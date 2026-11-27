import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  addBooking,
  bookingsStore,
  newTable,
  reservationSettings,
  slotsFor,
  TABLE_KINDS,
  tablesStore,
  todayIso,
  updateBooking,
  type Booking,
  type DiningTable,
  type TableKind,
} from "../../lib/reservations";
import { ActivationButton, BackButton, Card, ConfirmDialog, Empty, SectionHead, SegmentedTabs, Toggle } from "./ui";

// ---------------------------------------------------------------- icons

const svg = (children: ReactNode, cls = "w-5 h-5") => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
    {children}
  </svg>
);

export const KIND_ICONS: Record<TableKind, ReactNode> = {
  table: svg(<><rect x="4" y="8" width="16" height="4" rx="1" /><path d="M7 12v7M17 12v7" /></>),
  banquette: svg(<><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><path d="M3 11h18v5H3zM5 16v3M19 16v3" /></>),
  bar: svg(<><circle cx="12" cy="6" r="3" /><path d="M12 9v11M8 20h8M9 14h6" /></>),
  terrasse: svg(<><path d="M3 10a9 6 0 0 1 18 0z" /><path d="M12 10v10M8 20h8" /></>),
};
const PersonIcon = ({ cls }: { cls?: string }) => svg(<><circle cx="12" cy="7" r="3.2" /><path d="M5.5 20c.8-4 3.4-6 6.5-6s5.7 2 6.5 6" /></>, cls);
const BabyIcon = () => svg(<><path d="M8 4h8v7H8zM6 11h12M8 11l-2 9M16 11l2 9M7 16h10" /></>, "w-4 h-4");
const WheelchairIcon = () => svg(<><circle cx="10" cy="4.5" r="1.6" /><path d="M10 7v6h5l2 5" /><path d="M14.5 18a5 5 0 1 1-6-6.8" /></>, "w-4 h-4");
const GiftIcon = () => svg(<><rect x="4" y="9" width="16" height="11" rx="1" /><path d="M3 9h18v3H3zM12 9v11M12 9c-2-4-6-4-6-1.5S12 9 12 9zM12 9c2-4 6-4 6-1.5S12 9 12 9z" /></>, "w-4 h-4");

const dayFmt = new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long" });
const shiftDay = (iso: string, by: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + by);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------- view

type Sub = "agenda" | "tables" | "settings";

export function ReservationsView() {
  const settings = reservationSettings.use();
  const [sub, setSub] = useState<Sub>("agenda");

  return (
    <>
      <SectionHead title="Réservations" desc="Les clients réservent une table sur le site ; chaque réservation reçoit automatiquement une table libre adaptée." />


      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          id="reservations-view"
          label="Section"
          value={sub}
          onChange={setSub}
          items={[
            { id: "agenda", label: "Agenda", icon: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></> },
            { id: "tables", label: "Tables", icon: <path d="M3 9h18M5 9v10M19 9v10M8 9l1-4h6l1 4M9 14h6" strokeLinecap="round" strokeLinejoin="round" /> },
            { id: "settings", label: "Réglages", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></> },
          ]}
        />
        <ActivationButton
          on={settings.enabled}
          what="les réservations en ligne"
          status={{ on: "Réservations en ligne activées", off: "Réservations en ligne désactivées" }}
          onChange={(enabled) => reservationSettings.set({ ...settings, enabled })}
        />
      </div>

      {sub === "agenda" && <Agenda />}
      {sub === "tables" && <Tables />}
      {sub === "settings" && <BookingSettings />}
    </>
  );
}

// ---------------------------------------------------------------- agenda

function Agenda() {
  const bookings = bookingsStore.use();
  const tables = tablesStore.use();
  const settings = reservationSettings.use();
  const [date, setDate] = useState(todayIso);
  const [adding, setAdding] = useState(false);
  // Search across every day: name, phone (digits) or booking number.
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const found = q
    ? bookings
        .filter((b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || (digits.length >= 3 && b.phone.replace(/\D/g, "").includes(digits)))
        .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time))
    : [];

  const day = bookings.filter((b) => b.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const active = day.filter((b) => b.status !== "annulee" && b.status !== "absent");
  const guests = active.reduce((n, b) => n + b.party, 0);
  const tableOf = (b: Booking) => tables.find((t) => t.id === b.tableId);

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher une réservation : nom, téléphone ou numéro…"
          aria-label="Chercher une réservation"
          className="w-full rounded-full border border-ink/15 bg-white py-3 pl-12 pr-4 text-sm focus:border-red-600 focus:outline-none"
        />
      </label>

      {q ? (
        found.length ? (
          <>
            <p className="text-sm text-ink/55">
              {found.length} réservation{found.length > 1 ? "s" : ""} trouvée{found.length > 1 ? "s" : ""}
            </p>
            <ul className="flex flex-col gap-2">
              {found.map((b) => (
                <BookingRow key={b.id} b={b} table={tableOf(b)} showDate />
              ))}
            </ul>
          </>
        ) : (
          <Empty text="Aucune réservation ne correspond." />
        )
      ) : (
      <>
      <Card className="flex flex-wrap items-center gap-3">
        <button onClick={() => setDate(shiftDay(date, -1))} aria-label="Jour précédent" className="h-9 w-9 rounded-full border border-ink/15 hover:bg-ink/5">
          ‹
        </button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-ink/15 px-3 py-2 text-sm" />
        <button onClick={() => setDate(shiftDay(date, 1))} aria-label="Jour suivant" className="h-9 w-9 rounded-full border border-ink/15 hover:bg-ink/5">
          ›
        </button>
        <span className="font-semibold capitalize">{dayFmt.format(new Date(`${date}T12:00:00`))}</span>
        {date !== todayIso() && (
          <button onClick={() => setDate(todayIso())} className="text-xs font-bold text-red-600">
            Aujourd'hui
          </button>
        )}
        <span className="ml-auto flex items-center gap-4 text-sm text-ink/60">
          <span>
            <strong className="text-ink">{active.length}</strong> réservation{active.length > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <PersonIcon cls="w-4 h-4" /> <strong className="text-ink">{guests}</strong>
          </span>
        </span>
      </Card>

      {!day.length ? (
        <Empty text={settings.enabled ? "Aucune réservation ce jour-là." : "Aucune réservation. Activez les réservations pour que les clients puissent réserver sur le site."} />
      ) : (
        <ul className="flex flex-col gap-2">
          {day.map((b) => (
            <BookingRow key={b.id} b={b} table={tableOf(b)} />
          ))}
        </ul>
      )}

      </>
      )}

      {/* Stays at the bottom of the screen while scrolling, centred on the page. */}
      <div className="pointer-events-none sticky bottom-6 z-30 mt-2 flex justify-center">
        <button
          onClick={() => setAdding(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-red-600 py-3.5 pl-4 pr-5 text-sm font-bold text-paper shadow-lg shadow-red-600/25 hover:bg-red-700 transition-colors"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper/20 text-lg leading-none">+</span>
          Ajouter une réservation
        </button>
      </div>
      {adding && <PhoneBooking date={date} onDone={() => setAdding(false)} />}
    </div>
  );
}

const shortDay = new Intl.DateTimeFormat("fr-CA", { weekday: "short", day: "numeric", month: "short" });

/** One booking: time, guest, party, table, needs and status. With the date when listed from a search. */
function BookingRow({ b, table, showDate = false }: { b: Booking; table?: DiningTable; showDate?: boolean }) {
  return (
    <li className={`rounded-2xl bg-white border border-ink/10 p-4 flex flex-wrap items-center gap-x-5 gap-y-3 ${b.status === "annulee" ? "opacity-50" : ""}`}>
      <span className="w-16 font-display font-black text-2xl tabular-nums">
      {b.time}
      {showDate && <span className="block font-sans text-xs font-semibold text-ink/50 capitalize">{shortDay.format(new Date(`${b.date}T12:00:00`))}</span>}
    </span>
      <div className="flex-1 min-w-[180px]">
        <p className="font-semibold">
          {b.name}
          {b.sample && <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink/45">Exemple</span>}
        </p>
        <a href={`tel:${b.phone}`} className="text-sm text-red-600 font-semibold">
          {b.phone}
        </a>
        {b.notes && <p className="text-xs text-ink/55 mt-1">« {b.notes} »</p>}
      </div>
      <span className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-sm font-semibold" title="Personnes">
        <PersonIcon cls="w-4 h-4" /> {b.party}
      </span>
      {table && (
        <span className="flex items-center gap-1.5 rounded-full bg-red-600/8 px-3 py-1.5 text-sm font-semibold text-red-700" title={TABLE_KINDS[table.kind].fr}>
          <span className="[&_svg]:w-4 [&_svg]:h-4">{KIND_ICONS[table.kind]}</span> {table.code}
        </span>
      )}
      <span className="flex items-center gap-1 text-ink/60">
        {b.highChairs > 0 && (
          <span title={`${b.highChairs} chaise(s) haute(s)`} className="flex items-center gap-0.5 rounded-full bg-orange/15 px-2 py-1 text-xs font-bold text-ink">
            <BabyIcon /> {b.highChairs}
          </span>
        )}
        {b.accessible && (
          <span title="Accès fauteuil roulant" className="rounded-full bg-ink/5 p-1.5">
            <WheelchairIcon />
          </span>
        )}
        {b.occasion && (
          <span title={b.occasion} className="flex items-center gap-1 rounded-full bg-ink/5 px-2 py-1 text-xs">
            <GiftIcon /> {b.occasion}
          </span>
        )}
      </span>
      {/* Two states only: booked (« Prévue ») and here (« Arrivée »). */}
      <select
        value={b.status === "arrivee" ? "arrivee" : "confirmee"}
        onChange={(e) => updateBooking(b.id, { status: e.target.value as "confirmee" | "arrivee" })}
        aria-label={`Statut de la réservation de ${b.name}`}
        className={`rounded-full border-0 px-3 py-2 text-xs font-bold ${b.status === "arrivee" ? "bg-green-700/10 text-green-800" : "bg-ink/5 text-ink"}`}
      >
        <option value="confirmee">Prévue</option>
        <option value="arrivee">Arrivée</option>
      </select>
    </li>
  );
}

/** For bookings taken by phone or at the counter: same rules as the site. */
function PhoneBooking({ date: initialDate, onDone }: { date: string; onDone: () => void }) {
  const settings = reservationSettings.use();
  const [date, setDate] = useState(initialDate);
  const slots = slotsFor(date, settings);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = "w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm focus:border-red-600 focus:outline-none";
  const label = "flex flex-col gap-1.5 text-xs font-semibold text-ink/60";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    const booking = await addBooking({
      date,
      time: String(f.get("time")),
      party: Number(f.get("party")),
      name: String(f.get("name")),
      phone: String(f.get("phone")),
      highChairs: Number(f.get("highChairs") || 0),
      accessible: f.get("accessible") === "on",
      notes: String(f.get("notes") || "") || undefined,
    }).catch((err: Error) => {
      setError(err.message);
      return undefined;
    });
    setBusy(false);
    if (booking === undefined) return;
    if (!booking) setError("Aucune table libre pour ce nombre de personnes à cette heure. Essayez une autre heure.");
    else onDone();
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-ink/50 sm:p-6" onClick={onDone} data-lenis-prevent>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 text-ink shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="booking-title" className="font-display font-extrabold text-xl">
            Nouvelle réservation
          </h2>
          <button onClick={onDone} aria-label="Fermer" className="relative h-9 w-9 rounded-full text-ink/60 hover:bg-ink/5">
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 bg-current rotate-45" />
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 bg-current -rotate-45" />
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <label className={`${label} col-span-2`}>
            Au nom de
            <input name="name" required autoComplete="off" className={field} />
          </label>
          <label className={`${label} col-span-2`}>
            Téléphone
            <input name="phone" type="tel" required autoComplete="off" className={field} />
          </label>
          <label className={label}>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={field} />
          </label>
          <label className={label}>
            Heure
            <select name="time" required className={field}>
              {slots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Personnes
            <input name="party" type="number" min={1} max={settings.maxParty} defaultValue={2} required className={field} />
          </label>
          <label className={label}>
            Chaises hautes
            <input name="highChairs" type="number" min={0} max={4} defaultValue={0} className={field} />
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input name="accessible" type="checkbox" className="h-4 w-4 accent-red-600" /> Accès fauteuil roulant
          </label>
          <label className={`${label} col-span-2`}>
            Note (facultatif)
            <input name="notes" className={field} />
          </label>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !slots.length}
            className="col-span-2 mt-1 rounded-full bg-red-600 px-5 py-3.5 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Réservation…" : slots.length ? "Réserver" : "Plus d'heure libre ce jour-là"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- tables

/**
 * The dining tables: shared by Réservations and the Tables pop-up in Commandes.
 * A grid (adding a table always comes first); adding or changing one opens its own
 * screen, saved with OK, which goes back to the grid.
 */
export function Tables() {
  const tables = tablesStore.use();
  // null: the grid; "new": adding; otherwise the id of the table being changed.
  const [screen, setScreen] = useState<string | null>(null);
  const seats = tables.filter((t) => t.active).reduce((n, t) => n + t.seats, 0);
  const editing = screen && screen !== "new" ? tables.find((t) => t.id === screen) : undefined;
  // The table just deleted from the grid, for a few seconds, to undo.
  const [removed, setRemoved] = useState<{ table: DiningTable; index: number } | null>(null);
  useEffect(() => {
    if (!removed) return;
    const t = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(t);
  }, [removed]);

  if (screen === "new" || editing) {
    return (
      <TableForm
        key={screen}
        tables={tables}
        table={editing}
        onDone={() => setScreen(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink/60">
        <strong className="text-ink">{tables.filter((t) => t.active).length} tables</strong> · {seats} places au total. Touchez une table pour la modifier.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Always the first card. */}
        <button
          onClick={() => setScreen("new")}
          className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 text-ink/50 transition-colors hover:border-red-600 hover:text-red-600"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-xl leading-none text-paper">+</span>
          <span className="text-sm font-bold">Ajouter une table</span>
        </button>
        {tables.map((t, i) => (
          <div key={t.id} className="group relative">
          <button
            onClick={() => setScreen(t.id)}
            className={`relative h-full w-full text-left rounded-2xl border border-ink/10 bg-white p-4 transition-colors hover:border-ink/30 ${t.active ? "" : "opacity-45"}`}
          >
            <div className="flex items-start justify-between">
              <span className="text-red-600 [&_svg]:w-7 [&_svg]:h-7">{KIND_ICONS[t.kind]}</span>
              <span className="font-display font-black text-2xl">{t.code}</span>
            </div>
            <p className="mt-3 text-xs font-semibold text-ink/50">{TABLE_KINDS[t.kind].fr}</p>
            <p className="mt-0.5 flex items-center gap-1 font-semibold">
              <PersonIcon cls="w-4 h-4" /> {t.seats} pers.
            </p>
            <div className="mt-2 flex gap-1 text-ink/55">
              {t.highChair && (
                <span title="Chaise haute possible" className="rounded-full bg-orange/15 p-1">
                  <BabyIcon />
                </span>
              )}
              {t.accessible && (
                <span title="Accessible en fauteuil roulant" className="rounded-full bg-ink/5 p-1">
                  <WheelchairIcon />
                </span>
              )}
              {!t.active && <span className="text-[10px] font-bold uppercase">Non réservable</span>}
            </div>
          </button>
          {/* Quick delete on hover (always shown, faintly, on touch screens); « Annuler » brings it back. */}
          <button
            onClick={() => {
              tablesStore.set(tables.filter((x) => x.id !== t.id));
              setRemoved({ table: t, index: i });
            }}
            aria-label={`Supprimer la table ${t.code}`}
            title="Supprimer"
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink/40 opacity-0 ring-1 ring-ink/10 transition-all hover:bg-red-600 hover:text-paper hover:ring-red-600 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          </div>
        ))}
      </div>
      {removed && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-4 rounded-full bg-ink py-2.5 pl-5 pr-2.5 text-sm text-paper shadow-xl">
          Table {removed.table.code} supprimée
          <button
            onClick={() => {
              const now = tablesStore.get();
              tablesStore.set([...now.slice(0, removed.index), removed.table, ...now.slice(removed.index)]);
              setRemoved(null);
            }}
            className="rounded-full bg-paper/15 px-4 py-1.5 font-bold hover:bg-paper/25"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

/** One table on its own screen: new (numbered after the last) or one to change or delete. */
function TableForm({ tables, table, onDone }: { tables: DiningTable[]; table?: DiningTable; onDone: () => void }) {
  const [draft, setDraft] = useState<DiningTable>(() => table ?? newTable(tables));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulk, setBulk] = useState({ count: 4, seats: 4, kind: "table" as TableKind });
  const set = (patch: Partial<DiningTable>) => setDraft((d) => ({ ...d, ...patch }));
  const code = draft.code.trim();
  const taken = tables.some((t) => t.id !== draft.id && t.code.trim().toLowerCase() === code.toLowerCase());

  function ok() {
    if (!code || taken) return;
    const saved = { ...draft, code };
    tablesStore.set(table ? tables.map((t) => (t.id === table.id ? saved : t)) : [...tables, saved]);
    onDone();
  }

  function addMany() {
    const next = [...tables];
    for (let i = 0; i < bulk.count; i++) next.push(newTable(next, { kind: bulk.kind, seats: bulk.seats, accessible: bulk.kind !== "bar" }));
    tablesStore.set(next);
    onDone();
  }

  const check = (on: boolean, label: string, icon: ReactNode, key: "highChair" | "accessible" | "active") => (
    <label className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm cursor-pointer ${on ? "border-red-600/40 bg-red-600/5 font-semibold" : "border-ink/10 text-ink/60"}`}>
      <input type="checkbox" checked={on} onChange={(e) => set({ [key]: e.target.checked })} className="h-4 w-4 accent-red-600" />
      {icon}
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="self-start">
        <BackButton label="Tables" onClick={onDone} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ok();
        }}
        className="flex flex-col gap-6"
      >
        <h3 className="font-display text-2xl font-extrabold">{table ? `Table ${table.code}` : "Nouvelle table"}</h3>

        <div className="flex flex-wrap items-start gap-6">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Numéro
            <input
              value={draft.code}
              onChange={(e) => set({ code: e.target.value })}
              autoFocus={!table}
              aria-invalid={taken}
              className={`w-32 rounded-xl border-2 px-3 py-2 font-display text-3xl font-black ${taken ? "border-red-600" : "border-ink/15"}`}
            />
            <span className={`text-xs font-normal ${taken ? "font-semibold text-red-600" : "text-ink/45"}`}>
              {taken ? "Ce numéro existe déjà." : table ? "Le numéro de la table." : "Le suivant ; vous pouvez le changer."}
            </span>
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-semibold">
            Personnes
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => set({ seats: Math.max(1, draft.seats - 1) })} aria-label="Une personne de moins" className="h-12 w-12 rounded-xl border-2 border-ink/15 text-xl">
                −
              </button>
              <span className="w-14 text-center font-display text-3xl font-black tabular-nums">{draft.seats}</span>
              <button type="button" onClick={() => set({ seats: Math.min(20, draft.seats + 1) })} aria-label="Une personne de plus" className="h-12 w-12 rounded-xl border-2 border-ink/15 text-xl">
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm font-semibold">
          Type
          <KindPicker value={draft.kind} onChange={(kind) => set({ kind })} />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {check(draft.highChair, "Chaise haute (enfants)", <BabyIcon />, "highChair")}
          {check(draft.accessible, "Fauteuil roulant", <WheelchairIcon />, "accessible")}
          {check(draft.active, "Réservable", <PersonIcon cls="w-4 h-4" />, "active")}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-ink/10 pt-5">
          <button type="submit" disabled={!code || taken} className="rounded-full bg-red-600 px-8 py-3.5 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-40">
            OK
          </button>
          <button type="button" onClick={onDone} className="rounded-full px-5 py-3.5 text-sm font-bold text-ink/60 hover:bg-ink/5">
            Annuler
          </button>
          {table && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto rounded-full px-5 py-3.5 text-sm font-bold text-red-600 hover:bg-red-600/10">
              Supprimer la table
            </button>
          )}
        </div>
      </form>

      {!table && (
        <details className="rounded-2xl border border-ink/10 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Ajouter plusieurs tables d'un coup</summary>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="number" min={1} max={30} value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: Number(e.target.value) })} className="w-16 rounded-lg border border-ink/15 px-2 py-1.5 text-center" />
              tables de
            </label>
            <label className="flex items-center gap-2">
              <input type="number" min={1} max={20} value={bulk.seats} onChange={(e) => setBulk({ ...bulk, seats: Number(e.target.value) })} className="w-16 rounded-lg border border-ink/15 px-2 py-1.5 text-center" />
              personnes,
            </label>
            <KindPicker value={bulk.kind} onChange={(kind) => setBulk({ ...bulk, kind })} />
            <button type="button" onClick={addMany} className="rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-paper">
              Ajouter {bulk.count} tables
            </button>
          </div>
          <p className="mt-2 text-xs text-ink/45">Numérotées à la suite des autres.</p>
        </details>
      )}

      {confirmDelete && table && (
        <ConfirmDialog
          title={`Supprimer la table ${table.code} ?`}
          text="Elle disparaît des tables et des réservations futures. Les commandes déjà prises ne changent pas."
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            tablesStore.set(tables.filter((t) => t.id !== table.id));
            onDone();
          }}
        />
      )}
    </div>
  );
}

function KindPicker({ value, onChange }: { value: TableKind; onChange: (k: TableKind) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(TABLE_KINDS) as TableKind[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${value === k ? "bg-red-600 text-paper" : "bg-ink/5 text-ink/65 hover:bg-ink/10"}`}
        >
          <span className="[&_svg]:w-4 [&_svg]:h-4">{KIND_ICONS[k]}</span>
          {TABLE_KINDS[k].fr}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- settings

function BookingSettings() {
  const s = reservationSettings.use();
  const set = (patch: Partial<typeof s>) => reservationSettings.set({ ...s, ...patch });
  const row = "flex flex-wrap items-center justify-between gap-4 py-4";
  const num = "w-20 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-right tabular-nums";

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="divide-y divide-ink/10 -my-5">
          <Toggle label="Réservations en ligne" desc="Affiche « Réserver une table » sur le site." on={s.enabled} onChange={(v) => set({ enabled: v })} />
        </div>
      </Card>
      <Card>
        <h2 className="font-display font-bold text-lg mb-1">Heures et durée</h2>
        <div className="divide-y divide-ink/10">
          <div className={row}>
            <span>
              <span className="block font-semibold">Heures de réservation</span>
              <span className="block text-sm text-ink/55">Première et dernière heure proposées chaque jour.</span>
            </span>
            <span className="flex items-center gap-2">
              <input type="time" value={s.from} onChange={(e) => set({ from: e.target.value })} className="rounded-xl border-2 border-ink/15 px-3 py-2" />
              –
              <input type="time" value={s.to} onChange={(e) => set({ to: e.target.value })} className="rounded-xl border-2 border-ink/15 px-3 py-2" />
            </span>
          </div>
          <div className={row}>
            <span>
              <span className="block font-semibold">Intervalle entre les heures</span>
              <span className="block text-sm text-ink/55">Ex. 30 min : 18 h, 18 h 30, 19 h…</span>
            </span>
            <select value={s.slotMinutes} onChange={(e) => set({ slotMinutes: Number(e.target.value) })} className="rounded-xl border-2 border-ink/15 px-3 py-2">
              {[15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
          <div className={row}>
            <span>
              <span className="block font-semibold">Durée d'une réservation</span>
              <span className="block text-sm text-ink/55">Temps pendant lequel la table est bloquée.</span>
            </span>
            <select value={s.durationMinutes} onChange={(e) => set({ durationMinutes: Number(e.target.value) })} className="rounded-xl border-2 border-ink/15 px-3 py-2">
              {[60, 75, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? m % 60 : ""}`.trim() : `${m} min`}
                </option>
              ))}
            </select>
          </div>
          <div className={row}>
            <span className="font-semibold">Groupe maximum en ligne</span>
            <span className="flex items-center gap-2 text-sm">
              <input type="number" min={1} max={30} value={s.maxParty} onChange={(e) => set({ maxParty: Number(e.target.value) })} className={num} /> personnes
            </span>
          </div>
          <div className={row}>
            <span className="font-semibold">Réserver jusqu'à</span>
            <span className="flex items-center gap-2 text-sm">
              <input type="number" min={1} max={120} value={s.daysAhead} onChange={(e) => set({ daysAhead: Number(e.target.value) })} className={num} /> jours à l'avance
            </span>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="font-display font-bold text-lg mb-1">Questions aux clients</h2>
        <div className="divide-y divide-ink/10">
          <Toggle label="Chaise haute pour bébé" desc="Le client indique combien il en faut ; seules les tables compatibles sont proposées." on={s.askHighChair} onChange={(v) => set({ askHighChair: v })} />
          <Toggle label="Accès fauteuil roulant" desc="Réserve une table accessible." on={s.askAccessible} onChange={(v) => set({ askAccessible: v })} />
          <Toggle label="Occasion spéciale" desc="Anniversaire, fête… pour préparer une attention." on={s.askOccasion} onChange={(v) => set({ askOccasion: v })} />
        </div>
      </Card>
    </div>
  );
}

