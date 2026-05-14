"use client";

import { useEffect, useMemo } from "react";

import type { BankIntegration, IntegrationStatus } from "@/data";
import { useIntegrationHealthStore } from "@/stores/integration-health";
import { cn } from "@/lib/utils";

import { CountChip } from "./count-chip";
import { SectionShell } from "./section-shell";
import { ErrorState } from "./state";

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

const Shell = ({ children }: { children: React.ReactNode }) => (
  <SectionShell
    ariaLabel="Integration health summary"
    title="Integration health"
    subtitle="Status across payment rails"
    viewAllHref="/dashboard/integrations"
  >
    {children}
  </SectionShell>
);

export const IntegrationHealthSummary = () => {
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
  if (integrations.length === 0) {
    return (
      <Shell>
        <p className="text-sm text-zinc-500">No integrations configured yet.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {(["operational", "degraded", "outage", "maintenance"] as const).map(
          (s) => (
            <CountChip
              key={s}
              dotClass={STATUS_DOT[s]}
              count={counts[s]}
              label={STATUS_LABEL[s]}
            />
          ),
        )}
      </div>

      <div
        aria-label="Payment rails"
        className="relative mt-3 flex flex-row snap-x gap-2 overflow-x-auto pb-1"
      >
        {sorted.map((i) => (
          <RailCard key={i.id} integration={i} />
        ))}
      </div>
    </Shell>
  );
};

const RailCard = ({ integration }: { integration: BankIntegration }) => {
  return (
    <div className="w-32 shrink-0 snap-start rounded-md border bg-white p-3 sm:w-40 dark:border-zinc-800 dark:bg-zinc-950">
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
    </div>
  );
};

const LoadingBody = () => {
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
};
