"use client";

import Link from "next/link";

import { IntegrationHealth } from "@/components/ui/dashboard/integration-health";
import { ArrowLeft } from "@solar-icons/react";

const IntegrationsPage = () => {
    return (
        <div className="h-full flex flex-col flex-1 justify-start bg-zinc-50 font-sans dark:bg-black">
            <main className="mx-auto w-full max-w-7xl px-6 py-8">
                <header className="mb-6">
                    <Link
                        href="/dashboard"
                        className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <ArrowLeft size={15} className="ml-1 inline-block" />
                        Dashboard
                    </Link>
                    <h1 className="mt-2 text-xl font-semibold tracking-tight">
                        Integration health
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Live status across the payment rails powering your transactions.
                    </p>
                </header>
                <IntegrationHealth />
            </main>
        </div>
    );
}

export default IntegrationsPage;