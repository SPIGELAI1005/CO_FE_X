import { Link } from "@tanstack/react-router";
import { Home, Map as MapIcon, BookOpen, Coffee, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import cofexLogo from "@/assets/cofex-logo.png";
import { LanguageToggle } from "@/components/app/LanguageToggle";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div
      className="cofex-app-page flex min-h-screen flex-col"
      style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}
    >
      <header className="cofex-safe-top border-b border-[color:var(--border)] bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3 font-medium leading-tight">
            <img
              src={cofexLogo}
              alt="CO:FE(X) logo"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
            />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[10px] tracking-[0.12em] sm:text-sm md:tracking-[0.2em]">
                {t("header.brandLine")}
              </span>
              <span className="text-[10px] tracking-[0.12em] opacity-70 sm:text-xs">{t("header.tagline")}</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <Link
              to="/auth"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-4 py-2 text-xs font-medium transition hover:bg-[color:var(--cofex-black)] hover:text-white sm:text-sm"
            >
              {t("header.signIn")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="cofex-app-card w-full p-8 text-center sm:p-10">
          <img
            src={cofexLogo}
            alt=""
            width={72}
            height={72}
            className="mx-auto h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
            aria-hidden
          />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-[color:var(--cofex-cyan)]">
            {t("notFound.eyebrow")}
          </p>
          <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-[color:var(--cofex-coffee-deep)] sm:text-6xl">
            404
          </h1>
          <h2 className="mt-3 text-xl font-extrabold text-[color:var(--cofex-black)] sm:text-2xl">
            {t("notFound.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-[color:var(--cofex-black)]/65">{t("notFound.body")}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-5 py-2.5 text-sm font-semibold text-[color:var(--cofex-coffee-deep)] transition hover:border-[color:var(--cofex-cyan)] hover:bg-[color:var(--cofex-pastel-blue)]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("notFound.landing")}
            </Link>
            <Link
              to="/explore"
              className="cofex-onboarding-cta inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
            >
              <Home className="h-4 w-4" />
              {t("notFound.exploreCafes")}
            </Link>
          </div>
        </div>

        <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
          <Link
            to="/explore"
            className="cofex-app-card flex flex-col items-center gap-2 p-4 transition hover:-translate-y-0.5"
          >
            <MapIcon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
            <span className="text-xs font-bold text-[color:var(--cofex-coffee-deep)]">{t("nav.explore")}</span>
          </Link>
          <Link
            to="/passport"
            className="cofex-app-card flex flex-col items-center gap-2 p-4 transition hover:-translate-y-0.5"
          >
            <BookOpen className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
            <span className="text-xs font-bold text-[color:var(--cofex-coffee-deep)]">{t("nav.passport")}</span>
          </Link>
          <Link
            to="/campaigns"
            className="cofex-app-card flex flex-col items-center gap-2 p-4 transition hover:-translate-y-0.5"
          >
            <Coffee className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
            <span className="text-xs font-bold text-[color:var(--cofex-coffee-deep)]">{t("nav.campaigns")}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
