import type { Metadata } from "next";
import "./globals.css";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Sidebar from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";

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
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { plan: true }
      });
      if (dbUser && (dbUser.plan === 'basic' || dbUser.plan === 'pro')) {
        isLocked = false;
      }
    } catch (e) {
      console.error("Failed to fetch user plan in layout:", e);
    }
  }

  return (
    <html lang="en">
      <body>
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
