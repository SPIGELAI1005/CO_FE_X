import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({ meta: [{ title: "Reset password — CO:FE(X)" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e2) {
      setErr(friendlyAuthError(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle={sent ? "Check your inbox for a reset link." : "We'll email you a link to choose a new password."}
    >
      {sent ? (
        <p className="text-sm text-muted-foreground text-center">
          Didn&apos;t get it? Check spam or{" "}
          <button type="button" className="underline" onClick={() => setSent(false)}>
            try again
          </button>
          .
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <Link to="/auth" className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12" style={{ background: "var(--cofex-cream)" }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
            CO:FE(X)
          </div>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
