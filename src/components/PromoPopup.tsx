import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { track } from "../lib/analytics";
import { asset } from "../lib/asset";
import { useCart, useOnlineOrdering } from "../lib/cart";
import { submit as submitRecord } from "../lib/demoStore";
import { useI18n } from "../lib/i18n";
import { usePopup, type PopupTexts } from "../lib/popup";
import { queuePromo } from "../lib/promos";
import { navigate, useRoute } from "../lib/router";
import { commander } from "./Navigation";
import { useSend } from "../lib/useSend";

const SEEN = "patatheque-promo-seen"; // localStorage: the campaign last shown in this browser
const JOINED = "patatheque-promo-joined"; // localStorage: the campaign this browser signed up to

function shouldShow(campaign: string) {
  try {
    // Shown once per campaign: publishing new texts in the panel shows it again, once.
    return localStorage.getItem(SEEN) !== campaign && localStorage.getItem(JOINED) !== campaign;
  } catch {
    return false;
  }
}

/**
 * Email capture shown once per browser (and per campaign) after a short delay. Its texts
 * and whether it shows come from the panel (Marketing → Pop-up). The card itself is
 * PopupCard, also used for the panel's preview.
 */
export function PromoPopup() {
  const { lang } = useI18n();
  const config = usePopup();
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  // With a promo code: the big card closes and a small one shows the code.
  const [codeOpen, setCodeOpen] = useState(false);
  const send = useSend();

  useEffect(() => {
    if (!config.enabled || route === "/admin" || route === "/404" || !shouldShow(config.campaign)) return;
    const id = window.setTimeout(() => {
      setOpen(true);
      try {
        localStorage.setItem(SEEN, config.campaign);
      } catch {
        // ignore
      }
    }, 7000);
    return () => window.clearTimeout(id);
  }, [route, config.enabled, config.campaign]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    send.run(async () => {
      await submitRecord("subscribers", {
        email: String(f.get("email")),
        consent: f.get("consent") === "on",
        code: config.code,
        // The French title, so the contacts list shows which pop-up each email came from.
        campaign: config.fr.title.slice(0, 60),
        lang,
      });
      track("promo_signup");
      try {
        localStorage.setItem(JOINED, config.campaign);
      } catch {
        // ignore
      }
      if (config.code) {
        setOpen(false);
        setCodeOpen(true);
      } else {
        setDone(true);
      }
    });
  }

  const texts = config[lang === "en" ? "en" : "fr"];

  return (
    <>
    <AnimatePresence>
      {codeOpen && (
        <motion.div
          key="code"
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-[88] sm:inset-x-auto sm:left-1/2 sm:bottom-6 sm:w-[26rem] sm:-translate-x-1/2"
        >
          <CodeCard code={config.code} texts={texts} onClose={() => setCodeOpen(false)} />
        </motion.div>
      )}
    </AnimatePresence>
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
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:w-auto"
          >
            <PopupCard
              texts={texts}
              done={done}
              busy={send.busy}
              error={send.error}
              onSubmit={submit}
              onClose={() => setOpen(false)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

/**
 * The small card that replaces the pop-up once a visitor signed up for a code: the
 * code, copy it, and (with online ordering on) use it now, which puts it in the cart.
 */
export function CodeCard({ code, texts, onClose, preview = false }: { code: string; texts: PopupTexts; onClose: () => void; preview?: boolean }) {
  const { t } = useI18n();
  const ordering = useOnlineOrdering();
  const cart = useCart();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (preview) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to read.
    }
  }

  function useNow() {
    if (preview) return;
    queuePromo(code);
    onClose();
    // Something already in the cart: open it with the code applied. Otherwise pick dishes first.
    if (cart.count > 0) cart.setOpen(true);
    else navigate("/commander");
  }

  return (
    <div role={preview ? undefined : "status"} className="relative rounded-3xl bg-[#6a030a] p-6 text-paper shadow-2xl">
      <button
        onClick={onClose}
        aria-label={t("promo.close")}
        className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper transition-colors"
      >
        <span className="absolute h-[1.5px] w-4 bg-current rotate-45" />
        <span className="absolute h-[1.5px] w-4 bg-current -rotate-45" />
      </button>
      {texts.kicker && <p className="script text-orange-soft text-3xl mb-1">{texts.kicker}</p>}
      <p className="pr-8 text-paper/85">{texts.success}</p>
      <p className="mt-4 inline-block rounded-xl border-2 border-dashed border-paper/70 px-6 py-3 font-display font-black text-2xl tracking-wider">{code}</p>
      {texts.note && <p className="mt-3 text-xs text-paper/65 whitespace-pre-line">{texts.note}</p>}
      <div className="mt-5 flex gap-2">
        <button onClick={copy} className="flex-1 rounded-full border border-paper/35 px-4 py-3 text-sm font-bold hover:bg-paper/10 transition-colors">
          {copied ? t("promo.copied") : t("promo.copy")}
        </button>
        {ordering && (
          <button onClick={useNow} className="flex-1 rounded-full bg-paper px-4 py-3 text-sm font-bold text-red-700 hover:bg-cream transition-colors">
            {t("promo.useNow")}
          </button>
        )}
      </div>
    </div>
  );
}

/** The pop-up card: photo, copy and form. Shared by the site and the panel's preview. */
export function PopupCard({
  texts,
  done,
  busy = false,
  error = "",
  onSubmit,
  onClose,
  preview = false,
}: {
  texts: PopupTexts;
  done: boolean;
  busy?: boolean;
  error?: string;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  /** Panel preview: same card, nothing is sent. */
  preview?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      role={preview ? undefined : "dialog"}
      aria-modal={preview ? undefined : true}
      aria-labelledby={preview ? undefined : "promo-title"}
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
        onClick={onClose}
        aria-label={t("promo.close")}
        className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-ink/25 text-paper backdrop-blur-sm hover:bg-ink/40 transition-colors"
      >
        <span className="absolute h-[1.5px] w-5 bg-current rotate-45" />
        <span className="absolute h-[1.5px] w-5 bg-current -rotate-45" />
      </button>

      <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[48%] lg:w-[44%] flex flex-col justify-end md:justify-center px-6 pb-8 pt-10 md:px-12 md:py-12">
        {texts.kicker && <p className="script text-orange-soft text-3xl md:text-5xl mb-1 md:mb-2">{texts.kicker}</p>}
        <h2 id={preview ? undefined : "promo-title"} className="font-display font-extrabold text-[1.75rem] md:text-[clamp(2rem,3.4vw,3rem)] leading-[1.02] tracking-[-0.02em]">
          {texts.title}
        </h2>

        {done ? (
        <div role="status" className="mt-6">
          <p className="text-paper/80 mb-3">{texts.success}</p>
          {texts.note && <p className="mt-3 text-xs text-paper/65 max-w-xs whitespace-pre-line">{texts.note}</p>}
          <button
            onClick={() => {
              onClose();
              if (!preview) commander("promo");
            }}
            className="mt-6 w-full rounded-full bg-paper px-8 py-4 text-sm font-bold text-red-700 hover:bg-cream transition-colors"
          >
            {t("home.seeMenu")}
          </button>
        </div>
      ) : (
          <form onSubmit={(e) => (preview ? e.preventDefault() : onSubmit?.(e))} className="mt-5 flex flex-col gap-3.5">
            {texts.text && <p className="hidden md:block text-paper/85">{texts.text}</p>}
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
            {error && (
              <p role="alert" className="text-sm text-orange-soft">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-paper px-8 py-4 text-sm font-bold text-red-700 hover:bg-cream disabled:opacity-60 transition-colors"
            >
              {busy ? t("form.sending") : texts.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
