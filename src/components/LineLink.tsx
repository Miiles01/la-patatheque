import { useRef, type ReactNode } from "react";
import { gsap } from "../lib/motion";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  className?: string;
};

function Anchor({ children, href, onClick, external, className, ...hover }: Props & {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const cls = `relative inline-block overflow-hidden pb-1 ${className ?? ""}`;
  if (href) {
    return (
      <a
        href={href}
        className={cls}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        onClick={
          onClick &&
          ((e) => {
            e.preventDefault();
            onClick();
          })
        }
        {...hover}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} {...hover}>
      {children}
    </button>
  );
}

/** Underlined link whose line runs out to the right and comes back in from the left on hover. */
export function LineButton(props: Props) {
  const lineRef = useRef<HTMLSpanElement>(null);
  const onMouseEnter = () => {
    gsap
      .timeline()
      .to(lineRef.current, { xPercent: 102, duration: 0.3, ease: "quint.out", overwrite: true })
      .set(lineRef.current, { xPercent: -102 })
      .to(lineRef.current, { xPercent: 0, duration: 0.3, ease: "quint.out" });
  };

  return (
    <Anchor {...props} onMouseEnter={onMouseEnter} className={`alt text-xl ${props.className ?? ""}`}>
      {props.children}
      <span ref={lineRef} className="absolute left-0 bottom-0 h-px w-full bg-current" />
    </Anchor>
  );
}

/** Link with a hidden line that enters from the left on hover and leaves to the right. */
export function SweepLink(props: Props) {
  const lineRef = useRef<HTMLSpanElement>(null);
  const onMouseEnter = () => {
    gsap.fromTo(lineRef.current, { xPercent: -102 }, { xPercent: 0, duration: 0.3, ease: "quart.out", overwrite: true });
  };
  const onMouseLeave = () => {
    gsap.to(lineRef.current, {
      xPercent: 102,
      duration: 0.3,
      ease: "quart.inOut",
      overwrite: true,
      onComplete: () => {
        gsap.set(lineRef.current, { xPercent: -102 });
      },
    });
  };

  return (
    <Anchor {...props} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {props.children}
      <span
        ref={lineRef}
        className="absolute left-0 bottom-0 h-px w-full bg-current"
        style={{ transform: "translateX(-102%)" }}
      />
    </Anchor>
  );
}
