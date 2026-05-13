"use client";

import { useEffect } from "react";

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

function formatLatency(ms: number) {
  if (ms === 0) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-2 py-1 text-xs font-medium dark:bg-zinc-900">
      <span
        aria-hidden="true"
        className={cn("inline-block size-2 rounded-full", STATUS_DOT[status])}
      />
      <span className="sr-only">Status: </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

function IntegrationCard({ integration }: { integration: BankIntegration }) {
  const openIncident = integration.incidents.find((i) => i.resolvedAt === null);
  return (
    <article
      aria-label={`${integration.name} integration health`}
      className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: integration.brandColor }}
          >
            {integration.initials}
          </span>
          <div>
            <h3 className="font-medium leading-tight">{integration.name}</h3>
            <p className="text-xs text-zinc-500">
              {integration.region} · {integration.currencies.join(", ")}
            </p>
          </div>
        </div>
        <StatusBadge status={integration.status} />
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Success 24h</dt>
          <dd className="font-medium tabular-nums">
            {integration.successRate24h.toFixed(2)}%
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">p95 latency</dt>
          <dd className="font-medium tabular-nums">
            {formatLatency(integration.latencyP95Ms)}
          </dd>
        </div>
      </dl>

      {openIncident ? (
        <p className="mt-3 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          <strong className="font-medium">Open incident:</strong>{" "}
          {openIncident.summary}
        </p>
      ) : null}
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading integrations"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-2 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
            <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="h-2 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-12 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <div className="space-y-2">
              <div className="h-2 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-12 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <p className="font-medium">No integrations configured</p>
      <p className="mt-1 text-sm text-zinc-500">
        When you connect rails, their health will show up here.
      </p>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950"
    >
      <p className="font-medium text-rose-900 dark:text-rose-100">
        Could not load integration health
      </p>
      <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center rounded-md bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-900 hover:bg-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-rose-900 dark:text-rose-100 dark:hover:bg-rose-800"
      >
        Try again
      </button>
    </div>
  );
}

export function IntegrationHealth() {
  const integrations = useIntegrationHealthStore((s) => s.integrations);
  const loading = useIntegrationHealthStore((s) => s.loading);
  const error = useIntegrationHealthStore((s) => s.error);
  const fetch = useIntegrationHealthStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  if (loading && integrations.length === 0) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => void fetch()} />;
  if (integrations.length === 0) return <EmptyState />;

  return (
    <section aria-label="Integration health">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((i) => (
          <IntegrationCard key={i.id} integration={i} />
        ))}
      </div>
    </section>
  );
}
