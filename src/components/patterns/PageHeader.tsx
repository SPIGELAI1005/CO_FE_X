import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
            style={{ background: "var(--cofex-cream-warm)", color: "var(--cofex-coffee-deep)" }}
          >
            {eyebrow}
          </span>
        )}
        <h1 className={`font-bold tracking-tight text-2xl sm:text-3xl ${eyebrow ? "mt-3" : ""}`}>
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
