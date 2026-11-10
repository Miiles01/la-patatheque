import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { track } from "../lib/analytics";
import { PROMO_CODE } from "../lib/cart";
import { record } from "../lib/demoStore";
import { useI18n } from "../lib/i18n";
import { navigate, useRoute } from "../lib/router";
import { btnPrimary, Consent } from "./ui";

const SEEN = "patatheque-promo-seen"; // sessionStorage: shown once per visit
const JOINED = "patatheque-promo-joined"; // localStorage: never again once signed up

function shouldShow() {
  try {
    return !sessionStorage.getItem(SEEN) && !localStorage.getItem(JOINED);
  } catch {
    return false;
  }
}

/** "10 % on your first order" email capture: appears once per visit, after a short delay. */
export function PromoPopup() {
  const { t, lang } = useI18n();
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (route === "/admin" || !shouldShow()) return;
    const id = window.setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(SEEN, "1");
      } catch {
        // ignore
      }
    }, 7000);
    return () => window.clearTimeout(id);
  }, [route]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    record("subscribers", { email: String(f.get("email")), consent: f.get("consent") === "on", code: PROMO_CODE, lang });
    track("promo_signup");
    try {
      localStorage.setItem(JOINED, "1");
    } catch {
      // ignore
    }
    setDone(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[88] flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-sm sm:p-6"
          onClick={() => setOpen(false)}
          data-lenis-prevent
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-paper text-ink"
          >
            <div className="bg-red-700 text-paper px-7 pt-8 pb-7">
              <button
                onClick={() => setOpen(false)}
                aria-label={t("promo.close")}
                className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full text-paper/80 hover:bg-paper/10"
              >
                <span className="absolute h-[1.5px] w-5 bg-current rotate-45" />
                <span className="absolute h-[1.5px] w-5 bg-current -rotate-45" />
              </button>
              <p className="script text-orange-soft text-3xl mb-1">{t("promo.kicker")}</p>
              <h2 id="promo-title" className="font-display font-extrabold text-3xl leading-tight pr-6">
                {t("promo.title")}
              </h2>
            </div>

            <div className="px-7 py-7">
              {done ? (
                <div className="text-center" role="status">
                  <p className="text-ink/60 mb-2">{t("promo.success")}</p>
                  <p className="inline-block rounded-xl border-2 border-dashed border-red-600 px-6 py-3 font-display font-black text-2xl tracking-wider text-red-600 mb-3">
                    {PROMO_CODE}
                  </p>
                  <p className="text-sm text-ink/60 mb-6">{t("promo.howTo")}</p>
                  <button
                    onClick={() => {
                      setOpen(false);
                      track("commander_click", { from: "promo" });
                      navigate("/commander");
                    }}
                    className={`${btnPrimary} w-full`}
                  >
                    {t("promo.order")}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <p className="text-ink/70">{t("promo.text")}</p>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t("form.email")}
                    aria-label={t("form.email")}
                    className="w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-3.5 placeholder:text-ink/35 focus:border-red-600 focus:outline-none"
                  />
                  <Consent name="consent" required text={t("form.consent")} />
                  <button type="submit" className={`${btnPrimary} w-full`}>
                    {t("promo.submit")}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink/50 underline underline-offset-4 py-1">
                    {t("promo.later")}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
