interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Inline error block used inside SectionShell when a fetch fails.
 * Visually small — fits in a summary card.
 */
export const ErrorState = ({ error, onRetry }: ErrorStateProps) => (
  <div role="alert" className="text-sm">
    <p className="text-rose-700 dark:text-rose-300">{error}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-2 inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-900 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-rose-950 dark:text-rose-100 dark:hover:bg-rose-900"
    >
      Try again
    </button>
  </div>
);

interface ErrorPanelProps {
  title: string;
  error: string;
  onRetry: () => void;
}

/**
 * Card-style error state used by full-page widgets when the load fails.
 * Larger than ErrorState — meant to occupy the area a table would.
 */
export const ErrorPanel = ({ title, error, onRetry }: ErrorPanelProps) => (
  <div
    role="alert"
    className="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950"
  >
    <p className="font-medium text-rose-900 dark:text-rose-100">{title}</p>
    <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{error}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 inline-flex items-center rounded-md bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-900 hover:bg-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-rose-900 dark:text-rose-100 dark:hover:bg-rose-800"
    >
      Try again
    </button>
  </div>
);

interface EmptyPanelProps {
  title: string;
  description: string;
}

/**
 * Card-style empty state used by full-page widgets when no rows match
 * (either no data, or filtered down to zero).
 */
export const EmptyPanel = ({ title, description }: EmptyPanelProps) => (
  <div className="rounded-xl border border-dashed bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
    <p className="font-medium">{title}</p>
    <p className="mt-1 text-sm text-zinc-500">{description}</p>
  </div>
);
