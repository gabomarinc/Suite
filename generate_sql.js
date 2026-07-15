const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbExportsDir = path.join(process.cwd(), 'db-exports ');
const files = fs.readdirSync(dbExportsDir).filter(f => f.endsWith('.json'));

const usersMap = new Map();

for (const file of files) {
  const filePath = path.join(dbExportsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = JSON.parse(content);
  
  for (const record of records) {
    if (!record.email) continue;
    const email = record.email.toLowerCase().trim();
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

let sql = `INSERT INTO "User" ("id", "legacyId", "email", "firstName", "lastName", "name", "image", "role", "plan", "stripeCustomerId", "stripeSubscriptionId", "companyName", "createdAt", "updatedAt") VALUES\n`;

const values = [];
for (const [email, user] of usersMap.entries()) {
  const name = user.name || user.nombre || 'Usuario Invitado';
  const firstName = name.split(' ')[0].replace(/'/g, "''");
  const lastName = name.split(' ').slice(1).join(' ').replace(/'/g, "''");
  const safeName = name.replace(/'/g, "''");
  const role = user.role || 'USER';
  const plan = user.plan || 'free';
  const stripeCust = user.stripe_customer_id || null;
  const stripeSub = user.stripe_subscription_id || null;
  const comp = user.company_name ? user.company_name.replace(/'/g, "''") : null;
  const createdAt = user.createdAt || user.created_at || new Date().toISOString();
  const image = user.image || user.logo_url || null;
  
  // Create a temporary ID that we will update later when Kinde pairs
  const tempId = 'temp_' + crypto.randomUUID();
  
  values.push(`('${tempId}', ${user.id ? `'${user.id}'` : 'NULL'}, '${email}', '${firstName}', '${lastName}', '${safeName}', ${image ? `'${image}'` : 'NULL'}, '${role}', '${plan}', ${stripeCust ? `'${stripeCust}'` : 'NULL'}, ${stripeSub ? `'${stripeSub}'` : 'NULL'}, ${comp ? `'${comp}'` : 'NULL'}, '${createdAt}', '${createdAt}')`);
}

sql += values.join(',\n') + ' ON CONFLICT ("email") DO NOTHING;';

fs.writeFileSync('neon_import.sql', sql);
console.log('neon_import.sql generated');
