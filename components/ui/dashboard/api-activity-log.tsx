"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ApiActivityEntry, ApiMethod } from "@/data";
import { useApiActivityStore } from "@/stores/api-activity";
import { cn } from "@/lib/utils";
import { compareSorted } from "@/lib/sort";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

import { SortableHeader, type SortDir } from "./sortable-header";

type StatusBucket = "all" | "2xx" | "4xx" | "5xx";
type EnvFilter = "all" | "production" | "sandbox";
type ActivitySortKey =
  | "time"
  | "method"
  | "endpoint"
  | "status"
  | "latency"
  | "rail";

const METHODS: ApiMethod[] = ["GET", "POST", "PATCH"];

const statusBucketOf = (code: number): "2xx" | "3xx" | "4xx" | "5xx" => {
  if (code >= 500) return "5xx";
  if (code >= 400) return "4xx";
  if (code >= 300) return "3xx";
  return "2xx";
};

const formatLatency = (ms: number): string => {
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(2)}s`;
  return `${ms}ms`;
};

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const activitySortValue = (
  e: ApiActivityEntry,
  key: ActivitySortKey,
): string | number | null => {
  switch (key) {
    case "time":     return e.timestamp;
    case "method":   return e.method;
    case "endpoint": return e.endpoint;
    case "status":   return e.statusCode;
    case "latency":  return e.latencyMs;
    case "rail":     return e.integrationName;
  }
};

const METHOD_CLASS: Record<ApiMethod, string> = {
  GET: "text-zinc-700 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200",
  POST: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300",
  PUT: "text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300",
  PATCH: "text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300",
  DELETE: "text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-300",
};

const MethodBadge = ({ method }: { method: ApiMethod }) => (
  <span
    className={cn(
      "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-tight",
      METHOD_CLASS[method],
    )}
  >
    {method}
  </span>
);

const StatusPill = ({ code }: { code: number }) => {
  const b = statusBucketOf(code);
  const cls =
    b === "2xx"
      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300"
      : b === "3xx"
        ? "text-sky-700 bg-sky-50 dark:bg-sky-950 dark:text-sky-300"
        : b === "4xx"
          ? "text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300"
          : "text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-300";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
        cls,
      )}
    >
      {code}
    </span>
  );
};

const FilterBar = ({
  search,
  setSearch,
  statusBucket,
  setStatusBucket,
  methods,
  toggleMethod,
  environment,
  setEnvironment,
  filteredCount,
  totalCount,
}: {
  search: string;
  setSearch: (v: string) => void;
  statusBucket: StatusBucket;
  setStatusBucket: (b: StatusBucket) => void;
  methods: Set<ApiMethod>;
  toggleMethod: (m: ApiMethod) => void;
  environment: EnvFilter;
  setEnvironment: (e: EnvFilter) => void;
  filteredCount: number;
  totalCount: number;
}) => (
  <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Search activity</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search endpoint, request id, sub-customer…"
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
        />
      </label>

      <fieldset
        className="flex items-center gap-1 rounded-md border bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="Filter by status"
      >
        <legend className="sr-only">Status</legend>
        {(["all", "2xx", "4xx", "5xx"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setStatusBucket(b)}
            aria-pressed={statusBucket === b}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium tabular-nums",
              statusBucket === b
                ? "bg-zinc-100 dark:bg-zinc-800"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
            )}
          >
            {b === "all" ? "All" : b}
          </button>
        ))}
      </fieldset>

      <fieldset
        className="flex items-center gap-1 rounded-md border bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="Filter by method"
      >
        <legend className="sr-only">Method</legend>
        {METHODS.map((m) => {
          const active = methods.has(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggleMethod(m)}
              aria-pressed={active}
              className={cn(
                "rounded px-2 py-1 font-mono text-[11px] font-semibold",
                active
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
              )}
            >
              {m}
            </button>
          );
        })}
      </fieldset>

      <fieldset
        className="flex items-center gap-1 rounded-md border bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="Filter by environment"
      >
        <legend className="sr-only">Environment</legend>
        {(["all", "production", "sandbox"] as const).map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEnvironment(e)}
            aria-pressed={environment === e}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium capitalize",
              environment === e
                ? "bg-zinc-100 dark:bg-zinc-800"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
            )}
          >
            {e === "all" ? "All" : e}
          </button>
        ))}
      </fieldset>
    </div>

    <p
      className="text-xs text-zinc-500 tabular-nums whitespace-nowrap"
      aria-live="polite"
    >
      {filteredCount} of {totalCount}
    </p>
  </div>
);

const ActivityTable = ({
  entries,
  onSelect,
  sortKey,
  sortDir,
  onSort,
}: {
  entries: ApiActivityEntry[];
  onSelect: (e: ApiActivityEntry) => void;
  sortKey: ActivitySortKey;
  sortDir: SortDir;
  onSort: (key: ActivitySortKey) => void;
}) => (
  <div className="overflow-x-auto rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <table className="min-w-full text-sm">
      <thead className="border-b bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        <tr>
          <SortableHeader columnKey="time"     label="Time"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <SortableHeader columnKey="method"   label="Method"   sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <SortableHeader columnKey="endpoint" label="Endpoint" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <SortableHeader columnKey="status"   label="Status"   sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <SortableHeader columnKey="latency"  label="Latency"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} thClassName="hidden md:table-cell" />
          <SortableHeader columnKey="rail"     label="Rail"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} thClassName="hidden md:table-cell" />
          <th scope="col" className="px-3 py-2 text-right">
            <span className="sr-only">Inspect</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y dark:divide-zinc-800">
        {entries.map((e) => (
          <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
              <time dateTime={e.timestamp} title={formatDateTime(e.timestamp)}>
                {formatRelativeTime(e.timestamp)}
              </time>
            </td>
            <td className="whitespace-nowrap px-3 py-2">
              <MethodBadge method={e.method} />
            </td>
            <td className="px-3 py-2 font-mono text-xs">
              <span className="block max-w-[28rem] truncate" title={e.endpoint}>
                {e.endpoint}
              </span>
            </td>
            <td className="whitespace-nowrap px-3 py-2">
              <StatusPill code={e.statusCode} />
            </td>
            <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-600 tabular-nums md:table-cell dark:text-zinc-400">
              {formatLatency(e.latencyMs)}
            </td>
            <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-600 md:table-cell dark:text-zinc-400">
              {e.integrationName ?? "—"}
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-right">
              <button
                type="button"
                onClick={() => onSelect(e)}
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Inspect<span className="sr-only"> request {e.requestId}</span>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DetailRow = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="grid grid-cols-3 gap-3 border-b py-2 last:border-b-0 dark:border-zinc-800">
    <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
    <dd className={cn("col-span-2 text-sm break-all", mono && "font-mono text-xs")}>{value}</dd>
  </div>
);

const DetailPanel = ({
  entry,
  onClose,
}: {
  entry: ApiActivityEntry;
  onClose: () => void;
}) => (
  <div className="flex h-full flex-col">
    <header className="flex items-start justify-between border-b p-4 dark:border-zinc-800">
      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Request</p>
        <p className="mt-1 font-mono text-sm break-all">{entry.requestId}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close request detail"
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-4">
          <path
            fillRule="evenodd"
            d="M5.21 4.21a1 1 0 011.42 0L10 7.58l3.37-3.37a1 1 0 011.42 1.42L11.42 9l3.37 3.37a1 1 0 01-1.42 1.42L10 10.42l-3.37 3.37a1 1 0 01-1.42-1.42L8.58 9 5.21 5.63a1 1 0 010-1.42z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </header>

    <div className="flex-1 overflow-y-auto p-4">
      <dl>
        <DetailRow label="When" value={formatDateTime(entry.timestamp)} />
        <DetailRow
          label="Endpoint"
          mono
          value={
            <>
              <div>
                <MethodBadge method={entry.method} />
                <span className="ml-1">{entry.endpoint}</span>
              </div>
              {entry.endpointResolved !== entry.endpoint ? (
                <div className="mt-1 text-zinc-500">{entry.endpointResolved}</div>
              ) : null}
            </>
          }
        />
        <DetailRow
          label="Status"
          value={
            <span className="inline-flex items-center gap-2">
              <StatusPill code={entry.statusCode} />
              <span className="text-zinc-500">· {formatLatency(entry.latencyMs)}</span>
            </span>
          }
        />
        <DetailRow label="Environment" value={<span className="capitalize">{entry.environment}</span>} />
        <DetailRow
          label="API key"
          value={
            <span>
              {entry.apiKeyLabel}{" "}
              <span className="font-mono text-xs text-zinc-500">({entry.apiKeyPreview})</span>
            </span>
          }
        />
        {entry.integrationName ? <DetailRow label="Rail" value={entry.integrationName} /> : null}
        {entry.subCustomerId ? <DetailRow label="Sub-customer" mono value={entry.subCustomerId} /> : null}
        {entry.idempotencyKey ? <DetailRow label="Idempotency key" mono value={entry.idempotencyKey} /> : null}
        <DetailRow label="Client IP" mono value={entry.clientIp} />
        <DetailRow label="User agent" mono value={entry.userAgent} />
        <DetailRow label="Response size" value={formatBytes(entry.responseBytes)} />
        {entry.errorMessage ? (
          <DetailRow
            label="Error"
            value={
              <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {entry.errorCode ? (
                  <span className="font-mono font-semibold">{entry.errorCode} · </span>
                ) : null}
                {entry.errorMessage}
              </div>
            }
          />
        ) : null}
      </dl>
    </div>
  </div>
);

const LoadingTable = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading activity"
    className="rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-950"
  >
    <div className="space-y-2 p-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-10 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 flex-1 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="hidden h-3 w-16 animate-pulse rounded bg-zinc-100 md:block dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <div className="rounded-xl border border-dashed bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
    <p className="font-medium">
      {filtered ? "No requests match these filters" : "No activity yet"}
    </p>
    <p className="mt-1 text-sm text-zinc-500">
      {filtered
        ? "Try clearing the search or widening the status filter."
        : "When clients hit the API, requests will show up here."}
    </p>
  </div>
);

const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div
    role="alert"
    className="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950"
  >
    <p className="font-medium text-rose-900 dark:text-rose-100">
      Could not load activity
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

export const ApiActivityLog = () => {
  const entries = useApiActivityStore((s) => s.entries);
  const loading = useApiActivityStore((s) => s.loading);
  const error = useApiActivityStore((s) => s.error);
  const fetch = useApiActivityStore((s) => s.fetch);

  const [search, setSearch] = useState("");
  const [statusBucket, setStatusBucket] = useState<StatusBucket>("all");
  const [methods, setMethods] = useState<Set<ApiMethod>>(new Set());
  const [environment, setEnvironment] = useState<EnvFilter>("all");

  const [sortKey, setSortKey] = useState<ActivitySortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [selected, setSelected] = useState<ApiActivityEntry | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const onSort = (key: ActivitySortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const toggleMethod = (m: ApiMethod) => {
    setMethods((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const openDetail = (e: ApiActivityEntry) => {
    setSelected(e);
    dialogRef.current?.showModal();
  };
  const closeDetail = () => {
    dialogRef.current?.close();
    setSelected(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusBucket !== "all" && statusBucketOf(e.statusCode) !== statusBucket) return false;
      if (methods.size > 0 && !methods.has(e.method)) return false;
      if (environment !== "all" && e.environment !== environment) return false;
      if (q) {
        const hay = [
          e.endpoint,
          e.endpointResolved,
          e.requestId,
          e.subCustomerId,
          e.idempotencyKey,
          e.apiKeyPreview,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, statusBucket, methods, environment]);

  const sorted = useMemo(
    () => compareSorted(filtered, (e) => activitySortValue(e, sortKey), sortDir),
    [filtered, sortKey, sortDir],
  );

  if (loading && entries.length === 0) {
    return (
      <section aria-label="API activity">
        <LoadingTable />
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label="API activity">
        <ErrorState error={error} onRetry={() => void fetch()} />
      </section>
    );
  }

  const isFiltered =
    search.trim() !== "" ||
    statusBucket !== "all" ||
    methods.size > 0 ||
    environment !== "all";

  return (
    <section aria-label="API activity">
      <FilterBar
        search={search}
        setSearch={setSearch}
        statusBucket={statusBucket}
        setStatusBucket={setStatusBucket}
        methods={methods}
        toggleMethod={toggleMethod}
        environment={environment}
        setEnvironment={setEnvironment}
        filteredCount={filtered.length}
        totalCount={entries.length}
      />
      {filtered.length === 0 ? (
        <EmptyState filtered={isFiltered} />
      ) : (
        <ActivityTable
          entries={sorted}
          onSelect={openDetail}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
        />
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setSelected(null)}
        className="m-0 ml-auto h-screen w-full max-w-md border-l bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      >
        {selected ? (
          <DetailPanel entry={selected} onClose={closeDetail} />
        ) : null}
      </dialog>
    </section>
  );
};
