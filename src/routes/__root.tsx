import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ClientOnly,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { NotFoundPage } from "@/components/app/NotFoundPage";
import { PwaBootstrap } from "@/components/app/PwaBootstrap";
import { CofexMotionBootstrap } from "@/components/app/CofexMotionBootstrap";
import { I18nProvider } from "@/components/app/I18nProvider";
import { reportAppError } from "../lib/error-reporting";

function NotFoundComponent() {
  return (
    <I18nProvider>
      <NotFoundPage />
    </I18nProvider>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportAppError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <I18nProvider>
      <ErrorComponentInner error={error} reset={reset} router={router} />
    </I18nProvider>
  );
}

function ErrorComponentInner({
  error: _error,
  reset,
  router,
}: {
  error: Error;
  reset: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const { t } = useTranslation();
  void _error;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errors.pageLoadTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.pageLoadBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("errors.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("errors.goHome")}
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#3d2417" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "CO:FE(X) · (X)plore Cafés · (€)arn Coffees" },
      { name: "description", content: "Discover independent coffee shops, join campaigns, and earn rewards with CO:FE(X)." },
      { name: "author", content: "CO_FE_X" },
      { property: "og:title", content: "CO:FE(X) · Coffee Explorer Network" },
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
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/icon.png", type: "image/png", sizes: "512x512" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "512x512" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {supabaseUrl ? <meta name="cofex-supabase-url" content={supabaseUrl} /> : null}
        {supabaseKey ? <meta name="cofex-supabase-key" content={supabaseKey} /> : null}
      </head>
      <body>
        <script src="/cofex-auth.js" />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s='.cofex-reveal:not(.is-visible)';function r(){var v=innerHeight,m=v*.08;document.querySelectorAll(s).forEach(function(el){var b=el.getBoundingClientRect();if(b.top<v-m&&b.bottom>0)el.classList.add('is-visible')})}function q(){requestAnimationFrame(r)}if(matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.cofex-reveal').forEach(function(el){el.classList.add('is-visible')});return}addEventListener('scroll',q,{passive:true});addEventListener('resize',q,{passive:true});new MutationObserver(q).observe(document.body,{childList:true,subtree:true});requestAnimationFrame(function(){requestAnimationFrame(q)})})();(function(){function slides(){return document.querySelectorAll('[data-cofex-testimonial-slide]')}function current(){var list=slides();for(var i=0;i<list.length;i++){if(!list[i].classList.contains('invisible'))return i}return 0}function show(n){var list=slides();if(!list.length)return;var i=((n%list.length)+list.length)%list.length;list.forEach(function(el,j){if(j===i){el.classList.remove('invisible','pointer-events-none');el.removeAttribute('aria-hidden')}else{el.classList.add('invisible','pointer-events-none');el.setAttribute('aria-hidden','true')}})}document.addEventListener('click',function(e){var btn=e.target.closest('[data-cofex-testimonial-prev],[data-cofex-testimonial-next]');if(!btn)return;e.preventDefault();var idx=current();show(btn.hasAttribute('data-cofex-testimonial-prev')?idx-1:idx+1)})})();`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <PwaBootstrap />
        <ClientOnly fallback={null}>
          <CofexMotionBootstrap />
        </ClientOnly>
        <Outlet />
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </I18nProvider>
  );
}
