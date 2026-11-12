import { restaurant } from "../data/menu";
import type { Lang } from "./i18n";
import { createStore } from "./store";

// Basics the restaurant edits from the admin panel: contact details and
// opening hours. The site reads them from here.

export type BusinessInfo = { phoneDisplay: string; email: string; address: string };

export const businessInfo = createStore<BusinessInfo>("patatheque-demo-info", () => ({
  phoneDisplay: restaurant.phoneDisplay,
  email: restaurant.email,
  address: restaurant.address,
}));

/** tel: link for whatever format the phone was typed in. */
export const telHref = (phone: string) => `tel:+1${phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")}`;

export type DayHours = { open: boolean; from: string; to: string };
export type Hours = {
  /** Monday first. */
  days: DayHours[];
  breakfast: { enabled: boolean; from: string; to: string };
};

const day = (from: string, to: string): DayHours => ({ open: true, from, to });

export const openingHours = createStore<Hours>("patatheque-demo-hours", () => ({
  days: [
    day("11:00", "22:00"),
    day("11:00", "22:00"),
    day("11:00", "22:00"),
    day("11:00", "23:00"),
    day("11:00", "23:00"),
    day("11:00", "23:00"),
    day("11:00", "22:00"),
  ],
  breakfast: { enabled: true, from: "08:00", to: "13:00" },
}));

export const DAY_NAMES: Record<Lang, string[]> = {
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

/** "11:00" → "11 h" (fr) or "11 a.m." (en). */
export function formatTime(t: string, lang: Lang) {
  const [h, m] = t.split(":").map(Number);
  if (lang === "fr") return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  const suffix = h >= 12 && h < 24 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** Groups consecutive days with the same hours: "Lundi – Mercredi · 11 h – 22 h". */
export function groupedHours(hours: Hours, lang: Lang) {
  const names = DAY_NAMES[lang];
  const closed = lang === "fr" ? "Fermé" : "Closed";
  const label = (d: DayHours) => (d.open ? `${formatTime(d.from, lang)} – ${formatTime(d.to, lang)}` : closed);
  const rows: { day: string; time: string }[] = [];
  let start = 0;
  for (let i = 1; i <= hours.days.length; i++) {
    if (i === hours.days.length || label(hours.days[i]) !== label(hours.days[start])) {
      rows.push({
        day: i - 1 === start ? names[start] : `${names[start]} – ${names[i - 1]}`,
        time: label(hours.days[start]),
      });
      start = i;
    }
  }
  if (hours.breakfast.enabled) {
    rows.push({
      day: lang === "fr" ? "Déjeuner, 7 jours" : "Breakfast, 7 days",
      time: `${formatTime(hours.breakfast.from, lang)} – ${formatTime(hours.breakfast.to, lang)}`,
    });
  }
  return rows;
}
