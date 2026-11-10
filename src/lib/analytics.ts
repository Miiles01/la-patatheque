import { record } from "./demoStore";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type TrackedEvent =
  | "commander_click"
  | "add_to_cart"
  | "order_submitted"
  | "promo_signup"
  | "job_application"
  | "catering_request"
  | "call_click"
  | "directions_click";

/**
 * Pushes to the GTM / GA4 dataLayer (ready for when the tag is added) and keeps
 * a count in the demo store so the admin dashboard can show conversions.
 */
export function track(event: TrackedEvent, params: Record<string, unknown> = {}) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
  record("events", { event, ...params });
}
