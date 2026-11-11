export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-stone-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-stone-900 border border-stone-800" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-stone-900 border border-stone-800" />
    </div>
  );
}

