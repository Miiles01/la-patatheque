import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { Testimonial } from "../data/menu";
import { reducedMotion } from "../lib/motion";

type Photo = NonNullable<Testimonial["photo"]>;

/** Reviews slide on their own every few seconds; drag or swipe to move them by hand. */
export function ReviewsCarousel({ reviews }: { reviews: Testimonial[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" }, [
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true, active: !reducedMotion }),
  ]);
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [photo, setPhoto] = useState<Photo | null>(null);

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

  // Pause the slides while the photo is open.
  useEffect(() => {
    const autoplay = embla?.plugins().autoplay;
    if (!autoplay) return;
    if (photo) autoplay.stop();
    else if (!reducedMotion) autoplay.play();
  }, [embla, photo]);

  const prev = useCallback(() => embla?.scrollPrev(), [embla]);
  const next = useCallback(() => embla?.scrollNext(), [embla]);

  return (
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
              <ReviewCard review={t} onOpenPhoto={setPhoto} />
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

      <PhotoLightbox photo={photo} onClose={() => setPhoto(null)} />
    </div>
  );
}

function ReviewCard({ review: t, onOpenPhoto }: { review: Testimonial; onOpenPhoto: (p: Photo) => void }) {
  return (
    <figure className="h-full rounded-2xl bg-paper p-8 flex flex-col select-none">
      {t.rating !== undefined && (
        <span className="text-orange tracking-[0.2em] mb-5" aria-label={`${t.rating} étoiles sur 5`}>
          {"★".repeat(t.rating)}
        </span>
      )}
      <blockquote lang={t.lang} className="alt text-xl leading-snug text-ink flex-1 mb-8 whitespace-pre-line">
        « {t.quote} »
      </blockquote>

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

      <figcaption className="flex items-center gap-3">
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
      </figcaption>
    </figure>
  );
}

function PhotoLightbox({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/85 backdrop-blur-sm p-4 sm:p-10"
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
