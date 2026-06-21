export function ShopStoriesReel({
  stories,
}: {
  stories: Array<{ id: string; media_url: string; caption: string | null }>;
}) {
  if (stories.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-[color:var(--cofex-coffee-deep)]">Today&apos;s story</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {stories.map((s) => (
          <div key={s.id} className="relative h-40 w-28 shrink-0 overflow-hidden rounded-2xl ring-2 ring-[color:var(--cofex-cyan)]">
            <img src={s.media_url} alt={s.caption ?? "Story"} className="h-full w-full object-cover" />
            {s.caption ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white">
                {s.caption}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
