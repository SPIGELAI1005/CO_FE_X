import type { ReactNode } from "react";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-8 max-w-3xl mx-auto">
      {eyebrow && (
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
          style={{ background: "var(--cofex-cream-warm)", color: "var(--cofex-coffee-deep)" }}
        >
          {eyebrow}
        </span>
      )}
      <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}
