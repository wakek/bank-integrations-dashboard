import type { SortDir } from "@/components/ui/dashboard/sortable-header";

/**
 * Returns a copy of `arr` sorted by the value returned from `getValue`.
 * Nulls always sort to the bottom regardless of direction.
 */
export const compareSorted = <T>(
  arr: T[],
  getValue: (item: T) => string | number | null,
  dir: SortDir,
): T[] => {
  const factor = dir === "asc" ? 1 : -1;
  return [...arr].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    return 0;
  });
};
