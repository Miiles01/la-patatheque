import { useMemo } from "react";
import { createStore } from "./store";

// Taxes and extra fees added to an order's bill, set up in the admin (Paramètres → Taxes et frais).
// Everything starts switched off: until the restaurant turns one on, an order's total is just what was ordered
// (minus any discount code). Each active charge is a percentage of the amount after the discount; the server works
// them out again when the order comes in.

export type Charge = {
  id: string;
  /** What the bill says, e.g. "IVA", "TPS", "Frais de service". */
  name: string;
  kind: "tax" | "fee";
  percent: number;
  enabled: boolean;
};

export const DEFAULT_CHARGES: Charge[] = [{ id: "iva", name: "IVA", kind: "tax", percent: 0, enabled: false }];

export const chargesStore = createStore<Charge[]>("patatheque-demo-charges", () => DEFAULT_CHARGES);

export type ChargeLine = { id: string; name: string; percent: number; amount: number };

export const activeCharges = (list: Charge[]) => list.filter((c) => c.enabled && c.percent > 0 && c.name.trim() !== "");

/** The lines to add under a base amount (subtotal after discount) and the total with them. */
export function computeCharges(base: number, list: Charge[]): { lines: ChargeLine[]; total: number } {
  const lines = activeCharges(list).map((c) => ({ id: c.id, name: c.name.trim(), percent: c.percent, amount: Math.round(base * c.percent) / 100 }));
  const total = Math.round((base + lines.reduce((n, l) => n + l.amount, 0)) * 100) / 100;
  return { lines, total };
}

export function useCharges() {
  const list = chargesStore.use();
  return useMemo(() => activeCharges(list), [list]);
}
