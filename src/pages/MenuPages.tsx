import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { MenuCarte } from "../components/MenuCarte";
import { openReservation } from "../components/ReservationModal";
import { Alt, btnOutline, btnPrimary, headingXl, PageHero, SelectField, Success, TextArea, TextField } from "../components/ui";
import { restaurant } from "../data/menu";
import { track } from "../lib/analytics";
import { businessInfo, telHref } from "../lib/business";
import { reservationSettings } from "../lib/reservations";
import { asset } from "../lib/asset";
import { useCart } from "../lib/cart";
import { submit as submitRecord } from "../lib/demoStore";
import { useSend } from "../lib/useSend";
import { useI18n } from "../lib/i18n";
import { scrollToTop, startScroll, stopScroll } from "../lib/motion";

/**
 * The menu page. A full-screen pop-up first asks how you eat (dine-in first); picking one closes it and shows the menu:
 * dine-in is read-only, takeout has add-to-cart buttons.
 */
export function MenuPage() {
  const { t } = useI18n();
  const cart = useCart();
  const [how, setHow] = useState<"emporter" | "sur-place" | null>(null);
  const choices = [
    { id: "sur-place", title: t("menu.surPlaceTitle"), sub: t("menu.pickSurPlaceSub") },
    { id: "emporter", title: t("menu.orderTitle"), sub: t("menu.pickEmporterSub") },
  ] as const;

  const choose = (id: "emporter" | "sur-place") => {
    setHow(id);
    if (id === "emporter" && cart.modes.includes("emporter")) cart.setMode("emporter");
    scrollToTop(false);
  };

  // The page behind the pop-up doesn't scroll until a choice is made.
  useEffect(() => {
    if (how !== null) return;
    stopScroll();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      startScroll();
    };
  }, [how]);

  return (
    <>
      <section
        data-nav="dark"
        className="relative isolate overflow-hidden bg-[#150102] text-paper min-h-[max(100svh,calc(129vw+22rem))] md:min-h-[max(100svh,calc(40vw+21rem))]"
      >
        {/* Photo sits at the bottom at its own proportions; its dark top melts into the section so the title stays on plain velvet. */}
        <div className="absolute inset-x-0 bottom-0 -z-10">
          <picture>
            <source media="(min-width: 768px)" srcSet={asset("/images/menu-hero.webp")} />
            <img src={asset("/images/menu-hero-mobile.webp")} alt="" className="block h-auto w-full" />
          </picture>
          <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-[#150102] to-transparent" />
        </div>
        <div className="mx-auto max-w-7xl px-5 pt-32 text-center md:px-10 md:pt-40">
          <p data-fade data-intro className="script mb-4 text-5xl text-orange-soft md:text-6xl">
            {t("menu.kicker")}
          </p>
          <h1 data-reveal data-intro className={`${headingXl.replace("text-ink", "text-paper")} mx-auto max-w-4xl`}>
            {t("menu.title")} <Alt className="text-orange-soft">{t("menu.titleAlt")}</Alt>
          </h1>
        </div>
        {/* Under the sandwich, on the empty tabletop, so it never covers the photo. */}
        {how && (
          <div className="absolute inset-x-0 bottom-5 flex justify-center px-5 md:bottom-7">
            <div role="group" aria-label={t("menu.popupTitle")} className="flex w-fit max-w-full gap-0.5 rounded-full bg-ink/45 p-0.5 text-center backdrop-blur">
              {choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => choose(c.id)}
                  aria-pressed={how === c.id}
                  className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors md:px-6 md:py-2.5 md:text-sm ${how === c.id ? "bg-red-600 text-paper" : "text-paper/80 hover:text-paper"}`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="bg-paper pb-24 pt-12 md:pb-36 md:pt-16">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          {how && <MenuCarte key={how} orderable={how === "emporter"} />}
        </div>
      </section>

      <AnimatePresence>
        {how === null && (
          <motion.div
            key="menu-chooser"
            role="dialog"
            aria-modal="true"
            aria-label={t("menu.popupTitle")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[89] flex flex-col items-center justify-center overflow-y-auto bg-red-700 px-5 py-12 text-center text-paper"
          >
            <p className="script text-orange-soft text-4xl md:text-6xl">{t("menu.kicker")}</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,6vw,4rem)] font-extrabold leading-tight tracking-tight text-balance">{t("menu.popupTitle")}</h2>
            <div className="mt-10 flex flex-col items-center gap-4 md:flex-row md:gap-6">
              {choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => choose(c.id)}
                  className="w-72 max-w-full rounded-3xl bg-paper px-6 py-9 text-ink transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] md:py-14"
                >
                  <span className="script block text-4xl text-red-600 md:text-5xl">{c.title}</span>
                  <span className="mt-2 block text-sm text-ink/60 md:text-base">{c.sub}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function OrderPage() {
  const { t } = useI18n();
  const cart = useCart();
  return (
    <>
      <PageHero kicker={t("order.kicker")} title={t("order.title")} alt={t("order.titleAlt")} intro={t("order.intro")}>
        <div
          data-fade="0.3"
          data-intro
          className={`mt-8 inline-grid gap-1 rounded-full bg-ink/5 p-1 ${cart.modes.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {cart.modes.map((m) => (
            <button
              key={m}
              onClick={() => cart.setMode(m)}
              aria-pressed={cart.mode === m}
              className={`rounded-full px-6 py-3 text-sm font-bold transition-colors ${
                cart.mode === m ? "bg-red-600 text-paper" : "text-ink/60 hover:text-ink"
              }`}
            >
              {m === "emporter" ? t("cart.emporter") : t("cart.livraison")}
            </button>
          ))}
        </div>
      </PageHero>
      <section className="bg-paper pb-24 md:pb-36">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <MenuCarte orderable />
        </div>
      </section>
    </>
  );
}

export function SurPlacePage() {
  const { t } = useI18n();
  const reservations = reservationSettings.use();
  const info = businessInfo.use();
  return (
    <>
      <PageHero kicker={t("surPlace.kicker")} title={t("surPlace.title")} alt={t("surPlace.titleAlt")} intro={t("surPlace.intro")}>
        <div data-fade="0.3" data-intro className="mt-10 flex flex-wrap gap-3">
          {reservations.enabled ? (
            <button onClick={openReservation} className={btnPrimary}>
              {t("surPlace.reserve")}
            </button>
          ) : (
            <a href={telHref(info.phoneDisplay)} onClick={() => track("call_click", { from: "sur-place" })} className={btnPrimary}>
              {t("contact.call")} · {info.phoneDisplay}
            </a>
          )}
          <a
            href={restaurant.mapsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("directions_click", { from: "sur-place" })}
            className={btnOutline}
          >
            {t("surPlace.directions")}
          </a>
        </div>
      </PageHero>

      <section className="bg-paper pb-24 md:pb-36">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <MenuCarte />
        </div>
      </section>
    </>
  );
}

export function CateringPage() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const send = useSend();
  const options = t("catering.eventOptions").split("|");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    send.run(async () => {
    await submitRecord("catering", {
      name: get("name"),
      email: get("email"),
      phone: get("phone"),
      eventType: get("eventType"),
      date: get("date") || undefined,
      guests: get("guests") || undefined,
      message: get("message") || undefined,
    });
    track("catering_request");
    setSent(true);
    });
  }

  return (
    <>
      <PageHero kicker={t("catering.kicker")} title={t("catering.title")} alt={t("catering.titleAlt")} intro={t("catering.intro")}>
        <p data-fade="0.3" data-intro className="mt-8 inline-block rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper">
          {t("catering.badge")}
        </p>
      </PageHero>

      <section className="bg-paper pb-24 md:pb-36">
        <div className="mx-auto max-w-7xl px-5 md:px-10 grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start">
          <div data-fade className="relative overflow-hidden rounded-3xl bg-red-700 aspect-[4/5] hidden lg:block">
            <img src={asset("/images/story-pizza.webp")} alt="" className="h-full w-full object-cover opacity-60 mix-blend-multiply" />
            <p className="absolute bottom-8 left-8 right-8 script text-paper text-6xl leading-none">2027</p>
          </div>

          <div data-fade className="rounded-3xl bg-cream p-6 md:p-10">
            <h2 className="font-display font-extrabold text-3xl mb-6">
              <Alt>{t("catering.formTitle")}</Alt>
            </h2>
            {sent ? (
              <Success title={t("cart.thanks")} text={t("catering.thanks")} />
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <TextField label={t("form.fullName")} name="name" required autoComplete="name" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField label={t("form.email")} name="email" type="email" required autoComplete="email" />
                  <TextField label={t("form.phone")} name="phone" type="tel" required autoComplete="tel" />
                </div>
                <SelectField label={t("catering.eventType")} name="eventType" options={options} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField label={t("catering.date")} optional={t("form.optional")} name="date" type="month" />
                  <TextField label={t("catering.guests")} optional={t("form.optional")} name="guests" type="number" min={10} max={500} />
                </div>
                <TextArea label={t("form.message")} optional={t("form.optional")} name="message" />
                {send.error && (
                  <p role="alert" className="text-sm text-red-600">
                    {send.error}
                  </p>
                )}
                <button type="submit" disabled={send.busy} className={`${btnPrimary} mt-2`}>
                  {send.busy ? t("form.sending") : t("catering.submit")}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

