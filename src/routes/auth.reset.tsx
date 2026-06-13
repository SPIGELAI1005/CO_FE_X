import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({ meta: [{ title: "New password · CO:FE(X)" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate({ to: "/explore", replace: true });
    } catch (e2) {
      setErr(friendlyAuthError(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12" style={{ background: "var(--cofex-cream)" }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
            CO:FE(X)
          </div>
          <h1 className="mt-2 text-2xl font-bold">Choose a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready ? "Enter your new password below." : "Open the link from your email to continue."}
          </p>
        </div>

        {ready ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              required
              minLength={6}
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
            <input
              required
              minLength={6}
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--gradient-coffee)" }}
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Waiting for a valid reset session…
          </p>
        )}

        <Link to="/auth" className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
