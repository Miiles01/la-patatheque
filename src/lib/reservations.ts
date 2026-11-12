import { createStore } from "./store";

// Table reservations. The restaurant switches them on, lists its tables (with
// how many people each seats and what it can accommodate) and sets the booking
// hours; customers pick a date, time and party size and the site assigns the
// smallest free table that fits.

export type TableKind = "table" | "banquette" | "bar" | "terrasse";

export const TABLE_KINDS: Record<TableKind, { fr: string; en: string }> = {
  table: { fr: "Table", en: "Table" },
  banquette: { fr: "Banquette", en: "Booth" },
  bar: { fr: "Comptoir", en: "Counter" },
  terrasse: { fr: "Terrasse", en: "Patio" },
};

export type DiningTable = {
  id: string;
  /** What staff call it: a number by default, or any code ("T4", "Banquette A"). */
  code: string;
  kind: TableKind;
  seats: number;
  /** A high chair can be added at this table. */
  highChair: boolean;
  /** Reachable and roomy enough for a wheelchair. */
  accessible: boolean;
  active: boolean;
};

export type ReservationSettings = {
  enabled: boolean;
  /** First and last time a table can be booked, each day. */
  from: string;
  to: string;
  /** Minutes between bookable times. */
  slotMinutes: number;
  /** How long a table stays held for one booking. */
  durationMinutes: number;
  maxParty: number;
  daysAhead: number;
  /** Questions offered to the customer. */
  askHighChair: boolean;
  askAccessible: boolean;
  askOccasion: boolean;
};

export type BookingStatus = "confirmee" | "arrivee" | "terminee" | "annulee" | "absent";

export type Booking = {
  id: string;
  createdAt: string;
  date: string;
  time: string;
  party: number;
  name: string;
  phone: string;
  email?: string;
  highChairs: number;
  accessible: boolean;
  occasion?: string;
  notes?: string;
  tableId: string;
  status: BookingStatus;
  sample?: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// Fixed ids: until the restaurant edits its tables these are rebuilt on every
// read, and bookings must keep pointing at the same table.
function defaultTables(): DiningTable[] {
  const tables: DiningTable[] = [];
  for (let n = 1; n <= 6; n++) tables.push({ id: `t${n}`, code: String(n), kind: "table", seats: n <= 2 ? 2 : 4, highChair: true, accessible: n <= 4, active: true });
  for (let n = 7; n <= 8; n++) tables.push({ id: `t${n}`, code: String(n), kind: "banquette", seats: 6, highChair: true, accessible: false, active: true });
  return tables;
}

export const tablesStore = createStore<DiningTable[]>("patatheque-demo-tables", defaultTables);

export const reservationSettings = createStore<ReservationSettings>("patatheque-demo-reservation-settings", () => ({
  enabled: false,
  from: "11:30",
  to: "21:00",
  slotMinutes: 30,
  durationMinutes: 90,
  maxParty: 10,
  daysAhead: 30,
  askHighChair: true,
  askAccessible: true,
  askOccasion: true,
}));

export const bookingsStore = createStore<Booking[]>("patatheque-demo-bookings", () => []);

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** Bookable times on a date; past times are left out for today. */
export function slotsFor(date: string, settings: ReservationSettings) {
  const start = toMinutes(settings.from);
  const end = toMinutes(settings.to);
  const now = new Date();
  const nowMin = date === todayIso() ? now.getHours() * 60 + now.getMinutes() + 30 : -1;
  const out: string[] = [];
  for (let m = start; m <= end; m += settings.slotMinutes) if (m > nowMin) out.push(toTime(m));
  return out;
}

/** Tables a booking can't share: same date, overlapping time, not cancelled. */
function busyTables(date: string, time: string, duration: number, bookings: Booking[], ignoreId?: string) {
  const t = toMinutes(time);
  return new Set(
    bookings
      .filter((b) => b.id !== ignoreId && b.date === date && b.status !== "annulee" && b.status !== "absent")
      .filter((b) => Math.abs(toMinutes(b.time) - t) < duration)
      .map((b) => b.tableId),
  );
}

/** Smallest free table that seats the party and meets its needs, or null when full. */
export function findTable(
  req: { date: string; time: string; party: number; highChairs: number; accessible: boolean },
  tables = tablesStore.get(),
  bookings = bookingsStore.get(),
  settings = reservationSettings.get(),
) {
  const busy = busyTables(req.date, req.time, settings.durationMinutes, bookings);
  return (
    tables
      .filter((tb) => tb.active && !busy.has(tb.id))
      .filter((tb) => tb.seats >= req.party)
      .filter((tb) => (req.highChairs > 0 ? tb.highChair : true))
      .filter((tb) => (req.accessible ? tb.accessible : true))
      .sort((a, b) => a.seats - b.seats)[0] ?? null
  );
}

export function addBooking(data: Omit<Booking, "id" | "createdAt" | "status" | "tableId">, sample = false): Booking | null {
  const table = findTable(data);
  if (!table) return null;
  const booking: Booking = {
    ...data,
    id: uid(),
    createdAt: new Date().toISOString(),
    status: "confirmee",
    tableId: table.id,
    ...(sample ? { sample } : {}),
  };
  bookingsStore.set([...bookingsStore.get(), booking]);
  return booking;
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  bookingsStore.set(bookingsStore.get().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

/** Next free number for a new table ("9" after tables 1–8). */
export function nextTableCode(tables: DiningTable[]) {
  const numbers = tables.map((t) => Number(t.code)).filter((n) => Number.isFinite(n));
  return String((numbers.length ? Math.max(...numbers) : 0) + 1);
}

export function newTable(tables: DiningTable[], patch: Partial<DiningTable> = {}): DiningTable {
  return { id: uid(), code: nextTableCode(tables), kind: "table", seats: 4, highChair: false, accessible: true, active: true, ...patch };
}
