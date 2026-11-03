import { redirect } from "next/navigation";
import { getUserRoles, requireAuth } from "@/lib/auth";

interface ProfileRouterProps {
  searchParams: Promise<{ portal?: string }>;
}

export default async function ProfileRouterPage({ searchParams }: ProfileRouterProps) {
  await requireAuth();
  const [{ portal }, roles] = await Promise.all([searchParams, getUserRoles()]);

  const isSeller = roles.includes("seller");
  const isBuyer = roles.includes("buyer");

  if (portal === "buyer" && isBuyer) {
    redirect("/buyer/profile");
  }
  if (portal === "seller" && isSeller) {
    redirect("/seller/profile");
  }
  if (isSeller) {
    redirect("/seller/profile");
  }
  if (isBuyer) {
    redirect("/buyer/profile");
  }

  redirect("/");
}
