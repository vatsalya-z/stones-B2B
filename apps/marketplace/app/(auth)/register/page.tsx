import Link from "next/link";
import { sanitizeNextPath } from "@stone/validation";

interface RegisterPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { next } = await searchParams;
  const safeNext = next ? sanitizeNextPath(next, "/dashboard") : null;
  const nextQuery = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-xl font-semibold text-stone-900 mb-2">Create your account</h1>
      <p className="text-sm text-stone-500 mb-8">Choose the account type that describes you best.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`/register/buyer${nextQuery}`}
          className="group flex flex-col gap-2 rounded-xl border-2 border-stone-200 p-5 hover:border-stone-400 transition-colors"
        >
          <span className="text-2xl">🏗️</span>
          <span className="font-semibold text-stone-900">Buyer</span>
          <span className="text-sm text-stone-500 leading-relaxed">
            Architect, contractor, builder, interior designer or importer looking to source natural stone.
          </span>
        </Link>

        <Link
          href={`/register/seller${nextQuery}`}
          className="group flex flex-col gap-2 rounded-xl border-2 border-stone-200 p-5 hover:border-stone-400 transition-colors"
        >
          <span className="text-2xl">🪨</span>
          <span className="font-semibold text-stone-900">Seller</span>
          <span className="text-sm text-stone-500 leading-relaxed">
            Manufacturer, mine owner, supplier, exporter or wholesaler of natural stone products.
          </span>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href={`/login${nextQuery}`} className="font-medium text-stone-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
