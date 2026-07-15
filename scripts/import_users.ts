import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Kinde M2M credentials
const KINDE_DOMAIN = process.env.KINDE_ISSUER_URL; // e.g. https://yourdomain.kinde.com
const CLIENT_ID = process.env.KINDE_M2M_CLIENT_ID;
const CLIENT_SECRET = process.env.KINDE_M2M_CLIENT_SECRET;

async function getKindeAccessToken() {
  if (!KINDE_DOMAIN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing Kinde M2M credentials in .env');
  }

  const response = await fetch(`${KINDE_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: `${KINDE_DOMAIN}/api`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Kinde token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createKindeUser(token: string, email: string, name: string) {
  const [firstName, ...lastNameParts] = name ? name.split(' ') : ['User'];
  const lastName = lastNameParts.join(' ') || undefined;

  const response = await fetch(`${KINDE_DOMAIN}/api/v1/user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      profile: {
        given_name: firstName,
        family_name: lastName,
      },
      identities: [
        {
          type: 'email',
          details: {
            email: email
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (errorData?.errors?.find((e: any) => e.code === 'USER_ALREADY_EXISTS' || e.message?.includes('exists'))) {
      console.log(`User ${email} already exists in Kinde.`);
      // If user exists, fetch their ID by email
      const fetchRes = await fetch(`${KINDE_DOMAIN}/api/v1/users?email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (fetchRes.ok) {
        const fetchJson = await fetchRes.json();
        if (fetchJson.users && fetchJson.users.length > 0) {
          return fetchJson.users[0].id;
        }
      }
      throw new Error(`User exists but could not fetch ID for ${email}`);
    }
    throw new Error(`Failed to create user ${email} in Kinde: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.id; // The new Kinde User ID
}

async function main() {
  console.log('Starting Unified Import...');
  
  const token = await getKindeAccessToken();
  console.log('Successfully authenticated with Kinde API.');

  const dbExportsDir = path.join(process.cwd(), 'db-exports ');
  const files = fs.readdirSync(dbExportsDir).filter(f => f.endsWith('.json'));

  const usersMap = new Map<string, any>();

  for (const file of files) {
    const filePath = path.join(dbExportsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = JSON.parse(content);
    
    for (const record of records) {
      if (!record.email) continue;
      
      const email = record.email.toLowerCase().trim();
      
      // If user already exists in map, we merge data (preferring non-null values)
      if (!usersMap.has(email)) {
        usersMap.set(email, record);
      } else {
        const existing = usersMap.get(email);
        usersMap.set(email, {
          ...existing,
          ...record,
          role: record.role && record.role !== 'guest' ? record.role : existing.role,
          plan: record.plan && record.plan !== 'free' ? record.plan : existing.plan,
        });
      }
    }
  }

  console.log(`Found ${usersMap.size} unique users to import.`);

  let importedCount = 0;
  let errorCount = 0;

  for (const [email, user] of usersMap.entries()) {
    try {
      const name = user.name || user.nombre || 'Usuario Invitado';
      console.log(`Processing: ${email}...`);
      
      // 1. Create in Kinde
      const kindeId = await createKindeUser(token, email, name);
      
      // 2. Insert into Neon Postgres via Prisma
      await prisma.user.upsert({
        where: { id: kindeId },
        update: {
          legacyId: user.id || null,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
          name: name,
          image: user.image || user.logo_url || null,
          role: user.role || 'USER',
          plan: user.plan || 'free',
          stripeCustomerId: user.stripe_customer_id || null,
          stripeSubscriptionId: user.stripe_subscription_id || null,
          companyName: user.company_name || null,
          createdAt: user.createdAt || user.created_at ? new Date(user.createdAt || user.created_at) : new Date(),
        },
        create: {
          id: kindeId,
          legacyId: user.id || null,
          email: email,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
          name: name,
          image: user.image || user.logo_url || null,
          role: user.role || 'USER',
          plan: user.plan || 'free',
          stripeCustomerId: user.stripe_customer_id || null,
          stripeSubscriptionId: user.stripe_subscription_id || null,
          companyName: user.company_name || null,
          createdAt: user.createdAt || user.created_at ? new Date(user.createdAt || user.created_at) : new Date(),
        }
      });
      
      importedCount++;
    } catch (err: any) {
      console.error(`Error processing ${email}:`, err.message);
      errorCount++;
    }
  }

  console.log(`Import finished! Successfully imported: ${importedCount}, Errors: ${errorCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
