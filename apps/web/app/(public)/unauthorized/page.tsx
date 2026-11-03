import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-stone-300 mb-4">403</p>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Access denied</h1>
        <p className="text-sm text-stone-500 mb-6">You don&apos;t have permission to view this page.</p>
        <Link href="/" className="text-sm font-medium text-stone-900 hover:underline">
          Go to homepage
        </Link>
      </div>
    </div>
  );
}

