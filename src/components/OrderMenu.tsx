import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { dishName, menuCategories, specials, type MenuCategory, type MenuItem } from "../data/menu";
import { useCart } from "../lib/cart";
import { categoryEn, useFormatPrice, useI18n } from "../lib/i18n";

const SPECIALS_ID = "super-speciaux";

/** Takeout/delivery menu: every price is a button that drops that dish and size into the cart. */
export function OrderMenu() {
  const { t, lang } = useI18n();
  const [categoryId, setCategoryId] = useState(menuCategories[0].id);
  const [toast, setToast] = useState<string | null>(null);
  const cart = useCart();

  const label = (c: MenuCategory) => (lang === "en" ? categoryEn[c.id]?.name ?? c.name : c.name);
  const tabs = [...menuCategories.map((c) => ({ id: c.id, name: label(c) })), { id: SPECIALS_ID, name: t("order.specials") }];

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const add = (item: { name: string; size?: string; price: number }) => {
    cart.add(item);
    setToast(`${item.name}${item.size ? ` · ${item.size}` : ""}`);
  };

  const category = menuCategories.find((c) => c.id === categoryId);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Catégories du menu"
        className="-mx-5 px-5 md:mx-0 md:px-0 flex gap-2 overflow-x-auto md:flex-wrap pb-2 mb-10 [scrollbar-width:none]"
      >
        {tabs.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === categoryId}
            onClick={() => setCategoryId(c.id)}
            className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
              c.id === categoryId ? "border-red-600 bg-red-600 text-paper" : "border-ink/15 text-ink/70 hover:border-ink/40 hover:text-ink"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={categoryId}
          role="tabpanel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {category ? <CategoryTable category={category} title={label(category)} onAdd={add} /> : <SpecialsTable onAdd={add} />}
        </motion.div>
      </AnimatePresence>

      <p className="mt-10 text-xs text-ink/45">{t("order.prices")}</p>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-6 md:bottom-8 flex items-center gap-4 rounded-full bg-ink text-paper pl-5 pr-2 py-2 shadow-xl max-w-[92vw]"
            role="status"
          >
            <span className="text-sm truncate">
              <span className="font-bold">{t("order.added")}</span> · {toast}
            </span>
            <button onClick={() => cart.setOpen(true)} className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-bold">
              {t("order.viewCart")} ({cart.count})
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Touch screens never hover, so there the "+" stays visible to show the price is tappable.
const canHover = window.matchMedia("(hover: hover)").matches;
const SPRING = { type: "spring", stiffness: 600, damping: 28 } as const;

/** Price pill; on hover the "+" slides in from the right. */
function AddButton({ price, onClick, label, small }: { price: number; onClick: () => void; label: string; small?: boolean }) {
  const formatPrice = useFormatPrice();
  const [active, setActive] = useState(false);
  const showPlus = !canHover || active;

  return (
    <motion.button
      layout
      onClick={onClick}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRING}
      aria-label={label}
      style={{ borderRadius: 999 }}
      className={`inline-flex items-center border font-semibold tabular-nums transition-colors duration-150 ${
        active ? "border-red-600 bg-red-600 text-paper" : "border-ink/15 text-ink"
      } ${small ? "h-9 px-3.5 text-sm" : "h-10 px-4"}`}
    >
      <motion.span layout="position" transition={SPRING}>
        {formatPrice(price)}
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        {showPlus && (
          <motion.span
            key="plus"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={SPRING}
            aria-hidden="true"
            className="ml-2 text-lg leading-none"
          >
            +
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function CategoryTable({
  category,
  title,
  onAdd,
}: {
  category: MenuCategory;
  title: string;
  onAdd: (item: { name: string; size?: string; price: number }) => void;
}) {
  const { t, lang } = useI18n();
  const multiSize = category.sizes.length > 1;
  const columns = `minmax(0,1fr) repeat(${category.sizes.length}, 6.75rem)`;
  const [size, setSize] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const note = lang === "en" ? categoryEn[category.id]?.note ?? category.note : category.note;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 76),
      { rootMargin: "-76px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const addLabel = (item: MenuItem, i: number) => `${t("order.add")} ${item.name}${multiSize ? ` ${category.sizes[i]}` : ""}`;

  return (
    <div>
      <h2 className="alt text-3xl md:text-4xl text-red-600 mb-2">{title}</h2>
      {note && <p className="text-ink/60 mb-6 max-w-2xl">{note}</p>}

      {multiSize && (
        <>
          <div ref={sentinelRef} aria-hidden="true" className="md:hidden h-px" />
          <div
            className={`md:hidden sticky top-[76px] z-10 -mx-5 px-5 mt-5 py-2 bg-paper ${
              stuck ? "before:absolute before:inset-x-0 before:bottom-full before:h-[76px] before:bg-paper" : ""
            }`}
          >
            <p className="alt text-ink/60 mb-2">{t("order.format")}</p>
            <div role="radiogroup" aria-label={t("order.format")} className="-mx-5 px-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {category.sizes.map((s, i) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={i === size}
                  onClick={() => setSize(i)}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                    i === size ? "bg-ink text-paper" : "bg-ink/5 text-ink/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div
            className="hidden md:grid gap-x-2 border-b border-ink/20 pb-3 mt-6 text-xs font-bold uppercase tracking-wider text-ink/50"
            style={{ gridTemplateColumns: columns }}
          >
            <span />
            {category.sizes.map((s) => (
              <span key={s} className="text-right pr-1">{s}</span>
            ))}
          </div>
        </>
      )}

      <ul className={multiSize ? "" : "mt-6 border-t border-ink/20"}>
        {category.items.map((item) => {
          let mobileIndex = size;
          if (item.prices[mobileIndex] === null) mobileIndex = item.prices.findIndex((p) => p !== null);
          const mobilePrice = mobileIndex === -1 ? null : item.prices[mobileIndex];

          return (
            <li
              key={`${item.num ?? ""}${item.name}`}
              className="py-4 border-b border-ink/10 md:grid md:gap-x-2 md:items-center"
              style={{ gridTemplateColumns: multiSize ? columns : undefined }}
            >
              <div className={`flex items-center justify-between gap-4 ${multiSize ? "md:block" : ""}`}>
                <div>
                  <p className="font-semibold">
                    {item.num && <span className="text-red-600 mr-2">{item.num}.</span>}
                    {item.name}
                  </p>
                  {item.desc && <p className="text-sm text-ink/55 mt-0.5">{item.desc}</p>}
                  {item.note && <p className="text-xs text-ink/45 mt-1">{item.note}</p>}
                  {multiSize && mobileIndex !== size && mobileIndex !== -1 && (
                    <p className="md:hidden text-xs text-ink/50 mt-1">{category.sizes[mobileIndex]}</p>
                  )}
                </div>

                {!multiSize && item.prices[0] !== null && (
                  <AddButton
                    price={item.prices[0]}
                    label={addLabel(item, 0)}
                    onClick={() => onAdd({ name: dishName(category.id, item.name), price: item.prices[0]! })}
                  />
                )}
                {multiSize && mobilePrice !== null && (
                  <span className="md:hidden shrink-0">
                    <AddButton
                      price={mobilePrice}
                      label={addLabel(item, mobileIndex)}
                      onClick={() => onAdd({ name: dishName(category.id, item.name), size: category.sizes[mobileIndex], price: mobilePrice })}
                    />
                  </span>
                )}
              </div>

              {multiSize &&
                item.prices.map((price, i) => (
                  <span key={category.sizes[i]} className="hidden md:flex justify-end">
                    {price === null ? (
                      <span className="text-ink/25 pr-4">—</span>
                    ) : (
                      <AddButton
                        small
                        price={price}
                        label={addLabel(item, i)}
                        onClick={() => onAdd({ name: dishName(category.id, item.name), size: category.sizes[i], price })}
                      />
                    )}
                  </span>
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SpecialsTable({ onAdd }: { onAdd: (item: { name: string; price: number }) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <h2 className="alt text-3xl md:text-4xl text-red-600 mb-6">{t("order.specials")}</h2>
      <ul className="border-t border-ink/20">
        {specials.map((s) => (
          <li key={s.id} className="flex items-center gap-4 py-4 border-b border-ink/10">
            <span className="w-8 shrink-0 font-display font-black text-red-600">{s.id}</span>
            <span className="flex-1">
              <span className="font-semibold">{s.name}</span>
              {s.desc && <span className="block text-sm text-ink/55">{s.desc}</span>}
              {s.note && <span className="block text-xs text-ink/45">{s.note}</span>}
            </span>
            <AddButton
              price={s.price}
              label={`${t("order.add")} ${t("specials.number")} ${s.id}`}
              onClick={() => onAdd({ name: `${t("specials.number")} ${s.id} — ${s.name}`, price: s.price })}
            />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink/45">{t("specials.rule")}</p>
    </div>
  );
}
