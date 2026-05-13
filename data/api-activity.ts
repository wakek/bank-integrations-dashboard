import type { ApiActivityEntry, ApiMethod, Environment } from "./types";
import { integrations, moneyMovementRails } from "./integrations";
import {
  HOUR,
  MINUTE,
  NOW,
  id,
  mulberry32,
  pad,
  pick,
  randInt,
  weightedPick,
} from "./seed";

/**
 * The activity log is generated deterministically from a fixed seed so the
 * rows are stable across renders. Bump the seed to regenerate.
 */
const ACTIVITY_SEED = 0x42_43_44_45;
const TARGET_ENTRIES = 256;

interface EndpointTemplate {
  method: ApiMethod;
  /** Templated path (with :id / :walletId placeholders). */
  path: string;
  weight: number;
  /** OK latency range in ms; errors override this. */
  latency: [number, number];
  responseBytes: [number, number];
  /** Whether the call should carry a sub-customer id. */
  hasSubCustomer: boolean;
  /** Whether this call attributes to a money-movement rail. */
  carriesRail: "payout" | "wallet" | "none";
  /** Some endpoints accept Idempotency-Key (only initiate-payout, per docs). */
  acceptsIdempotencyKey: boolean;
}

const ENDPOINTS: EndpointTemplate[] = [
  { method: "POST",  path: "/v1/transactions/initiate-payout",              weight: 15, latency: [240, 1_400], responseBytes: [800, 2_200],   hasSubCustomer: true,  carriesRail: "payout", acceptsIdempotencyKey: true  },
  { method: "GET",   path: "/v1/transactions",                              weight: 22, latency: [110, 480],   responseBytes: [4_000, 32_000], hasSubCustomer: false, carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "POST",  path: "/v1/subcustomers",                              weight: 3,  latency: [120, 480],   responseBytes: [600, 1_400],   hasSubCustomer: false, carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/subcustomers",                              weight: 12, latency: [70, 280],    responseBytes: [2_000, 12_000], hasSubCustomer: false, carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/subcustomers/:id",                          weight: 10, latency: [60, 240],    responseBytes: [800, 1_800],   hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "POST",  path: "/v1/subcustomers/:id/kyc",                      weight: 4,  latency: [280, 1_200], responseBytes: [400, 1_200],   hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/subcustomers/:id/kyc-link",                 weight: 2,  latency: [80, 240],    responseBytes: [200, 600],     hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "PATCH", path: "/v1/subcustomers/:id/archive",                  weight: 1,  latency: [120, 380],   responseBytes: [200, 400],     hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "POST",  path: "/v1/subcustomers/:id/accounts/request",         weight: 4,  latency: [180, 720],   responseBytes: [600, 1_400],   hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/subcustomers/:id/accounts",                 weight: 8,  latency: [80, 320],    responseBytes: [800, 3_200],   hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "POST",  path: "/v1/subcustomers/:id/wallets/request",          weight: 3,  latency: [220, 880],   responseBytes: [400, 1_200],   hasSubCustomer: true,  carriesRail: "wallet", acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/subcustomers/:id/wallets",                  weight: 5,  latency: [70, 280],    responseBytes: [600, 2_400],   hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/subcustomers/:id/wallets/:walletId",        weight: 2,  latency: [60, 240],    responseBytes: [400, 1_000],   hasSubCustomer: true,  carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/wallets/supported-assets",                  weight: 1,  latency: [40, 180],    responseBytes: [200, 600],     hasSubCustomer: false, carriesRail: "none",   acceptsIdempotencyKey: false },
  { method: "GET",   path: "/v1/rates",                                     weight: 8,  latency: [30, 160],    responseBytes: [600, 2_400],   hasSubCustomer: false, carriesRail: "none",   acceptsIdempotencyKey: false },
];

const STABLECOIN_RAIL_IDS = ["rail_usdc_eth", "rail_usdc_sol", "rail_usdt_tron"];

const API_KEYS = [
  { id: "key_01HW4N0M3X7A1B2C3D",  prefix: "sk_live_",  tail: "a1b2", label: "Production · web app",   env: "production" as Environment },
  { id: "key_01HW4N0M3X8F7E6D5C",  prefix: "sk_live_",  tail: "6d5c", label: "Production · mobile",    env: "production" as Environment },
  { id: "key_01HW4N0M3X99AA11BB",  prefix: "sk_live_",  tail: "11bb", label: "Production · batch",     env: "production" as Environment },
  { id: "key_01HW4N0M3XE5F6G7H8",  prefix: "sk_test_",  tail: "g7h8", label: "Sandbox · QA",           env: "sandbox" as Environment    },
  { id: "key_01HW4N0M3X33DD44EE",  prefix: "sk_test_",  tail: "44ee", label: "Sandbox · CI",           env: "sandbox" as Environment    },
];

const USER_AGENTS = [
  "wewire-node/1.4.2",
  "wewire-python/0.18.0",
  "wewire-go/0.9.1",
  "wewire-ruby/0.5.0",
  "curl/8.5.0",
  "PostmanRuntime/7.36.1",
];

const CLIENT_IPS = [
  "54.183.22.108", "3.218.94.21",  "13.57.196.44",  "44.227.118.9",
  "172.58.40.211", "98.207.18.66", "104.196.220.5", "35.184.71.142",
  "76.97.211.13",  "73.222.108.4", "162.247.74.27", "184.105.139.66",
  "197.211.45.18", "102.176.18.93", "41.79.220.114",
];

/**
 * WeWire-style error templates keyed by HTTP status. Messages mirror the
 * `{ message, statusCode }` envelope the API uses.
 */
const ERROR_TEMPLATES: Record<number, Array<{ code: string; message: string }>> = {
  400: [
    { code: "INVALID_REQUEST", message: "Field 'currency' is required." },
    { code: "INVALID_FIELD",   message: "Field 'amount' must be a positive integer in minor units." },
    { code: "INVALID_RAIL",    message: "Invalid 'rail' value; see /v1/wallets/supported-assets and rail docs for accepted values." },
    { code: "INVALID_INPUT",   message: "Beneficiary 'accountNumber' is malformed for the selected rail." },
  ],
  401: [
    { code: "INVALID_API_KEY",      message: "Invalid API key." },
    { code: "WRONG_ENVIRONMENT_KEY", message: "API key environment does not match the request base URL." },
  ],
  403: [
    { code: "KYC_NOT_APPROVED",     message: "Sub-customer KYC must be APPROVED before initiating payouts." },
    { code: "VIRTUAL_ACCOUNT_SUSPENDED", message: "Source virtual account is SUSPENDED." },
  ],
  404: [
    { code: "SUBCUSTOMER_NOT_FOUND", message: "Sub-customer not found." },
    { code: "TRANSACTION_NOT_FOUND", message: "Transaction not found." },
    { code: "WALLET_NOT_FOUND",      message: "Wallet not found for this sub-customer." },
  ],
  409: [
    { code: "IDEMPOTENCY_CONFLICT", message: "Idempotency key already used with a different request body." },
  ],
  422: [
    { code: "INSUFFICIENT_FUNDS",       message: "Insufficient balance in source account." },
    { code: "RAIL_CURRENCY_MISMATCH",   message: "Destination currency is not supported on the selected rail." },
    { code: "BELOW_MINIMUM_AMOUNT",     message: "Amount is below the minimum for the selected rail." },
  ],
  429: [
    { code: "RATE_LIMITED", message: "Rate limit exceeded: 10 requests / 30s on /v1/transactions/initiate-payout. Retry-After: 18s." },
    { code: "RATE_LIMITED", message: "Rate limit exceeded: 100 requests / minute on /v1/rates. Retry-After: 4s." },
  ],
  500: [
    { code: "INTERNAL_ERROR", message: "Internal server error. The request id has been logged." },
  ],
  502: [
    { code: "UPSTREAM_BAD_GATEWAY", message: "Upstream rail returned an unexpected response." },
  ],
  503: [
    { code: "RAIL_MAINTENANCE", message: "Rail is currently in a scheduled maintenance window." },
  ],
  504: [
    { code: "UPSTREAM_TIMEOUT", message: "Request to upstream rail timed out after 30s." },
  ],
};

function statusForEndpointAndRail(
  rand: () => number,
  endpoint: EndpointTemplate,
  railStatus: string | null,
): number {
  // Rate endpoint occasionally hits 429.
  if (endpoint.path === "/v1/rates") {
    return weightedPick(rand, [[200, 96], [429, 3], [500, 1]]);
  }

  // KYC endpoints can return 400 (validation) or 403 (wrong state).
  if (endpoint.path.endsWith("/kyc")) {
    return weightedPick(rand, [[200, 78], [201, 12], [400, 6], [403, 3], [500, 1]]);
  }

  // Sub-customer create / archive are write ops.
  if (endpoint.method === "POST" && endpoint.path === "/v1/subcustomers") {
    return weightedPick(rand, [[201, 90], [400, 6], [401, 2], [500, 2]]);
  }
  if (endpoint.method === "PATCH" && endpoint.path.endsWith("/archive")) {
    return weightedPick(rand, [[200, 92], [404, 4], [403, 2], [500, 2]]);
  }

  // Wallet/account request endpoints can return 403 if KYC isn't approved.
  if (endpoint.path.endsWith("/accounts/request") || endpoint.path.endsWith("/wallets/request")) {
    return weightedPick(rand, [[201, 84], [403, 8], [400, 4], [500, 2], [502, 2]]);
  }

  // Payout endpoint outcomes depend strongly on the chosen rail's health.
  if (endpoint.path === "/v1/transactions/initiate-payout") {
    if (railStatus === "outage") {
      return weightedPick(rand, [[504, 30], [502, 22], [503, 12], [500, 8], [201, 8], [403, 4]]);
    }
    if (railStatus === "degraded") {
      return weightedPick(rand, [[201, 68], [502, 9], [504, 7], [422, 4], [429, 3], [403, 3], [500, 3], [400, 3]]);
    }
    if (railStatus === "maintenance") {
      return weightedPick(rand, [[201, 75], [503, 15], [504, 4], [422, 3], [400, 3]]);
    }
    return weightedPick(rand, [
      [201, 86], [422, 4], [429, 3], [400, 2], [403, 1], [500, 1], [502, 1], [504, 1], [409, 1],
    ]);
  }

  // GET /v1/transactions, /v1/subcustomers* reads.
  return weightedPick(rand, [
    [200, 90], [404, 3], [401, 2], [400, 2], [429, 1], [500, 1], [502, 1],
  ]);
}

function latencyForStatus(
  rand: () => number,
  status: number,
  base: [number, number],
): number {
  if (status === 504) return randInt(rand, 20_000, 30_000);
  if (status === 502 || status === 503) return randInt(rand, 800, 8_000);
  if (status === 500) return randInt(rand, 600, 6_000);
  if (status >= 400 && status < 500) return randInt(rand, 30, 220);
  return randInt(rand, base[0], base[1]);
}

function generate(): ApiActivityEntry[] {
  const rand = mulberry32(ACTIVITY_SEED);
  const entries: ApiActivityEntry[] = [];

  for (let i = 0; i < TARGET_ENTRIES; i++) {
    // Spread across last ~24h, biased to recent.
    const u = rand();
    const ageMs = Math.floor(u * u * 24 * HOUR + rand() * 30 * MINUTE);
    const ts = new Date(NOW.getTime() - ageMs);

    const endpoint = weightedPick(
      rand,
      ENDPOINTS.map((e) => [e, e.weight] as const),
    );

    // Pick a rail for endpoints that attribute to one.
    let integration: typeof integrations[number] | null = null;
    if (endpoint.carriesRail === "payout") {
      integration = pick(rand, moneyMovementRails);
    } else if (endpoint.carriesRail === "wallet") {
      const stable = integrations.filter((r) => STABLECOIN_RAIL_IDS.includes(r.id));
      integration = pick(rand, stable);
    }

    const status = statusForEndpointAndRail(
      rand,
      endpoint,
      integration?.status ?? null,
    );

    const latency = latencyForStatus(rand, status, endpoint.latency);
    const apiKey = pick(rand, API_KEYS);

    const errors = ERROR_TEMPLATES[status];
    const errorPick = errors ? pick(rand, errors) : null;

    const isError = status >= 400;
    const baseBytes = randInt(rand, endpoint.responseBytes[0], endpoint.responseBytes[1]);
    const responseBytes = isError ? randInt(rand, 80, 280) : baseBytes;

    const subCustomerId = endpoint.hasSubCustomer
      ? `sc_${id(rand, "", 14).slice(1)}`
      : null;
    const walletId = endpoint.path.includes(":walletId")
      ? `wlt_${id(rand, "", 14).slice(1)}`
      : null;

    let endpointResolved = endpoint.path;
    if (subCustomerId) endpointResolved = endpointResolved.replace(":id", subCustomerId);
    if (walletId) endpointResolved = endpointResolved.replace(":walletId", walletId);

    const idempotencyKey =
      endpoint.acceptsIdempotencyKey && rand() > 0.18
        ? `idem_${id(rand, "", 18).slice(1)}`
        : null;

    entries.push({
      id: id(rand, "act", 16),
      timestamp: ts.toISOString(),
      method: endpoint.method,
      endpoint: endpoint.path,
      endpointResolved,
      statusCode: status,
      latencyMs: latency,
      integrationId: integration?.id ?? null,
      integrationName: integration?.name ?? null,
      subCustomerId,
      requestId: `req_${pad(i + 1, 6)}_${id(rand, "", 8).slice(1)}`,
      idempotencyKey,
      clientIp: pick(rand, CLIENT_IPS),
      userAgent: pick(rand, USER_AGENTS),
      apiKeyId: apiKey.id,
      apiKeyLabel: apiKey.label,
      apiKeyPreview: `${apiKey.prefix}••••${apiKey.tail}`,
      errorCode: errorPick?.code ?? null,
      errorMessage: errorPick?.message ?? null,
      responseBytes,
      environment: apiKey.env,
    });
  }

  entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return entries;
}

export const apiActivity: ApiActivityEntry[] = generate();

/** Distinct templated endpoint paths for filter dropdowns. */
export const apiEndpoints: string[] = Array.from(
  new Set(ENDPOINTS.map((e) => e.path)),
).sort();

/** Distinct status codes present in the dataset, ascending. */
export const apiStatusCodes: number[] = Array.from(
  new Set(apiActivity.map((e) => e.statusCode)),
).sort((a, b) => a - b);

/** Distinct API keys, for the "filter by key" dropdown. */
export const apiKeys = API_KEYS.map((k) => ({
  id: k.id,
  label: k.label,
  preview: `${k.prefix}••••${k.tail}`,
  environment: k.env,
}));
