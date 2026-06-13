import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PARTNER_BTN =
  "rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)] text-white";

export const PARTNER_CHIP_ACTIVE =
  "cofex-app-chip cofex-app-chip-active rounded-full px-3.5 py-1.5 text-xs font-semibold";

export const PARTNER_CHIP =
  "cofex-app-chip rounded-full px-3.5 py-1.5 text-xs font-medium text-[color:var(--cofex-black)]/65";

interface PartnerKpiCardProps {
  Icon: LucideIcon;
  label: string;
  value: number | string;
  delta?: number;
  tint?: string;
}

export function PartnerKpiCard({
  Icon,
  label,
  value,
  delta,
  tint = "from-[color:var(--cofex-coffee)] to-[color:var(--cofex-coffee-deep)]",
}: PartnerKpiCardProps) {
  return (
    <div className="cofex-app-card p-5">
      <div className="flex items-start justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white`}
        >
          <Icon className="h-5 w-5" />
        </span>
        {typeof delta === "number" && (
          <span className={`text-xs font-semibold ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-[color:var(--cofex-black)]">{value}</div>
      <div className="text-xs text-[color:var(--cofex-black)]/55">{label}</div>
    </div>
  );
}

interface PartnerEmptyStateProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  to?: string;
  actionLabel?: string;
}

export function PartnerEmptyState({ Icon, title, description, action, to, actionLabel }: PartnerEmptyStateProps) {
  return (
    <div className="cofex-app-card cofex-app-card-dashed p-10 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-[color:var(--cofex-coffee-deep)]" />
      <h3 className="text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-[color:var(--cofex-black)]/65">{description}</p>
      {action ??
        (to && actionLabel ? (
          <Button asChild className={`mt-4 ${PARTNER_BTN}`}>
            <Link to={to}>
              {actionLabel} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : null)}
    </div>
  );
}

interface PartnerWorkflowStepProps {
  step: number;
  title: string;
  description: string;
  to: string;
  label: string;
}

export function PartnerWorkflowStep({ step, title, description, to, label }: PartnerWorkflowStepProps) {
  return (
    <div className="cofex-app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--cofex-pastel-blue)] text-xs font-extrabold text-[color:var(--cofex-coffee-deep)]">
          {step}
        </span>
        <div>
          <div className="font-bold text-[color:var(--cofex-coffee-deep)]">{title}</div>
          <p className="text-sm text-[color:var(--cofex-black)]/65">{description}</p>
        </div>
      </div>
      <Link to={to} className="text-xs font-semibold text-[color:var(--cofex-cyan)] hover:underline whitespace-nowrap">
        {label} →
      </Link>
    </div>
  );
}

export function PartnerLoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cofex-app-card h-28 animate-pulse bg-[color:var(--cofex-cream)]" />
      ))}
    </div>
  );
}

export function PartnerStatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warn" | "danger" | "neutral" | "info";
}) {
  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-[color:var(--cofex-pastel-blue)] text-[color:var(--cofex-coffee-deep)] border-transparent",
    neutral: "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-black)]/65 border-[color:var(--border)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function partnerDelta(curr: number, prev: number) {
  if (!prev) return curr ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export function formatCompact(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}
