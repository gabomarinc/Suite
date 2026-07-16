import type { Metadata } from "next";
import "./globals.css";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Sidebar from "@/components/Sidebar";

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

  return (
    <html lang="en">
      <body>
        {isAuth ? (
          <>
            <Sidebar user={user} />
            {children}
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
