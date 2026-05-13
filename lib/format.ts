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
