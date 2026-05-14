/**
 * Public entry point for the mock dataset.
 *
 * Import from `@/app/data` rather than reaching into individual files —
 * this gives us a single place to swap mock data for a real API later.
 */

export * from "./types";
export {
  integrations,
  integrationById,
  integrationBySlug,
  moneyMovementRails,
  datasetSnapshotAt,
} from "./integrations";
export {
  apiActivity,
  apiEndpoints,
  apiStatusCodes,
  apiKeys,
} from "./api-activity";
export {
  webhookDeliveries,
  webhookStatusCounts,
  webhookEventTypes,
} from "./webhooks";
export { initiatePayoutDoc, endpointDocsByPath } from "./endpoint-docs";
