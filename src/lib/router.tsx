import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

// Hash routes ("#/menu") so the demo works on GitHub Pages without server rewrites.
export type Route =
  | "/"
  | "/menu"
  | "/commander"
  | "/sur-place"
  | "/traiteur"
  | "/a-propos"
  | "/carrieres"
  | "/nous-joindre"
  | "/admin";

const ROUTES: Route[] = ["/", "/menu", "/commander", "/sur-place", "/traiteur", "/a-propos", "/carrieres", "/nous-joindre", "/admin"];

function current(): Route {
  const path = window.location.hash.replace(/^#/, "") || "/";
  return (ROUTES as string[]).includes(path) ? (path as Route) : "/";
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(current);
  useEffect(() => {
    const onChange = () => setRoute(current());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(to: Route) {
  if (current() === to) {
    window.scrollTo({ top: 0 });
    return;
  }
  window.location.hash = to;
}

export function Link({ to, onClick, ...props }: { to: Route } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={`#${to}`}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        navigate(to);
      }}
    />
  );
}
