import { useEffect } from "react";
import { useConsent } from "./consent";
import type { Route } from "./router";

// Meta Pixel. Only on the real site (the id is set at build time by
// scripts/deploy-hostinger.sh, so the GitHub Pages demo never sends anything),
// only once the visitor has accepted, and never in the staff admin panel.

export const PIXEL_ID = (import.meta.env.VITE_META_PIXEL as string | undefined) ?? "";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][]; loaded: boolean; version: string; push: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Meta's loader, as in their snippet: queues calls until fbevents.js arrives. */
function load() {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = window._fbq ?? fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", PIXEL_ID);
}

/** Set when the visitor withdrew consent after the pixel had loaded in this visit. */
let revoked = false;

/** Loads the pixel after consent and sends a PageView for each page visited. */
export function useMetaPixel(route: Route) {
  const consent = useConsent();
  useEffect(() => {
    if (!PIXEL_ID || route === "/admin") return;
    if (consent === "accepted") {
      load();
      if (revoked) window.fbq?.("consent", "grant");
      revoked = false;
      window.fbq?.("track", "PageView");
    } else if (consent === "refused" && window.fbq && !revoked) {
      // Accepted earlier in this visit, then withdrew: stop sending.
      window.fbq("consent", "revoke");
      revoked = true;
    }
  }, [route, consent]);
}
