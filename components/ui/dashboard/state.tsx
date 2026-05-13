interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Inline error block used inside SectionShell when a fetch fails.
 * Visually small — fits in a summary card.
 */
export const ErrorState = ({ error, onRetry }: ErrorStateProps) => {
  return (
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
};
