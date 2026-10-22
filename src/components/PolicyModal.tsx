import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { restaurant } from "../data/menu";

const OPEN_EVENT = "open-policy";

export function openPolicy() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function PolicyModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm sm:p-6"
          onClick={() => setOpen(false)}
          data-lenis-prevent
        >
          <motion.article
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-2xl max-h-[90svh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-paper p-6 sm:p-12 text-ink"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink transition-colors text-2xl leading-none"
            >
              ×
            </button>

            <p className="alt text-xl text-red-600 mb-1">Légal</p>
            <h2 id="policy-title" className="font-display font-extrabold text-3xl md:text-4xl tracking-[-0.02em] mb-8 pr-8">
              Politique de confidentialité
            </h2>

            <div className="flex flex-col gap-6 text-ink/75 leading-relaxed [&_h3]:font-display [&_h3]:font-bold [&_h3]:text-ink [&_h3]:mb-1">
              <section>
                <h3>Les renseignements que nous recueillons</h3>
                <p>
                  Quand vous demandez une réservation, nous recueillons votre nom, votre numéro de téléphone, votre
                  courriel (facultatif), la date, l'heure, le nombre de personnes et votre note. Rien d'autre.
                </p>
              </section>
              <section>
                <h3>Pourquoi</h3>
                <p>
                  Uniquement pour confirmer et gérer votre réservation. Nous ne vendons ni ne partageons vos
                  renseignements, et nous ne les utilisons pas pour de la publicité.
                </p>
              </section>
              <section>
                <h3>Conservation et sécurité</h3>
                <p>
                  Vos renseignements sont conservés sur notre hébergeur au Canada ou aux États-Unis, accessibles
                  seulement au personnel autorisé, et supprimés au plus tard 12 mois après la date de la réservation.
                </p>
              </section>
              <section>
                <h3>Services tiers</h3>
                <p>
                  La carte de la section « Nous trouver » est fournie par Google Maps, qui peut déposer ses propres
                  témoins. La commande en ligne se fait sur une plateforme externe soumise à sa propre politique.
                </p>
              </section>
              <section>
                <h3>Vos droits</h3>
                <p>
                  Conformément à la Loi 25 du Québec, vous pouvez demander l'accès à vos renseignements, leur correction
                  ou leur suppression. Communiquez avec la personne responsable de la protection des renseignements
                  personnels au{" "}
                  <a href={`tel:${restaurant.phone}`} className="font-semibold text-red-600">{restaurant.phoneDisplay}</a>{" "}
                  ou sur place, au {restaurant.address}.
                </p>
              </section>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
