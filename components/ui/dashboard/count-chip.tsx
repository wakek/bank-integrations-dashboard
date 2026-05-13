import { cn } from "@/lib/utils";

interface CountChipProps {
  /** Tailwind background-color class for the dot, e.g. "bg-emerald-500". */
  dotClass: string;
  count: number;
  label: string;
}

/**
 * Compact "● 9 operational" chip used by summary headers to convey
 * status distribution at a glance.
 */
export const CountChip = ({ dotClass, count, label }: CountChipProps) => {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      <span
        aria-hidden="true"
        className={cn("inline-block size-2 rounded-full", dotClass)}
      />
      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {count}
      </span>
      <span>{label}</span>
    </span>
  );
};
