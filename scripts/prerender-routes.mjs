// Runs after `vite build`. Vite writes a single dist/index.html; this copies it
// to dist/<page>/index.html for every page with that page's own title,
// description, canonical and social tags, so each URL is served directly by
// the static host and crawlers see the right head without running JavaScript.
// It also writes the sitemap from the same list.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const seo = JSON.parse(await readFile(join(root, "src/data/seo.json"), "utf8"));
const template = await readFile(join(dist, "index.html"), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const url = (route) => seo.site + (route === "/" ? "/" : `${route}/`);

function page(route) {
  const { title, description } = seo.routes[route].fr;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url(route)}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url(route)}`);
  // Staff only: keep the panel out of search results.
  if (route === "/admin") html = html.replace(/(<meta name="robots" content=")[^"]*/, "$1noindex,nofollow");
  return html;
}

const routes = Object.keys(seo.routes);
for (const route of routes) {
  const file = route === "/" ? join(dist, "index.html") : join(dist, route.slice(1), "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page(route));
}

// Unknown URLs: the app falls back to the home page; never indexed.
await writeFile(
  join(dist, "404.html"),
  page("/").replace(/(<meta name="robots" content=")[^"]*/, "$1noindex,nofollow").replace(/\s*<link rel="canonical"[^>]*>/, ""),
);

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .filter((r) => r !== "/admin")
  .map((r) => `  <url>\n    <loc>${url(r)}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${r === "/" ? "1.0" : "0.8"}</priority>\n  </url>`)
  .join("\n")}
</urlset>
`;
await writeFile(join(dist, "sitemap.xml"), sitemap);
console.log(`prerendered ${routes.length} pages + 404.html + sitemap.xml`);
