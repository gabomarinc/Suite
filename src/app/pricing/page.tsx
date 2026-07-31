import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import PricingClient from "./PricingClient";

export default async function PricingPage() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  const kindeUser = isAuth ? await getUser() : null;

  let currentPlan = "free";
  if (kindeUser?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: kindeUser.id },
      select: { plan: true },
    });
    if (dbUser?.plan) {
      currentPlan = dbUser.plan;
    }
  }

  return (
    <PricingClient 
      isAuthenticated={!!isAuth} 
      currentPlan={currentPlan}
    />
  );
}
