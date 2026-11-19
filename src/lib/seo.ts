import { useEffect } from "react";
import seo from "../data/seo.json";
import type { Lang } from "./i18n";
import type { Route } from "./router";

// Each page's title, description and canonical. The build writes them into
// every page's own HTML (scripts/prerender-routes.mjs) for crawlers; this keeps
// them right while visitors move between pages or switch language.

type Meta = { title: string; description: string };
const ROUTES = seo.routes as Record<Exclude<Route, "/404">, Record<Lang, Meta>>;

const NOT_FOUND: Record<Lang, Meta> = {
  fr: { title: "Page introuvable | La Patathèque", description: "Cette page n'existe pas ou a été déplacée." },
  en: { title: "Page not found | La Patathèque", description: "This page doesn't exist or has moved." },
};

/** Canonical URL on the real domain, e.g. https://…/menu/ */
export function canonicalUrl(route: Exclude<Route, "/404">) {
  return seo.site + (route === "/" ? "/" : `${route}/`);
}

function setMeta(selector: string, attr: string, value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value);
}

export function usePageMeta(route: Route, lang: Lang) {
  useEffect(() => {
    if (route === "/404") {
      const meta = NOT_FOUND[lang];
      document.title = meta.title;
      setMeta('meta[name="description"]', "content", meta.description);
      setMeta('meta[name="robots"]', "content", "noindex,nofollow");
      document.head.querySelector('link[rel="canonical"]')?.remove();
      return;
    }
    setMeta('meta[name="robots"]', "content", route === "/admin" ? "noindex,nofollow" : "index,follow");
    const meta = ROUTES[route][lang];
    const url = canonicalUrl(route);
    document.title = meta.title;
    setMeta('meta[name="description"]', "content", meta.description);
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('link[rel="canonical"]', "href", url);
  }, [route, lang]);
}
