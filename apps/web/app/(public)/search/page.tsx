import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchRedirectPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        val.forEach((v) => params.append(key, v));
      } else {
        params.set(key, val);
      }
    }
  }
  const qs = params.toString();
  redirect(qs ? `/products?${qs}` : "/products");
}

