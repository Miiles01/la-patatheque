import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { dishName } from "../../data/menu";
import { submit, update, type Order, type Stored } from "../../lib/demoStore";
import { useMenu } from "../../lib/menuStore";
import { tablesStore } from "../../lib/reservations";
import { listTeam, onTeamChange, type Member } from "../../lib/team";
import { inputCls } from "./ui";

// Staff take an order in the panel: at a table (the default) or by phone for
// pickup. Full screen so the whole menu is at hand; on phones the menu and the
// order are two views switched from the bottom bar. Tapping an order card opens
// the same pop-up with that order, to see what was asked for or add to it.

type Line = { key: string; name: string; size?: string; price: number; qty: number; category: string };

const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
const SPECIALS = "super-speciaux";

export function NewOrderDialog({ onClose, order, user }: { onClose: () => void; order?: Stored<Order>; user: Member }) {
  const { categories, specials } = useMenu();
  const tables = tablesStore.use().filter((t) => t.active);
  const [mode, setMode] = useState<"surplace" | "emporter">(order ? (order.mode === "surplace" ? "surplace" : "emporter") : "surplace");
  const [table, setTable] = useState(order?.table ?? "");
  const [name, setName] = useState(order && order.mode !== "surplace" ? order.name : "");
  const [phone, setPhone] = useState(order?.phone ?? "");
  const [when, setWhen] = useState(order && order.mode !== "surplace" ? order.when : "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  // Only waiters can be picked (not the owner). A waiter taking the order is chosen by default.
  const waiters = () => listTeam().filter((m) => m.active && !m.owner && m.role === "serveur");
  const [server, setServer] = useState(order?.server ?? (user.role === "serveur" && !user.owner ? user.name : ""));
  const [team, setTeam] = useState(waiters);
  useEffect(() => onTeamChange(() => setTeam(waiters())), []);
  const servers = [...new Set([server, ...team.map((m) => m.name)].filter(Boolean))];
  const [lines, setLines] = useState<Line[]>(() =>
    (order?.lines ?? []).map((l) => ({ ...l, category: l.category ?? "", key: `${l.category ?? ""}|${l.name}|${l.size ?? ""}` })),
  );
  const [category, setCategory] = useState(categories[0]?.id ?? SPECIALS);
  const [search, setSearch] = useState("");
  // The dish whose sizes are shown.
  const [expanded, setExpanded] = useState<string | null>(null);
  // An existing order opens on what was asked for (on phones the order view).
  const [view, setView] = useState<"menu" | "order">(order ? "order" : "menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  // Orders from the site may carry the 10 % welcome code.
  const discount = order?.promoCode ? Math.round(subtotal * 10) / 100 : 0;
  const total = subtotal - discount;
  const count = lines.reduce((n, l) => n + l.qty, 0);

  const add = (item: Omit<Line, "key" | "qty">) => {
    const key = `${item.category}|${item.name}|${item.size ?? ""}`;
    setLines((ls) => (ls.some((l) => l.key === key) ? ls.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { ...item, key, qty: 1 }]));
  };
  const setQty = (key: string, qty: number) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, qty } : l))));

  // Searching looks through the whole menu; otherwise one section at a time.
  const q = search.trim().toLowerCase();
  const sections = useMemo(() => {
    const all = [
      ...categories.map((c) => ({ id: c.id, name: c.name, sizes: c.sizes, items: c.items.map((i) => ({ name: i.name, prices: i.prices })) })),
      { id: SPECIALS, name: "Super spéciaux", sizes: [""], items: specials.map((s) => ({ name: s.name, prices: [s.price] })) },
    ];
    if (!q) return all.filter((s) => s.id === category);
    return all.map((s) => ({ ...s, items: s.items.filter((i) => i.name.toLowerCase().includes(q)) })).filter((s) => s.items.length);
  }, [categories, specials, category, q]);

  async function send() {
    setError("");
    if (!lines.length) return setError("Ajoutez au moins un plat.");
    if (mode === "surplace" && !table) return setError("Choisissez la table.");
    if (mode === "emporter" && !name.trim()) return setError("Indiquez le nom du client.");
    setBusy(true);
    try {
      const sub = Math.round(subtotal * 100) / 100;
      if (order) {
        update("orders", order.id, {
          mode,
          table: mode === "surplace" ? table : undefined,
          name: mode === "surplace" ? `Table ${table}` : name.trim(),
          phone: mode === "emporter" ? phone.trim() : "",
          when: mode === "surplace" ? "Sur place" : when.trim() || "Dès que possible",
          notes: notes.trim(),
          server: mode === "surplace" && server ? server : undefined,
          lines: lines.map(({ name, size, price, qty, category }) => ({ name, size, price, qty, category })),
          subtotal: sub,
          discount,
          total: Math.round((sub - discount) * 100) / 100,
        });
        onClose();
        return;
      }
      await submit("orders", {
        mode,
        table: mode === "surplace" ? table : undefined,
        name: mode === "surplace" ? `Table ${table}` : name.trim(),
        phone: mode === "emporter" ? phone.trim() : "",
        when: mode === "surplace" ? "Sur place" : when.trim() || "Dès que possible",
        notes: notes.trim() || undefined,
        server: mode === "surplace" && server ? server : undefined,
        lines: lines.map(({ name, size, price, qty, category }) => ({ name, size, price, qty, category })),
        subtotal: sub,
        discount: 0,
        total: sub,
        status: "nouvelle",
        paid: false,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau. Réessayez.");
      setBusy(false);
    }
  }

  const segment = (active: boolean) =>
    `relative flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition-colors duration-200 ${active ? "text-paper" : "text-ink/60 hover:text-ink"}`;

  return (
    <div className="fixed inset-0 z-[95] flex items-stretch md:items-center justify-center bg-ink/50 md:p-6" data-lenis-prevent>
      <div role="dialog" aria-modal="true" aria-labelledby="new-order-title" className="flex h-full w-full flex-col bg-white text-ink md:h-[92vh] md:max-w-6xl md:rounded-3xl md:overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4 md:px-7">
          <h2 id="new-order-title" className="font-display font-extrabold text-xl md:text-2xl">
            {order ? (order.mode === "surplace" ? `Table ${order.table}` : order.name) : "Nouvelle commande"}
            {order && <span className="ml-2 text-sm font-semibold text-ink/40">#{order.id}</span>}
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="relative h-10 w-10 rounded-full text-ink/60 hover:bg-ink/5">
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 bg-current rotate-45" />
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 bg-current -rotate-45" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Menu */}
          <section className={`min-h-0 min-w-0 flex-1 flex-col lg:flex lg:border-r lg:border-ink/10 ${view === "menu" ? "flex" : "hidden"}`}>
            <div className="border-b border-ink/10 px-5 pt-4 pb-3 md:px-7">
              <label className="relative block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chercher un plat…"
                  aria-label="Chercher un plat"
                  className={`${inputCls} pl-12`}
                />
              </label>
              {!q && (
                <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-7 md:px-7 [scrollbar-width:none]">
                  {[...categories.map((c) => ({ id: c.id, name: c.name })), { id: SPECIALS, name: "Super spéciaux" }].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                        category === c.id ? "bg-red-600 text-paper" : "bg-ink/5 text-ink/65 hover:bg-ink/10"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-7">
              {sections.map((s) => (
                <div key={s.id} className="mb-6">
                  {q && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">{s.name}</p>}
                  <ul className="flex flex-col divide-y divide-ink/5">
                    {s.items.map((item) => {
                      const options = item.prices
                        .map((price, i) => ({ price, size: s.sizes.length > 1 ? s.sizes[i] : undefined }))
                        .filter((o): o is { price: number; size: string | undefined } => o.price !== null);
                      const pick = (o: { price: number; size?: string }) =>
                        add({ name: s.id === SPECIALS ? item.name : dishName(s.id, item.name), size: o.size, price: o.price, category: s.id });
                      const key = `${s.id}|${item.name}`;
                      const isOpen = expanded === key;
                      // One price: a tap adds it. Several sizes: a tap shows them.
                      const single = options.length === 1;
                      return (
                        <li key={item.name}>
                          <button
                            onClick={() => (single ? pick(options[0]) : setExpanded(isOpen ? null : key))}
                            aria-expanded={single ? undefined : isOpen}
                            className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                          >
                            <span className="font-semibold leading-tight">{item.name}</span>
                            <span className="flex shrink-0 items-center gap-2 text-sm text-ink/55 tabular-nums">
                              {single ? (
                                <span className="rounded-full border border-ink/15 px-3 py-1 font-bold text-ink">+ {money.format(options[0].price)}</span>
                              ) : (
                                <>
                                  dès {money.format(Math.min(...options.map((o) => o.price)))}
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
                                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </>
                              )}
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                                  {options.map((o) => (
                                    <button
                                      key={o.size ?? o.price}
                                      onClick={() => pick(o)}
                                      className="flex flex-col items-start rounded-xl border border-ink/15 px-3 py-2.5 text-left hover:border-red-600 hover:bg-red-600 hover:text-paper transition-colors"
                                    >
                                      <span className="text-xs opacity-70">{o.size}</span>
                                      <span className="font-bold tabular-nums">{money.format(o.price)}</span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {!sections.length && <p className="py-10 text-center text-sm text-ink/45">Aucun plat ne correspond.</p>}
            </div>
          </section>

          {/* Order */}
          <section className={`min-h-0 flex-col lg:flex lg:w-[55%] lg:shrink-0 bg-ink/[0.02] ${view === "order" ? "flex flex-1" : "hidden"}`}>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
              <div className="flex rounded-full bg-ink/5 p-1">
                {(
                  [
                    ["surplace", "Sur place"],
                    ["emporter", "Pour emporter"],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} onClick={() => setMode(id)} aria-pressed={mode === id} className={segment(mode === id)}>
                    {mode === id && (
                      <motion.span layoutId="order-mode-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-ink" />
                    )}
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>

              {mode === "surplace" ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Table</p>
                  {tables.length ? (
                    <div className="grid grid-cols-4 gap-2">
                      {tables.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTable(t.code)}
                          aria-pressed={table === t.code}
                          className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition-colors ${
                            table === t.code ? "border-red-600 bg-red-600 text-paper" : "border-ink/15 bg-white hover:border-ink/40"
                          }`}
                        >
                          {t.code}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="No de table" className={inputCls} />
                  )}
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du client" aria-label="Nom du client" autoComplete="off" className={inputCls} />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="Téléphone (facultatif)" aria-label="Téléphone" autoComplete="off" className={inputCls} />
                  <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Heure (dès que possible)" aria-label="Heure de cueillette" className={inputCls} />
                </div>
              )}

              {mode === "surplace" && servers.length > 0 && (
              <>
              <p className="mt-5 mb-2 text-sm font-semibold">Serveur·euse</p>
              <div className="flex flex-wrap gap-2">
                {servers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setServer(server === n ? "" : n)}
                    aria-pressed={server === n}
                    className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-semibold transition-colors ${
                      server === n ? "border-red-600 bg-red-600 text-paper" : "border-ink/15 bg-white hover:border-ink/40"
                    }`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${server === n ? "bg-paper text-red-600" : "bg-ink/10 text-ink/70"}`}>
                      {n.charAt(0)}
                    </span>
                    {n}
                  </button>
                ))}
              </div>
              </>
              )}

              <p className="mt-6 mb-2 text-sm font-semibold">Commande</p>
              {lines.length ? (
                <ul className="flex flex-col gap-2">
                  {lines.map((l) => (
                    <li key={l.key} className="flex items-center gap-3 rounded-xl bg-white border border-ink/10 px-3 py-2.5">
                      <span className="min-w-0 flex-1 text-sm leading-tight">
                        {l.name}
                        {l.size && <span className="block text-xs text-ink/45">{l.size}</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={`Retirer un ${l.name}`} className="h-8 w-8 rounded-full bg-ink/5 font-bold hover:bg-ink/10">
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                        <button onClick={() => setQty(l.key, l.qty + 1)} aria-label={`Ajouter un ${l.name}`} className="h-8 w-8 rounded-full bg-ink/5 font-bold hover:bg-ink/10">
                          +
                        </button>
                      </span>
                      <span className="w-16 text-right text-sm font-bold tabular-nums">{money.format(l.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">
                  Touchez un plat dans le menu, puis sa taille, pour l’ajouter.
                </p>
              )}

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Note pour la cuisine (allergies, sans oignons…)"
                aria-label="Note pour la cuisine"
                className={`${inputCls} mt-4 resize-none`}
              />
            </div>

            <div className="hidden lg:block border-t border-ink/10 px-6 py-4">
              <SendBar total={total} discount={discount} count={count} busy={busy} error={error} onSend={send} editing={!!order} />
            </div>
          </section>
        </div>

        {/* Phones and tablets: one bar to switch views and send. */}
        <div className="lg:hidden border-t border-ink/10 px-5 py-3">
          {view === "menu" ? (
            <button onClick={() => setView("order")} className="flex w-full items-center justify-between rounded-full bg-ink px-5 py-3.5 text-sm font-bold text-paper">
              <span>Voir la commande ({count})</span>
              <span className="tabular-nums">{money.format(total)}</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <SendBar total={total} discount={discount} count={count} busy={busy} error={error} onSend={send} editing={!!order} />
              <button onClick={() => setView("menu")} className="py-1.5 text-sm font-bold text-ink/60">
                ← Ajouter des plats
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SendBar({
  total,
  discount,
  count,
  busy,
  error,
  onSend,
  editing,
}: {
  total: number;
  discount: number;
  count: number;
  busy: boolean;
  error: string;
  onSend: () => void;
  editing: boolean;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-ink/55">
          {count} article{count > 1 ? "s" : ""}
          {discount > 0 && ` · rabais 10 % (−${money.format(discount)})`}
        </span>
        <span className="font-display text-xl font-bold tabular-nums">{money.format(total)}</span>
      </div>
      <button
        onClick={onSend}
        disabled={busy}
        className="w-full rounded-full bg-red-600 px-6 py-3.5 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        {busy ? "Envoi…" : editing ? "Enregistrer" : "Envoyer en cuisine"}
      </button>
    </>
  );
}
