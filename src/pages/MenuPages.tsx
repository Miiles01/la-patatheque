import { useState, type FormEvent } from "react";
import { MenuCarte } from "../components/MenuCarte";
import { openReservation } from "../components/ReservationModal";
import { Alt, btnOutline, btnPrimary, PageHero, SelectField, Success, TextArea, TextField } from "../components/ui";
import { restaurant } from "../data/menu";
import { track } from "../lib/analytics";
import { businessInfo, telHref } from "../lib/business";
import { reservationSettings } from "../lib/reservations";
import { asset } from "../lib/asset";
import { useCart } from "../lib/cart";
import { submit as submitRecord } from "../lib/demoStore";
import { useSend } from "../lib/useSend";
import { useI18n } from "../lib/i18n";
import { navigate } from "../lib/router";

/** Menu chooser: pick how you eat (dine-in first). Each choice opens its own page with the menu. */
export function MenuPage() {
  const { t } = useI18n();
  const cart = useCart();
  const choices = [
    { id: "sur-place", title: t("menu.surPlaceTitle"), sub: t("menu.pickSurPlaceSub"), go: () => navigate("/sur-place") },
    {
      id: "emporter",
      title: t("menu.orderTitle"),
      sub: t("menu.pickEmporterSub"),
      go: () => {
        if (cart.modes.includes("emporter")) cart.setMode("emporter");
        navigate("/commander");
      },
    },
  ] as const;

  return (
    <>
      <PageHero center kicker={t("menu.kicker")} title={t("menu.title")} alt={t("menu.titleAlt")} intro={t("menu.intro")} />
      <section className="bg-paper pb-24 md:pb-36">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div data-fade className="mx-auto grid max-w-2xl grid-cols-2 gap-3 md:gap-5 text-center">
            {choices.map((c, i) => (
              <button
                key={c.id}
                onClick={c.go}
                className={`rounded-3xl px-3 py-8 md:px-6 md:py-12 transition-colors ${
                  i === 0 ? "bg-cream text-ink hover:bg-ink/10" : "bg-red-600 text-paper hover:bg-red-700"
                }`}
              >
                <span className={`script block text-3xl md:text-5xl ${i === 0 ? "text-red-600" : "text-paper"}`}>{c.title}</span>
                <span className={`mt-2 block text-xs md:text-base ${i === 0 ? "text-ink/60" : "text-paper/85"}`}>{c.sub}</span>
                <span className={`mt-5 block text-sm font-bold ${i === 0 ? "text-ink" : "text-paper"}`}>{t("menu.seeMenu")} →</span>
              </button>
            ))}
          </div>
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

