import { Leaf, MapPin } from "lucide-react";

interface OriginStoryBlockProps {
  originRegion?: string | null;
  roasterName?: string | null;
  fairTrade?: boolean | null;
  co2Note?: string | null;
}

export function OriginStoryBlock({ originRegion, roasterName, fairTrade, co2Note }: OriginStoryBlockProps) {
  if (!originRegion && !roasterName && !co2Note) return null;

  return (
    <section className="cofex-app-card space-y-2 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[color:var(--cofex-coffee-deep)]">
        <Leaf className="h-4 w-4 text-[color:var(--cofex-cyan)]" /> Origin story
      </h3>
      {originRegion ? (
        <p className="flex items-start gap-2 text-sm text-[color:var(--cofex-black)]/80">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
          {originRegion}
        </p>
      ) : null}
      {roasterName ? <p className="text-sm text-[color:var(--cofex-black)]/75">Roasted by {roasterName}</p> : null}
      {fairTrade ? (
        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
          Fair trade
        </span>
      ) : null}
      {co2Note ? <p className="text-xs text-[color:var(--cofex-black)]/60">{co2Note}</p> : null}
    </section>
  );
}
