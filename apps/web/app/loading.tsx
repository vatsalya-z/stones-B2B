/**
 * Global root loading state — displayed during Next.js route transitions
 * for public marketplace pages while server components fetch data.
 */
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-amber-600" />
        <p className="text-sm text-stone-500 font-medium tracking-wide">
          Loading StonesDekho…
        </p>
      </div>
    </div>
  );
}

