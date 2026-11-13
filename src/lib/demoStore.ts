import { api, ApiError, live } from "./api";
import { SAVE_ERROR } from "./store";

// What the site collects: orders, 10 % sign-ups, applications, catering
// requests and click events. The demo keeps them in this browser's
// localStorage; the real site sends them to the API, and the admin panel reads
// them back from it (refresh).

export type OrderLine = { name: string; size?: string; price: number; qty: number; category?: string };

export type OrderStatus = "nouvelle" | "preparation" | "prete" | "terminee";

export type Order = {
  mode: "emporter" | "livraison";
  name: string;
  phone: string;
  email?: string;
  address?: string;
  when: string;
  notes?: string;
  promoCode?: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  /** Paid at the counter or to the driver; there is no online payment. */
  paid?: boolean;
};

export type Subscriber = { email: string; consent: boolean; code: string; lang: string };

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
