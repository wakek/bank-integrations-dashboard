import type { ApiMethod } from "@/data";
import { cn } from "@/lib/utils";

export const METHOD_CLASS: Record<ApiMethod, string> = {
  GET: "text-zinc-700 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200",
  POST: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300",
  PUT: "text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300",
  PATCH: "text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300",
  DELETE: "text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-300",
};

/** Small monospace badge showing the HTTP method, color-coded. */
export const MethodBadge = ({ method }: { method: ApiMethod }) => (
  <span
    className={cn(
      "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-tight",
      METHOD_CLASS[method],
    )}
  >
    {method}
  </span>
);
