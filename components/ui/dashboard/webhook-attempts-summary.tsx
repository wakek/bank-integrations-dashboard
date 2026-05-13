"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import type { WebhookStatus } from "@/data";
import { useWebhooksStore } from "@/stores/webhooks";
import { cn } from "@/lib/utils";
import { ArrowRight } from "@solar-icons/react";

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Webhook deliveries summary"
      className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Webhook deliveries
          </h2>
          <p className="text-xs text-zinc-500">Latest events sent to your endpoint</p>
        </div>
        <Link
          href="/dashboard/webhooks"
          className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          View all <ArrowRight size={15} className="ml-1 inline-block" />
        </Link>
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LoadingBody() {
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
}

function ErrorBody({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div role="alert" className="text-sm">
      <p className="text-rose-700 dark:text-rose-300">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-900 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-100 dark:hover:bg-rose-900"
      >
        Try again
      </button>
    </div>
  );
}

function CountChip({ status, count }: { status: WebhookStatus; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      <span
        aria-hidden="true"
        className={cn("inline-block size-2 rounded-full", STATUS_DOT[status])}
      />
      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {count}
      </span>
      <span>{STATUS_LABEL[status].toLowerCase()}</span>
    </span>
  );
}

export function WebhookAttemptsSummary() {
  const deliveries = useWebhooksStore((s) => s.deliveries);
  const loading = useWebhooksStore((s) => s.loading);
  const error = useWebhooksStore((s) => s.error);
  const fetch = useWebhooksStore((s) => s.fetch);

  useEffect(() => {
    if (deliveries.length === 0 && !loading && !error) void fetch();
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

  const recent = useMemo(() => deliveries.slice(0, 5), [deliveries]);

  if (loading && deliveries.length === 0) {
    return (
      <SectionShell>
        <LoadingBody />
      </SectionShell>
    );
  }
  if (error) {
    return (
      <SectionShell>
        <ErrorBody error={error} onRetry={() => void fetch()} />
      </SectionShell>
    );
  }
  if (deliveries.length === 0) {
    return (
      <SectionShell>
        <p className="text-sm text-zinc-500">No webhook deliveries yet.</p>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {(["delivered", "retrying", "failed", "pending"] as const).map((s) => (
          <CountChip key={s} status={s} count={counts[s]} />
        ))}
      </div>

      <ul className="mt-3 divide-y dark:divide-zinc-800">
        {recent.map((d) => (
          <li
            key={d.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-1.5 text-sm"
          >
            <span className="font-mono text-xs text-zinc-500 tabular-nums">
              {formatTime(d.firstAttemptAt)}
            </span>
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
    </SectionShell>
  );
}
