import { create } from "zustand";

import { webhookDeliveries as allDeliveries } from "@/data";
import type { WebhookDelivery } from "@/data";

interface WebhooksState {
  deliveries: WebhookDelivery[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  fetch: () => Promise<void>;
}

const FAILURE_RATE = 0.1;

const FAILURE_MESSAGES = [
  "Upstream service unavailable (502)",
  "Request timed out after 5s",
  "Rate limit exceeded — try again shortly",
  "Network error: could not reach api.wewire.com",
] as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useWebhooksStore = create<WebhooksState>((set) => ({
  deliveries: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      await delay(400 + Math.random() * 900);
      if (Math.random() < FAILURE_RATE) {
        throw new Error(
          FAILURE_MESSAGES[
            Math.floor(Math.random() * FAILURE_MESSAGES.length)
          ],
        );
      }
      set({
        deliveries: allDeliveries,
        loading: false,
        lastFetchedAt: new Date().toISOString(),
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Unknown error",
        loading: false,
      });
    }
  },
}));
