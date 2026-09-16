import type { Metadata } from "next";
import "./globals.css";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Sidebar from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";
import { syncUserPlanFromStripe } from "@/lib/stripeSync";

export const metadata: Metadata = {
  title: "Konsul Central Hub",
  description: "Unified dashboard for all Konsul MicroSaaS applications",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  const user = isAuth ? await getUser() : null;

  let isLocked = true;
  if (isAuth && user?.id) {
    try {
      let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { plan: true, role: true, email: true }
      });

      const email = user.email || dbUser?.email || '';
      const isAdmin = dbUser?.role === 'ADMIN' || email === 'somos@konsul.digital' || email.endsWith('@konsul.digital');

      if (isAdmin) {
        isLocked = false;
      } else {
        if (!dbUser || !dbUser.plan || dbUser.plan === 'free') {
          const syncedUser = await syncUserPlanFromStripe({ id: user.id, email: user.email });
          if (syncedUser) {
            dbUser = { plan: syncedUser.plan, role: syncedUser.role, email: syncedUser.email };
          }
        }

        if (dbUser && (
          dbUser.plan === 'basic' || 
          dbUser.plan === 'pro' || 
          dbUser.plan === 'basic_leads' || 
          dbUser.plan === 'pro_leads'
        )) {
          isLocked = false;
        }
      }
    } catch (e) {
      console.error("Failed to fetch user plan in layout:", e);
    }
  }

  return (
    <html lang="en">
      <body className={isAuth ? "app-body" : "landing-body"}>
        {isAuth ? (
          <>
            <Sidebar user={user} isLocked={isLocked} />
            {children}
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
