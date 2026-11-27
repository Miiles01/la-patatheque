import { useState, type FormEvent, type ReactNode } from "react";
import { businessInfo, DAY_NAMES, groupedHours, openingHours, type Hours } from "../../lib/business";
import { chargesStore, type Charge } from "../../lib/charges";
import { essentialsStore, markEssential } from "../../lib/essentials";
import { reservationSettings } from "../../lib/reservations";
import { BookingRules } from "./Reservations";
import type { AdminTab } from "../../lib/team";
import { saveSettings, useSettings } from "../../lib/settings";
import { DEFAULT_ORDER_SOUND, ORDER_SOUNDS, playOrderSound } from "../../lib/sounds";
import { BackButton, Card, EssentialBanner, inputCls, SectionHead, Toggle } from "./ui";

type SettingsSection = "info" | "orders" | "sound" | "charges" | "reservations";

const SECTION_ICONS: Record<SettingsSection, ReactNode> = {
  info: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  orders: (
    <>
      <path d="M5 8h14l-1 12H6z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  sound: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" strokeLinejoin="round" />
      <path d="M10 20.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </>
  ),
  charges: (
    <>
      <path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z" strokeLinejoin="round" />
      <path d="M10 8h4M10 12h4M10 16h2" strokeLinecap="round" />
    </>
  ),
  reservations: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" strokeLinecap="round" />
    </>
  ),
};

/** Paramètres: one square card per topic; each opens its own screen. */
export function SettingsView({ onOpen }: { onOpen: (tab: AdminTab) => void }) {
  const shop = useSettings();
  const info = businessInfo.use();
  const reservations = reservationSettings.use();
  const charges = chargesStore.use();
  const [section, setSection] = useState<SettingsSection | null>(null);

  const sound = ORDER_SOUNDS.find((s) => s.id === shop.orderSound);
  const activeCharges = charges.filter((c) => c.enabled).length;
  const cards: { id: SettingsSection; title: string; status: string; on?: boolean }[] = [
    { id: "info", title: "Coordonnées", status: info.phoneDisplay || "Téléphone, courriel, adresse" },
    { id: "orders", title: "Commandes en ligne", status: shop.pickup ? "Activées" : "Désactivées", on: shop.pickup },
    { id: "sound", title: "Notifications", status: sound ? `Nouvelle commande : ${sound.label}` : "Aucun son" },
    { id: "charges", title: "Taxes et frais", status: activeCharges ? `${activeCharges} actif${activeCharges > 1 ? "s" : ""}` : "Aucun actif" },
    { id: "reservations", title: "Réservations", status: reservations.enabled ? "Activées" : "Désactivées", on: reservations.enabled },
  ];

  if (section) {
    const card = cards.find((c) => c.id === section)!;
    return (
      <>
        <BackButton label="Paramètres" onClick={() => setSection(null)} />
        <h1 className="mb-6 font-display font-extrabold text-3xl">{card.title}</h1>
        {section === "info" && <InfoSection />}
        {section === "orders" && <OrdersSection />}
        {section === "sound" && <SoundSection />}
        {section === "charges" && <ChargesCard />}
        {section === "reservations" && <ReservationsSection onOpen={onOpen} />}
      </>
    );
  }

  return (
    <>
      <SectionHead title="Paramètres" desc="Les réglages de votre restaurant. Touchez une carte pour l'ouvrir." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setSection(c.id)}
            className="group flex aspect-square flex-col justify-between rounded-2xl border border-ink/10 bg-white p-5 text-left transition-colors hover:border-ink/30"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/[0.08] text-red-600 transition-colors group-hover:bg-red-600 group-hover:text-paper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
                {SECTION_ICONS[c.id]}
              </svg>
            </span>
            <span>
              <span className="block font-display font-bold text-xl leading-tight">{c.title}</span>
              <span className={`mt-1 flex items-center gap-1.5 text-sm ${c.on === undefined ? "text-ink/55" : c.on ? "text-green-700" : "text-ink/45"}`}>
                {c.on !== undefined && <span className={`h-2 w-2 rounded-full ${c.on ? "bg-green-600" : "bg-ink/25"}`} />}
                {c.status}
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function InfoSection() {
  const info = businessInfo.use();
  const essentials = essentialsStore.use();
  const [saved, setSaved] = useState(false);

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    businessInfo.set({
      phoneDisplay: String(f.get("phone")).trim(),
      email: String(f.get("email")).trim(),
      address: String(f.get("address")).trim(),
    });
    markEssential("info");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <EssentialBanner done={essentials.info} text="vérifiez votre téléphone, votre courriel et votre adresse, puis enregistrez." onConfirm={() => markEssential("info")} />
      <Card className="mb-5">
        <p className="mb-4 text-sm text-ink/55">Affichées sur le site dès que vous les enregistrez.</p>
        <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Téléphone
            <input name="phone" type="tel" defaultValue={info.phoneDisplay} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Courriel du restaurant
            <input name="email" type="email" defaultValue={info.email} placeholder="bonjour@patatheque.ca" className={inputCls} />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1.5 text-sm font-medium">
            Adresse
            <input name="address" defaultValue={info.address} required className={inputCls} />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper">
              Enregistrer
            </button>
            {saved && <span className="text-sm font-semibold text-green-700">Enregistré ✓</span>}
          </div>
        </form>
      </Card>
    </>
  );
}

function OrdersSection() {
  const shop = useSettings();
  const essentials = essentialsStore.use();
  return (
    <>
      <EssentialBanner
        done={essentials.pickup}
        text="les clients commandent en ligne et viennent chercher leur commande au comptoir. Vérifiez que c'est bien ce que vous offrez."
        onConfirm={() => markEssential("pickup")}
      />
      <Card className="mb-5">
        <div className="divide-y divide-ink/10 -my-5">
          <Toggle
            label="Commandes en ligne (cueillette au comptoir)"
            desc={
              shop.pickup
                ? "Activées : les clients commandent sur le site et paient au comptoir en venant chercher leur commande."
                : "Désactivées : le site n'affiche ni panier ni bouton Commander, et le menu se consulte sans commander. Les commandes prises dans le panneau restent possibles."
            }
            on={shop.pickup}
            onChange={(v) => saveSettings({ pickup: v })}
          />
        </div>
      </Card>
    </>
  );
}

/** The sound Commandes plays when an order comes in: a dropdown and a play button. */
function SoundSection() {
  const shop = useSettings();
  return (
    <Card className="mb-5 max-w-xl">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Son d'une nouvelle commande
        <div className="flex gap-2">
          <select
            value={shop.orderSound}
            onChange={(e) => {
              saveSettings({ orderSound: e.target.value });
              playOrderSound(e.target.value);
            }}
            className={`${inputCls} flex-1`}
          >
            {ORDER_SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.id === DEFAULT_ORDER_SOUND ? " (par défaut)" : ""}
              </option>
            ))}
            <option value="">Aucun son</option>
          </select>
          <button
            type="button"
            onClick={() => playOrderSound(shop.orderSound)}
            disabled={!shop.orderSound}
            aria-label="Écouter"
            title="Écouter"
            className="flex w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-paper hover:bg-ink/85 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M7 4.5v15l12-7.5z" />
            </svg>
          </button>
        </div>
      </label>
      <p className="mt-3 text-sm text-ink/55">Joué dans Commandes (vue Salle ou Cuisine) quand une commande arrive. Le même son pour toutes les tablettes.</p>
    </Card>
  );
}

function ReservationsSection({ onOpen }: { onOpen: (tab: AdminTab) => void }) {
  const reservations = reservationSettings.use();
  return (
    <div className="flex flex-col gap-5">
    <Card>
      <div className="divide-y divide-ink/10 -my-5">
        <Toggle
          label="Réservations de tables en ligne"
          desc="Affiche « Réserver une table » sur le site."
          on={reservations.enabled}
          onChange={(v) => reservationSettings.set({ ...reservations, enabled: v })}
        />
      </div>
      <button onClick={() => onOpen("reservations")} className="mt-1 text-sm font-bold text-red-600 hover:underline underline-offset-4">
        Voir les réservations et les tables →
      </button>
    </Card>
    {/* The same settings as Réservations → Réglages. */}
    <BookingRules />
    </div>
  );
}

export function HoursView() {
  const saved = openingHours.use();
  const essentials = essentialsStore.use();
  const [hours, setHours] = useState<Hours>(saved);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const names = DAY_NAMES.fr;
  const dirty = JSON.stringify(hours) !== JSON.stringify(saved);

  const setDay = (i: number, patch: Partial<Hours["days"][number]>) =>
    setHours({ ...hours, days: hours.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  function save() {
    openingHours.set(hours);
    markEssential("hours");
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 2000);
  }

  const time = "rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-sm tabular-nums focus:border-red-600 focus:outline-none disabled:opacity-40";

  return (
    <>
      <SectionHead title="Horaires" desc="Vos heures d'ouverture, affichées sur le site (Nous joindre, pied de page)." />
      <EssentialBanner
        done={essentials.hours}
        text="vérifiez vos heures pour chaque jour, puis enregistrez."
        onConfirm={() => markEssential("hours")}
      />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <Card>
          <ul className="divide-y divide-ink/10">
            {hours.days.map((d, i) => (
              <li key={names[i]} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-24 font-semibold">{names[i]}</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={d.open} onChange={(e) => setDay(i, { open: e.target.checked })} className="h-4 w-4 accent-green-700" />
                  {d.open ? "Ouvert" : "Fermé"}
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <input type="time" value={d.from} disabled={!d.open} onChange={(e) => setDay(i, { from: e.target.value })} className={time} aria-label={`${names[i]} ouverture`} />
                  <span className="text-ink/40">–</span>
                  <input type="time" value={d.to} disabled={!d.open} onChange={(e) => setDay(i, { to: e.target.value })} className={time} aria-label={`${names[i]} fermeture`} />
                </div>
              </li>
            ))}
            <li className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-24 font-semibold">Déjeuner</span>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={hours.breakfast.enabled}
                  onChange={(e) => setHours({ ...hours, breakfast: { ...hours.breakfast, enabled: e.target.checked } })}
                  className="h-4 w-4 accent-green-700"
                />
                {hours.breakfast.enabled ? "7 jours" : "Pas de déjeuner"}
              </label>
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="time"
                  value={hours.breakfast.from}
                  disabled={!hours.breakfast.enabled}
                  onChange={(e) => setHours({ ...hours, breakfast: { ...hours.breakfast, from: e.target.value } })}
                  className={time}
                  aria-label="Déjeuner début"
                />
                <span className="text-ink/40">–</span>
                <input
                  type="time"
                  value={hours.breakfast.to}
                  disabled={!hours.breakfast.enabled}
                  onChange={(e) => setHours({ ...hours, breakfast: { ...hours.breakfast, to: e.target.value } })}
                  className={time}
                  aria-label="Déjeuner fin"
                />
              </div>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={save} className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper disabled:opacity-40" disabled={!dirty && essentials.hours}>
              Enregistrer
            </button>
            <button
              onClick={() => setHours({ ...hours, days: hours.days.map(() => ({ ...hours.days[0] })) })}
              className="rounded-full px-4 py-3 text-sm font-bold text-ink/60 hover:bg-ink/5"
            >
              Copier le lundi sur tous les jours
            </button>
            {status === "saved" && <span className="text-sm font-semibold text-green-700">Enregistré ✓</span>}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-ink/45 mb-3">Aperçu sur le site</p>
          <ul className="flex flex-col gap-2 text-sm">
            {groupedHours(hours, "fr").map((r) => (
              <li key={r.day} className="flex justify-between gap-4 border-b border-ink/10 pb-2">
                <span>{r.day}</span>
                <span className="font-semibold tabular-nums">{r.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

/** Taxes and extra fees added to every bill. All off by default; the ones switched on show in the cart, on the order and on the staff's bill. */
function ChargesCard() {
  const charges = chargesStore.use();
  const save = (next: Charge[]) => chargesStore.set(next);
  const patch = (id: string, change: Partial<Charge>) => save(charges.map((c) => (c.id === id ? { ...c, ...change } : c)));
  const add = (kind: Charge["kind"]) =>
    save([...charges, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: kind === "tax" ? "Taxe" : "Frais", kind, percent: 0, enabled: false }]);

  return (
    <Card className="mb-5">
      <h2 className="font-display font-bold text-lg mb-1">Taxes et frais</h2>
      <p className="text-sm text-ink/55 max-w-2xl">
        Désactivés par défaut : la facture ne montre alors que le total des plats. Activez l'IVA ou ajoutez vos propres taxes et frais (un nom et
        un pourcentage). Ceux qui sont actifs s'ajoutent au total après le rabais et s'affichent sur le panier du client, sur la commande et sur la
        facture du personnel.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {charges.map((c) => (
          <li key={c.id} className={`rounded-xl border-2 p-4 transition-colors ${c.enabled ? "border-green-700/30 bg-green-700/[0.04]" : "border-ink/10"}`}>
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem_7rem]">
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Nom sur la facture
                <input value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} maxLength={40} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Type
                <select value={c.kind} onChange={(e) => patch(c.id, { kind: e.target.value as Charge["kind"] })} className={inputCls}>
                  <option value="tax">Taxe</option>
                  <option value="fee">Frais</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Pourcentage (%)
                <input type="number" min={0} max={100} step="0.001" value={c.percent || ""} onChange={(e) => patch(c.id, { percent: Number(e.target.value) })} className={inputCls} />
              </label>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-[14rem] flex-1">
                <Toggle
                  on={c.enabled}
                  onChange={(v) => patch(c.id, { enabled: v })}
                  label={c.enabled ? "Activé : s'ajoute à la facture" : "Désactivé"}
                  desc={c.percent > 0 ? `${c.percent} % du montant après rabais.` : "Indiquez un pourcentage pour pouvoir l'activer."}
                />
              </div>
              {c.id !== "iva" && (
                <button onClick={() => save(charges.filter((x) => x.id !== c.id))} className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600/10">
                  Supprimer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => add("tax")} className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper hover:bg-ink/85">
          + Ajouter une taxe
        </button>
        <button onClick={() => add("fee")} className="rounded-full bg-ink/5 px-5 py-2.5 text-sm font-bold hover:bg-ink/10">
          + Ajouter un frais
        </button>
      </div>
    </Card>
  );
}
