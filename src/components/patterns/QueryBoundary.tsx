import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";

interface QueryBoundaryProps<T> {
  query: Pick<UseQueryResult<T>, "isLoading" | "isError" | "error" | "refetch" | "data">;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionTo?: string;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}

export function QueryBoundary<T>({
  query,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionTo,
  loadingLabel,
  children,
}: QueryBoundaryProps<T>) {
  const { t } = useTranslation();
  const resolvedLoading = loadingLabel ?? t("query.loading");
  const resolvedEmpty = emptyTitle ?? t("query.empty");

  if (query.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        {resolvedLoading}
      </div>
    );
  }

  if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : t("query.errorGeneric");
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border)" }}>
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-medium">{t("query.errorTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => query.refetch()}>
          {t("query.tryAgain")}
        </Button>
      </div>
    );
  }

  if (query.data !== undefined && isEmpty?.(query.data)) {
    return (
      <EmptyState
        title={resolvedEmpty}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionTo={emptyActionTo}
      />
    );
  }

  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}
