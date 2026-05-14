"use client";

import { useEffect, useMemo } from "react";

import { useApiActivityStore } from "@/stores/api-activity";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

import { MethodBadge } from "./method-badge";
import { SectionShell } from "./section-shell";
import { StatusPill } from "./status-pill";
import { ErrorState } from "./state";

const Shell = ({ children }: { children: React.ReactNode }) => (
  <SectionShell
    ariaLabel="API activity summary"
    title="API activity"
    subtitle="Most recent requests"
    viewAllHref="/dashboard/activity"
    className="h-full"
  >
    {children}
  </SectionShell>
);

export const ApiActivityLogSummary = () => {
  const entries = useApiActivityStore((s) => s.entries);
  const loading = useApiActivityStore((s) => s.loading);
  const error = useApiActivityStore((s) => s.error);
  const fetch = useApiActivityStore((s) => s.fetch);

  useEffect(() => {
    if (entries.length === 0 && !loading && !error) {
      void fetch();
    }
  }, [fetch, entries.length, loading, error]);

  const stats = useMemo(() => {
    const errors = entries.filter((e) => e.statusCode >= 400).length;
    const success = entries.length === 0 ? 0 : ((entries.length - errors) / entries.length) * 100;
    return { total: entries.length, errors, success };
  }, [entries]);

  const recent = useMemo(() => entries.slice(0, 10), [entries]);

  if (loading && entries.length === 0) {
    return (
      <Shell>
        <LoadingBody />
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell>
        <ErrorState error={error} onRetry={() => void fetch()} />
      </Shell>
    );
  }
  if (entries.length === 0) {
    return (
      <Shell>
        <p className="text-sm text-zinc-500">No activity yet.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span>
          <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {stats.total}
          </span>{" "}
          requests
        </span>
        <span>
          <span
            className={cn(
              "font-medium tabular-nums",
              stats.errors > 0 ? "text-rose-700 dark:text-rose-300" : "text-zinc-900 dark:text-zinc-100",
            )}
          >
            {stats.errors}
          </span>{" "}
          errors
        </span>
        <span>
          <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {stats.success.toFixed(1)}%
          </span>{" "}
          success
        </span>
      </p>

      <ul className="mt-3 divide-y dark:divide-zinc-800">
        {recent.map((e) => (
          <li
            key={e.id}
            className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 py-1.5 text-sm"
          >
            <time
              dateTime={e.timestamp}
              title={formatDateTime(e.timestamp)}
              className="font-mono text-xs text-zinc-500"
            >
              {formatRelativeTime(e.timestamp)}
            </time>
            <MethodBadge method={e.method} />
            <span
              className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300"
              title={e.endpoint}
            >
              {e.endpoint}
            </span>
            <StatusPill code={e.statusCode} />
          </li>
        ))}
      </ul>
    </Shell>
  );
};

const LoadingBody = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading activity"
      className="space-y-1.5"
    >
      <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="space-y-1.5 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-5 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
};
