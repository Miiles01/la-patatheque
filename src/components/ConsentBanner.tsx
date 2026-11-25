import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { onConsentOpen, setConsent, useConsent } from "../lib/consent";
import { useI18n } from "../lib/i18n";
import { PIXEL_ID } from "../lib/metaPixel";
import { navigate, routeHref, useRoute } from "../lib/router";

/**
 * Asks before any advertising cookie is set. Accept and refuse are equally easy;
 * the footer link "Témoins" brings it back to change the choice.
 */
export function ConsentBanner() {
  const { lang } = useI18n();
  const route = useRoute();
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);
  useEffect(() => onConsentOpen(() => setReopened(true)), []);

  // Nothing to ask while no tracking tool is set up (the demo, for one).
  const show = !!PIXEL_ID && route !== "/admin" && (consent === null || reopened);
  const choose = (v: "accepted" | "refused") => {
    setConsent(v);
    setReopened(false);
  };
  const fr = lang !== "en";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="region"
          aria-label={fr ? "Témoins" : "Cookies"}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-[80] sm:inset-x-auto sm:left-5 sm:bottom-5 sm:max-w-md rounded-2xl bg-ink p-5 text-paper shadow-2xl"
        >
          <p className="text-sm leading-relaxed text-paper/85">
            {fr
              ? "Avec votre accord, nous utilisons le pixel de Meta pour mesurer l'efficacité de nos publicités sur Facebook et Instagram."
              : "With your consent, we use the Meta pixel to measure how well our Facebook and Instagram ads work."}{" "}
            <a
              href={routeHref("/confidentialite")}
              onClick={(e) => {
                e.preventDefault();
                navigate("/confidentialite");
              }}
              className="underline underline-offset-2 hover:text-paper"
            >
              {fr ? "En savoir plus" : "Learn more"}
            </a>
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => choose("refused")} className="flex-1 rounded-full border border-paper/30 px-4 py-2.5 text-sm font-bold hover:bg-paper/10 transition-colors">
              {fr ? "Refuser" : "Decline"}
            </button>
            <button onClick={() => choose("accepted")} className="flex-1 rounded-full bg-paper px-4 py-2.5 text-sm font-bold text-ink hover:bg-cream transition-colors">
              {fr ? "Accepter" : "Accept"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
