import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

interface SortableHeaderProps<K extends string> {
  columnKey: K;
  label: string;
  sortKey: K | null;
  sortDir: SortDir;
  onSort: (key: K) => void;
  /** Visual alignment of the header inside its cell. */
  align?: "left" | "right";
  /** Extra Tailwind classes merged onto the th (e.g. responsive hide). */
  thClassName?: string;
}

/**
 * Clickable column header used by data tables. Toggles sort direction
 * when clicked on the active column; otherwise sets the column active.
 *
 * Renders `aria-sort` on the th and a small arrow indicator on the
 * active column. The whole header is a button, so keyboard nav and
 * screen-reader announcements work without extra wiring.
 */
export const SortableHeader = <K extends string>({
  columnKey,
  label,
  sortKey,
  sortDir,
  onSort,
  align = "left",
  thClassName,
}: SortableHeaderProps<K>) => {
  const active = sortKey === columnKey;
  const ariaSort: "ascending" | "descending" | "none" = active
    ? sortDir === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th scope="col" aria-sort={ariaSort} className={cn("font-medium", thClassName)}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "inline-flex w-full items-center gap-1 px-3 py-2 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:hover:text-zinc-100",
          align === "right" && "justify-end text-right",
        )}
      >
        {label}
        <span
          aria-hidden="true"
          className={cn(
            "inline-block w-3 text-center text-zinc-400",
            !active && "opacity-0 group-hover:opacity-100",
          )}
        >
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
};
