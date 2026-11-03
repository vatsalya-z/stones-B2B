import { redirect } from "next/navigation";
import { requireBuyer } from "@/lib/auth";

export default async function BuyerIndexPage() {
  await requireBuyer();
  redirect("/buyer/dashboard");
}

