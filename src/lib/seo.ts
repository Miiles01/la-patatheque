import { useEffect } from "react";
import seo from "../data/seo.json";
import type { Lang } from "./i18n";
import type { Route } from "./router";

// Each page's title, description and canonical. The build writes them into
// every page's own HTML (scripts/prerender-routes.mjs) for crawlers; this keeps
// them right while visitors move between pages or switch language.

type Meta = { title: string; description: string };
const ROUTES = seo.routes as Record<Route, Record<Lang, Meta>>;

/** Canonical URL on the real domain, e.g. https://…/menu/ */
export function canonicalUrl(route: Route) {
  return seo.site + (route === "/" ? "/" : `${route}/`);
}

function setMeta(selector: string, attr: string, value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value);
}

export function usePageMeta(route: Route, lang: Lang) {
  useEffect(() => {
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
