/** Lightweight decorative accents, CSS-only, respects prefers-reduced-motion */

export function CoffeeSteam({ className = "" }: { className?: string }) {
  return (
    <div className={`cofex-coffee-steam pointer-events-none ${className}`} aria-hidden>
      <span className="cofex-steam-wisp cofex-steam-wisp--1" />
      <span className="cofex-steam-wisp cofex-steam-wisp--2" />
      <span className="cofex-steam-wisp cofex-steam-wisp--3" />
    </div>
  );
}

const CONFETTI_COLORS = [
  "var(--cofex-cyan)",
  "var(--cofex-gold)",
  "var(--cofex-magenta)",
  "var(--cofex-coffee)",
  "var(--cofex-lime)",
] as const;

export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="cofex-confetti-burst pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="cofex-confetti-piece"
          style={{
            left: `${8 + (i * 5) % 84}%`,
            animationDelay: `${(i % 6) * 0.08}s`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            transform: `rotate(${i * 37}deg)`,
          }}
        />
      ))}
    </div>
  );
}
