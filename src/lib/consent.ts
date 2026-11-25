import { useEffect, useState } from "react";

// The visitor's choice about advertising cookies (Meta Pixel). Nothing beyond
// what the site needs to work loads until they accept (Quebec Law 25; see the
// privacy policy, section 8). Stored in this browser only.

export type Consent = "accepted" | "refused" | null;

const KEY = "patatheque-consent";
const CHANGE = "patatheque-consent-change";
const OPEN = "patatheque-consent-open";

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "refused" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: Exclude<Consent, null>) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Storage blocked: the choice lasts for this visit.
  }
  window.dispatchEvent(new CustomEvent(CHANGE, { detail: v }));
}

export function useConsent() {
  const [consent, set] = useState<Consent>(getConsent);
  useEffect(() => {
    const sync = (e: Event) => set((e as CustomEvent<Consent>).detail ?? getConsent());
    window.addEventListener(CHANGE, sync);
    return () => window.removeEventListener(CHANGE, sync);
  }, []);
  return consent;
}

/** Shows the banner again (footer link "Témoins"), to change one's mind. */
export function openConsent() {
  window.dispatchEvent(new Event(OPEN));
}

export function onConsentOpen(fn: () => void) {
  window.addEventListener(OPEN, fn);
  return () => window.removeEventListener(OPEN, fn);
}
