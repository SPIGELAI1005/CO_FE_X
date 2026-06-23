import type { ReactNode } from "react";

interface AppPageProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}

interface AppPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accent?: string;
  action?: ReactNode;
}

export function AppPage({ children, className = "", fullHeight }: AppPageProps) {
  return (
    <div
      className={`cofex-app-page ${fullHeight ? "flex min-h-0 flex-1 flex-col" : "min-h-full pb-6"} ${className}`}
    >
      {children}
    </div>
  );
}

export function AppPageHeader({ eyebrow, title, subtitle, accent = "var(--cofex-cyan)", action }: AppPageHeaderProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:pt-8">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--cofex-cyan)]/20 bg-[color:var(--cofex-pastel-blue)]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs sm:tracking-[0.25em]"
            style={{ color: accent }}
          >
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[color:var(--cofex-coffee-deep)] sm:text-2xl md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--cofex-black)]/70">{subtitle}</p>
        )}
      </div>
      {action ? <div className="shrink-0 self-start">{action}</div> : null}
    </div>
  );
}

export function AppPageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-5 ${className}`}>{children}</div>;
}

interface AppPageSectionProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function AppPageSection({
  eyebrow,
  title,
  subtitle,
  icon,
  action,
  className = "",
  children,
}: AppPageSectionProps) {
  return (
    <section className={`mt-6 sm:mt-8 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--cofex-cyan)] sm:tracking-[0.25em]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)] sm:text-xl md:text-2xl">
            {icon}
            <span className="min-w-0">{title}</span>
          </h2>
          {subtitle && <p className="mt-1 text-sm text-[color:var(--cofex-black)]/65">{subtitle}</p>}
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
