import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AutomatizacionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    redirect("/api/auth/login");
  }

  const kindeUser = await getUser();
  if (!kindeUser || !kindeUser.id) {
    redirect("/api/auth/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: kindeUser.id },
    select: { plan: true }
  });

  if (!dbUser || !dbUser.plan || dbUser.plan === 'free') {
    redirect('/pricing');
  }

  return <>{children}</>;
}
