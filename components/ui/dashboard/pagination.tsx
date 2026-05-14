import { cn } from "@/lib/utils";

interface PaginationProps {
  /** Zero-indexed current page. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Page-size choices. Hidden if `onPageSizeChange` is omitted. */
  pageSizes?: number[];
  /** Extra Tailwind classes on the outer container. */
  className?: string;
}

const PAGE_SIZES_DEFAULT = [10, 25, 50, 100];

/**
 * Compact pagination control: range indicator + per-page selector +
 * prev/next buttons + page-of-total. Designed to sit under a table.
 */
export const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = PAGE_SIZES_DEFAULT,
  className,
}: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400",
        className,
      )}
    >
      <p className="tabular-nums" aria-live="polite">
        <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
          {start}–{end}
        </span>{" "}
        of {total}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5">
            <span className="sr-only sm:not-sr-only">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-xs focus:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            className="inline-flex h-7 items-center rounded-md px-2 font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ‹ Prev
          </button>
          <span className="px-2 tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            className="inline-flex h-7 items-center rounded-md px-2 font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Next ›
          </button>
        </div>
      </div>
    </nav>
  );
};
