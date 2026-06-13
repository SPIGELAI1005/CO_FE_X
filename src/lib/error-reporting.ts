export interface AppErrorReport {
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  timestamp: string;
  environment: "client" | "server";
}

const recentReports: AppErrorReport[] = [];
const MAX_BUFFER = 20;

function environment(): "client" | "server" {
  return typeof window === "undefined" ? "server" : "client";
}

export function buildAppErrorReport(
  error: unknown,
  context: Record<string, unknown> = {},
): AppErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    message: err.message,
    stack: err.stack,
    context,
    timestamp: new Date().toISOString(),
    environment: environment(),
  };
}

export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  const report = buildAppErrorReport(error, context);
  recentReports.unshift(report);
  if (recentReports.length > MAX_BUFFER) recentReports.pop();

  console.error("[CO_FE_X]", report);

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn && typeof window !== "undefined") {
    // Hook for Sentry/Datadog — load SDK when DSN is configured.
    window.dispatchEvent(new CustomEvent("cofex:error", { detail: report }));
  }
}

/** Test helper — inspect recent structured reports in unit tests. */
export function peekRecentAppErrors(): AppErrorReport[] {
  return [...recentReports];
}

export function clearRecentAppErrors() {
  recentReports.length = 0;
}

declare global {
  interface WindowEventMap {
    "cofex:error": CustomEvent<AppErrorReport>;
  }
}
