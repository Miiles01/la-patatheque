// Demo storage: everything the site collects is kept in this browser's
// localStorage so the admin dashboard can show it without a backend. The real
// site will post the same records to the API instead.

export type OrderLine = { name: string; size?: string; price: number; qty: number };

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
};

export type Subscriber = { email: string; consent: boolean; code: string; lang: string };

export type Application = {
  name: string;
  email: string;
  phone: string;
  message: string;
  cv?: { name: string; size: number; type: string; dataUrl?: string };
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

export function list<C extends Collection>(c: C): Stored<Collections[C]>[] {
  try {
    return JSON.parse(localStorage.getItem(KEY(c)) ?? "[]");
  } catch {
    return [];
  }
}

function write<C extends Collection>(c: C, rows: Stored<Collections[C]>[]) {
  try {
    localStorage.setItem(KEY(c), JSON.stringify(rows));
  } catch {
    // Quota or private mode: the demo keeps working, it just won't remember.
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function record<C extends Collection>(c: C, data: Collections[C], sample = false): Stored<Collections[C]> {
  const row = {
    ...data,
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    ...(sample ? { sample } : {}),
  } as Stored<Collections[C]>;
  write(c, [row, ...list(c)]);
  return row;
}

export function update<C extends Collection>(c: C, id: string, patch: Partial<Collections[C]>) {
  write(
    c,
    list(c).map((r) => (r.id === id ? { ...r, ...patch } : r)),
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
