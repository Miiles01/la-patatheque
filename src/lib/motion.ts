import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useLayoutEffect } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger };

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Seconds before hero text starts revealing on load. */
export const introDelay = 0.15;

let lenis: Lenis | null = null;

export function stopScroll() {
  lenis?.stop();
}

export function startScroll() {
  lenis?.start();
}

export function scrollToHash(hash: string) {
  const target = hash === "#accueil" ? 0 : document.querySelector<HTMLElement>(hash);
  if (target === null) return;
  if (lenis) {
    lenis.scrollTo(target, { offset: -72, duration: 1.4 });
  } else if (typeof target === "number") {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  } else {
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }
}

export function useSmoothScroll() {
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
    });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = null;
    };
  }, []);

  // Trigger positions go stale whenever the page height changes (images and
  // web fonts loading, menu tabs, the specials list), so recompute on resize.
  useLayoutEffect(() => {
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    observer.observe(document.body);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);
}

/**
 * Wires every scroll effect declared in the markup:
 * - data-reveal: heading lines slide up out of a mask
 * - data-fade="0.2": fades up, with an optional extra delay in seconds
 * - data-intro: plays on load (after the preloader) instead of on scroll
 * - data-parallax="-24": image starts shifted by that yPercent and settles to 0
 * - data-drift="10": element drifts to that yPercent across its container
 * - data-zoom: image eases from scale 1.15 to 1 inside its frame
 * - data-spin: rotates a full turn while it crosses the viewport
 */
export function useScrollEffects() {
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const splits: SplitText[] = [];

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const intro = el.hasAttribute("data-intro");
        splits.push(
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: 1.1,
                stagger: 0.09,
                ease: "quint.out",
                delay: intro ? introDelay : 0,
                scrollTrigger: intro ? undefined : { trigger: el, start: "top 88%", once: true },
              }),
          }),
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-fade]").forEach((el) => {
        const intro = el.hasAttribute("data-intro");
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: 1,
          ease: "quart.out",
          delay: (intro ? introDelay : 0) + Number(el.dataset.fade || 0),
          scrollTrigger: intro ? undefined : { trigger: el, start: "top 90%", once: true },
        });
      });

      const scrub = (trigger: Element | null) => ({
        trigger,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
      });

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: Number(el.dataset.parallax) },
          { yPercent: 0, ease: "none", scrollTrigger: scrub(el.parentElement) },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-drift]").forEach((el) => {
        gsap.to(el, { yPercent: Number(el.dataset.drift), ease: "none", scrollTrigger: scrub(el.parentElement) });
      });

      gsap.utils.toArray<HTMLElement>("[data-zoom]").forEach((el) => {
        gsap.fromTo(el, { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: scrub(el.parentElement) });
      });

      gsap.utils.toArray<HTMLElement>("[data-spin]").forEach((el) => {
        gsap.to(el, { rotation: 360, ease: "none", scrollTrigger: { ...scrub(el), scrub: true } });
      });
    });

    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);
}
