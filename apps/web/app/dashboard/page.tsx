import { redirect } from "next/navigation";
import { getUserRoles, requireAuth } from "@/lib/auth";

interface DashboardRouterProps {
  searchParams: Promise<{ portal?: string }>;
}

export default async function DashboardRouterPage({ searchParams }: DashboardRouterProps) {
  await requireAuth();
  const [{ portal }, roles] = await Promise.all([searchParams, getUserRoles()]);

  const isSeller = roles.includes("seller");
  const isBuyer = roles.includes("buyer");
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  if (portal === "admin" && isAdmin) {
    redirect("/admin/dashboard");
  }
  if (portal === "buyer" && isBuyer) {
    redirect("/buyer/dashboard");
  }
  if (portal === "seller" && isSeller) {
    redirect("/seller/dashboard");
  }
  if (isAdmin) {
    redirect("/admin/dashboard");
  }
  if (isSeller) {
    redirect("/seller/dashboard");
  }
  if (isBuyer) {
    redirect("/buyer/dashboard");
  }

  redirect("/");
}
