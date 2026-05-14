"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  WebhookAttempt,
  WebhookDelivery,
  WebhookEventType,
  WebhookStatus,
} from "@/data";
import { useWebhooksStore } from "@/stores/webhooks";
import { cn } from "@/lib/utils";
import { compareSorted } from "@/lib/sort";
import {
  formatBytes,
  formatDateTime,
  formatLatency,
  formatRelativeTime,
  formatTime,
} from "@/lib/format";

import { DetailRow } from "./detail-row";
import { Pagination } from "./pagination";
import { SortableHeader, type SortDir } from "./sortable-header";
import { EmptyPanel, ErrorPanel } from "./state";

type StatusFilter = "all" | WebhookStatus;
type EnvFilter = "all" | "production" | "sandbox";
type WebhookSortKey =
  | "time"
  | "event"
  | "destination"
  | "status"
  | "attempts"
  | "nextRetry";

const webhookSortValue = (
  d: WebhookDelivery,
  key: WebhookSortKey,
): string | number | null => {
  switch (key) {
    case "time": return d.firstAttemptAt;
    case "event": return d.eventType;
    case "destination": return d.destinationUrl;
    case "status": return d.status;
    case "attempts": return d.attemptCount;
    case "nextRetry": return d.nextRetryAt;
  }
};

const EVENT_TYPES: WebhookEventType[] = [
  "transaction.pay_in",
  "transaction.status_updated",
  "virtual_account.status_updated",
  "subcustomer.kyc_status_updated",
  "subcustomer.kyc_submission_feedback",
  "subcustomer.wallet.created",
  "subcustomer.wallet.failed",
];

const STATUS_LABEL: Record<WebhookStatus, string> = {
  delivered: "Delivered",
  retrying: "Retrying",
  failed: "Failed",
  pending: "Pending",
};

const STATUS_PILL: Record<WebhookStatus, string> = {
  delivered: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300",
  retrying: "text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300",
  failed: "text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-300",
  pending: "text-zinc-700 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300",
};

const STATUS_DOT: Record<WebhookStatus, string> = {
  delivered: "bg-emerald-500",
  retrying: "bg-amber-500",
  failed: "bg-rose-500",
  pending: "bg-zinc-400",
};


export const WebhookAttempts = () => {
  const deliveries = useWebhooksStore((s) => s.deliveries);
  const loading = useWebhooksStore((s) => s.loading);
  const error = useWebhooksStore((s) => s.error);
  const fetch = useWebhooksStore((s) => s.fetch);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventType, setEventType] = useState<WebhookEventType | "all">("all");
  const [environment, setEnvironment] = useState<EnvFilter>("all");

  const [sortKey, setSortKey] = useState<WebhookSortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Reset to first page whenever filters change (derive-from-key pattern
  // so we don't synchronously setState inside an effect).
  const filtersKey = `${search}|${statusFilter}|${eventType}|${environment}`;
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(0);
  }

  const [selected, setSelected] = useState<WebhookDelivery | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const onSort = (key: WebhookSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    if (deliveries.length === 0 && !loading && !error) {
      void fetch();
    }
  }, [fetch]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (eventType !== "all" && d.eventType !== eventType) return false;
      if (environment !== "all" && d.environment !== environment) return false;
      if (q) {
        const hay = [
          d.eventType,
          d.destinationUrl,
          d.resourceId,
          d.eventId,
          d.integrationName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deliveries, search, statusFilter, eventType, environment]);

  const sorted = useMemo(
    () => compareSorted(filtered, (d) => webhookSortValue(d, sortKey), sortDir),
    [filtered, sortKey, sortDir],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => sorted.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [sorted, safePage, pageSize],
  );

  const openDetail = (d: WebhookDelivery) => {
    setSelected(d);
    dialogRef.current?.showModal();
  };
  const closeDetail = () => {
    dialogRef.current?.close();
    setSelected(null);
  };
  const toggleStatusFilter = (s: WebhookStatus) => {
    setStatusFilter((cur) => (cur === s ? "all" : s));
  };

  if (loading && deliveries.length === 0) {
    return (
      <section aria-label="Webhook deliveries">
        <LoadingTable />
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label="Webhook deliveries">
        <ErrorPanel
          title="Could not load webhook deliveries"
          error={error}
          onRetry={() => void fetch()}
        />
      </section>
    );
  }

  const isFiltered =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    eventType !== "all" ||
    environment !== "all";

  return (
    <section aria-label="Webhook deliveries">
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["delivered", "retrying", "failed", "pending"] as const).map((s) => (
          <StatusTile
            key={s}
            status={s}
            count={counts[s]}
            active={statusFilter === s}
            onClick={() => toggleStatusFilter(s)}
          />
        ))}
      </div>

      <FilterBar
        search={search}
        setSearch={setSearch}
        eventType={eventType}
        setEventType={setEventType}
        environment={environment}
        setEnvironment={setEnvironment}
        filteredCount={filtered.length}
        totalCount={deliveries.length}
      />

      {filtered.length === 0 ? (
        <WebhooksEmpty filtered={isFiltered} />
      ) : (
        <DeliveriesTable
          deliveries={paginated}
          onSelect={openDetail}
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
        {selected ? <DetailPanel delivery={selected} onClose={closeDetail} /> : null}
      </dialog>
    </section>
  );
};

const StatusPill = ({ status }: { status: WebhookStatus }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold",
      STATUS_PILL[status],
    )}
  >
    <span aria-hidden="true" className={cn("inline-block size-1.5 rounded-full", STATUS_DOT[status])} />
    {STATUS_LABEL[status]}
  </span>
);

const dotColorForAttempt = (a: WebhookAttempt): string => {
  const code = a.responseStatusCode;
  if (code === null) return "bg-zinc-300 dark:bg-zinc-700";
  if (code >= 200 && code < 300) return "bg-emerald-500";
  if (code >= 300 && code < 400) return "bg-sky-500";
  if (code >= 400 && code < 500) return "bg-amber-500";
  return "bg-rose-500";
};

const attemptLabel = (a: WebhookAttempt): string => {
  const status = a.responseStatusCode === null ? "no response" : `HTTP ${a.responseStatusCode}`;
  const lat = a.responseTimeMs === null ? "" : ` · ${formatLatency(a.responseTimeMs)}`;
  return `Attempt ${a.attemptNumber} · ${status}${lat}`;
};

const RetryDots = ({
  attempts,
  maxAttempts,
}: {
  attempts: WebhookAttempt[];
  maxAttempts: number;
}) => {
  const placeholders = Math.max(0, maxAttempts - attempts.length);
  return (
    <div
      role="img"
      aria-label={`${attempts.length} of up to ${maxAttempts} attempts`}
      className="inline-flex items-center gap-0.5"
    >
      {attempts.map((a) => (
        <span
          key={a.attemptNumber}
          title={attemptLabel(a)}
          className={cn("inline-block size-1.5 rounded-full", dotColorForAttempt(a))}
        />
      ))}
      {Array.from({ length: placeholders }).map((_, i) => (
        <span
          key={`p${i}`}
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
};

const StatusTile = ({
  status,
  count,
  active,
  onClick,
}: {
  status: WebhookStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "flex flex-1 flex-col items-start rounded-xl border bg-white p-4 text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950",
      active && "ring-2 ring-zinc-400 dark:ring-zinc-500",
    )}
  >
    <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
      <span aria-hidden="true" className={cn("inline-block size-2 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
    <span className="mt-2 text-2xl font-semibold tabular-nums">{count}</span>
  </button>
);

const FilterBar = ({
  search,
  setSearch,
  eventType,
  setEventType,
  environment,
  setEnvironment,
  filteredCount,
  totalCount,
}: {
  search: string;
  setSearch: (v: string) => void;
  eventType: WebhookEventType | "all";
  setEventType: (v: WebhookEventType | "all") => void;
  environment: EnvFilter;
  setEnvironment: (e: EnvFilter) => void;
  filteredCount: number;
  totalCount: number;
}) => (
  <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Search deliveries</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search event, destination, resource id…"
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="sr-only md:not-sr-only">Event</span>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as WebhookEventType | "all")}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <option value="all">All events</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

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

const DeliveriesTable = ({
  deliveries,
  onSelect,
  sortKey,
  sortDir,
  onSort,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  deliveries: WebhookDelivery[];
  onSelect: (d: WebhookDelivery) => void;
  sortKey: WebhookSortKey;
  sortDir: SortDir;
  onSort: (key: WebhookSortKey) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => (
  <div className="rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <SortableHeader columnKey="time" label="Time" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader columnKey="event" label="Event" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader columnKey="destination" label="Destination" sortKey={sortKey} sortDir={sortDir} onSort={onSort} thClassName="hidden md:table-cell" />
            <SortableHeader columnKey="status" label="Status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader columnKey="attempts" label="Attempts" sortKey={sortKey} sortDir={sortDir} onSort={onSort} thClassName="hidden lg:table-cell" />
            <SortableHeader columnKey="nextRetry" label="Next retry" sortKey={sortKey} sortDir={sortDir} onSort={onSort} thClassName="hidden lg:table-cell" />
            <th scope="col" className="px-3 py-2 text-right">
              <span className="sr-only">Inspect</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-zinc-800">
          {deliveries.map((d) => (
            <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                <time
                  dateTime={d.firstAttemptAt}
                  title={formatDateTime(d.firstAttemptAt)}
                >
                  {formatRelativeTime(d.firstAttemptAt)}
                </time>
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                <span className="block max-w-[16rem] truncate" title={d.eventType}>
                  {d.eventType}
                </span>
              </td>
              <td className="hidden px-3 py-2 text-xs text-zinc-600 md:table-cell dark:text-zinc-400">
                <span className="block max-w-[22rem] truncate" title={d.destinationUrl}>
                  {d.destinationUrl}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <StatusPill status={d.status} />
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">
                <div className="flex items-center gap-2">
                  <RetryDots attempts={d.attempts} maxAttempts={d.maxAttempts} />
                  <span className="text-xs tabular-nums text-zinc-500">
                    {d.attemptCount}/{d.maxAttempts}
                  </span>
                </div>
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2 text-xs text-zinc-500 lg:table-cell">
                {d.nextRetryAt ? (
                  <time
                    dateTime={d.nextRetryAt}
                    title={formatDateTime(d.nextRetryAt)}
                  >
                    {formatRelativeTime(d.nextRetryAt)}
                  </time>
                ) : (
                  "—"
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onSelect(d)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Inspect<span className="sr-only"> delivery {d.id}</span>
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

const AttemptHistory = ({ attempts }: { attempts: WebhookAttempt[] }) => {
  if (attempts.length === 0) {
    return (
      <p className="text-xs text-zinc-500">No attempts yet — delivery is queued.</p>
    );
  }
  return (
    <ol className="divide-y rounded-md border dark:divide-zinc-800 dark:border-zinc-800">
      {attempts.map((a) => {
        const ok =
          a.responseStatusCode !== null &&
          a.responseStatusCode >= 200 &&
          a.responseStatusCode < 300;
        return (
          <li key={a.attemptNumber} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 p-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold tabular-nums dark:bg-zinc-800">
              {a.attemptNumber}
            </span>
            <div>
              <p className="font-mono text-xs">
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    dotColorForAttempt(a),
                  )}
                  aria-hidden="true"
                />{" "}
                {a.responseStatusCode === null ? "No response" : `HTTP ${a.responseStatusCode}`}
                {a.responseTimeMs !== null ? (
                  <span className="text-zinc-500"> · {formatLatency(a.responseTimeMs)}</span>
                ) : null}
              </p>
              {!ok && a.errorMessage ? (
                <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                  {a.errorCode ? (
                    <span className="font-mono font-semibold">{a.errorCode} · </span>
                  ) : null}
                  {a.errorMessage}
                </p>
              ) : null}
            </div>
            <span className="whitespace-nowrap text-xs text-zinc-500 tabular-nums">
              {formatTime(a.attemptedAt)}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const DetailPanel = ({
  delivery,
  onClose,
}: {
  delivery: WebhookDelivery;
  onClose: () => void;
}) => (
  <div className="flex h-full flex-col">
    <header className="flex items-start justify-between border-b p-4 dark:border-zinc-800">
      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Event</p>
        <p className="mt-1 font-mono text-sm break-all">{delivery.eventType}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close delivery detail"
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
        <DetailRow label="Status" value={<StatusPill status={delivery.status} />} />
        <DetailRow label="Event id" mono value={delivery.eventId} />
        <DetailRow label="Resource id" mono value={delivery.resourceId} />
        <DetailRow label="Resource updated" value={formatDateTime(delivery.resourceUpdatedAt)} />
        <DetailRow label="Destination" mono value={delivery.destinationUrl} />
        {delivery.integrationName ? <DetailRow label="Rail" value={delivery.integrationName} /> : null}
        <DetailRow label="Environment" value={<span className="capitalize">{delivery.environment}</span>} />
        <DetailRow label="Signature" value={`Version ${delivery.signatureVersion}`} />
        <DetailRow label="Payload size" value={formatBytes(delivery.payloadBytes)} />
        <DetailRow label="First attempt" value={formatDateTime(delivery.firstAttemptAt)} />
        <DetailRow label="Last attempt" value={formatDateTime(delivery.lastAttemptAt)} />
        {delivery.nextRetryAt ? (
          <DetailRow label="Next retry" value={formatDateTime(delivery.nextRetryAt)} />
        ) : null}
      </dl>

      <h3 className="mt-6 mb-2 text-xs uppercase tracking-wide text-zinc-500">
        Attempts ({delivery.attemptCount}/{delivery.maxAttempts})
      </h3>
      <AttemptHistory attempts={delivery.attempts} />

      <h3 className="mt-6 mb-2 text-xs uppercase tracking-wide text-zinc-500">Payload</h3>
      <pre className="overflow-x-auto rounded-md bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-900">
        {delivery.payloadPreview}
      </pre>
    </div>
  </div>
);

const LoadingTable = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading webhooks"
    className="rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-950"
  >
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 flex-1 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="hidden h-3 w-20 animate-pulse rounded bg-zinc-100 md:block dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  </div>
);

const WebhooksEmpty = ({ filtered }: { filtered: boolean }) => (
  <EmptyPanel
    title={filtered ? "No deliveries match these filters" : "No webhook deliveries yet"}
    description={
      filtered
        ? "Try clearing the search or widening the status filter."
        : "When events are emitted, delivery attempts will show up here."
    }
  />
);
