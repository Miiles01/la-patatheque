import { createStore } from "./store";

// Restaurant settings edited from the admin panel (Paramètres).

export type Settings = {
  /**
   * Online ordering for pickup at the counter. Off by default: while off, the site
   * shows no cart, bag or order buttons, and the server refuses orders from it.
   */
  pickup: boolean;
  /** The restaurant delivers. */
  delivery: boolean;
  /** Minimum subtotal before tax for a delivery order. */
  deliveryMinimum: number;
};

const DEFAULTS: Settings = { pickup: false, delivery: false, deliveryMinimum: 10 };
const store = createStore<Partial<Settings>>("patatheque-demo-settings", () => ({}));

// No delivery for now, whatever was saved before.
const resolve = (saved: Partial<Settings>): Settings => ({ ...DEFAULTS, ...saved, delivery: false });

/** Whether customers can order on the site right now. */
export function onlineOrdering() {
  return getSettings().pickup;
}

export function getSettings(): Settings {
  return resolve(store.get());
}

export function saveSettings(patch: Partial<Settings>) {
  store.set({ ...getSettings(), ...patch });
}

export function useSettings() {
  return resolve(store.use());
}
