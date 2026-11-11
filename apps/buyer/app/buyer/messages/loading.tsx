export default function BuyerMessagesLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-stone-200" />
      <div className="h-14 rounded-2xl border border-stone-200 bg-white" />
      <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-stone-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-stone-200" />
              <div className="h-3 w-72 rounded bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

