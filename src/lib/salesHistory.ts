import { useEffect, useMemo, useState } from "react";
import { api, live } from "./api";
import type { Order, Stored } from "./demoStore";

// Sales history for the dashboard: sales before taxes (subtotal minus discount) and
// order counts per day, week, month or year. The real site asks the server, which
// has every order; the demo works it out from the orders in this browser.

export type SalesPeriod = "day" | "week" | "month" | "year";
export type SalesPoint = { start: string; count: number; sales: number };

/** Sales before taxes for one order. */
export const beforeTax = (o: Pick<Order, "subtotal" | "discount">) => o.subtotal - (o.discount ?? 0);

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function startOf(d: Date, period: SalesPeriod) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (period === "week") s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  if (period === "month") s.setDate(1);
  if (period === "year") s.setMonth(0, 1);
  return s;
}

function step(d: Date, period: SalesPeriod) {
  const n = new Date(d);
  if (period === "day") n.setDate(n.getDate() + 1);
  if (period === "week") n.setDate(n.getDate() + 7);
  if (period === "month") n.setMonth(n.getMonth() + 1);
  if (period === "year") n.setFullYear(n.getFullYear() + 1);
  return n;
}

/** Same grouping as the server (server/api sales_history), for the demo build. */
export function groupSales(orders: Stored<Order>[], period: SalesPeriod): SalesPoint[] {
  const sums = new Map<string, { count: number; sales: number }>();
  let first: Date | null = null;
  for (const o of orders) {
    const at = new Date(o.createdAt);
    const key = iso(startOf(at, period));
    const cur = sums.get(key) ?? { count: 0, sales: 0 };
    sums.set(key, { count: cur.count + 1, sales: cur.sales + beforeTax(o) });
    if (!first || at < first) first = at;
  }
  const now = startOf(new Date(), period);
  const from = new Date(now);
  if (period === "day") from.setDate(from.getDate() - 29);
  if (period === "week") from.setDate(from.getDate() - 7 * 11);
  if (period === "month") from.setMonth(from.getMonth() - 11);
  const start = period === "year" ? (first ? startOf(first, "year") : now) : from;
  const out: SalesPoint[] = [];
  for (let d = start; d <= now; d = step(d, period)) {
    const s = sums.get(iso(d));
    out.push({ start: iso(d), count: s?.count ?? 0, sales: Math.round((s?.sales ?? 0) * 100) / 100 });
  }
  return out;
}

/** History for the chosen period; refreshed when the orders change (new order, status…). */
export function useSalesHistory(period: SalesPeriod, orders: Stored<Order>[]) {
  const signature = `${orders.length}|${orders[0]?.id ?? ""}`;
  // Demo: worked out from the orders in this browser, in the same render as the tab change.
  const local = useMemo(() => (live ? null : groupSales(orders, period)), [period, signature]); // eslint-disable-line react-hooks/exhaustive-deps
  // Real site: tagged with its period, so a tab never shows the previous tab's numbers.
  const [fetched, setFetched] = useState<{ period: SalesPeriod; points: SalesPoint[] } | null>(null);
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    api<SalesPoint[]>(`stats/sales?period=${period}`)
      .catch(() => groupSales(orders, period))
      .then((points) => !cancelled && setFetched({ period, points }));
    return () => {
      cancelled = true;
    };
  }, [period, signature]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!live) return local;
  return fetched?.period === period ? fetched.points : null;
}
