import { Link } from "@tanstack/react-router";
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      <div className="lg:col-span-2 rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Activity — last 30 days</h3>
            <p className="text-xs text-muted-foreground">Visitors, new customers and redemptions per day.</p>
          </div>
          <Link to="/partner/analytics" className="text-xs text-amber-700 inline-flex items-center gap-1">
            Open analytics →
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
              <Area type="monotone" dataKey="visitors" stroke="#b45309" fill="url(#gv)" name="Visitors" />
              <Area type="monotone" dataKey="new_customers" stroke="#0ea5e9" fill="url(#gn)" name="New" />
              <Area type="monotone" dataKey="redemptions" stroke="#e11d48" fill="transparent" name="Redemptions" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="font-semibold mb-1">Top campaigns</h3>
        <p className="text-xs text-muted-foreground mb-3">Participants vs. redemptions this month.</p>
        <div className="h-64">
          {campaignBars.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <BarChart3 className="h-6 w-6 mb-2 opacity-40" />
              Launch a campaign to see data.
              <Link to="/partner/campaigns" className="mt-2 text-amber-700 text-xs">
                Create one →
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
