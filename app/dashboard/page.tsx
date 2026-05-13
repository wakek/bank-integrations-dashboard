import { ApiActivityLog } from "@/components/ui/dashboard/api-activity-log";
import { IntegrationHealth } from "@/components/ui/dashboard/integration-health";
import { WebhookAttempts } from "@/components/ui/dashboard/webhook-attempts";

export default function Dashboard() {
    return (
        <div className="h-full flex flex-col flex-1 justify-start bg-zinc-50 font-sans dark:bg-black">
            <main className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
                <section>
                    <header className="mb-6">
                        <h1 className="text-xl font-semibold tracking-tight">
                            Integration health
                        </h1>
                        <p className="mt-1 text-sm text-zinc-500">
                            Live status across the payment rails powering your transactions.
                        </p>
                    </header>
                    <IntegrationHealth />
                </section>

                <section>
                    <header className="mb-6">
                        <h2 className="text-xl font-semibold tracking-tight">
                            API activity
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">
                            Recent requests against your API keys. Click a row to inspect details.
                        </p>
                    </header>
                    <ApiActivityLog />
                </section>

                <section>
                    <header className="mb-6">
                        <h2 className="text-xl font-semibold tracking-tight">
                            Webhook deliveries
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">
                            Events we tried to deliver to your endpoint. Click a row to see the full retry timeline.
                        </p>
                    </header>
                    <WebhookAttempts />
                </section>
            </main>
        </div>
    );
}
