"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ApiActivityEntry, ApiEndpointDoc, ApiMethod } from "@/data";
import { endpointDocsByPath } from "@/data";
import { useApiActivityStore } from "@/stores/api-activity";
import { cn } from "@/lib/utils";
import { compareSorted } from "@/lib/sort";
import {
  formatBytes,
  formatDateTime,
  formatLatency,
  formatRelativeTime,
} from "@/lib/format";

import { DetailRow } from "./detail-row";
import { EndpointDocsDrawer } from "./endpoint-docs-drawer";
import { MethodBadge } from "./method-badge";
import { Pagination } from "./pagination";
import { SortableHeader, type SortDir } from "./sortable-header";
import { StatusPill } from "./status-pill";
import { EmptyPanel, ErrorPanel } from "./state";

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

const activitySortValue = (
  e: ApiActivityEntry,
  key: ActivitySortKey,
): string | number | null => {
  switch (key) {
    case "time": return e.timestamp;
    case "method": return e.method;
    case "endpoint": return e.endpoint;
    case "status": return e.statusCode;
    case "latency": return e.latencyMs;
    case "rail": return e.integrationName;
  }
};

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

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Reset to first page whenever the filter narrows or widens the result set.
  // Pattern: derive from filter key, compare-on-render, setState only if
  // changed. Avoids the `setState-in-effect` cascade.
  const filtersKey = `${search}|${statusBucket}|${[...methods].sort().join(",")}|${environment}`;
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(0);
  }

  const [selected, setSelected] = useState<ApiActivityEntry | null>(null);
  const [docDrawer, setDocDrawer] = useState<ApiEndpointDoc | null>(null);
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
    if (entries.length === 0 && !loading && !error) {
      void fetch();
    }
  }, [fetch, entries.length, loading, error]);

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
  const showDocs = (doc: ApiEndpointDoc) => setDocDrawer(doc);
  const hideDocs = () => setDocDrawer(null);

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

  // Clamp page if filters/sort shrunk the set below our current offset.
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => sorted.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [sorted, safePage, pageSize],
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
        <ErrorPanel
          title="Could not load activity"
          error={error}
          onRetry={() => void fetch()}
        />
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
        <ActivityEmpty filtered={isFiltered} />
      ) : (
        <ActivityTable
          entries={paginated}
          onSelect={openDetail}
          onShowDocs={showDocs}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          page={safePage}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDetail();
        }}
        className="inset-4 m-auto max-h-[calc(100dvh-2rem)] max-w-md rounded-xl border bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:m-0 sm:h-dvh sm:max-h-none sm:w-full sm:rounded-none sm:border-l"
      >
        {selected ? (
          <DetailPanel entry={selected} onClose={closeDetail} />
        ) : null}
      </dialog>

      <EndpointDocsDrawer doc={docDrawer} onClose={hideDocs} />
    </section>
  );
};

const InfoButton = ({
  endpoint,
  onClick,
}: {
  endpoint: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`View documentation for ${endpoint}`}
    title={`View documentation for ${endpoint}`}
    className="inline-flex shrink-0 rounded-md p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
  >
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-3.5">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9zm0-3a1 1 0 102 0 1 1 0 00-2 0z"
        clipRule="evenodd"
      />
    </svg>
  </button>
);

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
  onShowDocs,
  sortKey,
  sortDir,
  onSort,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  entries: ApiActivityEntry[];
  onSelect: (e: ApiActivityEntry) => void;
  onShowDocs: (doc: ApiEndpointDoc) => void;
  sortKey: ActivitySortKey;
  sortDir: SortDir;
  onSort: (key: ActivitySortKey) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => (
  <div className="rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <div className="overflow-auto">
      <table className="relative min-w-full text-sm">
        <thead className="border-b bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <SortableHeader columnKey="time" label="Time" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader columnKey="method" label="Method" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader columnKey="endpoint" label="Endpoint" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader columnKey="status" label="Status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader columnKey="latency" label="Latency" sortKey={sortKey} sortDir={sortDir} onSort={onSort} thClassName="hidden md:table-cell" />
            <SortableHeader columnKey="rail" label="Rail" sortKey={sortKey} sortDir={sortDir} onSort={onSort} thClassName="hidden md:table-cell" />
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
                <div className="flex items-center gap-1.5">
                  <span className="block max-w-104 truncate" title={e.endpoint}>
                    {e.endpoint}
                  </span>
                  {endpointDocsByPath[e.endpoint] ? (
                    <InfoButton
                      endpoint={e.endpoint}
                      onClick={() => onShowDocs(endpointDocsByPath[e.endpoint])}
                    />
                  ) : null}
                </div>
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
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      className="border-t dark:border-zinc-800"
    />
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
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:hover:bg-zinc-800"
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

const ActivityEmpty = ({ filtered }: { filtered: boolean }) => (
  <EmptyPanel
    title={filtered ? "No requests match these filters" : "No activity yet"}
    description={
      filtered
        ? "Try clearing the search or widening the status filter."
        : "When clients hit the API, requests will show up here."
    }
  />
);
