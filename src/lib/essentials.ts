import type { AdminTab } from "./team";
import { createStore } from "./store";

// The basics a restaurant should review before going live. Each one is ticked
// when the owner confirms it in its section of the panel.

export type EssentialId = "info" | "hours" | "menu" | "pickup";

export const ESSENTIALS: { id: EssentialId; title: string; why: string; tab: AdminTab }[] = [
  { id: "info", title: "Vos coordonnées", why: "Téléphone, courriel et adresse affichés sur le site.", tab: "settings" },
  { id: "hours", title: "Vos heures d'ouverture", why: "Les clients voient quand passer et commander.", tab: "hours" },
  { id: "menu", title: "Votre menu et vos prix", why: "Ce que les clients commandent en ligne.", tab: "menu" },
  { id: "pickup", title: "Les commandes pour emporter", why: "Comment les clients récupèrent leur commande.", tab: "settings" },
];

export const essentialsStore = createStore<Record<EssentialId, boolean>>("patatheque-demo-essentials", () => ({
  info: false,
  hours: false,
  menu: false,
  pickup: false,
}));

export function markEssential(id: EssentialId, done = true) {
  essentialsStore.set({ ...essentialsStore.get(), [id]: done });
}
