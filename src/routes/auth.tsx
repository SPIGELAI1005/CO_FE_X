import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";

const searchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Sign in — CO:FE(X)" },
      { name: "description", content: "Sign in to CO:FE(X) and start earning free coffees." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function goAfterAuth() {
    if (next && next.startsWith("/")) {
      window.location.href = next;
    } else {
      navigate({ to: "/explore", replace: true });
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goAfterAuth();
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setInfo("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      goAfterAuth();
    } catch (e2) {
      setErr(friendlyAuthError(e2));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setErr(null);
    const redirectTo = next
      ? `${window.location.origin}${next.startsWith("/") ? next : "/explore"}`
      : `${window.location.origin}/explore`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setErr(friendlyAuthError(error));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{ background: "var(--cofex-cream)" }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
            CO:FE(X)
          </div>
          <h1 className="mt-2 text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Join the network"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to keep exploring." : "Snap, share, earn coffees."}
          </p>
        </div>

        <button
          type="button"
          onClick={onGoogle}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium hover:bg-accent"
          style={{ borderColor: "var(--border)" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.55c2.08-1.92 3.23-4.74 3.23-8.11Z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.27-2.66l-3.55-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.52H2.18v2.84A11 11 0 0 0 12 23Z"/>
            <path fill="#FBBC05" d="M5.85 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.35-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.42 3.46 1.18 4.96l3.67-2.84Z"/>
            <path fill="#EA4335" d="M12 5.4c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.67 2.84C6.72 7.33 9.14 5.4 12 5.4Z"/>
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or with email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              required
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            required
            minLength={6}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          />
          {mode === "signin" && (
            <div className="text-right">
              <Link to="/auth/forgot" className="text-xs text-muted-foreground hover:text-foreground underline">
                Forgot password?
              </Link>
            </div>
          )}
          {info && <p className="text-sm text-emerald-700">{info}</p>}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--gradient-coffee)" }}
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); setInfo(null); }}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
