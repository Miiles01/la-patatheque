import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

// Real page URLs ("/menu/") so search engines see every page on its own. The
// build writes one HTML file per route (scripts/prerender-routes.mjs), so the
// static host serves each URL directly; in the browser we move between them
// with the History API.
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

export const ROUTES: Route[] = ["/", "/menu", "/commander", "/sur-place", "/traiteur", "/a-propos", "/carrieres", "/nous-joindre", "/admin"];

const BASE = import.meta.env.BASE_URL; // "/" or "/la-patatheque/"
const CHANGE = "patatheque-route-change";

/** Public URL of a route, e.g. "/la-patatheque/menu/". */
export function routeHref(to: Route) {
  return to === "/" ? BASE : `${BASE}${to.slice(1)}/`;
}

function current(): Route {
  const path = "/" + window.location.pathname.slice(BASE.length).replace(/\/+$/, "");
  return (ROUTES as string[]).includes(path) ? (path as Route) : "/";
}

// Links shared before the switch used "#/menu": send them to the real URL.
if (window.location.hash.startsWith("#/")) {
  const legacy = window.location.hash.slice(1).replace(/\/+$/, "") || "/";
  if ((ROUTES as string[]).includes(legacy)) window.history.replaceState(null, "", routeHref(legacy as Route));
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(current);
  useEffect(() => {
    const onChange = () => setRoute(current());
    window.addEventListener("popstate", onChange);
    window.addEventListener(CHANGE, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(CHANGE, onChange);
    };
  }, []);
  return route;
}

export function navigate(to: Route) {
  if (current() === to) {
    window.scrollTo({ top: 0 });
    return;
  }
  window.history.pushState(null, "", routeHref(to));
  window.dispatchEvent(new Event(CHANGE));
}

export function Link({ to, onClick, ...props }: { to: Route } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={routeHref(to)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        navigate(to);
      }}
    />
  );
}
