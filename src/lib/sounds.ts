import { asset } from "./asset";

// Sounds for a new order in the panel (Paramètres → Son des nouvelles commandes).
// The files are in public/sounds; son-01 is the default.

export const ORDER_SOUNDS = [
  { id: "son-01", label: "Son 1" },
  { id: "son-02", label: "Son 2" },
  { id: "son-03", label: "Son 3" },
  { id: "son-04", label: "Son 4" },
  { id: "son-05", label: "Son 5" },
  { id: "son-06", label: "Son 6" },
  { id: "son-07", label: "Son 7" },
  { id: "son-08", label: "Son 8" },
  { id: "son-09", label: "Son 9" },
] as const;

export const DEFAULT_ORDER_SOUND = "son-01";

/**
 * Plays a sound by id ("" = silent). Browsers only allow sound once the page has been
 * clicked or tapped (signing in counts), so a panel left open after a reload stays
 * silent until someone touches it.
 */
export function playOrderSound(id: string) {
  if (!ORDER_SOUNDS.some((s) => s.id === id)) return;
  const audio = new Audio(asset(`/sounds/${id}.mp3`));
  audio.play().catch(() => {
    // Not allowed yet (no click on the page): nothing to do.
  });
}
