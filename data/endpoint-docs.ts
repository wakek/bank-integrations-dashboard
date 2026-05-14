import type { ApiEndpointDoc } from "./types";

/**
 * Inline documentation preview for the one client-facing endpoint we
 * surface in-context from the activity log. Modeled after WeWire's
 * documented `/v1/transactions/initiate-payout`.
 *
 * "Small" by spec — header + auth + rate limit + request/response
 * example + a handful of error codes. Not a full docs page.
 */
export const initiatePayoutDoc: ApiEndpointDoc = {
  id: "transactions.initiate-payout",
  method: "POST",
  path: "/v1/transactions/initiate-payout",
  title: "Initiate a payout",
  summary:
    "Send funds from a sub-customer's source account to a beneficiary on a supported rail.",
  description:
    "Initiates a debit transaction against the specified source account and routes the funds to the beneficiary via the chosen rail. The transaction starts in PROCESSING; subscribe to `transaction.status_updated` webhooks to track it to COMPLETED, FAILED, or RETURNED.",
  authentication:
    "Header `ww-api-key: sk_live_*` (production) or `sk_test_*` (sandbox). The key must belong to the same environment as the source virtual account.",
  rateLimit: {
    requestsPerWindow: 10,
    windowSeconds: 30,
  },
  parameters: [
    {
      name: "subCustomerId",
      in: "body",
      type: "string",
      required: true,
      description: "Sub-customer initiating the payout. KYC must be APPROVED.",
      example: "sc_3f8c1d9a7b8e4f1d",
    },
    {
      name: "sourceAccountId",
      in: "body",
      type: "string",
      required: true,
      description: "Virtual account id to debit. Must be ACTIVE.",
      example: "va_5d4c3b2a1f0e9d8c",
    },
    {
      name: "amount",
      in: "body",
      type: "integer",
      required: true,
      description: "Amount in the smallest currency unit (e.g. cents for USD).",
      example: "50000",
    },
    {
      name: "currency",
      in: "body",
      type: "string (ISO 4217)",
      required: true,
      description:
        "Currency of the payout. Must be supported by the selected rail (see /v1/rates for coverage).",
      example: "USD",
    },
    {
      name: "rail",
      in: "body",
      type: "string",
      required: true,
      description:
        "One of: ACH, WIRE, SWIFT, SEPA, FPS, CHAPS, NIBSS, GHIPSS, USDC_ETHEREUM, USDC_SOLANA, USDT_TRON.",
      example: "ACH",
    },
    {
      name: "beneficiary",
      in: "body",
      type: "object",
      required: true,
      description:
        "Recipient details. Required fields vary by rail (e.g. routingNumber for ACH, IBAN for SEPA, walletAddress for stablecoin rails).",
    },
    {
      name: "narration",
      in: "body",
      type: "string",
      required: false,
      description: "Free-form description shown on the beneficiary's statement (max 140 chars).",
      example: "April invoice",
    },
    {
      name: "idempotencyKey",
      in: "body",
      type: "string",
      required: false,
      description:
        "Optional dedupe key. Two requests with the same key (within 24h) return the same transaction. Use to safely retry on network errors.",
      example: "idem_2c3d4e5f6a7b8c9d",
    },
  ],
  requestExample: `curl https://capi.wewire.com/v1/transactions/initiate-payout \\
  -H "ww-api-key: sk_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "subCustomerId": "sc_3f8c1d9a7b8e4f1d",
    "sourceAccountId": "va_5d4c3b2a1f0e9d8c",
    "amount": 50000,
    "currency": "USD",
    "rail": "ACH",
    "beneficiary": {
      "name": "Acme Logistics LLC",
      "accountNumber": "1234567890",
      "routingNumber": "021000021",
      "country": "US"
    },
    "narration": "April invoice",
    "idempotencyKey": "idem_2c3d4e5f6a7b8c9d"
  }'`,
  responseExamples: [
    {
      status: 201,
      description: "Payout accepted and queued on the rail.",
      body: `{
  "transactionId": "txn_9a7e8b1d2c3f4e5d",
  "subCustomerId": "sc_3f8c1d9a7b8e4f1d",
  "sourceAccountId": "va_5d4c3b2a1f0e9d8c",
  "type": "DEBIT",
  "amount": 50000,
  "currency": "USD",
  "rail": "ACH",
  "status": "PROCESSING",
  "estimatedSettlementAt": "2026-05-15T16:00:00Z",
  "createdAt": "2026-05-13T17:30:00Z"
}`,
    },
  ],
  errors: [
    {
      code: "KYC_NOT_APPROVED",
      httpStatus: 403,
      message: "Sub-customer KYC must be APPROVED before initiating payouts.",
      resolution:
        "Submit KYC via `POST /v1/subcustomers/{id}/kyc` and wait for the `subcustomer.kyc_status_updated` webhook with status APPROVED.",
    },
    {
      code: "INSUFFICIENT_FUNDS",
      httpStatus: 422,
      message: "Source account balance is below the requested amount.",
      resolution:
        "Top up the source virtual account via inbound transfer, or split the payout into smaller amounts.",
    },
    {
      code: "RAIL_CURRENCY_MISMATCH",
      httpStatus: 422,
      message: "Selected currency is not supported on the specified rail.",
      resolution:
        "Check `/v1/rates` for supported corridors, or pick a different rail that supports the target currency.",
    },
    {
      code: "IDEMPOTENCY_CONFLICT",
      httpStatus: 409,
      message: "An earlier request with this idempotencyKey had a different body.",
      resolution:
        "Either reuse the key with the exact same body (to get the original response) or generate a new key.",
    },
    {
      code: "RATE_LIMITED",
      httpStatus: 429,
      message: "Rate limit exceeded: 10 requests / 30s on this endpoint.",
      resolution:
        "Honour the `Retry-After` response header and queue subsequent payouts client-side.",
    },
  ],
  sdkSnippets: [],
};

/**
 * Map of endpoint paths → docs. Used by the activity log to decide whether
 * to show an info icon next to a row. Most endpoints have no entry —
 * spec says "one client-facing API endpoint."
 */
export const endpointDocsByPath: Record<string, ApiEndpointDoc> = {
  [initiatePayoutDoc.path]: initiatePayoutDoc,
};
