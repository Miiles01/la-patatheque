import { useState, type FormEvent } from "react";
import { businessInfo, DAY_NAMES, groupedHours, openingHours, type Hours } from "../../lib/business";
import { essentialsStore, markEssential } from "../../lib/essentials";
import { reservationSettings } from "../../lib/reservations";
import type { AdminTab } from "../../lib/team";
import { Card, EssentialBanner, inputCls, SectionHead, Toggle } from "./ui";

export function SettingsView({ onOpen }: { onOpen: (tab: AdminTab) => void }) {
  const info = businessInfo.use();
  const essentials = essentialsStore.use();
  const reservations = reservationSettings.use();
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
      <SectionHead title="Paramètres" desc="Les informations de base de votre restaurant. Elles s'affichent sur le site dès que vous les enregistrez." />

      <EssentialBanner
        done={essentials.info}
        text="vérifiez votre téléphone, votre courriel et votre adresse, puis enregistrez."
        onConfirm={() => markEssential("info")}
      />
      <Card className="mb-5">
        <h2 className="font-display font-bold text-lg mb-4">Coordonnées</h2>
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

      <EssentialBanner
        done={essentials.pickup}
        text="les clients commandent en ligne et viennent chercher leur commande au comptoir. Vérifiez que c'est bien ce que vous offrez."
        onConfirm={() => markEssential("pickup")}
      />
      <Card className="mb-5">
        <h2 className="font-display font-bold text-lg mb-1">Commandes en ligne</h2>
        <div className="mt-3 flex items-start gap-4 rounded-xl bg-ink/[0.03] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-paper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
              <path d="M5 8h14l-1 12H6z" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </span>
          <div>
            <p className="font-semibold">Cueillette au comptoir</p>
            <p className="text-sm text-ink/60">
              Le client commande sur le site et passe chercher sa commande. Il paie au comptoir : aucun paiement en ligne. La
              livraison n'est pas offerte.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="divide-y divide-ink/10 -my-5">
          <Toggle
            label="Réservations de tables en ligne"
            desc="Affiche « Réserver une table » sur le site. Configurez vos tables et vos heures dans Réservations."
            on={reservations.enabled}
            onChange={(v) => reservationSettings.set({ ...reservations, enabled: v })}
          />
        </div>
        <button onClick={() => onOpen("reservations")} className="mt-1 text-sm font-bold text-red-600 hover:underline underline-offset-4">
          Configurer les réservations →
        </button>
      </Card>
    </>
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
