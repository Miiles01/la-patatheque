import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { LineButton } from "../components/LineLink";
import { commander } from "../components/Navigation";
import { ReviewsCarousel } from "../components/ReviewsCarousel";
import { openReservation } from "../components/ReservationModal";
import { Alt, btnLight, btnOutline, btnPrimary, headingLg } from "../components/ui";
import { reservationSettings } from "../lib/reservations";
import { restaurant, specialsNote, testimonials } from "../data/menu";
import { useMenu } from "../lib/menuStore";
import { asset } from "../lib/asset";
import { useCart, type OrderMode } from "../lib/cart";
import { useFormatPrice, useI18n, type Key } from "../lib/i18n";
import { reducedMotion } from "../lib/motion";
import { navigate, routeHref } from "../lib/router";

function Hero() {
  const { t } = useI18n();
  const reservations = reservationSettings.use();
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
          {reservations.enabled && (
            <button onClick={openReservation} className={btnOutline}>
              {t("book.cta")}
            </button>
          )}
          <LineButton href={routeHref("/menu")} onClick={() => navigate("/menu")} className="text-ink">
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

// Phones get the lighter 720p cut; larger screens the 1080p one.
const HERO_VIDEO = window.matchMedia("(min-width: 1024px)").matches ? "/video/hero-1080.mp4" : "/video/hero-720.mp4";

/** Drone shot of the restaurant on Sherbrooke East: silent, looping, with the same parallax as before. */
function HeroImage() {
  return (
    <section data-nav="dark" className="h-[60svh] md:h-[85svh] overflow-hidden bg-red-700" aria-label="La Patathèque vue du ciel">
      <video
        data-parallax="-24"
        src={asset(HERO_VIDEO)}
        poster={asset("/video/hero-poster.webp")}
        autoPlay={!reducedMotion}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Vue aérienne de La Patathèque, rue Sherbrooke Est"
        className="h-[124%] w-full object-cover will-change-transform"
      />
    </section>
  );
}

type BestSeller = {
  key: Key;
  /** Only when the printed menu describes the dish. */
  desc?: Key;
  category: string;
  item: string;
  size: number;
  image?: string;
  word: string;
};

// Each best seller points at a real menu row, so prices follow the menu data.
const BEST_SELLERS: BestSeller[] = [
  { key: "best.burger", desc: "best.burgerDesc", category: "les-repas", item: "Hamburger B.B.Q.", size: 0, image: "/dishes/burger.webp", word: "Burger" },
  { key: "best.brochette", desc: "best.brochetteDesc", category: "les-repas", item: "Brochette de poulet (1 bâton)", size: 0, image: "/dishes/brochette.webp", word: "Brochette" },
  { key: "best.club", category: "sandwichs", item: "Club Sandwich", size: 0, image: "/dishes/club.webp", word: "Club" },
  { key: "best.sub", desc: "best.subDesc", category: "sous-marins", item: "Le Super (tout garni)", size: 0, image: "/dishes/sous-marin.webp", word: "Sous-marin" },
  { key: "best.salade", category: "les-salades", item: "Salade italienne", size: 0, image: "/dishes/salade.webp", word: "Salade" },
  { key: "best.frites", category: "les-casse-croutes", item: "Frites maison", size: 1, image: "/dishes/frites.webp", word: "Frites" },
  { key: "best.poutine", category: "poutines-speciales", item: "Avec sauce", size: 0, image: "/dishes/poutine.webp", word: "Poutine" },
];

/**
 * Tablet and desktop: the carousel fades out on the side that has more cards,
 * the right at first, then the left too once it has been scrolled.
 */
function useRailEdges(rail: React.RefObject<HTMLDivElement | null>) {
  const [mask, setMask] = useState<string | undefined>();
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const wide = window.matchMedia("(min-width: 768px)");
    const update = () => {
      if (!wide.matches) return setMask(undefined);
      const fade = Math.min(160, el.clientWidth * 0.12);
      const left = el.scrollLeft > 4 ? fade : 0;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4 ? fade : 0;
      setMask(`linear-gradient(to right, transparent, #000 ${left}px, #000 calc(100% - ${right}px), transparent)`);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [rail]);
  return mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined;
}

function BestSellers() {
  const { t } = useI18n();
  const { categories: menuCategories } = useMenu();
  const formatPrice = useFormatPrice();
  const rail = useRef<HTMLDivElement>(null);
  const edges = useRailEdges(rail);
  // One card per click.
  const scroll = (dir: 1 | -1) => {
    const el = rail.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: "smooth" });
  };

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
          <div className="flex items-center gap-5 shrink-0">
            <LineButton href={routeHref("/commander")} onClick={() => commander("best-sellers")} className="text-ink">
              {t("nav.order")}
            </LineButton>
            <div className="hidden md:flex gap-2">
              {([-1, 1] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => scroll(dir)}
                  aria-label={t(dir < 0 ? "best.prev" : "best.next")}
                  className="w-11 h-11 flex items-center justify-center rounded-full border border-ink/15 hover:border-red-600 hover:text-red-600 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${dir < 0 ? "rotate-180" : ""}`} aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={rail}
          style={edges}
          className="-mx-5 px-5 md:mx-0 md:px-0 flex gap-3 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-px-5 md:scroll-px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {BEST_SELLERS.map((b, i) => {
            const category = menuCategories.find((c) => c.id === b.category);
            const row = category?.items.find((it) => it.name.includes(b.item));
            const price = row?.prices[b.size] ?? null;
            const size = category && category.sizes.length > 1 ? category.sizes[b.size] : undefined;
            const name = t(b.key);
            return (
              <a
                key={b.key}
                href={routeHref("/commander")}
                onClick={(e) => {
                  e.preventDefault();
                  commander("best-sellers");
                }}
                data-fade={Math.min(i, 3) * 0.08}
                className="group relative snap-start shrink-0 w-[84%] sm:w-[58%] md:w-[calc((100%-2.5rem)/2.4)] lg:w-[calc((100%-3.75rem)/3.4)] aspect-[4/5] rounded-2xl overflow-hidden bg-red-700"
              >
                {row?.photo || b.image ? (
                  <img
                    src={row?.photo || asset(b.image!)}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  // Photo coming from the restaurant; the dish name holds the spot meanwhile.
                  <span className="absolute inset-0 flex items-center justify-center script text-paper/90 text-[clamp(1.8rem,4vw,3rem)] -rotate-6">
                    {b.word}
                  </span>
                )}
                {/* Darkens the bottom so the name stays readable on any photo. */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/75 to-ink/0" />
                {price !== null && (
                  <span className="absolute top-4 right-4 md:top-6 md:right-6 rounded-full bg-paper px-4 py-2 text-base font-display font-bold tabular-nums text-ink">
                    {formatPrice(price)}
                    {size && <span className="ml-1.5 text-xs font-normal text-ink/55">{size}</span>}
                  </span>
                )}
                <h3 className="absolute left-5 right-5 bottom-5 md:left-7 md:right-7 md:bottom-7 font-display font-bold text-paper text-2xl md:text-3xl leading-tight">
                  {name}
                </h3>
              </a>
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

// Three photos between the order modes and the specials, set at different
// heights and drifting at different speeds as the page scrolls.
const GALLERY: { src: string; alt: Key; drift: string; offset: string }[] = [
  { src: "/gallery/club-fourchette.webp", alt: "gallery.club", drift: "-10", offset: "" },
  { src: "/gallery/brochette-mains.webp", alt: "gallery.brochette", drift: "8", offset: "mt-10 md:mt-24" },
  { src: "/gallery/sous-marin-assiette.webp", alt: "gallery.sub", drift: "-16", offset: "mt-4 md:mt-8" },
];

function Gallery() {
  const { t } = useI18n();
  return (
    <section className="bg-cream pb-24 md:pb-36 overflow-hidden" aria-label={t("gallery.label")}>
      <div className="mx-auto max-w-7xl px-5 md:px-10 grid grid-cols-3 gap-2.5 md:gap-6 items-start">
        {GALLERY.map((g, i) => (
          <div key={g.src} data-fade={i * 0.1} className={`overflow-hidden rounded-2xl md:rounded-3xl bg-red-700 aspect-[3/4] ${g.offset}`}>
            <img data-parallax={g.drift} src={asset(g.src)} alt={t(g.alt)} loading="lazy" className="h-[112%] w-full object-cover -mt-[6%]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Specials() {
  const { t } = useI18n();
  const { specials } = useMenu();
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
        <div data-fade className="mt-12 md:mt-16 flex justify-center">
          <a href={restaurant.reviewUrl} target="_blank" rel="noreferrer" className={btnOutline}>
            {t("reviews.cta")}
          </a>
        </div>
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
      <Gallery />
      <Specials />
      <Reviews />
    </>
  );
}
