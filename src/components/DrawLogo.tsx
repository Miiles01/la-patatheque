import { useLayoutEffect, useRef } from "react";
import logoSvg from "../assets/logo-patatheque.svg?raw";
import { gsap, reducedMotion } from "../lib/motion";

const PATHS = Array.from(logoSvg.matchAll(/<path([^>]*?)\sd="([^"]+)"/g), ([, attrs, d]) => ({
  d,
  evenOdd: attrs.includes("evenodd"),
}));

/**
 * The logo outline is traced stroke by stroke (DrawSVG), then the letters fill
 * in. Plays as the footer comes into view and rewinds when scrolling back up.
 */
export function DrawLogo({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || reducedMotion) return;
    const paths = svg.querySelectorAll("path");

    const ctx = gsap.context(() => {
      gsap.set(paths, { drawSVG: "0%", fillOpacity: 0, strokeOpacity: 1 });
      gsap
        .timeline({
          scrollTrigger: { trigger: svg, start: "top 85%", toggleActions: "play none none reverse" },
        })
        .to(paths, { drawSVG: "100%", duration: 1.8, stagger: 0.18, ease: "power1.inOut" })
        .to(paths, { fillOpacity: 1, duration: 0.7, stagger: 0.05, ease: "power1.out" }, "-=0.5")
        .to(paths, { strokeOpacity: 0, duration: 0.4 }, "-=0.2");
    }, svg);
    return () => ctx.revert();
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 3225 794"
      role="img"
      aria-label="La Patathèque"
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinejoin="round"
      style={{ overflow: "visible" }}
    >
      {PATHS.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fillRule={p.evenOdd ? "evenodd" : undefined}
          clipRule={p.evenOdd ? "evenodd" : undefined}
        />
      ))}
    </svg>
  );
}
