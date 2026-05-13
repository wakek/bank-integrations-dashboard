"use client";

import { useEffect, useMemo } from "react";

import type { WebhookStatus } from "@/data";
import { useWebhooksStore } from "@/stores/webhooks";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

import { CountChip } from "./count-chip";
import { SectionShell } from "./section-shell";
import { ErrorState } from "./state";

const STATUS_LABEL: Record<WebhookStatus, string> = {
  delivered: "Delivered",
  retrying: "Retrying",
  failed: "Failed",
  pending: "Pending",
};

const STATUS_DOT: Record<WebhookStatus, string> = {
  delivered: "bg-emerald-500",
  retrying: "bg-amber-500",
  failed: "bg-rose-500",
  pending: "bg-zinc-400",
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <SectionShell
    ariaLabel="Webhook deliveries summary"
    title="Webhook deliveries"
    subtitle="Latest events sent to your endpoint"
    viewAllHref="/dashboard/webhooks"
    className="h-full"
  >
    {children}
  </SectionShell>
);

export const WebhookAttemptsSummary = () => {
  const deliveries = useWebhooksStore((s) => s.deliveries);
  const loading = useWebhooksStore((s) => s.loading);
  const error = useWebhooksStore((s) => s.error);
  const fetch = useWebhooksStore((s) => s.fetch);

  useEffect(() => {
    if (deliveries.length === 0 && !loading && !error) {
      void fetch();
    }
  }, [fetch, deliveries.length, loading, error]);

  const counts = useMemo(() => {
    const acc: Record<WebhookStatus, number> = {
      delivered: 0,
      retrying: 0,
      failed: 0,
      pending: 0,
    };
    for (const d of deliveries) acc[d.status]++;
    return acc;
  }, [deliveries]);

  const recent = useMemo(() => deliveries.slice(0, 10), [deliveries]);

  if (loading && deliveries.length === 0) {
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
  if (deliveries.length === 0) {
    return (
      <Shell>
        <p className="text-sm text-zinc-500">No webhook deliveries yet.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {(["delivered", "retrying", "failed", "pending"] as const).map((s) => (
          <CountChip
            key={s}
            dotClass={STATUS_DOT[s]}
            count={counts[s]}
            label={STATUS_LABEL[s].toLowerCase()}
          />
        ))}
      </div>

      <ul className="mt-3 divide-y dark:divide-zinc-800">
        {recent.map((d) => (
          <li
            key={d.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-1.5 text-sm"
          >
            <time
              dateTime={d.firstAttemptAt}
              title={formatDateTime(d.firstAttemptAt)}
              className="font-mono text-xs text-zinc-500"
            >
              {formatRelativeTime(d.firstAttemptAt)}
            </time>
            <span
              className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300"
              title={d.eventType}
            >
              {d.eventType}
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span
                aria-hidden="true"
                className={cn("inline-block size-1.5 rounded-full", STATUS_DOT[d.status])}
              />
              {STATUS_LABEL[d.status]}
            </span>
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
      aria-label="Loading webhooks"
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
