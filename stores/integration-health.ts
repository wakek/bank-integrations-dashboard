import { create } from "zustand";

import { integrations as allIntegrations } from "@/data";
import type { BankIntegration } from "@/data";

interface IntegrationHealthState {
  integrations: BankIntegration[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  fetch: () => Promise<void>;
}

/** Chance that a fetch will fail outright, so we can demo the error state. */
const FAILURE_RATE = 0.1;

const FAILURE_MESSAGES = [
  "Upstream service unavailable (502)",
  "Request timed out after 5s",
  "Rate limit exceeded — try again shortly",
  "Network error: could not reach api.wewire.com",
] as const;

function pickRandomSubset(items: readonly BankIntegration[]): BankIntegration[] {
  const count = Math.floor(Math.random() * (items.length + 1));
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useIntegrationHealthStore = create<IntegrationHealthState>(
  (set) => ({
    integrations: [],
    loading: false,
    error: null,
    lastFetchedAt: null,
    fetch: async () => {
      set({ loading: true, error: null });
      try {
        await delay(300 + Math.random() * 700);
        if (Math.random() < FAILURE_RATE) {
          throw new Error(
            FAILURE_MESSAGES[
            Math.floor(Math.random() * FAILURE_MESSAGES.length)
            ],
          );
        }
        set({
          integrations: pickRandomSubset(allIntegrations),
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
  }),
);
