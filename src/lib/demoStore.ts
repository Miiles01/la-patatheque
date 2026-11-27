import { api, ApiError, live } from "./api";
import { SAVE_ERROR } from "./store";

// What the site collects: orders, 10 % sign-ups, applications, catering
// requests and click events. The demo keeps them in this browser's
// localStorage; the real site sends them to the API, and the admin panel reads
// them back from it (refresh).

export type OrderLine = { name: string; size?: string; price: number; qty: number; category?: string };

export type OrderStatus = "nouvelle" | "preparation" | "prete" | "terminee";

/**
 * Dishes added to an order after it was sent to the kitchen (a table ordering more).
 * Each round goes through the kitchen on its own: its own status and place in a column.
 */
export type OrderAddition = { at: string; lines: OrderLine[]; status?: OrderStatus; rank?: number; doneAt?: string };

/** What `next` has on top of `prev`: new dishes, and extra quantity of ones already there. */
export function addedLines(prev: OrderLine[], next: OrderLine[]): OrderLine[] {
  const key = (l: OrderLine) => `${l.category ?? ""}|${l.name}|${l.size ?? ""}`;
  const had = new Map<string, number>();
  for (const l of prev) had.set(key(l), (had.get(key(l)) ?? 0) + l.qty);
  const out: OrderLine[] = [];
  for (const l of next) {
    const extra = l.qty - (had.get(key(l)) ?? 0);
    had.set(key(l), Math.max(0, (had.get(key(l)) ?? 0) - l.qty));
    if (extra > 0) out.push({ ...l, qty: extra });
  }
  return out;
}

export type Order = {
  /** "surplace": taken by staff at a table. */
  mode: "emporter" | "livraison" | "surplace";
  /** Table code for an order eaten on site. */
  table?: string;
  /** The waiter closed the table (separate from the kitchen status). */
  closed?: boolean;
  /** Waiter looking after the table (name). */
  server?: string;
  /** When it was marked paid (a finished, paid order leaves the kitchen board a minute later). */
  paidAt?: string;
  /** When the kitchen marked the first round done. */
  doneAt?: string;
  /** Rounds of dishes added after the order was first sent, oldest first. */
  additions?: OrderAddition[];
  /** Position in its kitchen column, set when a card is dragged. */
  rank?: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  when: string;
  notes?: string;
  promoCode?: string;
  /** Anti-abuse signals sent with the order (the server reads and drops them): hidden robot trap, ms spent on the form, site language. */
  website?: string;
  ttf?: number;
  lang?: string;
  /** Taxes and fees added to the bill (see lib/charges). */
  charges?: { id: string; name: string; percent: number; amount: number }[];
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  /** Paid at the counter or to the driver; there is no online payment. */
  paid?: boolean;
};

export type Subscriber = { email: string; consent: boolean; code: string; lang: string; /** Title of the pop-up it came from. */ campaign?: string };

export type Application = {
  /** Opening applied to; missing for a spontaneous application. */
  jobId?: string;
  jobTitle?: string;
  portfolio?: string;
  coverLetter?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  /** Answers to the extra questions set in the admin, with the label as asked. */
  answers?: { label: string; value: string }[];
  cv?: { name: string; size: number; type: string; dataUrl?: string; url?: string };
};

export type CateringRequest = {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  date?: string;
  guests?: string;
  message?: string;
};

export type TrackedRecord = { event: string; [key: string]: unknown };

type Collections = {
  orders: Order;
  subscribers: Subscriber;
  applications: Application;
  catering: CateringRequest;
  events: TrackedRecord;
};

export type Collection = keyof Collections;
export type Stored<T> = T & { id: string; createdAt: string; sample?: boolean };

const KEY = (c: Collection) => `patatheque-demo-${c}`;
const CHANGE = "patatheque-demo-change";

const cache: Partial<Record<Collection, unknown[]>> = {};

export function list<C extends Collection>(c: C): Stored<Collections[C]>[] {
  if (live) return (cache[c] ?? []) as Stored<Collections[C]>[];
  try {
    return JSON.parse(localStorage.getItem(KEY(c)) ?? "[]");
  } catch {
    return [];
  }
}

function write<C extends Collection>(c: C, rows: Stored<Collections[C]>[]) {
  if (live) {
    cache[c] = rows;
  } else {
    try {
      localStorage.setItem(KEY(c), JSON.stringify(rows));
    } catch {
      // Quota or private mode: the demo keeps working, it just won't remember.
    }
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** Real site: reloads a collection from the API (admin panel only). */
export async function refresh(c: Collection) {
  if (!live) return;
  write(c, await api<Stored<Collections[typeof c]>[]>(`records/${c}`));
}

const newRow = <C extends Collection>(data: Collections[C], sample: boolean) =>
  ({
    ...data,
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    ...(sample ? { sample } : {}),
  }) as Stored<Collections[C]>;

/** Saves without waiting (click events, demo samples). */
export function record<C extends Collection>(c: C, data: Collections[C], sample = false): Stored<Collections[C]> {
  if (live) {
    api(`records/${c}`, { method: "POST", body: data }).catch(() => {});
    return newRow(data, sample);
  }
  const row = newRow(data, sample);
  write(c, [row, ...list(c)]);
  return row;
}

/** Saves and waits for the server, which returns the row as stored (its number, totals). Throws on failure. */
export async function submit<C extends Collection>(c: C, data: Collections[C]): Promise<Stored<Collections[C]>> {
  if (!live) return record(c, data);
  return api<Stored<Collections[C]>>(`records/${c}`, { method: "POST", body: data });
}

export function update<C extends Collection>(c: C, id: string, patch: Partial<Collections[C]>) {
  write(
    c,
    list(c).map((r) => (r.id === id ? { ...r, ...patch } : r)),
  );
  if (live) {
    api(`records/${c}/${id}`, { method: "PATCH", body: patch }).catch((e) => {
      window.dispatchEvent(new CustomEvent(SAVE_ERROR, { detail: e instanceof ApiError ? e.message : "Erreur réseau." }));
      refresh(c).catch(() => {});
    });
  }
}

/**
 * An order as the kitchen sees it: the first round (what was ordered at first) and each
 * round added after it. Round 0 keeps its status on the order itself.
 */
export type Round = { n: number; key: string; at: string; lines: OrderLine[]; status: OrderStatus; rank?: number; doneAt?: string };

export const isDone = (s: OrderStatus) => s === "terminee" || s === "prete";

export function orderRounds(o: Stored<Order>): Round[] {
  const adds = o.additions ?? [];
  // The first round is what the order holds minus everything added since.
  const key = (l: OrderLine) => `${l.category ?? ""}|${l.name}|${l.size ?? ""}`;
  const later = new Map<string, number>();
  for (const a of adds) for (const l of a.lines) later.set(key(l), (later.get(key(l)) ?? 0) + l.qty);
  const first: OrderLine[] = [];
  for (const l of o.lines) {
    const take = Math.min(l.qty, later.get(key(l)) ?? 0);
    later.set(key(l), (later.get(key(l)) ?? 0) - take);
    if (l.qty - take > 0) first.push({ ...l, qty: l.qty - take });
  }
  return [
    { n: 0, key: o.id, at: o.createdAt, lines: first, status: o.status, rank: o.rank, doneAt: o.doneAt },
    ...adds.map((a, i) => ({ n: i + 1, key: `${o.id}+${i + 1}`, at: a.at, lines: a.lines, status: a.status ?? "nouvelle", rank: a.rank, doneAt: a.doneAt })),
  ];
}

/** Moves one round of an order through the kitchen (status, place in its column). */
export function updateRound(o: Stored<Order>, n: number, change: { status?: OrderStatus; rank?: number }) {
  // The time it was finished is kept (the server sets its own); moving it back clears it.
  const patch = change.status ? { ...change, doneAt: isDone(change.status) ? new Date().toISOString() : undefined } : change;
  if (n === 0) return update("orders", o.id, patch);
  write(
    "orders",
    list("orders").map((r) => (r.id === o.id ? { ...r, additions: (r.additions ?? []).map((a, i) => (i === n - 1 ? { ...a, ...patch } : a)) } : r)),
  );
  if (live) {
    api(`records/orders/${o.id}`, { method: "PATCH", body: { round: n, ...patch } }).catch((e) => {
      window.dispatchEvent(new CustomEvent(SAVE_ERROR, { detail: e instanceof ApiError ? e.message : "Erreur réseau." }));
      refresh("orders").catch(() => {});
    });
  }
}

/** Deletes one record; on the real site the server deletes it too (and an application's CV). */
export async function remove(c: Collection, id: string) {
  if (live) await api(`records/${c}/${id}`, { method: "DELETE" });
  write(
    c,
    list(c).filter((r) => r.id !== id),
  );
}

export function clear(c: Collection) {
  write(c, []);
}

export function onStoreChange(fn: () => void) {
  window.addEventListener(CHANGE, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(CHANGE, fn);
    window.removeEventListener("storage", fn);
  };
}

/** CSV (Excel-friendly, with BOM) of the given rows and columns. */
export function downloadCsv(filename: string, columns: [string, (row: never) => unknown][], rows: unknown[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [columns.map(([h]) => esc(h)).join(","), ...rows.map((r) => columns.map(([, get]) => esc(get(r as never))).join(","))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
