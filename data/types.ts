/**
 * Shared types for the WeWire bank-integrations dashboard mock dataset.
 *
 * Modeled after the public WeWire API surface (sub-customers, virtual
 * accounts, crypto wallets, transactions, rates) so the UI can be built
 * against a realistic shape and swapped for live data later.
 */

export type IntegrationStatus =
  | "operational"
  | "degraded"
  | "outage"
  | "maintenance";

/** The underlying money-movement rail an integration represents. */
export type Rail =
  | "ACH"
  | "WIRE"
  | "SWIFT"
  | "SEPA"
  | "FPS"
  | "CHAPS"
  | "NIBSS"
  | "GHIPSS"
  | "MTN_MOMO"
  | "M_PESA"
  | "USDC_ETHEREUM"
  | "USDC_SOLANA"
  | "USDT_TRON";

export type Currency =
  | "USD"
  | "EUR"
  | "GBP"
  | "NGN"
  | "GHS"
  | "CAD"
  | "KES"
  | "USDC"
  | "USDT";

export type Direction = "pay_in" | "pay_out";

export type Region =
  | "US"
  | "UK"
  | "EU"
  | "CA"
  | "NG"
  | "GH"
  | "KE"
  | "GLOBAL"
  | "ON_CHAIN";

export interface BankIntegration {
  id: string;
  rail: Rail;
  /** Human-readable rail name, e.g. "ACH", "USDC on Ethereum". */
  name: string;
  slug: string;
  initials: string;
  brandColor: string;
  status: IntegrationStatus;
  region: Region;
  currencies: Currency[];
  /** Directions this rail supports — some are unidirectional. */
  directions: Direction[];
  /** Typical settlement time in seconds (median, end-to-end). */
  medianSettlementSeconds: number;
  uptime30d: number;
  uptime90d: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  successRate24h: number;
  successRate7d: number;
  transactionCount24h: number;
  failedCount24h: number;
  /** Gross transaction value in the last 24h, USD-equivalent. */
  volume24hUsd: number;
  /** Sub-customers with at least one transaction on this rail in 24h. */
  activeSubCustomers24h: number;
  lastIncidentAt: string | null;
  lastSuccessAt: string;
  description: string;
  incidents: IntegrationIncident[];
}

export interface IntegrationIncident {
  id: string;
  startedAt: string;
  resolvedAt: string | null;
  severity: "minor" | "major" | "critical";
  summary: string;
}

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type Environment = "production" | "sandbox";

export interface ApiActivityEntry {
  id: string;
  timestamp: string;
  method: ApiMethod;
  /** Templated path (e.g. /v1/subcustomers/:id/wallets). */
  endpoint: string;
  /** Concrete path for this call (e.g. /v1/subcustomers/sc_abc123/wallets). */
  endpointResolved: string;
  statusCode: number;
  latencyMs: number;
  /** Rail attribution. Only populated for endpoints that move money. */
  integrationId: string | null;
  integrationName: string | null;
  /** Sub-customer id this call relates to, when applicable. */
  subCustomerId: string | null;
  requestId: string;
  /** Idempotency key sent by the client, when present. */
  idempotencyKey: string | null;
  clientIp: string;
  userAgent: string;
  apiKeyId: string;
  apiKeyLabel: string;
  /** Last-4 preview of the key: e.g. "sk_live_••••a1b2". */
  apiKeyPreview: string;
  /** WeWire error envelope uses { message, statusCode }; we expose both. */
  errorMessage: string | null;
  errorCode: string | null;
  responseBytes: number;
  environment: Environment;
}

export type WebhookStatus = "delivered" | "failed" | "pending" | "retrying";

/** Webhook event names mirrored from WeWire's docs. */
export type WebhookEventType =
  | "transaction.pay_in"
  | "transaction.status_updated"
  | "subcustomer.kyc_status_updated"
  | "subcustomer.kyc_submission_feedback"
  | "subcustomer.wallet.created"
  | "subcustomer.wallet.failed"
  | "virtual_account.status_updated";

export interface WebhookAttempt {
  attemptNumber: number;
  attemptedAt: string;
  responseStatusCode: number | null;
  responseTimeMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface WebhookDelivery {
  id: string;
  /** Stable id of the underlying event (used for dedup at the subscriber). */
  eventId: string;
  /** Id of the affected resource (sub-customer, transaction, va, wallet). */
  resourceId: string;
  /** updatedAt of the affected resource — dedup is on (resourceId, updatedAt). */
  resourceUpdatedAt: string;
  eventType: WebhookEventType;
  status: WebhookStatus;
  destinationUrl: string;
  integrationId: string | null;
  integrationName: string | null;
  attemptCount: number;
  maxAttempts: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  nextRetryAt: string | null;
  responseStatusCode: number | null;
  responseTimeMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  payloadBytes: number;
  payloadPreview: string;
  signatureVersion: "v1" | "v2";
  environment: Environment;
  attempts: WebhookAttempt[];
}

export interface EndpointParameter {
  name: string;
  in: "path" | "query" | "header" | "body";
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface EndpointResponseExample {
  status: number;
  description: string;
  body: string;
}

export interface EndpointError {
  code: string;
  httpStatus: number;
  message: string;
  resolution: string;
}

export interface ApiEndpointDoc {
  id: string;
  method: ApiMethod;
  path: string;
  title: string;
  summary: string;
  description: string;
  parameters: EndpointParameter[];
  requestExample: string;
  responseExamples: EndpointResponseExample[];
  errors: EndpointError[];
  rateLimit: {
    requestsPerWindow: number;
    windowSeconds: number;
  };
  authentication: string;
  sdkSnippets: Array<{
    language: "curl" | "node" | "python" | "go";
    code: string;
  }>;
}
