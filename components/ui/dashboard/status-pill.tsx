import { cn } from "@/lib/utils";

const colorFor = (code: number): string => {
  if (code >= 500) return "text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-300";
  if (code >= 400) return "text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300";
  if (code >= 300) return "text-sky-700 bg-sky-50 dark:bg-sky-950 dark:text-sky-300";
  return "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300";
};

/** Color-coded HTTP status pill (e.g. "200" green, "404" amber, "504" red). */
export const StatusPill = ({ code }: { code: number }) => (
  <span
    className={cn(
      "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
      colorFor(code),
    )}
  >
    {code}
  </span>
);
