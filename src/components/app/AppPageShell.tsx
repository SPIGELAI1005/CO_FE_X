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
    <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 px-5 pb-4 pt-6 sm:pt-8">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[color:var(--cofex-black)] sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-[color:var(--cofex-black)]/70">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AppPageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 ${className}`}>{children}</div>;
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
    <section className={`mt-8 ${className}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--cofex-cyan)]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-[color:var(--cofex-coffee-deep)] sm:text-2xl">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-[color:var(--cofex-black)]/65">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
