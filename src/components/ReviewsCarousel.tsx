import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Testimonial } from "../data/menu";
import { reducedMotion } from "../lib/motion";

type Photo = NonNullable<Testimonial["photo"]>;

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Reviews slide on their own every few seconds; drag or swipe to move them by
 * hand. Long quotes are clipped with "Lire la suite", which grows the card into
 * an enlarged view with the whole text.
 */
export function ReviewsCarousel({ reviews }: { reviews: Testimonial[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" }, [
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true, active: !reducedMotion }),
  ]);
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [expanded, setExpanded] = useState<Testimonial | null>(null);

  useEffect(() => {
    if (!embla) return;
    const sync = () => {
      setSnaps(embla.scrollSnapList());
      setSelected(embla.selectedScrollSnap());
    };
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  // Hold the slides still while a review or photo is open.
  const paused = photo !== null || expanded !== null;
  useEffect(() => {
    const autoplay = embla?.plugins().autoplay;
    if (!autoplay) return;
    if (paused) autoplay.stop();
    else if (!reducedMotion) autoplay.play();
  }, [embla, paused]);

  const prev = useCallback(() => embla?.scrollPrev(), [embla]);
  const next = useCallback(() => embla?.scrollNext(), [embla]);

  return (
    <LayoutGroup>
      <div role="region" aria-roledescription="carrousel" aria-label="Avis de clients">
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex touch-pan-y -ml-5">
            {reviews.map((t, i) => (
              <div
                key={t.name}
                role="group"
                aria-roledescription="diapositive"
                aria-label={`${i + 1} sur ${reviews.length}`}
                className="min-w-0 shrink-0 grow-0 basis-full md:basis-1/2 lg:basis-1/3 pl-5"
              >
                <ReviewCard
                  review={t}
                  hidden={expanded?.name === t.name}
                  onOpenPhoto={setPhoto}
                  onExpand={() => setExpanded(t)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6">
          <ArrowButton direction="prev" onClick={prev} />
          <div className="flex items-center gap-2">
            {snaps.map((_, i) => (
              <button
                key={i}
                onClick={() => embla?.scrollTo(i)}
                aria-label={`Aller à l'avis ${i + 1}`}
                aria-current={i === selected}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === selected ? "w-7 bg-red-600" : "w-1.5 bg-ink/20 hover:bg-ink/40"
                }`}
              />
            ))}
          </div>
          <ArrowButton direction="next" onClick={next} />
        </div>

        <ExpandedReview review={expanded} onClose={() => setExpanded(null)} onOpenPhoto={setPhoto} />
        <PhotoLightbox photo={photo} onClose={() => setPhoto(null)} />
      </div>
    </LayoutGroup>
  );
}

function ReviewCard({
  review: t,
  hidden,
  onOpenPhoto,
  onExpand,
}: {
  review: Testimonial;
  hidden: boolean;
  onOpenPhoto: (p: Photo) => void;
  onExpand: () => void;
}) {
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const [clipped, setClipped] = useState(false);

  // Only offer "Lire la suite" when the clamped quote actually hides text.
  useLayoutEffect(() => {
    const el = quoteRef.current;
    if (!el) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [t.quote]);

  return (
    <motion.figure
      layoutId={`review-${t.name}`}
      transition={{ duration: 0.5, ease: EASE }}
      style={{ borderRadius: 16, visibility: hidden ? "hidden" : "visible" }}
      className="h-full bg-paper p-8 flex flex-col select-none"
    >
      {t.rating !== undefined && <Stars rating={t.rating} />}
      <motion.blockquote
        layout="position"
        ref={quoteRef}
        lang={t.lang}
        className="alt text-xl leading-snug text-ink whitespace-pre-line line-clamp-5"
      >
        « {t.quote} »
      </motion.blockquote>
      <div className="flex-1 mb-8">
        {clipped && (
          <button
            onClick={onExpand}
            className="mt-3 text-sm font-semibold text-red-600 underline underline-offset-4 decoration-red-600/30 hover:decoration-red-600 transition-colors"
          >
            Lire la suite
          </button>
        )}
      </div>

      {t.photo && (
        <button
          onClick={() => onOpenPhoto(t.photo!)}
          aria-label="Agrandir la photo du repas"
          className="group relative mb-6 w-28 h-20 overflow-hidden rounded-lg"
        >
          <img
            src={t.photo.src}
            alt={t.photo.alt}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-paper opacity-0 transition group-hover:bg-ink/35 group-hover:opacity-100">
            <ZoomIcon />
          </span>
        </button>
      )}

      <Reviewer review={t} />
    </motion.figure>
  );
}

function ExpandedReview({
  review: t,
  onClose,
  onOpenPhoto,
}: {
  review: Testimonial | null;
  onClose: () => void;
  onOpenPhoto: (p: Photo) => void;
}) {
  useEffect(() => {
    if (!t) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t, onClose]);

  return (
    <AnimatePresence>
      {t && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-[85] flex items-center justify-center bg-ink/55 backdrop-blur-sm p-4 sm:p-8"
          data-lenis-prevent
        >
          <motion.figure
            layoutId={`review-${t.name}`}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ borderRadius: 24 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Avis de ${t.name}`}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[88svh] overflow-y-auto bg-paper p-8 md:p-12 flex flex-col"
          >
            <button
              onClick={onClose}
              autoFocus
              aria-label="Fermer l'avis"
              className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink transition-colors"
            >
              <span className="absolute h-[1.5px] w-5 bg-current rotate-45" />
              <span className="absolute h-[1.5px] w-5 bg-current -rotate-45" />
            </button>

            {t.rating !== undefined && <Stars rating={t.rating} />}
            <motion.blockquote
              layout="position"
              lang={t.lang}
              className="alt text-2xl md:text-[1.7rem] leading-snug text-ink whitespace-pre-line mb-8 pr-6"
            >
              « {t.quote} »
            </motion.blockquote>

            {t.photo && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.25 } }}
                onClick={() => onOpenPhoto(t.photo!)}
                aria-label="Agrandir la photo du repas"
                className="mb-8 overflow-hidden rounded-xl"
              >
                <img src={t.photo.src} alt={t.photo.alt} width={t.photo.width} height={t.photo.height} className="w-full h-auto" />
              </motion.button>
            )}

            <Reviewer review={t} />
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Reviewer({ review: t }: { review: Testimonial }) {
  return (
    <motion.figcaption layout="position" className="flex items-center gap-3">
      {t.avatar ? (
        <img src={t.avatar} alt="" width={48} height={48} loading="lazy" draggable={false} className="w-12 h-12 shrink-0" />
      ) : (
        <span className="w-12 h-12 shrink-0 rounded-full bg-red-600 text-paper flex items-center justify-center font-display font-bold">
          {t.name.charAt(0)}
        </span>
      )}
      <span>
        <span className="block font-semibold text-ink text-sm">{t.name}</span>
        <span className="block text-ink/50 text-xs">{t.source}</span>
      </span>
    </motion.figcaption>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-orange tracking-[0.2em] mb-5" aria-label={`${rating} étoiles sur 5`}>
      {"★".repeat(rating)}
    </span>
  );
}

function PhotoLightbox({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Close only the photo, not the review underneath it.
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [photo, onClose]);

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={photo.alt}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/85 backdrop-blur-sm p-4 sm:p-10"
          data-lenis-prevent
        >
          <button
            onClick={onClose}
            aria-label="Fermer la photo"
            autoFocus
            className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20 transition-colors"
          >
            <span className="absolute h-[1.5px] w-6 bg-current rotate-45" />
            <span className="absolute h-[1.5px] w-6 bg-current -rotate-45" />
          </button>
          <motion.img
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full w-auto h-auto rounded-xl shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ArrowButton({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "prev" ? "Avis précédent" : "Avis suivant"}
      className="w-12 h-12 flex items-center justify-center rounded-full border border-ink/15 text-ink hover:border-red-600 hover:text-red-600 transition-colors"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
        {direction === "prev" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );
}

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5M11 8.5v5M8.5 11h5" />
    </svg>
  );
}
