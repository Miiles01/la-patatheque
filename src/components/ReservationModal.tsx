import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { businessInfo } from "../lib/business";
import { useI18n } from "../lib/i18n";
import {
  addBooking,
  bookingsStore,
  findTable,
  reservationSettings,
  slotsFor,
  tablesStore,
  todayIso,
  type Booking,
} from "../lib/reservations";

const OPEN_EVENT = "open-reservation";

export function openReservation() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const fieldClass =
  "w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink/35 focus:border-red-600 focus:outline-none transition-colors";

function shiftDay(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Table booking: day, party size, then a time that still has a free table that fits. */
export function ReservationModal() {
  const { t, lang } = useI18n();
  const settings = reservationSettings.use();
  const tables = tablesStore.use();
  const bookings = bookingsStore.use();
  const info = businessInfo.use();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso);
  const [party, setParty] = useState(2);
  const [time, setTime] = useState<string | null>(null);
  const [highChairs, setHighChairs] = useState(0);
  const [accessible, setAccessible] = useState(false);
  const [booked, setBooked] = useState<Booking | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setBooked(null);
      setTime(null);
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

  // Each time is offered only while a suitable table is still free then.
  const slots = useMemo(
    () =>
      slotsFor(date, settings).map((s) => ({
        time: s,
        free: !!findTable({ date, time: s, party, highChairs, accessible }, tables, bookings, settings),
      })),
    [date, party, highChairs, accessible, settings, tables, bookings],
  );
  const anyFree = slots.some((s) => s.free);
  const selectedFree = slots.find((s) => s.time === time)?.free;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!time || !selectedFree) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const booking = addBooking({
      date,
      time,
      party,
      name: get("name"),
      phone: get("phone"),
      email: get("email") || undefined,
      highChairs,
      accessible,
      occasion: get("occasion") || undefined,
      notes: get("notes") || undefined,
    });
    if (booking) setBooked(booking);
  }

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm p-0 sm:p-6"
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

            {booked ? (
              <div className="py-8 text-center">
                <p className="script text-5xl text-red-600 mb-3">{t("book.thanks")}</p>
                <p className="text-ink/75 mb-2">
                  {t("book.confirmed", { n: booked.party, date: dateLabel(booked.date), time: booked.time })}
                </p>
                <p className="text-sm text-ink/55 mb-8">{t("book.change", { phone: info.phoneDisplay })}</p>
                <button onClick={() => setOpen(false)} className="rounded-full bg-red-600 px-7 py-3.5 text-sm font-bold text-paper hover:bg-red-700">
                  {t("cart.done")}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="pr-8">
                  <p className="script text-4xl text-red-600 mb-1">{t("book.kicker")}</p>
                  <h2 id="reservation-title" className="font-display font-extrabold text-3xl leading-tight">
                    {t("book.title")}
                  </h2>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    {t("book.date")}
                    <input
                      type="date"
                      required
                      min={todayIso()}
                      max={shiftDay(todayIso(), settings.daysAhead)}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setTime(null);
                      }}
                      className={fieldClass}
                    />
                  </label>
                  <div className="flex flex-col gap-1.5 text-sm font-medium">
                    {t("book.party")}
                    <div className="flex items-center rounded-xl border-2 border-ink/15 bg-paper">
                      <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))} className="h-[46px] w-11 text-xl" aria-label="−1">
                        −
                      </button>
                      <span className="w-8 text-center font-display font-bold text-lg tabular-nums">{party}</span>
                      <button type="button" onClick={() => setParty((p) => Math.min(settings.maxParty, p + 1))} className="h-[46px] w-11 text-xl" aria-label="+1">
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <p className="-mt-3 text-xs text-ink/45">{t("book.maxParty", { n: settings.maxParty })}</p>

                {(settings.askHighChair || settings.askAccessible) && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="text-sm font-medium mb-1.5">{t("book.needs")}</legend>
                    {settings.askHighChair && (
                      <div className="flex items-center justify-between rounded-xl border-2 border-ink/10 bg-paper px-4 py-2.5 text-sm">
                        <span>👶 {t("book.highChairs")}</span>
                        <span className="flex items-center gap-1">
                          <button type="button" onClick={() => setHighChairs((n) => Math.max(0, n - 1))} className="h-8 w-8 rounded-full hover:bg-ink/5" aria-label="−1">
                            −
                          </button>
                          <span className="w-5 text-center font-bold tabular-nums">{highChairs}</span>
                          <button type="button" onClick={() => setHighChairs((n) => Math.min(4, n + 1))} className="h-8 w-8 rounded-full hover:bg-ink/5" aria-label="+1">
                            +
                          </button>
                        </span>
                      </div>
                    )}
                    {settings.askAccessible && (
                      <label className="flex items-center justify-between rounded-xl border-2 border-ink/10 bg-paper px-4 py-3 text-sm cursor-pointer">
                        <span>♿ {t("book.accessible")}</span>
                        <input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} className="h-5 w-5 accent-red-600" />
                      </label>
                    )}
                  </fieldset>
                )}

                <div>
                  <p className="text-sm font-medium mb-1.5">{t("book.time")}</p>
                  {anyFree ? (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          disabled={!s.free}
                          onClick={() => setTime(s.time)}
                          aria-pressed={time === s.time}
                          className={`rounded-xl py-2.5 text-sm font-bold tabular-nums transition-colors ${
                            time === s.time
                              ? "bg-red-600 text-paper"
                              : s.free
                                ? "bg-paper border-2 border-ink/10 hover:border-red-600"
                                : "bg-ink/5 text-ink/25 line-through cursor-not-allowed"
                          }`}
                          title={s.free ? undefined : t("book.full")}
                        >
                          {s.time.replace(":", " h ")}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-red-600/10 px-4 py-3 text-sm text-red-700">{t("book.noSlots")}</p>
                  )}
                </div>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("form.name")}
                  <input name="name" required autoComplete="name" className={fieldClass} />
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    {t("form.phone")}
                    <input name="phone" type="tel" required autoComplete="tel" className={fieldClass} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    {t("form.email")}
                    <input name="email" type="email" autoComplete="email" placeholder={t("form.optional")} className={fieldClass} />
                  </label>
                </div>
                {settings.askOccasion && (
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    🎉 {t("book.occasion")}
                    <input name="occasion" placeholder={t("book.occasionHint")} className={fieldClass} />
                  </label>
                )}
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("form.notes")}
                  <textarea name="notes" rows={2} placeholder={t("form.optional")} className={fieldClass} />
                </label>

                <button
                  type="submit"
                  disabled={!time || !selectedFree}
                  className="rounded-full bg-red-600 px-7 py-4 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {t("book.submit")}
                  {time && ` · ${time.replace(":", " h ")}`}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
