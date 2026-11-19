import { useEffect, useMemo, useState } from "react";
import { dishName, type MenuCategory } from "../data/menu";
import { useCart } from "../lib/cart";
import { useMenu } from "../lib/menuStore";
import { categoryEn, useFormatPrice, useI18n } from "../lib/i18n";
import { MenuIcon as Icon, SPECIALS_ICON } from "./MenuIcons";
import { openReservation } from "./ReservationModal";
import { btnPrimary } from "./ui";
import { businessInfo, telHref } from "../lib/business";
import { reservationSettings } from "../lib/reservations";
import { useNavHidden } from "../lib/navVisibility";

const SPECIALS_ID = "super-speciaux";

/** Tabs at the top; each tab groups the menu sections that sit together on the printed menu. */
const GROUPS: { id: string; icon: string; label: string; cats: string[] }[] = [
  { id: "pizzas", icon: "notre-delicieuse-pizza", label: "carte.pizzas", cats: ["notre-delicieuse-pizza", "promos-pizza"] },
  { id: "sous-marins", icon: "sous-marins", label: "carte.subs", cats: ["sous-marins", "sandwichs"] },
  { id: "poutines", icon: "poutines-speciales", label: "carte.poutines", cats: ["poutines-speciales", "specialites-italiennes"] },
  { id: "repas", icon: "les-repas", label: "carte.repas", cats: ["les-repas", "ailes-de-poulet", "les-salades"] },
  { id: "snacks", icon: "les-casse-croutes", label: "carte.snacks", cats: ["les-casse-croutes", "les-breuvages"] },
];

/**
 * The menu: one accordion card per section, grouped under a small heading (like a printed carte).
 * With `orderable`, every price becomes a button that drops that dish and size into the cart (takeout).
 */
export function MenuCarte({ orderable = false }: { orderable?: boolean }) {
  const { t, lang } = useI18n();
  const cart = useCart();
  const [toast, setToast] = useState<string | null>(null);
  const navHidden = useNavHidden();

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const add = (item: { name: string; size?: string; price: number; category?: string }) => {
    cart.add(item);
    setToast(`${item.name}${item.size ? ` · ${item.size}` : ""}`);
  };
  const formatPrice = useFormatPrice();
  const reservations = reservationSettings.use();
  const info = businessInfo.use();
  const { categories, specials } = useMenu();
  const [open, setOpen] = useState<Set<string>>(() => new Set([GROUPS[0]!.cats[0]!]));

  /** A price: plain text when dining in, an add-to-cart button for takeout. */
  const Price = ({ value, item, className = "" }: { value: number; item: { name: string; size?: string; category?: string }; className?: string }) =>
    orderable ? (
      <button
        onClick={() => add({ ...item, price: value })}
        aria-label={`${t("order.add")} ${item.name}${item.size ? ` ${item.size}` : ""}`}
        className={`rounded-full border border-ink/15 px-3 py-1 font-semibold tabular-nums transition-colors hover:border-red-600 hover:bg-red-600 hover:text-paper active:scale-95 ${className}`}
      >
        {formatPrice(value)}
      </button>
    ) : (
      <span className={`font-semibold tabular-nums ${className}`}>{formatPrice(value)}</span>
    );

  const label = (c: MenuCategory) => (lang === "en" ? categoryEn[c.id]?.name ?? c.name : c.name);

  // Tabs: sections with the same tab name (set in the admin) share one tab. Without a name, the built-in grouping
  // applies, and any other section gets a tab of its own. The tab's icon is its first section's icon.
  const groups = useMemo(() => {
    const defaultTab = new Map<string, string>();
    GROUPS.forEach((g) => g.cats.forEach((id) => defaultTab.set(id, t(g.label as never))));
    const rank = (id: string) => {
      const i = GROUPS.findIndex((g) => g.cats.includes(id));
      return i === -1 ? GROUPS.length : i;
    };
    const sorted = categories.map((c, i) => ({ c, i })).sort((x, y) => rank(x.c.id) - rank(y.c.id) || x.i - y.i).map((x) => x.c);
    const byTitle = new Map<string, { id: string; icon: string; title: string; items: MenuCategory[] }>();
    for (const c of sorted) {
      const title = c.tab?.trim() || defaultTab.get(c.id) || label(c);
      const g = byTitle.get(title) ?? { id: `tab-${byTitle.size}`, icon: c.icon ?? c.id, title, items: [] };
      g.items.push(c);
      byTitle.set(title, g);
    }
    const list = [...byTitle.values()];
    if (specials.length) list.push({ id: SPECIALS_ID, icon: SPECIALS_ICON, title: t("order.specials"), items: [] });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, specials, lang]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-2xl">
      {groups.map((g) => (
        <section key={g.id} id={`carte-${g.id}`} className="pt-8">
          <p className="alt text-ink/55 mb-3 px-1">{g.title}</p>
          <div className="grid gap-3">
            {g.id === SPECIALS_ID ? (
              <Card
                id={SPECIALS_ID}
                open={open.has(SPECIALS_ID)}
                onToggle={toggle}
                title={t("order.specials")}
                sub={`${specials.length} ${specials.length === 1 ? t("carte.dish") : t("carte.dishes")}`}
                icon={SPECIALS_ICON}
              >
                {specials.map((s) => (
                  <li key={s.id} className="py-3.5 border-b border-ink/10 last:border-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-medium">
                        <span className="mr-2 font-bold text-red-600">{s.id}</span>
                        {s.name}
                      </span>
                      <Price value={s.price} item={{ name: `${t("specials.number")} ${s.id} — ${s.name}`, category: SPECIALS_ID }} />
                    </div>
                    {s.desc && <p className="mt-0.5 text-sm text-ink/55">{s.desc}</p>}
                  </li>
                ))}
              </Card>
            ) : (
              g.items.map((c) => {
                const note = lang === "en" ? categoryEn[c.id]?.note ?? c.note : c.note;
                const multi = c.sizes.length > 1;
                return (
                  <Card
                    key={c.id}
                    id={c.id}
                    open={open.has(c.id)}
                    onToggle={toggle}
                    title={label(c)}
                    sub={note ?? `${c.items.length} ${c.items.length === 1 ? t("carte.dish") : t("carte.dishes")}`}
                    icon={c.icon ?? c.id}
                  >
                    {c.items.map((item, i) => (
                      <li key={`${item.name}-${i}`} className="py-3.5 border-b border-ink/10 last:border-0">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="font-medium">
                            {item.name}
                          </span>
                          {!multi && item.prices[0] != null && <Price value={item.prices[0]} item={{ name: dishName(c.id, item.name), category: c.id }} />}
                        </div>
                        {item.desc && <p className="mt-0.5 text-sm text-ink/55">{item.desc}</p>}
                        {multi && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/60">
                            {c.sizes.map((s, si) =>
                              item.prices[si] == null ? null : (
                                <span key={s} className="inline-flex items-center gap-1.5">
                                  {s} <Price value={item.prices[si]!} item={{ name: dishName(c.id, item.name), size: s, category: c.id }} className="text-ink" />
                                </span>
                              ),
                            )}
                          </p>
                        )}
                      </li>
                    ))}
                  </Card>
                );
              })
            )}
          </div>
        </section>
      ))}

      <p className="mt-12 text-center text-xs text-ink/45">{t("order.prices")}</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {orderable ? (
          <button onClick={() => cart.setOpen(true)} className={btnPrimary}>
            {t("order.viewCart")}
            {cart.count > 0 ? ` (${cart.count})` : ""}
          </button>
        ) : reservations.enabled ? (
          <button onClick={openReservation} className={btnPrimary}>
            {t("surPlace.reserve")}
          </button>
        ) : (
          <a href={telHref(info.phoneDisplay)} className={btnPrimary}>
            {t("contact.call")} · {info.phoneDisplay}
          </a>
        )}
      </div>

      {/* While the header is tucked away (scrolling down), the cart rides along at the bottom; scrolling up brings the header back and this goes. */}
      {orderable && navHidden && !toast && cart.count > 0 && (
        <button
          onClick={() => cart.setOpen(true)}
          aria-label={t("order.viewCart")}
          className="fixed bottom-5 left-1/2 z-[60] flex max-w-[92vw] -translate-x-1/2 items-center gap-4 rounded-full bg-ink py-2 pl-5 pr-2 text-paper shadow-xl"
        >
          <span className="whitespace-nowrap text-sm">
            <b className="font-bold">{cart.count}</b> {cart.count === 1 ? t("carte.dish") : t("carte.dishes")} · <b className="font-bold">{formatPrice(cart.subtotal)}</b>
          </span>
          <span className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-bold">{t("order.viewCart")}</span>
        </button>
      )}

      {toast && (
        <div role="status" className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-6 md:bottom-8 flex items-center gap-4 rounded-full bg-ink text-paper pl-5 pr-2 py-2 shadow-xl max-w-[92vw]">
          <span className="truncate text-sm">{toast}</span>
          <button onClick={() => cart.setOpen(true)} className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-bold">
            {t("order.viewCart")} ({cart.count})
          </button>
        </div>
      )}
    </div>
  );
}

function Card({
  id,
  open,
  onToggle,
  title,
  sub,
  icon,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: (id: string) => void;
  title: string;
  sub: string;
  icon: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <button
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`panel-${id}`}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-600/10 text-red-600">
          <Icon id={icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-extrabold leading-tight">{title}</span>
          <span className="block truncate text-sm text-ink/55">{sub}</span>
        </span>
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-ink/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={`panel-${id}`} className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <ul className="px-5">{children}</ul>
          <div className="flex justify-center px-5 pb-4 pt-1">
            <button
              onClick={() => onToggle(id)}
              tabIndex={open ? 0 : -1}
              className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-5 py-2.5 text-sm font-semibold text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 15 6-6 6 6" />
              </svg>
              {t("carte.fold")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
