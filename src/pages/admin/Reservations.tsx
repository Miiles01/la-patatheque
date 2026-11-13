import { useState, type FormEvent, type ReactNode } from "react";
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
  type BookingStatus,
  type DiningTable,
  type TableKind,
} from "../../lib/reservations";
import { Card, Empty, SectionHead, Toggle } from "./ui";

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

const STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  confirmee: { label: "Confirmée", cls: "bg-ink/5 text-ink" },
  arrivee: { label: "Arrivée", cls: "bg-green-700/10 text-green-800" },
  terminee: { label: "Terminée", cls: "bg-ink/5 text-ink/50" },
  annulee: { label: "Annulée", cls: "bg-red-600/10 text-red-700" },
  absent: { label: "Absente", cls: "bg-orange/15 text-ink" },
};

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
  const pill = (active: boolean) =>
    `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${active ? "bg-ink text-paper" : "bg-ink/5 text-ink/65 hover:bg-ink/10"}`;

  return (
    <>
      <SectionHead title="Réservations" desc="Les clients réservent une table sur le site ; chaque réservation reçoit automatiquement une table libre adaptée." />

      {!settings.enabled && (
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-ink/10 bg-ink/[0.03] p-4">
          <p className="flex-1 text-sm text-ink/70">
            <strong>Les réservations en ligne sont désactivées.</strong> Préparez vos tables et vos heures, puis activez-les : le bouton « Réserver une table » apparaîtra sur le site.
          </p>
          <button onClick={() => reservationSettings.set({ ...settings, enabled: true })} className="shrink-0 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-700">
            Activer les réservations
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setSub("agenda")} className={pill(sub === "agenda")}>
          {svg(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>, "w-4 h-4")} Agenda
        </button>
        <button onClick={() => setSub("tables")} className={pill(sub === "tables")}>
          <span className="[&_svg]:w-4 [&_svg]:h-4">{KIND_ICONS.table}</span> Tables
        </button>
        <button onClick={() => setSub("settings")} className={pill(sub === "settings")}>
          {svg(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>, "w-4 h-4")} Réglages
        </button>
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

  const day = bookings.filter((b) => b.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const active = day.filter((b) => b.status !== "annulee" && b.status !== "absent");
  const guests = active.reduce((n, b) => n + b.party, 0);
  const tableOf = (b: Booking) => tables.find((t) => t.id === b.tableId);

  return (
    <div className="flex flex-col gap-4">
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
          {day.map((b) => {
            const table = tableOf(b);
            return (
              <li key={b.id} className={`rounded-2xl bg-white border border-ink/10 p-4 flex flex-wrap items-center gap-x-5 gap-y-3 ${b.status === "annulee" ? "opacity-50" : ""}`}>
                <span className="w-16 font-display font-black text-2xl tabular-nums">{b.time}</span>
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
                <select
                  value={b.status}
                  onChange={(e) => updateBooking(b.id, { status: e.target.value as BookingStatus })}
                  aria-label={`Statut de la réservation de ${b.name}`}
                  className={`rounded-full border-0 px-3 py-2 text-xs font-bold ${STATUS[b.status].cls}`}
                >
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <PhoneBooking date={date} onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="self-start rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-700">
          + Ajouter une réservation
        </button>
      )}
    </div>
  );
}

/** For bookings taken by phone or at the counter: same rules as the site. */
function PhoneBooking({ date, onDone }: { date: string; onDone: () => void }) {
  const settings = reservationSettings.use();
  const slots = slotsFor(date, settings);
  const [error, setError] = useState("");
  const field = "rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
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
    if (booking === undefined) return;
    if (!booking) setError("Aucune table libre pour ce nombre de personnes à cette heure. Essayez une autre heure.");
    else onDone();
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select name="time" required className={field} aria-label="Heure">
          {slots.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input name="party" type="number" min={1} max={settings.maxParty} defaultValue={2} required className={field} aria-label="Personnes" />
        <input name="name" placeholder="Nom" required className={field} />
        <input name="phone" type="tel" placeholder="Téléphone" required className={field} />
        <input name="highChairs" type="number" min={0} max={4} defaultValue={0} className={field} aria-label="Chaises hautes" />
        <label className="flex items-center gap-2 text-sm">
          <input name="accessible" type="checkbox" className="h-4 w-4 accent-red-600" /> Fauteuil roulant
        </label>
        <input name="notes" placeholder="Note (facultatif)" className={`${field} lg:col-span-2`} />
        {error && <p className="sm:col-span-2 lg:col-span-4 text-sm text-red-600">{error}</p>}
        <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
          <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper">
            Réserver
          </button>
          <button type="button" onClick={onDone} className="rounded-full px-4 py-2.5 text-sm font-bold text-ink/60 hover:bg-ink/5">
            Annuler
          </button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- tables

function Tables() {
  const tables = tablesStore.use();
  const [editing, setEditing] = useState<string | null>(null);
  const [bulk, setBulk] = useState({ count: 4, seats: 4, kind: "table" as TableKind });
  const seats = tables.filter((t) => t.active).reduce((n, t) => n + t.seats, 0);

  const save = (id: string, patch: Partial<DiningTable>) => tablesStore.set(tables.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  function addMany() {
    const next = [...tables];
    for (let i = 0; i < bulk.count; i++) next.push(newTable(next, { kind: bulk.kind, seats: bulk.seats, accessible: bulk.kind !== "bar" }));
    tablesStore.set(next);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink/60">
        <strong className="text-ink">{tables.filter((t) => t.active).length} tables</strong> · {seats} places au total. Cliquez sur une table pour la modifier.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tables.map((t) => (
          <button
            key={t.id}
            onClick={() => setEditing(editing === t.id ? null : t.id)}
            className={`relative text-left rounded-2xl border p-4 transition-colors ${
              editing === t.id ? "border-red-600 bg-red-600/5" : "border-ink/10 bg-white hover:border-ink/25"
            } ${t.active ? "" : "opacity-45"}`}
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
              {!t.active && <span className="text-[10px] font-bold uppercase">Inactive</span>}
            </div>
          </button>
        ))}
        <button
          onClick={() => {
            const t = newTable(tables);
            tablesStore.set([...tables, t]);
            setEditing(t.id);
          }}
          className="flex min-h-[148px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 text-ink/50 hover:border-red-600 hover:text-red-600"
        >
          <span className="text-3xl leading-none">+</span>
          <span className="text-sm font-bold">Ajouter une table</span>
        </button>
      </div>

      {editing && tables.find((t) => t.id === editing) && (
        <TableEditor table={tables.find((t) => t.id === editing)!} onChange={(patch) => save(editing, patch)} onDelete={() => {
          tablesStore.set(tables.filter((t) => t.id !== editing));
          setEditing(null);
        }} />
      )}

      <Card>
        <p className="font-semibold mb-3">Ajouter plusieurs tables d'un coup</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="number" min={1} max={30} value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: Number(e.target.value) })} className="w-16 rounded-lg border border-ink/15 px-2 py-1.5 text-center" />
            tables de
          </label>
          <label className="flex items-center gap-2">
            <input type="number" min={1} max={20} value={bulk.seats} onChange={(e) => setBulk({ ...bulk, seats: Number(e.target.value) })} className="w-16 rounded-lg border border-ink/15 px-2 py-1.5 text-center" />
            personnes,
          </label>
          <KindPicker value={bulk.kind} onChange={(kind) => setBulk({ ...bulk, kind })} />
          <button onClick={addMany} className="rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-paper">
            Ajouter {bulk.count} tables
          </button>
        </div>
        <p className="mt-2 text-xs text-ink/45">Elles sont numérotées à la suite ; vous pouvez changer chaque numéro ensuite.</p>
      </Card>
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

function TableEditor({ table, onChange, onDelete }: { table: DiningTable; onChange: (patch: Partial<DiningTable>) => void; onDelete: () => void }) {
  const check = (on: boolean, label: string, icon: ReactNode, key: "highChair" | "accessible" | "active") => (
    <label className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm cursor-pointer ${on ? "border-red-600/40 bg-red-600/5" : "border-ink/10 text-ink/60"}`}>
      <input type="checkbox" checked={on} onChange={(e) => onChange({ [key]: e.target.checked })} className="h-4 w-4 accent-red-600" />
      {icon}
      {label}
    </label>
  );

  return (
    <Card className="border-red-600/40">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
          Numéro ou code
          <input value={table.code} onChange={(e) => onChange({ code: e.target.value })} className="w-32 rounded-xl border border-ink/15 px-3 py-2 text-lg font-display font-black" />
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
          Personnes
          <div className="flex items-center gap-1">
            <button onClick={() => onChange({ seats: Math.max(1, table.seats - 1) })} className="h-10 w-10 rounded-xl border border-ink/15 text-lg">
              −
            </button>
            <span className="w-12 text-center font-display font-black text-xl text-ink">{table.seats}</span>
            <button onClick={() => onChange({ seats: Math.min(20, table.seats + 1) })} className="h-10 w-10 rounded-xl border border-ink/15 text-lg">
              +
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
          Type
          <KindPicker value={table.kind} onChange={(kind) => onChange({ kind })} />
        </div>
      </div>
      <div className="mt-4 grid sm:grid-cols-3 gap-2">
        {check(table.highChair, "Chaise haute possible", <BabyIcon />, "highChair")}
        {check(table.accessible, "Fauteuil roulant", <WheelchairIcon />, "accessible")}
        {check(table.active, "Réservable", <PersonIcon cls="w-4 h-4" />, "active")}
      </div>
      <button onClick={() => window.confirm(`Supprimer la table ${table.code} ?`) && onDelete()} className="mt-4 text-xs font-bold text-red-600 hover:underline">
        Supprimer cette table
      </button>
    </Card>
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

