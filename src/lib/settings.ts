import { useEffect, useState } from "react";

// Restaurant settings edited from the admin panel (Paramètres). The demo keeps
// them in this browser; the real site will read them from the API.

export type Settings = {
  /** Customers can pick their order up at the counter. */
  pickup: boolean;
  /** The restaurant delivers. */
  delivery: boolean;
  /** Minimum subtotal before tax for a delivery order. */
  deliveryMinimum: number;
};

const DEFAULTS: Settings = { pickup: true, delivery: false, deliveryMinimum: 10 };
const KEY = "patatheque-demo-settings";
const CHANGE = "patatheque-settings-change";

export function getSettings(): Settings {
  try {
    // Pickup only for now: delivery stays off whatever an older demo session saved.
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}"), pickup: true, delivery: false };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch };
  // At least one way to get the food must stay on.
  if (!next.pickup && !next.delivery) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function useSettings() {
  const [settings, setSettings] = useState(getSettings);
  useEffect(() => {
    const sync = () => setSettings(getSettings());
    window.addEventListener(CHANGE, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return settings;
}
