import { createStore } from "./store";

// The email pop-up shown once to new visitors. Its texts and whether it shows at
// all are edited in the panel (Marketing → Pop-up) and saved on the server.

export type PopupTexts = {
  /** Small script line above the title. */
  kicker: string;
  title: string;
  /** Line under the title (desktop). */
  text: string;
  /** The form's button. */
  submit: string;
  /** Shown once the email is sent. */
  success: string;
  /** Optional small print under the success message (draw date, rules…). */
  note: string;
};

export type PopupConfig = {
  enabled: boolean;
  /** Changes whenever the texts are published, so visitors who saw an older pop-up see the new one once. */
  campaign: string;
  /** Show the BIENVENUE10 welcome code after sign-up (the original 10 % pop-up). */
  showCode: boolean;
  fr: PopupTexts;
  en: PopupTexts;
};

export const DEFAULT_POPUP: PopupConfig = {
  enabled: true,
  campaign: "concours-pizza-2026",
  showCode: false,
  fr: {
    kicker: "Concours",
    title: "Gagnez une pizza large gratuite !",
    text: "Laissez votre courriel pour participer à notre tirage de fin d'année.",
    submit: "Je participe",
    success: "C'est noté : vous participez au tirage. Bonne chance !",
    note: "",
  },
  en: {
    kicker: "Contest",
    title: "Win a free large pizza!",
    text: "Leave your email to enter our end-of-year draw.",
    submit: "Enter the draw",
    success: "You're in the draw. Good luck!",
    note: "",
  },
};

export const popupStore = createStore<PopupConfig>("patatheque-demo-popup", () => DEFAULT_POPUP);

/** Saved config with any missing field filled from the defaults (older saves). */
export function usePopup(): PopupConfig {
  const saved = popupStore.use();
  return { ...DEFAULT_POPUP, ...saved, fr: { ...DEFAULT_POPUP.fr, ...saved.fr }, en: { ...DEFAULT_POPUP.en, ...saved.en } };
}
