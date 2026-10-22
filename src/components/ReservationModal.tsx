import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { restaurant } from "../data/menu";

const OPEN_EVENT = "open-reservation";
const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export function openReservation() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Status = "idle" | "sending" | "sent" | "error";

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Half-hour slots from 11:00 to 21:30; the kitchen closes at 22:00 at the earliest.
const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const minutes = 11 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const fieldClass =
  "w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink/35 focus:border-red-600 focus:outline-none transition-colors";

export function ReservationModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const onOpen = () => {
      setStatus("idle");
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`${API_URL}/reservations.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm p-0 sm:p-6"
          onClick={() => setOpen(false)}
          data-lenis-prevent
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-lg max-h-[92svh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-cream p-6 sm:p-10 text-ink"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink transition-colors text-2xl leading-none"
            >
              ×
            </button>

            {status === "sent" ? (
              <div className="py-10 text-center">
                <p className="script text-5xl text-red-600 mb-3">Merci !</p>
                <h2 id="reservation-title" className="font-display font-extrabold text-3xl mb-4">
                  Demande reçue.
                </h2>
                <p className="text-ink/65 mb-8">
                  On vous confirme votre table par téléphone sous peu. Pour un changement, appelez-nous au{" "}
                  <a href={`tel:${restaurant.phone}`} className="font-semibold text-red-600">{restaurant.phoneDisplay}</a>.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-red-600 px-7 py-3.5 text-sm font-bold text-paper hover:bg-red-500 transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div className="mb-2 pr-8">
                  <p className="script text-4xl text-red-600 mb-1">Réserver</p>
                  <h2 id="reservation-title" className="font-display font-extrabold text-3xl leading-tight">
                    Une table à La Patathèque
                  </h2>
                </div>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Nom
                  <input name="name" required autoComplete="name" className={fieldClass} placeholder="Votre nom" />
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Téléphone
                    <input name="phone" type="tel" required autoComplete="tel" className={fieldClass} placeholder="(514) 000-0000" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Courriel
                    <input name="email" type="email" autoComplete="email" className={fieldClass} placeholder="Facultatif" />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className="col-span-3 sm:col-span-1 flex flex-col gap-1.5 text-sm font-medium">
                    Date
                    <input name="date" type="date" required min={today()} defaultValue={today()} className={fieldClass} />
                  </label>
                  <label className="col-span-2 sm:col-span-1 flex flex-col gap-1.5 text-sm font-medium">
                    Heure
                    <select name="time" required defaultValue="18:00" className={fieldClass}>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t.replace(":", " h ")}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Personnes
                    <input name="guests" type="number" required min={1} max={20} defaultValue={2} className={fieldClass} />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Note <span className="sr-only">(facultatif)</span>
                  <textarea name="notes" rows={2} className={fieldClass} placeholder="Allergies, chaise haute, occasion spéciale… (facultatif)" />
                </label>

                {status === "error" && (
                  <p role="alert" className="rounded-xl bg-red-600/10 px-4 py-3 text-sm text-red-700">
                    La demande n'a pas pu être envoyée. Réessayez ou appelez-nous au{" "}
                    <a href={`tel:${restaurant.phone}`} className="font-semibold underline">{restaurant.phoneDisplay}</a>.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="mt-2 rounded-full bg-red-600 px-7 py-4 text-sm font-bold text-paper hover:bg-red-500 disabled:opacity-60 transition-colors"
                >
                  {status === "sending" ? "Envoi…" : "Envoyer la demande"}
                </button>
                <p className="text-xs text-ink/50 text-center">
                  Votre table est confirmée par téléphone. Pour plus de 20 personnes, appelez-nous.
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
