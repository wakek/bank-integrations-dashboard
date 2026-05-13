"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "@solar-icons/react"
import type { BankIntegration, IntegrationStatus } from "@/data";
import { useIntegrationHealthStore } from "@/stores/integration-health";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  maintenance: "Maintenance",
};

const STATUS_DOT: Record<IntegrationStatus, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  outage: "bg-rose-500",
  maintenance: "bg-sky-500",
};

const STATUS_PRIORITY: IntegrationStatus[] = [
  "outage",
  "degraded",
  "maintenance",
  "operational",
];

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Integration health summary"
      className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 min-w-0"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Integration health
          </h2>
          <p className="text-xs text-zinc-500">Status across payment rails</p>
        </div>
        <Link
          href="/dashboard/integrations"
          className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          View all <ArrowRight size={15} className="ml-1 inline-block" />
        </Link>
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CountChip({
  status,
  count,
}: {
  status: IntegrationStatus;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      <span
        aria-hidden="true"
        className={cn("inline-block size-2 rounded-full", STATUS_DOT[status])}
      />
      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {count}
      </span>
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}

function RailCard({ integration }: { integration: BankIntegration }) {
  return (
    <li className="w-32 shrink-0 snap-start rounded-md border bg-white p-3 sm:w-40 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <span
          aria-hidden="true"
          className="inline-flex size-6 items-center justify-center rounded text-[10px] font-semibold text-white"
          style={{ backgroundColor: integration.brandColor }}
        >
          {integration.initials}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-2 rounded-full",
            STATUS_DOT[integration.status],
          )}
        />
      </div>
      <p className="mt-2 truncate text-sm font-medium" title={integration.name}>
        {integration.name}
      </p>
      <p className="text-xs text-zinc-500">
        <span className="sr-only">Status: </span>
        {STATUS_LABEL[integration.status]}
      </p>
      <p className="mt-1 text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
        {integration.successRate24h.toFixed(1)}%{" "}
        <span className="text-zinc-500">24h</span>
      </p>
    </li>
  );
}

function LoadingBody() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading integration health"
      className="space-y-3"
    >
      <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 w-32 shrink-0 animate-pulse rounded-md bg-zinc-100 sm:w-40 dark:bg-zinc-800"
          />
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

export function IntegrationHealthSummary() {
  const integrations = useIntegrationHealthStore((s) => s.integrations);
  const loading = useIntegrationHealthStore((s) => s.loading);
  const error = useIntegrationHealthStore((s) => s.error);
  const fetch = useIntegrationHealthStore((s) => s.fetch);

  useEffect(() => {
    if (integrations.length === 0 && !loading && !error) {
      void fetch();
    }
  }, [fetch, integrations.length, loading, error]);

  const counts = useMemo(() => {
    const acc: Record<IntegrationStatus, number> = {
      operational: 0,
      degraded: 0,
      outage: 0,
      maintenance: 0,
    };
    for (const i of integrations) acc[i.status]++;
    return acc;
  }, [integrations]);

  const sorted = useMemo(
    () =>
      [...integrations].sort(
        (a, b) =>
          STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status),
      ),
    [integrations],
  );

  if (loading && integrations.length === 0) {
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
  if (integrations.length === 0) {
    return (
      <SectionShell>
        <p className="text-sm text-zinc-500">No integrations configured yet.</p>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {(["operational", "degraded", "outage", "maintenance"] as const).map(
          (s) => (
            <CountChip key={s} status={s} count={counts[s]} />
          ),
        )}
      </div>

      <ul
        aria-label="Payment rails"
        className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1"
      >
        {sorted.map((i) => (
          <RailCard key={i.id} integration={i} />
        ))}
      </ul>
    </SectionShell>
  );
}
