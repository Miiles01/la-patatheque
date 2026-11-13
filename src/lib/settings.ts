import { createStore } from "./store";

// Restaurant settings edited from the admin panel (Paramètres).

export type Settings = {
  /** Customers can pick their order up at the counter. */
  pickup: boolean;
  /** The restaurant delivers. */
  delivery: boolean;
  /** Minimum subtotal before tax for a delivery order. */
  deliveryMinimum: number;
};

const DEFAULTS: Settings = { pickup: true, delivery: false, deliveryMinimum: 10 };
const store = createStore<Partial<Settings>>("patatheque-demo-settings", () => ({}));

// Pickup only for now: delivery stays off whatever was saved before.
const resolve = (saved: Partial<Settings>): Settings => ({ ...DEFAULTS, ...saved, pickup: true, delivery: false });

export function getSettings(): Settings {
  return resolve(store.get());
}

export function saveSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch };
  // At least one way to get the food must stay on.
  if (!next.pickup && !next.delivery) return;
  store.set(next);
}

export function useSettings() {
  return resolve(store.use());
}
