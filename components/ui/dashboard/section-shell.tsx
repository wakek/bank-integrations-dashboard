import Link from "next/link";
import { ArrowRight } from "@solar-icons/react";

import { cn } from "@/lib/utils";

interface SectionShellProps {
  ariaLabel: string;
  title: string;
  subtitle: string;
  viewAllHref: string;
  children: React.ReactNode;
  /** Extra Tailwind classes merged onto the section (e.g. "h-full"). */
  className?: string;
}

export const SectionShell = ({
  ariaLabel,
  title,
  subtitle,
  viewAllHref,
  children,
  className,
}: SectionShellProps) => {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <Link
          href={viewAllHref}
          className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          View all <ArrowRight size={15} className="ml-1 inline-block" />
        </Link>
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
};
