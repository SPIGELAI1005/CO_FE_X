import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Gift,
  Megaphone,
  Share2,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { usePartnerDashboardOverview } from "@/lib/queries/partner-dashboard";
import { formatCompact } from "@/components/app/partner/PartnerShell";

export function PartnerCounterOverview() {
  const { t } = useTranslation();
  const { data, isLoading } = usePartnerDashboardOverview();

  const items = [
    {
      label: t("partnerDashboardPage.counter.activeCampaigns"),
      value: data?.activeCampaigns ?? 0,
      Icon: Megaphone,
      to: "/partner/campaigns",
      tint: "bg-amber-100 text-amber-800",
    },
    {
      label: t("partnerDashboardPage.counter.pendingProofs"),
      value: data?.pendingSubmissions ?? 0,
      Icon: Share2,
      to: "/partner/submissions",
      tint: "bg-fuchsia-100 text-fuchsia-800",
      highlight: (data?.pendingSubmissions ?? 0) > 0,
    },
    {
      label: t("partnerDashboardPage.counter.redeemedToday"),
      value: data?.redeemedToday ?? 0,
      Icon: Gift,
      to: "/partner/verify",
      tint: "bg-rose-100 text-rose-800",
    },
    {
      label: t("partnerDashboardPage.counter.newExplorers"),
      value: data?.newExplorersToday ?? 0,
      Icon: UserPlus,
      to: "/partner/analytics",
      tint: "bg-sky-100 text-sky-800",
    },
    {
      label: t("partnerDashboardPage.counter.socialReach"),
      value: formatCompact(data?.socialReachToday ?? 0),
      Icon: Sparkles,
      to: "/partner/analytics",
      tint: "bg-violet-100 text-violet-800",
      hint: t("partnerDashboardPage.counter.socialReachHint"),
    },
    {
      label: t("partnerDashboardPage.counter.rewardsLeft"),
      value: data?.rewardsRemaining ?? 0,
      Icon: Users,
      to: "/partner/campaigns",
      tint: "bg-emerald-100 text-emerald-800",
    },
  ];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--cofex-coffee-deep)]/55">
            {t("partnerDashboardPage.counter.eyebrow")}
          </p>
          <h2 className="text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {t("partnerDashboardPage.counter.title")}
          </h2>
        </div>
        <Clock className="h-5 w-5 shrink-0 text-[color:var(--cofex-cyan)]" />
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory">
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`cofex-app-card min-w-[9.5rem] shrink-0 snap-start p-4 transition hover:-translate-y-0.5 ${
              item.highlight ? "ring-2 ring-fuchsia-300" : ""
            }`}
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.tint}`}>
              <item.Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-2xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
              {isLoading ? "…" : item.value}
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-[color:var(--cofex-black)]/65">
              {item.label}
            </p>
            {item.hint ? (
              <p className="mt-1 text-[10px] text-[color:var(--cofex-black)]/40">{item.hint}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
