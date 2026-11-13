import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { track } from "../lib/analytics";
import { asset } from "../lib/asset";
import { PROMO_CODE } from "../lib/cart";
import { record } from "../lib/demoStore";
import { useI18n } from "../lib/i18n";
import { navigate, useRoute } from "../lib/router";

const SEEN = "patatheque-promo-seen"; // localStorage: shown once per browser, on the first visit
const JOINED = "patatheque-promo-joined"; // localStorage: never again once signed up

function shouldShow() {
  try {
    return !localStorage.getItem(SEEN) && !localStorage.getItem(JOINED);
  } catch {
    return false;
  }
}

/**
 * "10 % on your first order" email capture, shown once per browser (first visit) after a short
 * delay. The food photo fills the card: on desktop the copy sits on the empty
 * red right side of the landscape shot, on phones over the bottom of the
 * portrait one.
 */
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
        localStorage.setItem(SEEN, "1");
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
          className="fixed inset-0 z-[88] flex items-end md:items-center justify-center bg-ink/60 backdrop-blur-sm md:p-8"
          onClick={() => setOpen(false)}
          data-lenis-prevent
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-title"
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-[92svh] md:h-auto md:w-[min(94vw,1180px)] md:aspect-[1800/1004] md:min-h-[480px] overflow-hidden rounded-t-3xl md:rounded-3xl bg-[#6a030a] text-paper shadow-2xl"
          >
            <picture>
              <source media="(min-width: 768px)" srcSet={asset("/promo/promo-desktop.webp")} />
              <img
                src={asset("/promo/promo-mobile.webp")}
                alt=""
                className="absolute inset-x-0 top-0 h-[56%] w-full object-cover object-[50%_64%] md:inset-0 md:h-full md:object-[30%_50%]"
              />
            </picture>
            {/* One gradient, 0 % to 100 %, in the photo's own wine red (#6a030a, sampled from the
                shot) so it melts into the picture. Phones: transparent at the top to solid under
                the copy. Desktop: transparent on the left to solid behind the text on the right. */}
            <div className="absolute inset-0 bg-linear-to-t from-[#6a030a] from-40% to-[#6a030a]/0 to-62% md:bg-linear-to-r md:from-[#6a030a]/0 md:from-35% md:to-[#6a030a] md:to-100%" />

            <button
              onClick={() => setOpen(false)}
              aria-label={t("promo.close")}
              className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-ink/25 text-paper backdrop-blur-sm hover:bg-ink/40 transition-colors"
            >
              <span className="absolute h-[1.5px] w-5 bg-current rotate-45" />
              <span className="absolute h-[1.5px] w-5 bg-current -rotate-45" />
            </button>

            <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[48%] lg:w-[44%] flex flex-col justify-end md:justify-center px-6 pb-8 pt-10 md:px-12 md:py-12">
              <p className="script text-orange-soft text-3xl md:text-5xl mb-1 md:mb-2">{t("promo.kicker")}</p>
              <h2 id="promo-title" className="font-display font-extrabold text-[1.75rem] md:text-[clamp(2rem,3.4vw,3rem)] leading-[1.02] tracking-[-0.02em]">
                {t("promo.title")}
              </h2>

              {done ? (
                <div role="status" className="mt-6">
                  <p className="text-paper/80 mb-3">{t("promo.success")}</p>
                  <p className="inline-block rounded-xl border-2 border-dashed border-paper/70 px-6 py-3 font-display font-black text-2xl tracking-wider">
                    {PROMO_CODE}
                  </p>
                  <p className="mt-3 text-sm text-paper/75 max-w-xs">{t("promo.howTo")}</p>
                  <button
                    onClick={() => {
                      setOpen(false);
                      track("commander_click", { from: "promo" });
                      navigate("/commander");
                    }}
                    className="mt-6 w-full rounded-full bg-paper px-8 py-4 text-sm font-bold text-red-700 hover:bg-cream transition-colors"
                  >
                    {t("promo.order")}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
                  <p className="hidden md:block text-paper/85">{t("promo.text")}</p>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t("form.email")}
                    aria-label={t("form.email")}
                    className="w-full rounded-full bg-paper px-5 py-3.5 text-ink placeholder:text-ink/40 focus:outline-none focus:ring-4 focus:ring-orange-soft/60"
                  />
                  <label className="flex items-start gap-3 text-xs leading-snug text-paper/80 cursor-pointer">
                    <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-orange" />
                    <span>{t("form.consent")}</span>
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-paper px-8 py-4 text-sm font-bold text-red-700 hover:bg-cream transition-colors"
                  >
                    {t("promo.submit")}
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
