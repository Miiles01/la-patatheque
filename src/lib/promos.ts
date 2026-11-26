import { api, live } from "./api";
import { createStore } from "./store";

// Discount codes created in the admin ("Codes promo"). The customer's cart never sees the list: on the real site it asks
// the server whether the code it typed works, and the server decides again when the order comes in.

export type PromoType = "percent" | "amount";

export type Promo = {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  active: boolean;
  /** First / last valid day, YYYY-MM-DD (the last day still counts). */
  startsAt?: string;
  expiresAt?: string;
  /** Uses across all customers; empty = unlimited ("the first 1000"). */
  maxUses?: number;
  oncePerCustomer?: boolean;
  /** Smallest subtotal (before tax) the code applies to. */
  minSubtotal?: number;
  note?: string;
};

/** The code the 10 % welcome pop-up gives out; it works until the restaurant saves its own list. */
export const DEFAULT_PROMOS: Promo[] = [{ id: "welcome", code: "BIENVENUE10", type: "percent", value: 10, active: true }];

export const promosStore = createStore<Promo[]>("patatheque-demo-promos", () => DEFAULT_PROMOS);

export function promoDiscount(p: { type: PromoType; value: number }, subtotal: number) {
  const d = p.type === "amount" ? Math.min(p.value, subtotal) : (subtotal * Math.min(p.value, 100)) / 100;
  return Math.round(d * 100) / 100;
}

export type PromoReason = "unknown" | "inactive" | "early" | "expired" | "used_up" | "already_used" | "min";
export type PromoResult = { ok: true; code: string; type: PromoType; value: number } | { ok: false; reason: PromoReason; minSubtotal?: number };

/** Is this typed code good for this cart? */
export async function checkPromo(code: string, subtotal: number, who: { phone?: string; email?: string } = {}): Promise<PromoResult> {
  const clean = code.trim().toUpperCase();
  if (live) {
    return api<PromoResult>("promos/check", { method: "POST", body: { code: clean, subtotal, ...who } });
  }
  // Demo build: the codes live in this browser (no order history to count uses against).
  const p = promosStore.get().find((x) => x.code.toUpperCase() === clean);
  if (!p) return { ok: false, reason: "unknown" };
  if (!p.active) return { ok: false, reason: "inactive" };
  const today = new Date().toISOString().slice(0, 10);
  if (p.startsAt && today < p.startsAt) return { ok: false, reason: "early" };
  if (p.expiresAt && today > p.expiresAt) return { ok: false, reason: "expired" };
  if (p.minSubtotal && subtotal < p.minSubtotal) return { ok: false, reason: "min", minSubtotal: p.minSubtotal };
  return { ok: true, code: p.code, type: p.type, value: p.value };
}

// A code waiting to be used: the pop-up's "Utiliser maintenant" puts it here and the
// cart applies it as soon as it opens with something in it.
const PENDING = "patatheque-pending-promo";
const PENDING_EVENT = "patatheque-pending-promo";

export function queuePromo(code: string) {
  try {
    sessionStorage.setItem(PENDING, code);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(PENDING_EVENT));
}

export function takePendingPromo(): string | null {
  try {
    const code = sessionStorage.getItem(PENDING);
    if (code) sessionStorage.removeItem(PENDING);
    return code;
  } catch {
    return null;
  }
}

export function onPendingPromo(fn: () => void) {
  window.addEventListener(PENDING_EVENT, fn);
  return () => window.removeEventListener(PENDING_EVENT, fn);
}
