/** Compact latency string: "240ms", "2.30s". */
export const formatLatency = (ms: number): string => {
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(2)}s`;
  return `${ms}ms`;
};

/** Compact byte size: "240 B", "12.4 KB", "1.30 MB". */
export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

/** 24h time-of-day, e.g. "17:28:18". */
export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** Full locale date+time, e.g. "5/13/2026, 17:28:18". Use in titles/tooltips. */
export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", { hour12: false });

/**
 * Human-friendly relative time: "5m ago", "in 12m", "2h ago", "1d ago".
 * Falls back to "MMM D" for timestamps older than 7 days. Works for past
 * and future times — future renders as "in X".
 *
 * The `now` argument lets callers anchor against a stable reference (e.g.
 * the dataset snapshot) so screenshots and demos stay stable; defaults to
 * the wall clock.
 */
export const formatRelativeTime = (
  iso: string,
  now: Date | number | string = Date.now(),
): string => {
  const past = new Date(iso).getTime();
  const ref =
    typeof now === "number"
      ? now
      : now instanceof Date
        ? now.getTime()
        : new Date(now).getTime();

  const diffMs = ref - past;
  const absMs = Math.abs(diffMs);
  const future = diffMs < 0;

  const SECOND = 1_000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  if (absMs < 5 * SECOND) return "just now";

  let value: string;
  if (absMs < MINUTE) value = `${Math.round(absMs / SECOND)}s`;
  else if (absMs < HOUR) value = `${Math.round(absMs / MINUTE)}m`;
  else if (absMs < DAY) value = `${Math.round(absMs / HOUR)}h`;
  else if (absMs < WEEK) value = `${Math.round(absMs / DAY)}d`;
  else {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return future ? `in ${value}` : `${value} ago`;
};
