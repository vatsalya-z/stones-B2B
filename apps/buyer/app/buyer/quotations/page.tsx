import { redirect } from "next/navigation";

interface QuotationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuyerQuotationsAliasPage({ searchParams }: QuotationsPageProps) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") {
      q.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => q.append(key, v));
    }
  }
  const queryString = q.toString();
  redirect(`/buyer/quotes${queryString ? `?${queryString}` : ""}`);
}

