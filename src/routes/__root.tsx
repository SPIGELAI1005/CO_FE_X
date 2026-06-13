import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Home, Map, BookOpen, Coffee } from "lucide-react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { PwaBootstrap } from "@/components/app/PwaBootstrap";
import { reportAppError } from "../lib/error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--cofex-cream, #f5efe6)" }}>
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--cofex-coffee-deep, #3d2417)" }}>
          <Coffee className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight" style={{ color: "var(--cofex-coffee-deep, #3d2417)" }}>404</h1>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">Lost in the beans?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-8">
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "var(--cofex-coffee-deep, #3d2417)" }}
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            to="/explore"
            className="flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 transition-colors hover:bg-white/80"
            style={{ borderColor: "var(--border)" }}
          >
            <Map className="h-5 w-5" style={{ color: "var(--cofex-coffee-deep, #3d2417)" }} />
            <span className="text-xs font-semibold text-foreground">Explore</span>
          </Link>
          <Link
            to="/passport"
            className="flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 transition-colors hover:bg-white/80"
            style={{ borderColor: "var(--border)" }}
          >
            <BookOpen className="h-5 w-5" style={{ color: "var(--cofex-coffee-deep, #3d2417)" }} />
            <span className="text-xs font-semibold text-foreground">Passport</span>
          </Link>
          <Link
            to="/coffee/fabrica-coffee-roasters"
            className="flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 transition-colors hover:bg-white/80"
            style={{ borderColor: "var(--border)" }}
          >
            <Coffee className="h-5 w-5" style={{ color: "var(--cofex-coffee-deep, #3d2417)" }} />
            <span className="text-xs font-semibold text-foreground">Coffee shop</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportAppError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#3d2417" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "CO:FE(X) — (X)plore Cafés · (€)arn Coffees" },
      { name: "description", content: "Discover independent coffee shops, join campaigns, and earn rewards with CO:FE(X)." },
      { name: "author", content: "CO_FE_X" },
      { property: "og:title", content: "CO:FE(X) — Coffee Explorer Network" },
      { property: "og:description", content: "Snap. Post. Earn a free coffee. The Coffee Explorer Network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@COFEX_app" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/icon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PwaBootstrap />
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
