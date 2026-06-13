import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminUsers, useAdminSetUserRole } from "@/lib/queries/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsersPage,
});

const ROLES = ["explorer", "partner", "admin"] as const;

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data: users, isLoading } = useAdminUsers(query);
  const setRole = useAdminSetUserRole();

  async function toggleRole(userId: string, role: (typeof ROLES)[number], hasRole: boolean) {
    try {
      await setRole.mutateAsync({
        userId,
        role,
        action: hasRole ? "revoke" : "grant",
      });
      toast.success(hasRole ? `Removed ${role}` : `Granted ${role}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role update failed");
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold">User management</h1>
      <p className="mt-1 text-sm text-muted-foreground">Search explorers and manage roles.</p>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, handle, or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {isLoading ? (
        <Loader2 className="mt-8 h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <ul className="mt-6 space-y-3">
          {(users ?? []).map((u) => (
            <li
              key={u.id}
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{u.display_name ?? "Anonymous"}</p>
                  <p className="text-sm text-muted-foreground">
                    {u.handle ? `@${u.handle}` : u.id.slice(0, 8)} · {u.city ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {u.total_points} pts · {u.total_check_ins} check-ins
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ROLES.map((role) => {
                    const active = u.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(u.id, role, active)}
                        disabled={setRole.isPending || (role === "explorer" && active && u.roles.length === 1)}
                      >
                        <Badge variant={active ? "default" : "outline"} className="capitalize cursor-pointer">
                          {role}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
