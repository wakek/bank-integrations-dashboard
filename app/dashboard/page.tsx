import { ApiActivityLogSummary } from "@/components/ui/dashboard/api-activity-log-summary";
import { IntegrationHealthSummary } from "@/components/ui/dashboard/integration-health-summary";
import { WebhookAttemptsSummary } from "@/components/ui/dashboard/webhook-attempts-summary";

const Dashboard = () => {
    return (
        <div className="h-full flex flex-col flex-1 justify-start bg-zinc-50 font-sans dark:bg-black">
            <main className="flex flex-1 flex-col mx-auto w-full max-w-7xl min-w-0 px-6 py-6">
                <header className="mb-4">
                    <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        At-a-glance health, activity, and webhook deliveries.
                    </p>
                </header>
                <div className="flex flex-col flex-1 min-w-0 space-y-4">
                    <IntegrationHealthSummary />
                    <div className="h-full grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ApiActivityLogSummary />
                        <WebhookAttemptsSummary />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;