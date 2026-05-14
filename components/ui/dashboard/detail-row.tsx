import { cn } from "@/lib/utils";

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  /** Render the value in a mono font (for ids, paths, etc). */
  mono?: boolean;
}

/**
 * Label-value row used inside the request / delivery detail drawers.
 * Three-column grid: label takes 1 column, value spans 2.
 */
export const DetailRow = ({ label, value, mono }: DetailRowProps) => (
  <div className="grid grid-cols-3 gap-3 border-b py-2 last:border-b-0 dark:border-zinc-800">
    <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
    <dd className={cn("col-span-2 text-sm break-all", mono && "font-mono text-xs")}>
      {value}
    </dd>
  </div>
);
