import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminUsers, useAdminSetUserRole } from "@/lib/queries/admin";
import { useAdminUserDetail } from "@/lib/queries/admin-moderation";
import { useAdminSetUserTrust } from "@/lib/queries/admin-fraud";
import { TRUST_STATUS_LABELS, TRUST_STATUS_TONES, type TrustStatus } from "@/lib/anti-fraud";
import {
  AdminCard,
  AdminLoading,
  AdminPage,
  AdminStatusBadge,
} from "@/components/app/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronRight, Search, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users · Admin" }] }),
  component: AdminUsersPage,
});

const ROLES = ["explorer", "partner", "admin"] as const;
const TRUST_OPTIONS: TrustStatus[] = ["normal", "watch", "flagged", "restricted"];

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: users, isLoading } = useAdminUsers(query);
  const { data: detail, isLoading: detailLoading } = useAdminUserDetail(selectedId);
  const setRole = useAdminSetUserRole();
  const setTrust = useAdminSetUserTrust();

  async function toggleRole(userId: string, role: (typeof ROLES)[number], hasRole: boolean) {
    try {
      await setRole.mutateAsync({ userId, role, action: hasRole ? "revoke" : "grant" });
      toast.success(hasRole ? `Removed ${role}` : `Granted ${role}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role update failed");
    }
  }

  const profile = detail?.profile as Record<string, unknown> | undefined;
  const trustStatus = (profile?.trust_status as TrustStatus) ?? "normal";

  return (
    <AdminPage title="User management" subtitle="Search explorers, view activity, manage roles and trust status.">
      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
          setSelectedId(null);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--cofex-black)]/40" />
          <Input
            className="pl-9"
            placeholder="Search by name, handle, or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {isLoading ? (
            <AdminLoading />
          ) : (
            <ul className="space-y-2">
              {(users ?? []).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className={`cofex-app-card w-full p-4 text-left transition ${
                      selectedId === u.id ? "ring-2 ring-[color:var(--cofex-cyan)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[color:var(--cofex-coffee-deep)]">
                          {u.display_name ?? "Anonymous"}
                        </p>
                        <p className="truncate text-xs text-[color:var(--cofex-black)]/55">
                          {u.handle ? `@${u.handle}` : u.id.slice(0, 8)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--cofex-black)]/35" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] capitalize">
                          {r}
                        </Badge>
                      ))}
                      {u.trust_status !== "normal" && (
                        <Badge className={`text-[10px] ${TRUST_STATUS_TONES[u.trust_status as TrustStatus]}`}>
                          {TRUST_STATUS_LABELS[u.trust_status as TrustStatus]}
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selectedId ? (
            <AdminCard className="flex flex-col items-center justify-center py-16 text-center text-[color:var(--cofex-black)]/55">
              <User className="mb-3 h-10 w-10 text-[color:var(--cofex-cyan)]" />
              <p className="font-semibold">Select a user</p>
              <p className="mt-1 text-sm">View profile, roles, trust status, and activity summary.</p>
            </AdminCard>
          ) : detailLoading ? (
            <AdminLoading />
          ) : !detail?.found ? (
            <AdminCard>User not found.</AdminCard>
          ) : (
            <div className="space-y-4">
              <AdminCard>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
                      {(profile?.display_name as string) ?? "Anonymous"}
                    </h2>
                    <p className="text-sm text-[color:var(--cofex-black)]/60">
                      {(profile?.handle as string) ? `@${profile?.handle}` : selectedId} ·{" "}
                      {(profile?.city as string) ?? "—"}
                    </p>
                  </div>
                  <Badge className={TRUST_STATUS_TONES[trustStatus]}>{TRUST_STATUS_LABELS[trustStatus]}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Points" value={detail.activity?.points_total ?? 0} />
                  <Stat label="Check-ins" value={detail.activity?.check_ins_total ?? 0} />
                  <Stat label="30d visits" value={detail.activity?.check_ins_30d ?? 0} />
                  <Stat label="Fraud events (7d)" value={detail.activity?.fraud_events_7d ?? 0} />
                  <Stat label="Campaigns joined" value={detail.activity?.campaigns_joined ?? 0} />
                  <Stat label="Rewards used" value={detail.activity?.rewards_redeemed ?? 0} />
                  <Stat label="Fraud score" value={Number(profile?.fraud_score ?? 0)} />
                  <Stat label="Status" value={trustStatus} />
                </div>
              </AdminCard>

              <AdminCard>
                <h3 className="font-bold text-[color:var(--cofex-coffee-deep)]">Roles</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ROLES.map((role) => {
                    const active = (detail.roles ?? []).includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(selectedId, role, active)}
                        disabled={setRole.isPending || (role === "explorer" && active && (detail.roles ?? []).length === 1)}
                      >
                        <Badge variant={active ? "default" : "outline"} className="cursor-pointer capitalize">
                          {role}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </AdminCard>

              <AdminCard>
                <h3 className="font-bold text-[color:var(--cofex-coffee-deep)]">Trust status</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TRUST_OPTIONS.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={trustStatus === status ? "default" : "outline"}
                      disabled={setTrust.isPending}
                      onClick={async () => {
                        try {
                          await setTrust.mutateAsync({ userId: selectedId, trustStatus: status });
                          toast.success(`Trust set to ${TRUST_STATUS_LABELS[status]}`);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Update failed");
                        }
                      }}
                    >
                      {TRUST_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </AdminCard>

              {(detail.activity?.recent_check_ins?.length ?? 0) > 0 && (
                <AdminCard>
                  <h3 className="font-bold text-[color:var(--cofex-coffee-deep)]">Recent check-ins</h3>
                  <ul className="mt-3 space-y-2">
                    {detail.activity!.recent_check_ins.map((ci) => (
                      <li key={ci.id} className="flex justify-between text-sm">
                        <span>
                          {ci.shop_name}
                          {ci.city ? ` · ${ci.city}` : ""}
                        </span>
                        <time className="text-xs text-[color:var(--cofex-black)]/50">
                          {new Date(ci.created_at).toLocaleDateString()}
                        </time>
                      </li>
                    ))}
                  </ul>
                </AdminCard>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[color:var(--cofex-cream)] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-black)]/45">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums capitalize text-[color:var(--cofex-coffee-deep)]">
        {value}
      </p>
    </div>
  );
}
