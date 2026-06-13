import { Link } from "@tanstack/react-router";
import { MapPin, Coffee, Sparkles } from "lucide-react";
import type { CityCollectionProgress } from "@/lib/queries/city-collections";

interface CityCollectionCardProps {
  progress: CityCollectionProgress;
  compact?: boolean;
}

export function CityCollectionCard({ progress, compact }: CityCollectionCardProps) {
  const { city_name, city_slug, country, visited, shops_target, pct, complete, next_shop } = progress;

  return (
    <div className={`cofex-app-card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[color:var(--cofex-cyan)] uppercase">
            <MapPin className="h-3.5 w-3.5" /> City collection
          </div>
          <h3 className="mt-1 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{city_name}</h3>
          {country && <p className="text-xs text-[color:var(--cofex-black)]/55">{country}</p>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-[color:var(--cofex-accent-gold)]">
            {visited}/{shops_target}
          </div>
          <div className="text-[10px] tracking-widest text-[color:var(--cofex-black)]/45 uppercase">Cafés</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-[color:var(--cofex-black)]/55">
          <span>{complete ? "Collection complete!" : `${shops_target - visited} to go`}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[color:var(--cofex-cyan)] to-[color:var(--cofex-accent-gold)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/city/$city"
          params={{ city: city_slug }}
          className="cofex-app-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          Explore {city_name}
        </Link>
        {next_shop && !complete && (
          <Link
            to="/coffee/$slug"
            params={{ slug: next_shop.slug }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--cofex-coffee-deep)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Coffee className="h-3.5 w-3.5" /> Next: {next_shop.name}
          </Link>
        )}
        {complete && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" /> Complete
          </span>
        )}
      </div>
    </div>
  );
}
