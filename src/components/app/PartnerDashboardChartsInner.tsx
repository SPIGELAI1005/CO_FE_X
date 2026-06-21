import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type DailyPoint = {
  day: string;
  visitors: number;
  new_customers: number;
  redemptions: number;
  reviews: number;
};

export type CampaignBar = {
  name: string;
  participants: number;
  redemptions: number;
};

export function PartnerDashboardChartsInner({
  series,
  campaignBars,
}: {
  series: DailyPoint[];
  campaignBars: CampaignBar[];
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="cofex-app-card lg:col-span-2 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("partnerDashboardPage.chartActivity")}</h3>
            <p className="text-xs text-[color:var(--cofex-black)]/55">{t("partnerDashboardPage.chartActivityDesc")}</p>
          </div>
          <Link to="/partner/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--cofex-cyan)] hover:underline">
            {t("partnerDashboardPage.openAnalytics")}
          </Link>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b45309" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717a" }} interval={3} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="visitors" stroke="#b45309" fill="url(#gv)" name={t("partnerDashboardPage.chartVisitors")} />
              <Area type="monotone" dataKey="new_customers" stroke="#0ea5e9" fill="url(#gn)" name={t("partnerDashboardPage.chartNew")} />
              <Area type="monotone" dataKey="redemptions" stroke="#e11d48" fill="transparent" name={t("partnerDashboardPage.chartRedemptions")} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="cofex-app-card p-5">
        <h3 className="mb-1 font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("partnerDashboardPage.topCampaigns")}</h3>
        <p className="mb-3 text-xs text-[color:var(--cofex-black)]/55">{t("partnerDashboardPage.topCampaignsDesc")}</p>
        <div className="h-64">
          {campaignBars.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-[color:var(--cofex-black)]/55">
              <BarChart3 className="mb-2 h-6 w-6 opacity-40" />
              {t("partnerDashboardPage.launchCampaignData")}
              <Link to="/partner/campaigns" className="mt-2 text-xs font-semibold text-[color:var(--cofex-cyan)] hover:underline">
                {t("partnerDashboardPage.createOne")}
              </Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignBars} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="participants" fill="#b45309" radius={[6, 6, 0, 0]} />
                <Bar dataKey="redemptions" fill="#e11d48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
