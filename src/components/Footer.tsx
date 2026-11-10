import { restaurant } from "../data/menu";
import { useI18n } from "../lib/i18n";
import { navigate, type Route } from "../lib/router";
import { useHours } from "../pages/InfoPages";
import { DrawLogo } from "./DrawLogo";
import { SweepLink } from "./LineLink";
import { SOCIALS } from "./Navigation";
import { openPolicy } from "./PolicyModal";

export function Footer() {
  const { t } = useI18n();
  const hours = useHours();
  const year = new Date().getFullYear();
  const links: [Route, Parameters<typeof t>[0]][] = [
    ["/commander", "nav.order"],
    ["/sur-place", "nav.surPlace"],
    ["/traiteur", "nav.catering"],
    ["/carrieres", "nav.careers"],
    ["/nous-joindre", "nav.contact"],
  ];

  return (
    <footer data-nav="dark" className="bg-red-700 text-paper px-5 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="py-16 md:py-24 border-b border-paper/20 flex justify-center">
          <DrawLogo className="w-full max-w-5xl h-auto text-paper" />
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-[2fr_2fr_1fr] gap-x-4 gap-y-10 py-12 border-b border-paper/20 text-[15px] leading-relaxed">
          <div>
            <p className="alt text-lg mb-4">{t("footer.contact")}</p>
            <SweepLink href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</SweepLink>
            <p className="text-paper/70">{t("footer.delivery")}</p>
          </div>
          <div>
            <p className="alt text-lg mb-4">{t("footer.hours")}</p>
            {hours.map((h) => (
              <p key={h.day} className="text-paper/85">
                {h.day} : {h.time}
              </p>
            ))}
          </div>
          <div>
            <p className="alt text-lg mb-4">{t("footer.links")}</p>
            <div className="flex flex-col items-start">
              {links.map(([to, key]) => (
                <SweepLink key={to} href={`#${to}`} onClick={() => navigate(to)}>
                  {t(key)}
                </SweepLink>
              ))}
            </div>
          </div>
          <div>
            <p className="alt text-lg mb-4">{t("footer.where")}</p>
            <SweepLink href={restaurant.mapsUrl} external>
              13640, rue Sherbrooke Est
              <br />
              Montréal (Québec) H1A 4B2
            </SweepLink>
          </div>
          <div>
            <p className="alt text-lg mb-4">{t("footer.payment")}</p>
            <p className="text-paper/85">{restaurant.payments}</p>
          </div>
          <div>
            <p className="alt text-lg mb-4">{t("footer.social")}</p>
            <div className="flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-11 h-11 flex items-center justify-center rounded-full border border-paper/30 hover:border-orange hover:text-orange transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-paper/60">
          <span>© {year} La Patathèque · Rivière-des-Prairies – Pointe-aux-Trembles</span>
          <div className="flex items-center gap-5">
            <SweepLink onClick={openPolicy}>{t("footer.privacy")}</SweepLink>
            <SweepLink href="#/admin" onClick={() => navigate("/admin")}>
              {t("footer.admin")}
            </SweepLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
