import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { LineButton } from "../components/LineLink";
import { commander } from "../components/Navigation";
import { ReviewsCarousel } from "../components/ReviewsCarousel";
import { Alt, btnLight, btnPrimary, headingLg } from "../components/ui";
import { dishName, menuCategories, specials, specialsNote, testimonials } from "../data/menu";
import { asset } from "../lib/asset";
import { useCart, type OrderMode } from "../lib/cart";
import { useFormatPrice, useI18n, type Key } from "../lib/i18n";
import { navigate } from "../lib/router";

function Hero() {
  const { t } = useI18n();
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 md:px-10 pt-36 pb-16 md:pt-44 md:pb-24 min-h-[78svh] flex flex-col items-center justify-center text-center">
        <h1
          data-reveal
          data-intro
          className="font-display font-extrabold text-ink leading-[0.98] tracking-[-0.03em] text-[clamp(3rem,9vw,8.5rem)]"
        >
          {t("home.title1")}
          <br />
          <Alt>&amp;</Alt> {t("home.title2")}
        </h1>
        <p data-fade="0.35" data-intro className="script text-red-600 text-[clamp(2.2rem,4.5vw,3.6rem)] mt-6 text-balance">
          {t("home.tagline")}
        </p>
        <div data-fade="0.55" data-intro className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <button onClick={() => commander("hero")} className={btnPrimary}>
            {t("home.cta")}
          </button>
          <LineButton href="#/menu" onClick={() => navigate("/menu")} className="text-ink">
            {t("home.seeMenu")}
          </LineButton>
        </div>
        <p data-fade="0.7" data-intro className="mt-6 text-sm text-ink/50">
          {t("home.payNote")}
        </p>
      </div>
    </section>
  );
}

function HeroImage() {
  return (
    <section data-nav="dark" className="h-[60svh] md:h-[85svh] overflow-hidden bg-red-700" aria-label="Pizza toute garnie">
      <img
        data-parallax="-24"
        src={asset("/images/hero.webp")}
        alt="Pizza toute garnie sortie du four"
        className="h-[124%] w-full object-cover will-change-transform"
      />
    </section>
  );
}

type BestSeller = {
  key: Key;
  desc: Key;
  category: string;
  item: string;
  size: number;
  image?: string;
  word: string;
};

// Each best seller points at a real menu row, so prices follow the menu data.
const BEST_SELLERS: BestSeller[] = [
  { key: "best.pizza", desc: "best.pizzaDesc", category: "notre-delicieuse-pizza", item: "Toute garnie", size: 3, image: "/images/pizza.webp", word: "Pizza" },
  { key: "best.poutine", desc: "best.poutineDesc", category: "poutines-speciales", item: "Toute garnie", size: 0, word: "Poutine" },
  { key: "best.sub", desc: "best.subDesc", category: "sous-marins", item: "Le Super (tout garni)", size: 0, word: "Sous-marin" },
  { key: "best.brochette", desc: "best.brochetteDesc", category: "les-repas", item: "Brochette de poulet (1 bâton)", size: 0, word: "Brochette" },
];

function BestSellers() {
  const { t } = useI18n();
  const formatPrice = useFormatPrice();
  const cart = useCart();
  const [added, setAdded] = useState<string | null>(null);

  return (
    <section className="bg-paper py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <div>
            <p data-fade className="script text-red-600 text-5xl md:text-6xl mb-3">{t("best.kicker")}</p>
            <h2 data-reveal className={headingLg}>
              {t("best.title")} <Alt>{t("best.titleAlt")}</Alt>
            </h2>
          </div>
          <LineButton href="#/commander" onClick={() => commander("best-sellers")} className="shrink-0 text-ink">
            {t("nav.order")}
          </LineButton>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {BEST_SELLERS.map((b, i) => {
            const category = menuCategories.find((c) => c.id === b.category);
            const row = category?.items.find((it) => it.name.includes(b.item));
            const price = row?.prices[b.size] ?? null;
            const size = category && category.sizes.length > 1 ? category.sizes[b.size] : undefined;
            const name = t(b.key);
            return (
              <article key={b.key} data-fade={i * 0.08} className="group flex flex-col rounded-2xl bg-cream overflow-hidden">
                <div className="relative aspect-square overflow-hidden bg-red-700">
                  {b.image ? (
                    <img
                      src={asset(b.image)}
                      alt={name}
                      loading="lazy"
                      className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-105 group-hover:rotate-6"
                    />
                  ) : (
                    // Photo coming from the restaurant; the dish name holds the spot meanwhile.
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="script text-paper/90 text-[clamp(1.8rem,4vw,3rem)] -rotate-6 transition-transform duration-700 group-hover:scale-110">
                        {b.word}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4 md:p-6">
                  <h3 className="font-display font-bold text-base md:text-xl leading-tight">{name}</h3>
                  <p className="text-xs md:text-sm text-ink/55 mt-1 flex-1">{t(b.desc)}</p>
                  {price !== null && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display font-bold tabular-nums">
                        {formatPrice(price)}
                        {size && <span className="block text-xs font-normal text-ink/50">{size}</span>}
                      </span>
                      <button
                        onClick={() => {
                          cart.add({ name: dishName(b.category, row!.name), size, price, category: b.category });
                          setAdded(b.key);
                          window.setTimeout(() => setAdded((k) => (k === b.key ? null : k)), 1600);
                        }}
                        className="rounded-full bg-red-600 px-4 py-2.5 text-xs md:text-sm font-bold text-paper hover:bg-red-700 transition-colors"
                      >
                        {added === b.key ? "✓" : `+ ${t("best.add")}`}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Modes() {
  const { t } = useI18n();
  const cart = useCart();
  const go = (mode: OrderMode) => {
    cart.setMode(mode);
    commander(`mode-${mode}`);
  };
  const all: { title: Key; desc: Key; action: () => void; icon: string }[] = [
    { title: "modes.emporter", desc: "modes.emporterDesc", action: () => go("emporter"), icon: "01" },
    { title: "modes.livraison", desc: "modes.livraisonDesc", action: () => go("livraison"), icon: "02" },
    { title: "modes.surPlace", desc: "modes.surPlaceDesc", action: () => navigate("/sur-place"), icon: "03" },
  ];
  // Only the ways the restaurant currently offers (admin settings).
  const cards = all.filter((c) =>
    c.title === "modes.emporter" ? cart.modes.includes("emporter") : c.title === "modes.livraison" ? cart.modes.includes("livraison") : true,
  );

  return (
    <section className="bg-cream py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <p data-fade className="script text-red-600 text-5xl md:text-6xl mb-3">{t("modes.kicker")}</p>
        <h2 data-reveal className={`${headingLg} mb-12`}>
          {t("modes.title")} <Alt>{t("modes.titleAlt")}</Alt>
        </h2>
        <div className={`grid gap-4 md:gap-5 ${cards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {cards.map((c, i) => (
            <button
              key={c.title}
              onClick={c.action}
              data-fade={i * 0.08}
              className="group text-left rounded-2xl bg-paper p-7 md:p-9 flex flex-col min-h-[220px] hover:bg-red-600 hover:text-paper transition-colors duration-300"
            >
              <span className="alt text-2xl text-red-600 group-hover:text-orange-soft transition-colors">{c.icon}</span>
              <span className="font-display font-extrabold text-3xl mt-6">{t(c.title)}</span>
              <span className="mt-2 text-ink/60 group-hover:text-paper/80 flex-1 transition-colors">{t(c.desc)}</span>
              <span className="mt-6 text-sm font-bold">{t("modes.go")} →</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Specials() {
  const { t } = useI18n();
  const formatPrice = useFormatPrice();
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="speciaux" data-nav="dark" className="relative overflow-hidden bg-red-700 py-28 md:py-40">
      <img
        data-parallax="-12"
        src={asset("/gallery/pain.webp")}
        alt=""
        loading="lazy"
        className="absolute inset-x-0 -top-[12%] h-[124%] w-full object-cover opacity-25 mix-blend-multiply"
      />
      <div className="relative mx-auto max-w-5xl px-5 md:px-10 flex flex-col items-center text-center">
        <p data-fade className="script text-orange text-5xl md:text-6xl mb-4">{t("specials.kicker")}</p>
        <h2 data-reveal className="font-display font-extrabold text-paper text-[clamp(2.6rem,6vw,5.5rem)] leading-[1.02] tracking-[-0.02em] mb-14">
          {t("specials.title")} <span className="alt text-orange-soft">{t("specials.titleAlt")}</span> {t("specials.titleEnd")}
        </h2>

        <div className="w-full grid sm:grid-cols-3 gap-4 md:gap-5 mb-10 text-left">
          {specials
            .filter((s) => s.featured)
            .map((s, i) => (
              <div key={s.id} data-fade={i * 0.1} className="rounded-2xl bg-paper p-6 md:p-7 flex flex-col">
                <p className="alt text-xl text-red-600 mb-3">
                  {t("specials.number")} {s.id}
                </p>
                <p className="text-ink/80 leading-snug mb-6 flex-1">{s.name}</p>
                <p className="font-display font-black text-3xl text-ink">{formatPrice(s.price)}</p>
              </div>
            ))}
        </div>

        <button
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="mb-10 alt text-lg text-paper/85 underline underline-offset-4 decoration-1 hover:text-paper transition-colors py-2"
        >
          {showAll ? t("specials.hide") : t("specials.all", { n: specials.length })}
        </button>

        <AnimatePresence initial={false}>
          {showAll && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full overflow-hidden mb-12"
            >
              <ul className="rounded-2xl bg-paper text-ink text-left px-5 md:px-8 py-2">
                {specials.map((s) => (
                  <li key={s.id} className="flex items-baseline gap-4 py-3.5 border-b border-ink/10 last:border-0">
                    <span className="w-8 shrink-0 font-display font-black text-red-600">{s.id}</span>
                    <span className="flex-1">
                      {s.name}
                      {s.desc && <span className="block text-sm text-ink/55">{s.desc}</span>}
                    </span>
                    <span className="font-display font-bold shrink-0 tabular-nums">{formatPrice(s.price)}</span>
                  </li>
                ))}
              </ul>
              {specialsNote && (
                <p className="mt-4 text-xs text-paper/65">
                  {specialsNote}. {t("specials.rule")}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => commander("specials")} className={btnLight}>
          {t("home.cta")}
        </button>
      </div>
    </section>
  );
}

function Reviews() {
  const { t } = useI18n();
  return (
    <section className="bg-linear-to-b from-cream to-paper py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <h2 data-reveal className={`${headingLg} text-center mb-16`}>
          {t("reviews.title")} <Alt>{t("reviews.titleAlt")}</Alt>
        </h2>
        <ReviewsCarousel reviews={testimonials} />
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <Hero />
      <HeroImage />
      <BestSellers />
      <Modes />
      <Specials />
      <Reviews />
    </>
  );
}
