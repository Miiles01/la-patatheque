import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { DrawLogo } from "./components/DrawLogo";
import { LineButton, SweepLink } from "./components/LineLink";
import { LogoMark } from "./components/LogoMark";
import { Navigation, SOCIALS } from "./components/Navigation";
import { openPolicy, PolicyModal } from "./components/PolicyModal";
import { openReservation, ReservationModal } from "./components/ReservationModal";
import {
  formatPrice,
  menuCategories,
  restaurant,
  specials,
  specialsNote,
  testimonials,
  type MenuCategory,
} from "./data/menu";
import { gsap, reducedMotion, scrollToHash, useScrollEffects, useSmoothScroll } from "./lib/motion";

const goTo = (hash: string) => () => scrollToHash(hash);

/** Italic serif accent used inside headings, as in an editorial menu card. */
function Alt({ children }: { children: React.ReactNode }) {
  return <span className="alt text-red-600">{children}</span>;
}

function Hero() {
  return (
    <section id="accueil" className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 md:px-10 pt-32 pb-16 md:pt-40 md:pb-24 min-h-[86svh] flex flex-col items-center justify-center text-center">
        {/* Slot the navbar logo starts in (same size as in the bar); it slides into the bar on scroll. */}
        <div id="hero-logo" aria-hidden="true" className="h-8 md:h-10 aspect-[3225/794] mb-8 md:mb-10 text-red-600">
          {reducedMotion && <LogoMark className="block w-full h-full" />}
        </div>
        <h1
          data-reveal
          data-intro
          className="font-display font-extrabold text-ink leading-[0.98] tracking-[-0.03em] text-[clamp(3rem,9vw,8.5rem)]"
        >
          Pizza, poutine
          <br />
          <Alt>&amp;</Alt> sous-marins
        </h1>
        <p data-fade="0.35" data-intro className="script text-red-600 text-[clamp(2.2rem,4.5vw,3.6rem)] mt-6">
          La meilleure pizza de l'Est
        </p>
        <div data-fade="0.55" data-intro className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <button
            onClick={openReservation}
            className="rounded-full bg-red-600 px-8 py-4 text-sm font-bold text-paper hover:bg-red-700 transition-colors"
          >
            Réserver une table
          </button>
          <LineButton href="#menu" onClick={goTo("#menu")} className="text-ink">
            Voir le menu
          </LineButton>
        </div>
      </div>
    </section>
  );
}

function HeroImage() {
  return (
    <section data-nav="dark" className="h-[70svh] md:h-[90svh] overflow-hidden bg-red-700" aria-label="Pizza toute garnie">
      <img
        data-parallax="-24"
        src="/images/hero.webp"
        alt="Pizza toute garnie sortie du four"
        className="h-[124%] w-full object-cover will-change-transform"
      />
    </section>
  );
}

function Statement() {
  return (
    <section className="relative bg-paper overflow-hidden py-24 md:py-40">
      <div className="mx-auto max-w-7xl px-5 md:px-10 grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-12 md:gap-6">
        <div className="relative flex justify-center md:justify-start md:-ml-24 lg:-ml-40">
          <img
            data-spin
            src="/images/pizza.webp"
            alt="Pizza pepperoni de La Patathèque vue de haut"
            width={760}
            height={760}
            loading="lazy"
            className="w-[78vw] max-w-[26rem] md:w-[34rem] md:max-w-none lg:w-[40rem] drop-shadow-2xl"
          />
        </div>
        <h2
          data-reveal
          className="font-display font-extrabold text-ink text-[clamp(2.1rem,4.4vw,4rem)] leading-[1.08] tracking-[-0.02em] md:text-right"
        >
          <Alt>{restaurant.yearsOpen} ans</Alt> de sauce maison, de four toujours chaud <Alt>et</Alt> de portions
          généreuses.
        </h2>
      </div>
    </section>
  );
}

const TRIPTYCH = [
  { image: "/gallery/sauce.webp", caption: "Une sauce faite maison", drift: 10 },
  { image: "/gallery/pate.webp", caption: "Une recette qui n'a pas changé", drift: -8 },
  { image: "/gallery/pain.webp", caption: "Le pain des sous-marins, livré frais", drift: 4 },
];

function Triptych() {
  return (
    <section className="bg-paper pb-24 md:pb-40" aria-label="Notre cuisine en images">
      <div className="mx-auto max-w-7xl px-5 md:px-10 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        {TRIPTYCH.map((item, i) => (
          <figure key={item.image} data-drift={item.drift} className={i === 2 ? "hidden md:block" : ""}>
            <div className="aspect-[2/3] overflow-hidden rounded-sm">
              <img data-zoom src={item.image} alt={item.caption} loading="lazy" className="h-full w-full object-cover" />
            </div>
            <figcaption className="alt text-ink/70 text-base md:text-lg mt-3">{item.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Story() {
  const numberRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = numberRef.current;
    if (!el) return;
    if (reducedMotion) {
      el.textContent = String(restaurant.yearsOpen);
      return;
    }
    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: restaurant.yearsOpen,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = String(Math.round(counter.val));
      },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section id="histoire" className="bg-cream py-24 md:py-40">
      <div className="mx-auto max-w-2xl px-5 text-center">
        <p data-fade className="script text-red-600 text-5xl md:text-6xl mb-6">Notre histoire</p>
        <h2 data-reveal className="font-display font-extrabold text-ink text-[clamp(2rem,4vw,3.25rem)] leading-[1.1] tracking-[-0.02em]">
          Un comptoir de quartier <Alt>qui n'a jamais</Alt> changé de recette.
        </h2>
        <p data-fade className="mt-8 text-lg leading-relaxed text-ink/70">
          Même adresse sur Sherbrooke Est, même sauce, même four toujours chaud. Depuis {restaurant.yearsOpen} ans,
          La Patathèque nourrit les familles de Rivière-des-Prairies – Pointe-aux-Trembles, repas après repas.
        </p>
        <p data-fade className="mt-4 text-lg leading-relaxed text-ink/70">
          Pas de chichi : des habitués qu'on connaît par leur prénom, des portions qui remplissent et une pizza toute
          garnie qui goûte encore comme avant.
        </p>

        <dl data-fade className="mt-14 grid grid-cols-3 gap-4 border-y border-ink/10 py-8">
          <div>
            <dt className="sr-only">Années de service</dt>
            <dd className="font-display font-black text-4xl md:text-6xl text-red-600 tabular-nums">
              <span ref={numberRef}>0</span>+
            </dd>
            <dd className="alt text-ink/60 mt-1">années de service</dd>
          </div>
          <div>
            <dt className="sr-only">Note Google</dt>
            <dd className="font-display font-black text-4xl md:text-6xl text-ink">
              {String(restaurant.rating).replace(".", ",")}
              <span className="text-orange">★</span>
            </dd>
            <dd className="alt text-ink/60 mt-1">{restaurant.reviewCount} avis Google</dd>
          </div>
          <div>
            <dt className="sr-only">Plats au menu</dt>
            <dd className="font-display font-black text-4xl md:text-6xl text-ink">100+</dd>
            <dd className="alt text-ink/60 mt-1">plats au menu</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Kitchen() {
  return (
    <section className="bg-paper py-24 md:py-40 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 md:px-10 grid md:grid-cols-2 gap-12 md:gap-10 items-center">
        <div className="relative z-10 md:-mr-[15%]">
          <p data-fade className="script text-red-600 text-5xl md:text-6xl mb-4">Notre cuisine</p>
          <h2 data-reveal className="font-display font-extrabold text-ink text-[clamp(2.2rem,4.6vw,4.2rem)] leading-[1.05] tracking-[-0.02em]">
            De 8 à 18 pouces, <Alt>gratinée</Alt> comme il se doit.
          </h2>
          <p data-fade className="mt-8 max-w-md text-lg leading-relaxed text-ink/70">
            Des pizzas en six formats, des sous-marins garnis d'oignons frits, des poutines à la sauce maison et des
            pâtes gratinées au four. Livraison gratuite dans le quartier.
          </p>
          <div data-fade className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <LineButton href="#menu" onClick={goTo("#menu")} className="text-ink">
              Voir le menu
            </LineButton>
            <LineButton href={restaurant.orderUrl} external className="text-ink/60">
              Commander en ligne
            </LineButton>
          </div>
        </div>
        <div className="aspect-[4/5] overflow-hidden rounded-sm">
          <img
            data-parallax="-20"
            src="/images/story-pizza.webp"
            alt="Fromage filant d'une pointe de pizza"
            loading="lazy"
            className="h-[120%] w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function MenuSection() {
  const [categoryId, setCategoryId] = useState(menuCategories[0].id);
  const category = menuCategories.find((c) => c.id === categoryId) ?? menuCategories[0];

  return (
    <section id="menu" className="bg-paper border-t border-ink/10 py-24 md:py-40 text-ink">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
          <div>
            <p data-fade className="script text-red-600 text-5xl md:text-6xl mb-3">Le menu</p>
            <h2 data-reveal className="font-display font-extrabold text-[clamp(2.2rem,4.4vw,4rem)] leading-[1.05] tracking-[-0.02em] max-w-2xl">
              Les classiques <Alt>qu'on vient</Alt> chercher.
            </h2>
          </div>
          <LineButton href={restaurant.orderUrl} external className="shrink-0 text-ink">
            Commander en ligne
          </LineButton>
        </div>

        <div
          role="tablist"
          aria-label="Catégories du menu"
          className="-mx-5 px-5 md:mx-0 md:px-0 flex gap-2 overflow-x-auto md:flex-wrap pb-2 mb-10 [scrollbar-width:none]"
        >
          {menuCategories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={c.id === category.id}
              onClick={() => setCategoryId(c.id)}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                c.id === category.id
                  ? "border-red-600 bg-red-600 text-paper"
                  : "border-ink/15 text-ink/70 hover:border-ink/40 hover:text-ink"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={category.id}
            role="tabpanel"
            aria-label={category.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <MenuTable category={category} />
          </motion.div>
        </AnimatePresence>

        <p className="mt-10 text-xs text-ink/45">
          Prix sujets à changement sans préavis. Taxes en sus. {restaurant.delivery}.
        </p>
      </div>
    </section>
  );
}

function MenuTable({ category }: { category: MenuCategory }) {
  const multiSize = category.sizes.length > 1;
  const columns = `minmax(0,1fr) repeat(${category.sizes.length}, 5.5rem)`;

  return (
    <div>
      <h3 className="alt text-3xl md:text-4xl text-red-600 mb-2">{category.name}</h3>
      {category.note && <p className="text-ink/60 mb-6 max-w-2xl">{category.note}</p>}

      {multiSize && (
        <div
          className="hidden md:grid gap-x-2 border-b border-ink/20 pb-3 mt-6 text-xs font-bold uppercase tracking-wider text-ink/50"
          style={{ gridTemplateColumns: columns }}
        >
          <span />
          {category.sizes.map((s) => (
            <span key={s} className="text-right">{s}</span>
          ))}
        </div>
      )}

      <ul className={multiSize ? "" : "mt-6 border-t border-ink/20"}>
        {category.items.map((item) => (
          <li
            key={`${item.num ?? ""}${item.name}`}
            className="py-4 border-b border-ink/10 md:grid md:gap-x-2 md:items-baseline"
            style={{ gridTemplateColumns: multiSize ? columns : undefined }}
          >
            <div className={multiSize ? "" : "flex items-baseline justify-between gap-4"}>
              <div>
                <p className="font-semibold">
                  {item.num && <span className="text-red-600 mr-2">{item.num}.</span>}
                  {item.name}
                </p>
                {item.desc && <p className="text-sm text-ink/55 mt-0.5">{item.desc}</p>}
                {item.note && <p className="text-xs text-ink/45 mt-1">{item.note}</p>}
              </div>
              {!multiSize && (
                <span className="font-display font-bold text-lg shrink-0 tabular-nums">
                  {item.prices[0] === null ? "—" : formatPrice(item.prices[0])}
                </span>
              )}
            </div>

            {multiSize && (
              <>
                {/* Mobile: size/price pairs */}
                <div className="md:hidden mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {item.prices.map((price, i) =>
                    price === null ? null : (
                      <span key={category.sizes[i]}>
                        <span className="text-ink/50">{category.sizes[i]}</span>{" "}
                        <span className="font-semibold">{formatPrice(price)}</span>
                      </span>
                    ),
                  )}
                </div>
                {/* Desktop: one column per size */}
                {item.prices.map((price, i) => (
                  <span key={category.sizes[i]} className="hidden md:block text-right font-semibold tabular-nums">
                    {price === null ? <span className="text-ink/25">—</span> : formatPrice(price)}
                  </span>
                ))}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Specials() {
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="speciaux" data-nav="dark" className="relative overflow-hidden bg-red-700 py-28 md:py-44">
      <img
        data-parallax="-12"
        src="/gallery/pain.webp"
        alt=""
        loading="lazy"
        className="absolute inset-x-0 -top-[12%] h-[124%] w-full object-cover opacity-25 mix-blend-multiply"
      />
      <div className="relative mx-auto max-w-5xl px-5 md:px-10 flex flex-col items-center text-center">
        <p data-fade className="script text-orange text-5xl md:text-6xl mb-4">Super spéciaux</p>
        <h2 data-reveal className="font-display font-extrabold text-paper text-[clamp(2.6rem,6vw,5.5rem)] leading-[1.02] tracking-[-0.02em] mb-14">
          Bien manger, <span className="alt text-orange-soft">sans se</span> ruiner.
        </h2>

        <div className="w-full grid sm:grid-cols-3 gap-4 md:gap-5 mb-10 text-left">
          {specials
            .filter((s) => s.featured)
            .map((s, i) => (
              <div key={s.id} data-fade={i * 0.1} className="rounded-2xl bg-paper p-6 md:p-7 flex flex-col">
                <p className="alt text-xl text-red-600 mb-3">Spécial no {s.id}</p>
                <p className="text-ink/80 leading-snug mb-6 flex-1">{s.name}</p>
                <p className="font-display font-black text-3xl text-ink">{formatPrice(s.price)}</p>
              </div>
            ))}
        </div>

        <button
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="mb-10 alt text-lg text-paper/85 underline underline-offset-4 decoration-1 hover:text-paper transition-colors"
        >
          {showAll ? "Masquer la liste" : `Voir les ${specials.length} super spéciaux`}
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
                      {s.note && <span className="block text-xs text-ink/45">{s.note}</span>}
                    </span>
                    <span className="font-display font-bold shrink-0 tabular-nums">{formatPrice(s.price)}</span>
                  </li>
                ))}
              </ul>
              {specialsNote && (
                <p className="mt-4 text-xs text-paper/65">
                  {specialsNote}. Les spéciaux ne peuvent être combinés avec d'autres offres.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={openReservation}
          className="rounded-full bg-orange px-9 py-4 text-sm font-bold text-ink hover:bg-orange-soft transition-colors"
        >
          Réserver une table
        </button>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-cream py-24 md:py-40">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <h2 data-reveal className="text-center font-display font-extrabold text-ink text-[clamp(2.2rem,4.4vw,4rem)] leading-[1.05] tracking-[-0.02em] mb-16">
          Le quartier <Alt>en parle</Alt>
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <figure key={t.name} data-fade={i * 0.1} className="rounded-2xl bg-paper p-8 flex flex-col">
              <span className="text-orange tracking-[0.2em] mb-5" aria-label="5 étoiles sur 5">★★★★★</span>
              <blockquote className="alt text-xl leading-snug text-ink flex-1 mb-8">« {t.quote} »</blockquote>
              <figcaption className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-red-600 text-paper flex items-center justify-center font-display font-bold">
                  {t.name.charAt(0)}
                </span>
                <span>
                  <span className="block font-semibold text-ink text-sm">{t.name}</span>
                  <span className="block text-ink/50 text-xs">{t.neighborhood}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Visit() {
  const mapQuery = encodeURIComponent(restaurant.address);

  return (
    <section id="visite" className="bg-paper py-24 md:py-40 text-ink">
      <div className="mx-auto max-w-7xl px-5 md:px-10 grid lg:grid-cols-2 gap-14">
        <div>
          <p data-fade className="script text-red-600 text-5xl md:text-6xl mb-3">Nous trouver</p>
          <h2 data-reveal className="font-display font-extrabold text-[clamp(2.2rem,4.4vw,4rem)] leading-[1.05] tracking-[-0.02em] mb-12">
            Sur Sherbrooke Est, <Alt>comme toujours.</Alt>
          </h2>

          <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
            <div data-fade className="sm:col-span-2">
              <dt className="alt text-lg text-ink/60 mb-1">Adresse</dt>
              <dd>
                <SweepLink href={restaurant.mapsUrl} external className="text-lg font-semibold">
                  {restaurant.address}
                </SweepLink>
              </dd>
            </div>
            <div data-fade>
              <dt className="alt text-lg text-ink/60 mb-1">Téléphone</dt>
              <dd>
                <SweepLink href={`tel:${restaurant.phone}`} className="text-lg font-semibold">
                  {restaurant.phoneDisplay}
                </SweepLink>
              </dd>
            </div>
            <div data-fade>
              <dt className="alt text-lg text-ink/60 mb-1">Livraison</dt>
              <dd className="text-ink/80">{restaurant.delivery}</dd>
            </div>
            <div data-fade className="sm:col-span-2">
              <dt className="alt text-lg text-ink/60 mb-2">Heures d'ouverture</dt>
              <dd>
                <ul className="flex flex-col gap-2 max-w-sm">
                  {restaurant.hours.map((h) => (
                    <li key={h.day} className="flex justify-between gap-6 border-b border-ink/10 pb-2 text-ink/80">
                      <span>{h.day}</span>
                      <span className="font-semibold tabular-nums">{h.time}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>

          <button
            data-fade
            onClick={openReservation}
            className="mt-12 rounded-full bg-red-600 px-8 py-4 text-sm font-bold text-paper hover:bg-red-700 transition-colors"
          >
            Réserver une table
          </button>
        </div>

        <div className="rounded-sm overflow-hidden min-h-[380px] border border-ink/10">
          <iframe
            title="Carte : La Patathèque, 13640 rue Sherbrooke Est"
            src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 380 }}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer data-nav="dark" className="bg-red-700 text-paper px-5 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="py-16 md:py-24 border-b border-paper/20 flex justify-center">
          <DrawLogo className="w-full max-w-5xl h-auto text-paper" />
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-[2fr_2fr_1fr] gap-x-4 gap-y-10 py-12 border-b border-paper/20 text-[15px] leading-relaxed">
          <div>
            <p className="alt text-lg mb-4">Contact</p>
            <SweepLink href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</SweepLink>
            <p className="text-paper/70">Livraison gratuite, minimum 10 $</p>
          </div>
          <div>
            <p className="alt text-lg mb-4">Heures</p>
            {restaurant.hours.map((h) => (
              <p key={h.day} className="text-paper/85">
                {h.day} : {h.time}
              </p>
            ))}
          </div>
          <div>
            <p className="alt text-lg mb-4">Liens</p>
            <div className="flex flex-col items-start">
              <SweepLink href="#menu" onClick={goTo("#menu")}>Le menu</SweepLink>
              <SweepLink href="#speciaux" onClick={goTo("#speciaux")}>Super spéciaux</SweepLink>
              <SweepLink onClick={openReservation}>Réserver</SweepLink>
            </div>
          </div>
          <div>
            <p className="alt text-lg mb-4">Où nous trouver</p>
            <SweepLink href={restaurant.mapsUrl} external>
              13640, rue Sherbrooke Est
              <br />
              Montréal (Québec) H1A 4B2
            </SweepLink>
          </div>
          <div>
            <p className="alt text-lg mb-4">Paiement</p>
            <p className="text-paper/85">{restaurant.payments}</p>
          </div>
          <div>
            <p className="alt text-lg mb-4">Social</p>
            <div className="flex flex-col items-start">
              {SOCIALS.map((s) => (
                <SweepLink key={s.label} href={s.href} external>{s.label}</SweepLink>
              ))}
            </div>
          </div>
        </div>

        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-paper/60">
          <span>© {year} La Patathèque · Rivière-des-Prairies – Pointe-aux-Trembles</span>
          <SweepLink onClick={openPolicy}>Politique de confidentialité</SweepLink>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  useSmoothScroll();
  useScrollEffects();

  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <HeroImage />
        <Statement />
        <Triptych />
        <Story />
        <Kitchen />
        <MenuSection />
        <Specials />
        <Testimonials />
        <Visit />
      </main>
      <Footer />
      <ReservationModal />
      <PolicyModal />
    </>
  );
}
