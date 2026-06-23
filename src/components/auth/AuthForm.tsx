interface AuthFormProps {
  next?: string;
}

export function AuthForm({ next }: AuthFormProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-12"
      style={{ background: "var(--cofex-cream)" }}
      data-cofex-auth-page
      data-cofex-auth-next={next?.startsWith("/") ? next : ""}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
            CO:FE(X)
          </div>
          <h1 className="mt-2 text-2xl font-bold" data-cofex-auth-title>
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground" data-cofex-auth-subtitle>
            Sign in to keep exploring.
          </p>
        </div>

        <button
          type="button"
          data-cofex-oauth="google"
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium hover:bg-accent"
          style={{ borderColor: "var(--border)" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.55c2.08-1.92 3.23-4.74 3.23-8.11Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.27-2.66l-3.55-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.52H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.85 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.35-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.42 3.46 1.18 4.96l3.67-2.84Z" />
            <path fill="#EA4335" d="M12 5.4c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.67 2.84C6.72 7.33 9.14 5.4 12 5.4Z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span data-cofex-auth-or-email>or with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form data-cofex-auth-form data-cofex-auth-mode="signin" className="space-y-3">
          <div data-cofex-auth-name-field className="hidden">
            <input
              name="name"
              type="text"
              placeholder="Name"
              className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <input
            name="email"
            required
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            name="password"
            required
            minLength={6}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          />
          <div data-cofex-auth-forgot className="text-right">
            <a href="/auth/forgot" className="text-xs text-muted-foreground hover:text-foreground underline">
              Forgot password?
            </a>
          </div>
          <p data-cofex-auth-info className="hidden text-sm text-emerald-700" />
          <p data-cofex-auth-error className="hidden text-sm text-destructive" />
          <button
            type="submit"
            data-cofex-auth-submit
            className="w-full rounded-lg py-3 text-sm font-semibold text-white"
            style={{ background: "var(--gradient-coffee)" }}
          >
            Sign in
          </button>
        </form>

        <button
          type="button"
          data-cofex-auth-toggle
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Don&apos;t have an account? Sign up
        </button>
      </div>
    </div>
  );
}
