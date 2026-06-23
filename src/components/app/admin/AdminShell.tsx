import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminPage({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--cofex-coffee-deep)]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[color:var(--cofex-black)]/65">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AdminSection({
  title,
  icon: Icon,
  empty,
  emptyText,
  children,
  count,
}: {
  title: string;
  icon?: LucideIcon;
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-[color:var(--cofex-coffee-deep)]">
        {Icon && <Icon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
        {title}
        {count != null && (
          <Badge variant="secondary" className="ml-1 tabular-nums">
            {count}
          </Badge>
        )}
      </h2>
      {empty ? (
        <div className="cofex-app-card cofex-app-card-dashed p-5 text-sm text-[color:var(--cofex-black)]/60">{emptyText}</div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cofex-app-card p-4 ${className}`}>{children}</div>;
}

export function AdminLoading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-[color:var(--cofex-black)]/45" />
    </div>
  );
}

export function AdminStatGrid({
  stats,
}: {
  stats: { label: string; value: number | string; icon: LucideIcon }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="cofex-app-card p-5">
          <Icon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-[color:var(--cofex-coffee-deep)]">{value}</p>
          <p className="text-sm text-[color:var(--cofex-black)]/60">{label}</p>
        </div>
      ))}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  approved: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-900",
  paused: "bg-sky-100 text-sky-900",
  rejected: "bg-rose-100 text-rose-900",
  suspended: "bg-orange-100 text-orange-900",
  ended: "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-black)]/70",
  open: "bg-amber-100 text-amber-900",
  visible: "bg-emerald-100 text-emerald-800",
  hidden: "bg-slate-100 text-slate-700",
  removed: "bg-rose-100 text-rose-900",
};

export function AdminStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-coffee-deep)]";
  return <Badge className={`capitalize ${tone}`}>{status.replace(/_/g, " ")}</Badge>;
}
