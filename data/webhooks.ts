import type {
  Environment,
  WebhookAttempt,
  WebhookDelivery,
  WebhookEventType,
  WebhookStatus,
} from "./types";
import { integrations, moneyMovementRails } from "./integrations";
import {
  DAY,
  HOUR,
  MINUTE,
  NOW,
  id,
  mulberry32,
  pick,
  randInt,
  weightedPick,
} from "./seed";

const WEBHOOK_SEED = 0xb16_b00b5;
const TARGET_DELIVERIES = 128;

const EVENT_WEIGHTS: Array<readonly [WebhookEventType, number]> = [
  ["transaction.status_updated", 36],
  ["transaction.pay_in", 24],
  ["virtual_account.status_updated", 12],
  ["subcustomer.kyc_status_updated", 10],
  ["subcustomer.wallet.created", 7],
  ["subcustomer.kyc_submission_feedback", 6],
  ["subcustomer.wallet.failed", 5],
];

const DESTINATION_URLS = [
  "https://api.acme.com/webhooks/wewire",
  "https://hooks.northstar.io/v2/inbound",
  "https://events.lighthouse.app/webhook/wewire",
  "https://api.harborpay.com/webhook/wewire",
  "https://wewire.tessera.finance/api/v3/webhooks",
  "https://webhook.mintledger.com/wewire/events",
  "https://api.zenithfx.com.ng/webhooks/wewire",
  "https://hooks.akwaaba.gh/wewire/inbound",
];

const ERROR_RESPONSES = [
  { status: 500, code: "SUBSCRIBER_INTERNAL_ERROR",   message: "Subscriber returned 500 Internal Server Error.",                weight: 10 },
  { status: 502, code: "SUBSCRIBER_BAD_GATEWAY",      message: "Subscriber gateway returned 502.",                              weight: 6  },
  { status: 503, code: "SUBSCRIBER_UNAVAILABLE",      message: "Subscriber returned 503 Service Unavailable.",                  weight: 4  },
  { status: 504, code: "SUBSCRIBER_TIMEOUT",          message: "Subscriber did not respond within 10s timeout.",                weight: 8  },
  { status: 408, code: "CONNECTION_TIMEOUT",          message: "Failed to establish TCP connection within 5s.",                 weight: 3  },
  { status: 404, code: "DESTINATION_NOT_FOUND",       message: "Subscriber returned 404 — URL no longer accepts webhooks.",     weight: 2  },
  { status: 401, code: "SIGNATURE_REJECTED",          message: "Subscriber returned 401 — ww-signature header rejected.",       weight: 2  },
  { status: 0,   code: "DNS_RESOLUTION_FAILED",       message: "DNS resolution failed for destination host.",                   weight: 1  },
  { status: 0,   code: "TLS_HANDSHAKE_FAILED",        message: "TLS handshake failed: peer certificate is expired.",            weight: 1  },
] as const;

const STATUS_DISTRIBUTION: Array<readonly [WebhookStatus, number]> = [
  ["delivered", 70],
  ["failed", 14],
  ["retrying", 10],
  ["pending", 6],
];

const STABLECOIN_RAIL_IDS = new Set(["rail_usdc_eth", "rail_usdc_sol", "rail_usdt_tron"]);

const inferAssetAndNetwork = (
  railId: string,
): { asset: "USDC" | "USDT"; network: "ETHEREUM" | "SOLANA" | "TRON" } => {
  if (railId === "rail_usdc_eth") return { asset: "USDC", network: "ETHEREUM" };
  if (railId === "rail_usdc_sol") return { asset: "USDC", network: "SOLANA" };
  return { asset: "USDT", network: "TRON" };
};

const payloadPreview = (
  rand: () => number,
  event: WebhookEventType,
  resourceId: string,
  resourceUpdatedAt: string,
  rail: typeof integrations[number] | null,
): string => {
  const subCustomerId = `sc_${id(rand, "", 14).slice(1)}`;
  switch (event) {
    case "transaction.pay_in": {
      const cur = rail ? pick(rand, rail.currencies) : "USD";
      const amount = randInt(rand, 100_00, 25_000_00); // minor units
      return JSON.stringify(
        {
          event,
          transactionId: resourceId,
          subCustomerId,
          virtualAccountId: `va_${id(rand, "", 14).slice(1)}`,
          type: "CREDIT",
          amount,
          currency: cur,
          rail: rail?.rail ?? "ACH",
          status: "COMPLETED",
          updatedAt: resourceUpdatedAt,
        },
        null,
        2,
      );
    }
    case "transaction.status_updated": {
      const cur = rail ? pick(rand, rail.currencies) : "USD";
      const amount = randInt(rand, 50_00, 500_000_00);
      const status = weightedPick(rand, [
        ["COMPLETED", rail?.status === "outage" ? 10 : 70],
        ["PROCESSING", 14],
        ["FAILED", rail?.status === "outage" ? 60 : 8],
        ["RETURNED", 8],
      ] as Array<readonly [string, number]>);
      return JSON.stringify(
        {
          event,
          transactionId: resourceId,
          subCustomerId,
          type: "DEBIT",
          amount,
          currency: cur,
          rail: rail?.rail ?? "ACH",
          status,
          updatedAt: resourceUpdatedAt,
        },
        null,
        2,
      );
    }
    case "subcustomer.kyc_status_updated": {
      const status = weightedPick(rand, [
        ["APPROVED", 70],
        ["REJECTED", 18],
        ["RESUBMISSION", 12],
      ] as Array<readonly [string, number]>);
      return JSON.stringify(
        {
          event,
          subCustomerId: resourceId,
          status,
          updatedAt: resourceUpdatedAt,
        },
        null,
        2,
      );
    }
    case "subcustomer.kyc_submission_feedback": {
      return JSON.stringify(
        {
          event,
          subCustomerId: resourceId,
          feedback: pick(rand, [
            "Front of national ID is unreadable. Please resubmit.",
            "Proof of address is older than 90 days. Please resubmit.",
            "Selfie does not match the ID photo. Please resubmit both.",
          ]),
          fields: pick(rand, [
            ["id_front"],
            ["proof_of_address"],
            ["selfie", "id_front"],
          ]),
          updatedAt: resourceUpdatedAt,
        },
        null,
        2,
      );
    }
    case "subcustomer.wallet.created": {
      const { asset, network } = rail
        ? inferAssetAndNetwork(rail.id)
        : { asset: "USDC" as const, network: "ETHEREUM" as const };
      const address =
        network === "ETHEREUM"
          ? `0x${id(rand, "", 40).slice(1)}`
          : network === "SOLANA"
            ? id(rand, "", 44).slice(1)
            : `T${id(rand, "", 33).slice(1)}`;
      return JSON.stringify(
        {
          event,
          walletId: resourceId,
          subCustomerId,
          asset,
          network,
          address,
          updatedAt: resourceUpdatedAt,
        },
        null,
        2,
      );
    }
    case "subcustomer.wallet.failed": {
      const { asset, network } = rail
        ? inferAssetAndNetwork(rail.id)
        : { asset: "USDT" as const, network: "TRON" as const };
      return JSON.stringify(
        {
          event,
          subCustomerId,
          asset,
          network,
          reason: pick(rand, [
            "RPC endpoint unreachable; will retry.",
            "Custody provider returned 503; will retry.",
            "Address pool exhausted; will retry after refill.",
          ]),
          updatedAt: resourceUpdatedAt,
        },
        null,
        2,
      );
    }
    case "virtual_account.status_updated": {
      const status = weightedPick(rand, [
        ["ACTIVE", 60],
        ["PENDING", 18],
        ["SUSPENDED", 10],
        ["DENIED", 8],
        ["CLOSED", 4],
      ] as Array<readonly [string, number]>);
      const currency = pick(rand, ["USD", "EUR", "GBP", "NGN", "GHS", "CAD"] as const);
      return JSON.stringify(
        {
          event,
          virtualAccountId: resourceId,
          subCustomerId,
          currency,
          status,
          updatedAt: resourceUpdatedAt,
        },
        null,
        2,
      );
    }
  }
};

const pickResourceIdAndPrefix = (
  rand: () => number,
  event: WebhookEventType,
): { resourceId: string; prefix: string } => {
  switch (event) {
    case "transaction.pay_in":
    case "transaction.status_updated":
      return { prefix: "txn", resourceId: `txn_${id(rand, "", 14).slice(1)}` };
    case "subcustomer.kyc_status_updated":
    case "subcustomer.kyc_submission_feedback":
      return { prefix: "sc", resourceId: `sc_${id(rand, "", 14).slice(1)}` };
    case "subcustomer.wallet.created":
      return { prefix: "wlt", resourceId: `wlt_${id(rand, "", 14).slice(1)}` };
    case "subcustomer.wallet.failed":
      return { prefix: "sc", resourceId: `sc_${id(rand, "", 14).slice(1)}` };
    case "virtual_account.status_updated":
      return { prefix: "va", resourceId: `va_${id(rand, "", 14).slice(1)}` };
  }
};

const buildAttempts = (
  rand: () => number,
  status: WebhookStatus,
  firstAttemptAt: Date,
): {
  attempts: WebhookAttempt[];
  lastAttemptAt: Date;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  responseTime: number | null;
  errorCode: string | null;
  errorMessage: string | null;
} => {
  // Backoff schedule (ms): immediate, 1m, 5m, 30m, 2h, 6h, 24h. Capped at 8 attempts.
  const backoff = [0, 1 * MINUTE, 5 * MINUTE, 30 * MINUTE, 2 * HOUR, 6 * HOUR, 24 * HOUR];

  const attemptCount =
    status === "delivered"
      ? weightedPick(rand, [[1, 60], [2, 24], [3, 12], [4, 4]])
      : status === "pending"
        ? 0
        : status === "retrying"
          ? randInt(rand, 1, 5)
          : randInt(rand, 5, 8);

  const attempts: WebhookAttempt[] = [];
  for (let n = 1; n <= attemptCount; n++) {
    const at = new Date(firstAttemptAt.getTime() + (backoff[n - 1] ?? 24 * HOUR));
    const isLast = n === attemptCount;
    const succeedsHere = status === "delivered" && isLast;

    if (succeedsHere) {
      attempts.push({
        attemptNumber: n,
        attemptedAt: at.toISOString(),
        responseStatusCode: weightedPick(rand, [[200, 92], [201, 6], [202, 2]]),
        responseTimeMs: randInt(rand, 40, 480),
        errorCode: null,
        errorMessage: null,
      });
    } else {
      const err = weightedPick(
        rand,
        ERROR_RESPONSES.map((e) => [e, e.weight] as const),
      );
      attempts.push({
        attemptNumber: n,
        attemptedAt: at.toISOString(),
        responseStatusCode: err.status === 0 ? null : err.status,
        responseTimeMs:
          err.status === 0
            ? null
            : err.status === 504 || err.status === 408
              ? randInt(rand, 5_000, 10_000)
              : randInt(rand, 60, 1_400),
        errorCode: err.code,
        errorMessage: err.message,
      });
    }
  }

  if (status === "pending") {
    return {
      attempts: [],
      lastAttemptAt: firstAttemptAt,
      nextRetryAt: firstAttemptAt,
      responseStatus: null,
      responseTime: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const last = attempts[attempts.length - 1];
  const lastAttemptAt = new Date(last.attemptedAt);

  let nextRetryAt: Date | null = null;
  if (status === "retrying") {
    const nextBackoff = backoff[Math.min(attemptCount, backoff.length - 1)] ?? 24 * HOUR;
    nextRetryAt = new Date(lastAttemptAt.getTime() + nextBackoff);
  }

  return {
    attempts,
    lastAttemptAt,
    nextRetryAt,
    responseStatus: last.responseStatusCode,
    responseTime: last.responseTimeMs,
    errorCode: last.errorCode,
    errorMessage: last.errorMessage,
  };
};

const pickRailForEvent = (
  rand: () => number,
  event: WebhookEventType,
): typeof integrations[number] | null => {
  if (event === "transaction.pay_in" || event === "transaction.status_updated") {
    return pick(rand, moneyMovementRails);
  }
  if (event === "subcustomer.wallet.created" || event === "subcustomer.wallet.failed") {
    return pick(
      rand,
      integrations.filter((r) => STABLECOIN_RAIL_IDS.has(r.id)),
    );
  }
  return null;
};

const generate = (): WebhookDelivery[] => {
  const rand = mulberry32(WEBHOOK_SEED);
  const out: WebhookDelivery[] = [];

  for (let i = 0; i < TARGET_DELIVERIES; i++) {
    const eventType = weightedPick(rand, EVENT_WEIGHTS);
    const rail = pickRailForEvent(rand, eventType);

    // Skew delivery status by the rail's underlying health (loose correlation:
    // unhealthy rails generate more events and tend to overload subscribers).
    let status: WebhookStatus;
    if (rail?.status === "outage") {
      status = weightedPick(rand, [
        ["delivered", 30],
        ["retrying", 30],
        ["failed", 28],
        ["pending", 12],
      ]);
    } else if (rail?.status === "degraded") {
      status = weightedPick(rand, [
        ["delivered", 58],
        ["retrying", 18],
        ["failed", 16],
        ["pending", 8],
      ]);
    } else {
      status = weightedPick(rand, STATUS_DISTRIBUTION);
    }

    // First-attempt times across last ~3 days, biased recent.
    const u = rand();
    const ageMs = Math.floor(u * u * 3 * DAY + rand() * HOUR);
    const firstAttemptAt = new Date(NOW.getTime() - ageMs);
    const { resourceId } = pickResourceIdAndPrefix(rand, eventType);
    const resourceUpdatedAt = firstAttemptAt.toISOString();

    const built = buildAttempts(rand, status, firstAttemptAt);
    const preview = payloadPreview(rand, eventType, resourceId, resourceUpdatedAt, rail);
    const env: Environment = rand() > 0.18 ? "production" : "sandbox";

    out.push({
      id: id(rand, "wh", 16),
      eventId: id(rand, "evt", 18),
      resourceId,
      resourceUpdatedAt,
      eventType,
      status,
      destinationUrl: pick(rand, DESTINATION_URLS),
      integrationId: rail?.id ?? null,
      integrationName: rail?.name ?? null,
      attemptCount: built.attempts.length,
      maxAttempts: 8,
      firstAttemptAt: firstAttemptAt.toISOString(),
      lastAttemptAt: built.lastAttemptAt.toISOString(),
      nextRetryAt: built.nextRetryAt ? built.nextRetryAt.toISOString() : null,
      responseStatusCode: built.responseStatus,
      responseTimeMs: built.responseTime,
      errorCode: built.errorCode,
      errorMessage: built.errorMessage,
      payloadBytes: preview.length + randInt(rand, 40, 240),
      payloadPreview: preview,
      signatureVersion: rand() > 0.15 ? "v2" : "v1",
      environment: env,
      attempts: built.attempts,
    });
  }

  out.sort((a, b) => (a.firstAttemptAt < b.firstAttemptAt ? 1 : -1));
  return out;
};

export const webhookDeliveries: WebhookDelivery[] = generate();

export const webhookStatusCounts: Record<WebhookStatus, number> =
  webhookDeliveries.reduce(
    (acc, d) => {
      acc[d.status]++;
      return acc;
    },
    { delivered: 0, failed: 0, pending: 0, retrying: 0 } as Record<
      WebhookStatus,
      number
    >,
  );

export const webhookEventTypes: WebhookEventType[] = EVENT_WEIGHTS.map(
  ([t]) => t,
);
