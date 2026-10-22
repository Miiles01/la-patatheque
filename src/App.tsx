import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoMark } from "./components/LogoMark";
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

gsap.registerPlugin(ScrollTrigger, SplitText);

// autoSplit re-splits once web fonts load (and on resize), so lines measured
// against the fallback font don't leave one word per line.
function revealWords(el: HTMLElement, scrollTrigger?: ScrollTrigger.Vars) {
  return SplitText.create(el, {
    type: "words",
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.words, {
        opacity: 0,
        y: 15,
        stagger: 0.06,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger,
      }),
  });
}

function revealLines(el: HTMLElement, scrollTrigger?: ScrollTrigger.Vars) {
  return SplitText.create(el, {
    type: "lines",
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, {
        opacity: 0,
        y: 30,
        stagger: 0.2,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger,
      }),
  });
}

let lenisInstance: Lenis | null = null;

function scrollToHash(hash: string) {
  const target = hash === "#top" ? 0 : document.querySelector(hash);
  if (target === null) return;
  if (lenisInstance) {
    lenisInstance.scrollTo(target as HTMLElement | number, { offset: -80, duration: 1.2 });
  } else if (typeof target !== "number") {
    (target as HTMLElement).scrollIntoView({ behavior: "smooth" });
  }
}

function useSmoothScroll() {
  useLayoutEffect(() => {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenisInstance = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      lenisInstance = null;
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
    };
  }, []);

  useLayoutEffect(() => {
    const images = Array.from(document.images);
    const pending = images.filter((img) => !img.complete);
    if (pending.length === 0) {
      ScrollTrigger.refresh();
      return;
    }
    let remaining = pending.length;
    const onLoad = () => {
      remaining -= 1;
      if (remaining <= 0) ScrollTrigger.refresh();
    };
    pending.forEach((img) => img.addEventListener("load", onLoad, { once: true }));
    return () => pending.forEach((img) => img.removeEventListener("load", onLoad));
  }, []);
}

const HERO_IMG = "/images/hero.jpg";
const STORY_IMG = "/images/story-pizza.jpg";

const GALLERY_ITEMS = [
  { image: "/gallery/sauce.jpg", phrase: "Une sauce faite maison" },
  { image: "/gallery/pate.jpg", phrase: "Une recette qui n'a pas changé" },
  { image: "/gallery/pain.jpg", phrase: "Le vrai goût du quartier" },
];

function FeatureGallery() {
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      columnRefs.current.forEach((col) => {
        if (!col) return;
        const phrase = col.querySelector<HTMLElement>(".gallery-phrase");
        if (phrase) {
          splits.push(revealWords(phrase, { trigger: col, start: "top 80%" }));
        }
      });
    });
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  useLayoutEffect(() => {
    const id = window.setInterval(() => {
      setActive((v) => (v + 1) % GALLERY_ITEMS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section data-bg="#fbf3e6">
      {/* Desktop: 3 static full-bleed columns */}
      <div className="hidden md:grid md:grid-cols-3">
        {GALLERY_ITEMS.map((item, i) => (
          <div
            key={item.image}
            ref={(el) => { columnRefs.current[i] = el; }}
            className="relative h-[70vh] overflow-hidden"
          >
            <img src={item.image} alt={item.phrase} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-ink/45" />
            <div className="absolute inset-0 flex items-center justify-center px-8">
              <p className="gallery-phrase font-display font-extrabold text-2xl lg:text-3xl text-paper text-center leading-snug">
                {item.phrase}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: single column, images cycle */}
      <div className="md:hidden relative h-[60vh] overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={GALLERY_ITEMS[active].image}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={GALLERY_ITEMS[active].image}
              alt={GALLERY_ITEMS[active].phrase}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-ink/45" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center justify-center px-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={GALLERY_ITEMS[active].phrase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="font-display font-extrabold text-2xl text-paper text-center leading-snug"
            >
              {GALLERY_ITEMS[active].phrase}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-2">
          {GALLERY_ITEMS.map((item, i) => (
            <span
              key={item.image}
              className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-paper" : "w-1.5 bg-paper/40"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useLayoutEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        setHidden(self.scroll() > 120 && self.direction === 1);
      },
    });
    return () => trigger.kill();
  }, []);

  useLayoutEffect(() => {
    if (open) setHidden(false);
  }, [open]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-paper/90 backdrop-blur-md border-b border-ink/10 transition-transform duration-300 ease-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 h-20 flex items-center justify-between">
        <a href="#top" onClick={(e) => { e.preventDefault(); scrollToHash("#top"); }} className="text-red-600">
          <LogoMark className="h-9 md:h-10" />
        </a>

        <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-ink/70">
          <a href="#menu" onClick={(e) => { e.preventDefault(); scrollToHash("#menu"); }} className="hover:text-red-600 transition-colors">Menu</a>
          <a href="#histoire" onClick={(e) => { e.preventDefault(); scrollToHash("#histoire"); }} className="hover:text-red-600 transition-colors">Notre histoire</a>
          <a href="#visite" onClick={(e) => { e.preventDefault(); scrollToHash("#visite"); }} className="hover:text-red-600 transition-colors">Nous trouver</a>
        </nav>

        <div className="hidden md:flex items-center gap-5">
          <a href={`tel:${restaurant.phone}`} className="text-sm font-medium text-ink/80 hover:text-red-600 transition-colors">
            {restaurant.phoneDisplay}
          </a>
          <button
            onClick={openReservation}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-500 transition-colors"
          >
            Réserver
          </button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-ink w-9 h-9 flex flex-col items-center justify-center gap-1.5"
          aria-label="Menu"
        >
          <span className={`block h-0.5 w-6 bg-ink transition-transform ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-6 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-ink transition-transform ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-ink/10 bg-paper"
          >
            <div className="flex flex-col gap-5 px-6 py-6 text-ink font-medium">
              <a href="#menu" onClick={(e) => { e.preventDefault(); setOpen(false); scrollToHash("#menu"); }}>Menu</a>
              <a href="#histoire" onClick={(e) => { e.preventDefault(); setOpen(false); scrollToHash("#histoire"); }}>Notre histoire</a>
              <a href="#visite" onClick={(e) => { e.preventDefault(); setOpen(false); scrollToHash("#visite"); }}>Nous trouver</a>
              <a href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</a>
              <button
                onClick={() => { setOpen(false); openReservation(); }}
                className="rounded-full bg-red-600 px-5 py-3 text-center text-sm font-bold text-paper"
              >
                Réserver une table
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headingLine1Ref = useRef<HTMLSpanElement>(null);
  const headingLine2Ref = useRef<HTMLSpanElement>(null);
  const paraRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      gsap.to(".hero-img", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
      });

      if (headingLine1Ref.current) splits.push(revealWords(headingLine1Ref.current));
      if (headingLine2Ref.current) splits.push(revealWords(headingLine2Ref.current));
      if (paraRef.current) splits.push(revealLines(paraRef.current));
    }, heroRef);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <section id="top" ref={heroRef} data-bg="#a11f1a" className="relative h-[100svh] min-h-[720px] overflow-hidden">
      <div className="hero-img absolute inset-0 -top-[10%] h-[120%]">
        <img src={HERO_IMG} alt="Pizza toute garnie de La Patathèque" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-red-700/80 via-red-700/70 to-red-700" />
      </div>

      <div className="relative h-full mx-auto max-w-7xl px-6 md:px-10 pt-32 flex flex-col justify-center">
        <h1 className="font-display font-black text-paper leading-[1.05] sm:leading-[0.95] text-5xl sm:text-6xl md:text-[6rem] max-w-4xl">
          <span ref={headingLine1Ref} className="block">Pizza, poutine, sous-marins</span>
          <span ref={headingLine2Ref} className="block text-orange">depuis 45 ans.</span>
        </h1>

        <p ref={paraRef} className="mt-8 max-w-lg text-lg text-paper/80">
          Rivière-des-Prairies mange chez nous depuis presque un demi-siècle. Comptoir de quartier, portions généreuses, aucune prétention.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <button
            onClick={openReservation}
            className="rounded-full bg-orange px-7 py-4 text-sm font-bold text-ink hover:bg-orange-soft transition-colors"
          >
            Réserver une table
          </button>
          <a
            href="#menu"
            onClick={(e) => { e.preventDefault(); scrollToHash("#menu"); }}
            className="rounded-full border-2 border-paper/40 px-7 py-4 text-sm font-bold text-paper hover:border-paper hover:bg-paper/10 transition-colors"
          >
            Voir le menu
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function PizzaSpinner() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pizzaRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(pizzaRef.current, {
        rotation: 360,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="relative pt-20 pb-2 md:pt-32 md:pb-6 flex items-center justify-center">
      <img
        ref={pizzaRef}
        src="/images/pizza.png"
        alt="Pizza pepperoni de La Patathèque"
        className="w-[80vw] h-[80vw] max-w-sm max-h-[24rem] sm:max-w-md sm:max-h-none md:w-[38rem] md:h-[38rem] md:max-w-none drop-shadow-2xl"
      />
    </div>
  );
}

function Story() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const paraRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      const counter = { val: 0 };
      gsap.to(counter, {
        val: restaurant.yearsOpen,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: () => {
          if (numberRef.current) numberRef.current.textContent = String(Math.round(counter.val));
        },
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      });

      if (headingRef.current) {
        splits.push(revealWords(headingRef.current, { trigger: sectionRef.current, start: "top 75%" }));
      }
      if (paraRef.current) {
        splits.push(revealLines(paraRef.current, { trigger: sectionRef.current, start: "top 75%" }));
      }

      gsap.utils.toArray<HTMLElement>(".story-fade").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          delay: i * 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    }, sectionRef);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <section id="histoire" ref={sectionRef} data-bg="#fffaf3" className="relative pt-8 pb-28 md:pt-16 md:pb-44">
      <div className="mx-auto max-w-7xl px-6 md:px-10 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="script text-5xl md:text-6xl text-red-600 mb-2">Notre histoire</p>
          <h2 ref={headingRef} className="font-display font-extrabold text-4xl md:text-5xl leading-tight text-ink mb-6">
            Un comptoir de quartier qui n'a jamais changé de recette.
          </h2>
          <p ref={paraRef} className="text-ink/65 text-lg leading-relaxed max-w-md">
            Sauce maison, four toujours chaud, même adresse sur Sherbrooke Est. La Patathèque sert les familles de Rivière-des-Prairies – Pointe-aux-Trembles repas après repas, depuis presque un demi-siècle.
          </p>

          <div className="story-fade mt-12 flex items-end gap-10">
            <div>
              <span ref={numberRef} className="font-display font-black text-7xl md:text-8xl text-red-600">0</span>
              <span className="font-display font-black text-7xl md:text-8xl text-red-600">+</span>
              <p className="text-sm text-stone mt-2">années de service</p>
            </div>
            <div>
              <span className="font-display font-black text-4xl md:text-5xl text-ink">100+</span>
              <p className="text-sm text-stone mt-2">plats au menu</p>
            </div>
          </div>
        </div>

        <div className="story-fade relative">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden">
            <img src={STORY_IMG} alt="Comptoir de La Patathèque" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 md:-left-10 bg-orange text-ink rounded-2xl px-6 py-5 shadow-xl max-w-[220px]">
            <p className="font-display font-extrabold text-2xl leading-none">{restaurant.rating}★</p>
            <p className="text-xs mt-2 leading-snug">{restaurant.reviewCount} avis Google, quartier fidèle</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [categoryId, setCategoryId] = useState(menuCategories[0].id);
  const category = menuCategories.find((c) => c.id === categoryId) ?? menuCategories[0];

  useLayoutEffect(() => {
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      if (headingRef.current) {
        splits.push(revealWords(headingRef.current, { trigger: sectionRef.current, start: "top 80%" }));
      }
    }, sectionRef);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <section id="menu" ref={sectionRef} data-bg="#fbf3e6" className="py-28 md:py-44 text-ink">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <p className="script text-5xl md:text-6xl text-red-600 mb-2">Le menu</p>
            <h2 ref={headingRef} className="font-display font-extrabold text-4xl md:text-5xl leading-tight max-w-xl">
              Les classiques qu'on vient chercher.
            </h2>
          </div>
          <a
            href={restaurant.orderUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold hover:border-red-600 hover:text-red-600 transition-colors"
          >
            Commander en ligne →
          </a>
        </div>

        <div
          role="tablist"
          aria-label="Catégories du menu"
          className="-mx-6 px-6 md:mx-0 md:px-0 flex gap-2 overflow-x-auto md:flex-wrap pb-2 mb-10 [scrollbar-width:none]"
        >
          {menuCategories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={c.id === category.id}
              onClick={() => setCategoryId(c.id)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                c.id === category.id ? "bg-red-600 text-paper" : "bg-ink/5 text-ink/70 hover:bg-ink/10 hover:text-ink"
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
      {category.note && <p className="text-ink/60 mb-6 max-w-2xl">{category.note}</p>}

      {multiSize && (
        <div
          className="hidden md:grid gap-x-2 border-b-2 border-red-600/15 pb-3 text-xs font-bold uppercase tracking-wider text-red-600"
          style={{ gridTemplateColumns: columns }}
        >
          <span />
          {category.sizes.map((s) => (
            <span key={s} className="text-right">{s}</span>
          ))}
        </div>
      )}

      <ul>
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
                <span className="font-display font-bold text-lg shrink-0">
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [showAll, setShowAll] = useState(false);

  useLayoutEffect(() => {
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      if (headingRef.current) {
        splits.push(revealWords(headingRef.current, { trigger: sectionRef.current, start: "top 80%" }));
      }

      gsap.from(".special-card", {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: { trigger: ".special-card", start: "top 88%" },
      });
    }, sectionRef);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <section ref={sectionRef} data-bg="#a11f1a" className="relative py-28 md:py-40 overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-6 md:px-10 flex flex-col items-center text-center">
        <p className="script text-5xl md:text-6xl text-orange mb-4">Super spéciaux</p>
        <h2 ref={headingRef} className="font-display font-extrabold text-5xl md:text-7xl leading-[1.05] text-paper mb-14">
          Bien manger, sans se ruiner.
        </h2>

        <div className="w-full grid sm:grid-cols-3 gap-4 md:gap-6 mb-8 text-left">
          {specials.filter((s) => s.featured).map((s) => (
            <div key={s.id} className="special-card rounded-2xl bg-paper p-6 md:p-7 flex flex-col">
              <p className="font-display font-black text-sm uppercase tracking-wider text-red-600 mb-3">Spécial #{s.id}</p>
              <p className="text-ink/80 leading-snug mb-6 flex-1">{s.name}</p>
              <p className="font-display font-black text-3xl text-ink">{formatPrice(s.price)}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="mb-10 text-sm font-bold text-paper/80 underline underline-offset-4 hover:text-paper transition-colors"
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
              onAnimationComplete={() => ScrollTrigger.refresh()}
              className="w-full overflow-hidden mb-14"
            >
              <ul className="rounded-2xl bg-paper text-ink text-left px-5 md:px-8 py-2">
                {specials.map((s) => (
                  <li key={s.id} className="flex items-baseline gap-4 py-3.5 border-b border-ink/10 last:border-0">
                    <span className="w-8 shrink-0 font-display font-black text-red-600">#{s.id}</span>
                    <span className="flex-1">
                      {s.name}
                      {s.desc && <span className="block text-sm text-ink/55">{s.desc}</span>}
                      {s.note && <span className="block text-xs text-ink/45">{s.note}</span>}
                    </span>
                    <span className="font-display font-bold shrink-0 tabular-nums">{formatPrice(s.price)}</span>
                  </li>
                ))}
              </ul>
              {specialsNote && <p className="mt-4 text-xs text-paper/60">{specialsNote}. Les spéciaux ne peuvent être combinés avec d'autres offres.</p>}
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      if (headingRef.current) {
        splits.push(revealWords(headingRef.current, { trigger: sectionRef.current, start: "top 80%" }));
      }

      gsap.utils.toArray<HTMLElement>(".testimonial-card").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          y: 24,
          duration: 0.6,
          delay: i * 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
    }, sectionRef);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <section ref={sectionRef} data-bg="#fbf3e6" className="py-28 md:py-44">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <p className="script text-5xl md:text-6xl text-red-600 mb-2">Ils en parlent</p>
        <h2 ref={headingRef} className="font-display font-extrabold text-4xl md:text-5xl leading-tight text-ink max-w-xl mb-14">
          Le quartier en parle.
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="testimonial-card rounded-2xl bg-paper p-8 border-2 border-ink/10">
              <span className="flex items-center gap-1 text-orange mb-5">
                {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
              </span>
              <p className="text-ink/75 leading-relaxed mb-8">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-ink text-sm">{t.name}</p>
                  <p className="text-ink/50 text-xs">{t.neighborhood}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Visit() {
  const mapQuery = encodeURIComponent(restaurant.address);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      if (headingRef.current) {
        splits.push(revealWords(headingRef.current, { trigger: sectionRef.current, start: "top 80%" }));
      }
    }, sectionRef);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <section id="visite" ref={sectionRef} data-bg="#fffaf3" className="py-28 md:py-44 text-ink">
      <div className="mx-auto max-w-7xl px-6 md:px-10 grid lg:grid-cols-2 gap-16">
        <div>
          <p className="script text-5xl md:text-6xl text-red-600 mb-2">Nous trouver</p>
          <h2 ref={headingRef} className="font-display font-extrabold text-4xl md:text-5xl leading-tight mb-10">
            Sur Sherbrooke Est, comme toujours.
          </h2>

          <div className="flex flex-col gap-8">
            <div>
              <p className="text-sm text-ink/50 mb-1">Adresse</p>
              <a
                href={restaurant.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-lg font-semibold hover:text-red-600 transition-colors"
              >
                {restaurant.address}
              </a>
            </div>

            <div>
              <p className="text-sm text-ink/50 mb-1">Téléphone</p>
              <a href={`tel:${restaurant.phone}`} className="text-lg font-semibold hover:text-red-600 transition-colors">
                {restaurant.phoneDisplay}
              </a>
            </div>

            <div>
              <p className="text-sm text-ink/50 mb-3">Heures d'ouverture</p>
              <ul className="flex flex-col gap-2">
                {restaurant.hours.map((h) => (
                  <li key={h.day} className="flex justify-between max-w-xs text-ink/80">
                    <span>{h.day}</span>
                    <span className="font-semibold">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={openReservation}
              className="mt-4 inline-flex w-fit rounded-full bg-red-600 px-7 py-4 text-sm font-bold text-paper hover:bg-red-500 transition-colors"
            >
              Réserver une table
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden min-h-[360px] border-2 border-ink/10">
          <iframe
            title="Localisation de La Patathèque"
            src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 360 }}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer data-bg="#a11f1a" className="pt-24 md:pt-32 pb-10">
      <div className="mx-auto max-w-7xl px-6 md:px-10 flex flex-col items-center text-center gap-10">
        <LogoMark className="h-14 sm:h-20 md:h-28 lg:h-36 text-paper max-w-full" />

        <div className="flex items-center gap-4">
          <a
            href="https://www.instagram.com/resto.la.patatheque"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="w-11 h-11 flex items-center justify-center rounded-full border-2 border-paper/25 text-paper hover:border-orange hover:text-orange transition-colors"
          >
            <InstagramIcon />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-paper/70">
          <a href={`tel:${restaurant.phone}`} className="hover:text-orange transition-colors">{restaurant.phoneDisplay}</a>
          <a href={restaurant.mapsUrl} target="_blank" rel="noreferrer" className="hover:text-orange transition-colors">
            Itinéraire
          </a>
        </div>

        <p className="text-sm text-paper/50">Rivière-des-Prairies – Pointe-aux-Trembles</p>

        <div className="w-full mt-6 pt-8 border-t border-paper/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-paper/50">
          <p>© {year} La Patathèque. Tous droits réservés.</p>
          <p>{restaurant.payments}</p>
        </div>
      </div>
    </footer>
  );
}

function useScrollBackground() {
  useLayoutEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-bg]"));
    if (sections.length === 0) return;

    const root = document.documentElement;
    gsap.set(root, { "--bg": sections[0].dataset.bg });

    const triggers = sections.slice(1).map((section, i) => {
      const prevColor = sections[i].dataset.bg;
      const color = section.dataset.bg;
      return ScrollTrigger.create({
        trigger: section,
        start: "top center",
        onEnter: () => gsap.to(root, { "--bg": color, duration: 0.6, ease: "power1.inOut" }),
        onLeaveBack: () => gsap.to(root, { "--bg": prevColor, duration: 0.6, ease: "power1.inOut" }),
      });
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);
}

export default function App() {
  useSmoothScroll();
  useScrollBackground();

  return (
    <div>
      <Navbar />
      <Hero />
      <PizzaSpinner />
      <Story />
      <FeatureGallery />
      <MenuSection />
      <Specials />
      <Testimonials />
      <Visit />
      <Footer />
      <ReservationModal />
    </div>
  );
}
