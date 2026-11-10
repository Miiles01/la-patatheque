import { useState, type FormEvent } from "react";
import { commander } from "../components/Navigation";
import { OrderMenu } from "../components/OrderMenu";
import { openReservation } from "../components/ReservationModal";
import { Alt, btnOutline, btnPrimary, PageHero, SelectField, Success, TextArea, TextField } from "../components/ui";
import { restaurant } from "../data/menu";
import { track } from "../lib/analytics";
import { asset } from "../lib/asset";
import { useCart } from "../lib/cart";
import { record } from "../lib/demoStore";
import { useI18n } from "../lib/i18n";
import { navigate } from "../lib/router";

/** Menu chooser: dine-in and takeout/delivery are priced differently, so they never share a page. */
export function MenuPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHero kicker={t("menu.kicker")} title={t("menu.title")} alt={t("menu.titleAlt")} intro={t("menu.intro")} />
      <section className="bg-paper pb-24 md:pb-36">
        <div className="mx-auto max-w-7xl px-5 md:px-10 grid md:grid-cols-2 gap-4 md:gap-6">
          <button
            data-fade
            onClick={() => commander("menu-chooser")}
            className="group relative overflow-hidden rounded-3xl bg-red-700 text-paper text-left min-h-[360px] md:min-h-[460px] flex flex-col justify-end p-8 md:p-12"
          >
            <img
              src={asset("/images/hero.webp")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
            />
            <span className="relative script text-orange-soft text-4xl">{t("menu.orderTitle")}</span>
            <span className="relative mt-3 max-w-sm text-paper/85">{t("menu.orderDesc")}</span>
            <span className="relative mt-8 w-fit rounded-full bg-paper px-7 py-3.5 text-sm font-bold text-red-700">
              {t("menu.orderCta")} →
            </span>
          </button>
          <button
            data-fade="0.1"
            onClick={() => navigate("/sur-place")}
            className="group relative overflow-hidden rounded-3xl bg-cream text-ink text-left min-h-[360px] md:min-h-[460px] flex flex-col justify-end p-8 md:p-12"
          >
            <img
              src={asset("/images/pizza.webp")}
              alt=""
              className="absolute -top-16 -right-16 w-[70%] max-w-sm transition-transform duration-1000 group-hover:rotate-45"
            />
            <span className="relative script text-red-600 text-4xl">{t("menu.surPlaceTitle")}</span>
            <span className="relative mt-3 max-w-sm text-ink/70">{t("menu.surPlaceDesc")}</span>
            <span className="relative mt-8 w-fit rounded-full border border-ink/20 px-7 py-3.5 text-sm font-bold">
              {t("menu.surPlaceCta")} →
            </span>
          </button>
        </div>
      </section>
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
          <OrderMenu />
        </div>
      </section>
    </>
  );
}

export function SurPlacePage() {
  const { t } = useI18n();
  return (
    <>
      <PageHero kicker={t("surPlace.kicker")} title={t("surPlace.title")} alt={t("surPlace.titleAlt")} intro={t("surPlace.intro")}>
        <div data-fade="0.3" data-intro className="mt-10 flex flex-wrap gap-3">
          <button onClick={openReservation} className={btnPrimary}>
            {t("surPlace.reserve")}
          </button>
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
          <p data-fade className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-700/10 px-4 py-2 text-sm font-semibold text-green-800">
            ↓ {t("surPlace.cheaper")}
          </p>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {(
              [
                ["surPlace.breakfast", "surPlace.breakfastHours"],
                ["surPlace.dineIn", "surPlace.dineInHours"],
              ] as const
            ).map(([title, hours], i) => (
              <article key={title} data-fade={i * 0.1} className="rounded-3xl bg-cream p-8 md:p-10 flex flex-col min-h-[300px]">
                <h2 className="script text-red-600 text-4xl md:text-5xl">{t(title)}</h2>
                <p className="mt-2 font-semibold text-ink">{t(hours)}</p>
                <div className="mt-auto pt-10">
                  <p className="font-display font-bold text-lg">{t("surPlace.soon")}</p>
                  <p className="mt-1 text-ink/60 max-w-sm">{t("surPlace.soonText")}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function CateringPage() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const options = t("catering.eventOptions").split("|");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    record("catering", {
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
                <button type="submit" className={`${btnPrimary} mt-2`}>
                  {t("catering.submit")}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

