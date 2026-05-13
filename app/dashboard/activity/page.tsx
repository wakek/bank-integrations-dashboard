import Link from "next/link";

import { ApiActivityLog } from "@/components/ui/dashboard/api-activity-log";

const ActivityPage = () => {
    return (
        <div className="h-full flex flex-col flex-1 justify-start bg-zinc-50 font-sans dark:bg-black">
            <main className="mx-auto w-full max-w-7xl px-6 py-8">
                <header className="mb-6">
                    <Link
                        href="/dashboard"
                        className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-3.5">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.24a.75.75 0 010-1.06l4.25-4.24a.75.75 0 011.06 0z" clipRule="evenodd" />
                        </svg>
                        Dashboard
                    </Link>
                    <h1 className="mt-2 text-xl font-semibold tracking-tight">
                        API activity
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Recent requests against your API keys. Click a row to inspect details.
                    </p>
                </header>
                <ApiActivityLog />
            </main>
        </div>
    );
};

export default ActivityPage;
