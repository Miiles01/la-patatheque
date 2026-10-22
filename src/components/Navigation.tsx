import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { restaurant } from "../data/menu";
import { gsap, reducedMotion, ScrollTrigger, scrollToHash, startScroll, stopScroll } from "../lib/motion";
import { LogoMark } from "./LogoMark";
import { openPolicy } from "./PolicyModal";
import { openReservation } from "./ReservationModal";

const LINKS = [
  { hash: "#menu", label: "Le menu", alt: "À la carte" },
  { hash: "#speciaux", label: "Super spéciaux", alt: "Les combos" },
  { hash: "#histoire", label: "Notre histoire", alt: "Depuis 45 ans" },
  { hash: "#visite", label: "Nous trouver", alt: "Sherbrooke Est" },
];

export const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/resto.la.patatheque", icon: <InstagramIcon /> },
];

const NAV_LINE = 36; // px from the top where the bar's content sits

/**
 * True while the bar sits over a section marked data-nav="dark" (photos, red
 * bands, the footer), so the logo and controls can switch to cream.
 */
function useDarkBackdrop() {
  const [dark, setDark] = useState(false);

  useLayoutEffect(() => {
    const update = () => {
      const sections = document.querySelectorAll<HTMLElement>('[data-nav="dark"]');
      let over = false;
      sections.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top <= NAV_LINE && r.bottom >= NAV_LINE) over = true;
      });
      setDark(over);
    };
    const trigger = ScrollTrigger.create({ start: 0, end: "max", onUpdate: update, onRefresh: update });
    update();
    return () => trigger.kill();
  }, []);

  return dark;
}

function CopyPhone() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(restaurant.phoneDisplay);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `tel:${restaurant.phone}`;
    }
  }

  // The copy icon only shows while the pointer (or keyboard focus) is on the number.
  return (
    <div
      className="group hidden md:flex items-center gap-1 text-sm font-semibold text-ink"
    >
      <a href={`tel:${restaurant.phone}`} className="tabular-nums">
        {restaurant.phoneDisplay}
      </a>
      <button
        onClick={copy}
        aria-label={copied ? "Numéro copié" : "Copier le numéro de téléphone"}
        title={copied ? "Copié" : "Copier"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-[opacity,background-color] duration-200 ${
          copied ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        } hover:bg-ink/5`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const dark = useDarkBackdrop();
  const onDark = dark && !menuOpen;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[80] pointer-events-none">
        <div className="mx-auto max-w-7xl px-5 md:px-10 h-[72px] flex items-center justify-between">
          <a
            href="#accueil"
            onClick={(e) => {
              e.preventDefault();
              scrollToHash("#accueil");
            }}
            aria-label="La Patathèque, retour en haut"
            className={`pointer-events-auto block transition-colors duration-500 ${onDark ? "text-paper" : "text-red-600"}`}
          >
            <LogoMark className="h-8 md:h-10" />
          </a>

          {/* Controls sit on their own cream pill, so unlike the logo they never need to change color. */}
          <div className="pointer-events-auto flex items-center gap-2 md:gap-4 rounded-full bg-paper pl-2.5 md:pl-6 pr-2.5 py-2.5">
            <CopyPhone />
            <button
              onClick={openReservation}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-700 transition-colors"
            >
              Réserver
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              aria-controls="menu-lateral"
              className="group relative w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-ink/5 transition-colors"
            >
              <span
                className={`absolute right-[7px] h-[1.5px] bg-current transition-all duration-300 ${
                  menuOpen ? "w-7 rotate-45" : "w-7 -translate-y-[4px] group-hover:w-[18px]"
                }`}
              />
              <span
                className={`absolute right-[7px] h-[1.5px] bg-current transition-all duration-300 ${
                  menuOpen ? "w-7 -rotate-45" : "w-[18px] translate-y-[4px] group-hover:w-7"
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

/** Half-screen panel that slides in from the right: a red curtain first, then the cream panel. */
function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = gsap.utils.selector(root);

    if (!mounted.current) {
      mounted.current = true;
      gsap.set(root, { display: "none" });
      return;
    }

    let tl: gsap.core.Timeline;
    if (open) {
      stopScroll();
      tl = gsap
        .timeline()
        .set(root, { display: "block" })
        .set(q(".sm-curtain, .sm-panel"), { xPercent: 102 })
        .set(q(".sm-item"), { opacity: 0, x: 24 })
        .fromTo(q(".sm-scrim"), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0)
        .to(q(".sm-curtain"), { xPercent: 0, duration: 0.9, ease: "expo.inOut" }, 0)
        .to(q(".sm-panel"), { xPercent: 0, duration: 0.9, ease: "expo.inOut" }, 0.2)
        .to(q(".sm-item"), { opacity: 1, x: 0, duration: 0.7, stagger: 0.05, ease: "quart.out" }, 0.65);
    } else {
      tl = gsap
        .timeline({
          onComplete: () => {
            gsap.set(root, { display: "none" });
            startScroll();
            pending.current?.();
            pending.current = null;
          },
        })
        .to(q(".sm-item"), { opacity: 0, duration: 0.3 }, 0)
        .to(q(".sm-panel"), { xPercent: 102, duration: 0.8, ease: "expo.inOut" }, 0.1)
        .to(q(".sm-curtain"), { xPercent: 102, duration: 0.8, ease: "expo.inOut" }, 0.25)
        .to(q(".sm-scrim"), { opacity: 0, duration: 0.5 }, 0.5);
    }
    if (reducedMotion) tl.progress(1);
    return () => {
      tl.progress(1);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const closeThen = (action: () => void) => {
    pending.current = action;
    onClose();
  };

  return (
    <div
      ref={rootRef}
      id="menu-lateral"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      className="fixed inset-0 z-[70]"
      data-lenis-prevent
    >
      <div className="sm-scrim absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sm-curtain absolute inset-y-0 right-0 w-full md:w-1/2 bg-red-700" />

      <div className="sm-panel absolute inset-y-0 right-0 w-full md:w-1/2 bg-cream overflow-y-auto">
        <div className="min-h-full flex flex-col px-6 md:px-14 pt-28 pb-10">
          <nav className="flex flex-col gap-1" aria-label="Navigation principale">
            {LINKS.map((link) => (
              <a
                key={link.hash}
                href={link.hash}
                onClick={(e) => {
                  e.preventDefault();
                  closeThen(() => scrollToHash(link.hash));
                }}
                className="sm-item group relative block h-[1.15em] overflow-hidden font-display font-extrabold text-[clamp(2.2rem,4.4vw,3.75rem)] leading-[1.15] tracking-[-0.02em] text-ink"
              >
                <span className="block transition-transform duration-300 ease-out group-hover:-translate-y-[110%]">
                  {link.label}
                </span>
                <span className="alt absolute inset-x-0 top-full block font-normal tracking-normal text-red-600 transition-transform duration-300 ease-out group-hover:-translate-y-full">
                  {link.alt}
                </span>
              </a>
            ))}
          </nav>

          <button
            onClick={() => closeThen(openReservation)}
            className="sm-item mt-10 w-fit rounded-full bg-red-600 px-7 py-4 text-sm font-bold text-paper hover:bg-red-700 transition-colors"
          >
            Réserver une table
          </button>

          <div className="mt-auto pt-14 grid sm:grid-cols-2 gap-8 text-sm text-ink/75">
            <div className="sm-item">
              <p className="alt text-lg text-ink mb-1">Téléphone</p>
              <a href={`tel:${restaurant.phone}`} className="hover:text-red-600 tabular-nums">{restaurant.phoneDisplay}</a>
            </div>
            <div className="sm-item">
              <p className="alt text-lg text-ink mb-1">Adresse</p>
              <a href={restaurant.mapsUrl} target="_blank" rel="noreferrer" className="hover:text-red-600">
                13640, rue Sherbrooke Est
              </a>
            </div>
            <div className="sm-item">
              <p className="alt text-lg text-ink mb-2">Suivez-nous</p>
              <div className="flex gap-3">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="w-11 h-11 flex items-center justify-center rounded-full border border-ink/20 text-ink hover:border-red-600 hover:text-red-600 transition-colors"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
            <div className="sm-item">
              <p className="alt text-lg text-ink mb-1">Légal</p>
              <button onClick={() => closeThen(openPolicy)} className="text-left hover:text-red-600 underline underline-offset-4 decoration-ink/20">
                Politique de confidentialité
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-3.5 h-3.5" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}
