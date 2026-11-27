import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { dishName } from "../../data/menu";
import { addedLines, list, orderRounds, submit, update, updateRound, type Order, type Round, type Stored } from "../../lib/demoStore";
import { computeCharges, useCharges } from "../../lib/charges";
import { useMenu } from "../../lib/menuStore";
import { promoDiscount, promosStore } from "../../lib/promos";
import { tablesStore } from "../../lib/reservations";
import { listTeam, onTeamChange, type Member } from "../../lib/team";
import { markOrderTakenHere } from "./live";
import { inputCls, SegmentedTabs } from "./ui";
import { LogoMark } from "../../components/LogoMark";

// Staff take an order in the panel, in three short steps: the table (or the
// pickup customer), who serves it, then the dishes, which build up on a ticket.
// A table that already has an open order is flagged before a duplicate is made.
// Tapping an order card opens the same pop-up on its ticket, to add to it.

type Line = { key: string; name: string; size?: string; price: number; qty: number; category: string };

const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
const SPECIALS = "super-speciaux";

export function NewOrderDialog({
  onClose,
  order,
  user,
  onOpenOrder,
  wide,
  focusRound,
}: {
  onClose: () => void;
  order?: Stored<Order>;
  user: Member;
  /** Opens another order instead (the one already at the table typed in). */
  onOpenOrder?: (id: string) => void;
  /** Opens on the ticket at full width (the kitchen's view). */
  wide?: boolean;
  /** The round tapped on the kitchen board, highlighted beside the ticket. */
  focusRound?: number;
}) {
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
  // Category tabs fade out on the side that has more of them.
  const chips = useRef<HTMLDivElement>(null);
  // The dish whose sizes are shown.
  const [expanded, setExpanded] = useState<string | null>(null);
  // An existing order opens on what was asked for (on phones the order view).
  const [view, setView] = useState<"menu" | "order">(order ? "order" : "menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  // Orders from the site may carry a discount code: keep its rate while dishes are added.
  const savedPromos = promosStore.use();
  const code = order?.promoCode ? savedPromos.find((p) => p.code.toUpperCase() === order.promoCode!.toUpperCase()) : undefined;
  const discount = code ? promoDiscount(code, subtotal) : order?.promoCode && order.subtotal ? Math.round(subtotal * (order.discount / order.subtotal) * 100) / 100 : 0;
  const chargeList = useCharges();
  const { lines: chargeLines, total } = computeCharges(Math.round((subtotal - discount) * 100) / 100, chargeList);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  // In an order already sent, what was added since the ticket was opened goes on top, in red,
  // newest first: the waiter sees at a glance what the kitchen will get as new.
  const sentQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of order?.lines ?? []) {
      const k = `${l.category ?? ""}|${l.name}|${l.size ?? ""}`;
      m.set(k, (m.get(k) ?? 0) + l.qty);
    }
    return m;
  }, [order]);
  const freshQty = (l: Line) => (order ? Math.max(0, l.qty - (sentQty.get(l.key) ?? 0)) : 0);
  const shownLines = order ? [...lines.filter((l) => freshQty(l) > 0).reverse(), ...lines.filter((l) => freshQty(l) === 0)] : lines;

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

  // An open order saves itself when the ticket is closed: no button to remember. That is
  // also when what was added reaches the kitchen, as one round.
  const sig = (o: { mode: string; table?: string; name: string; phone?: string; when?: string; notes?: string; server?: string; lines: { name: string; size?: string; qty: number }[] }) =>
    JSON.stringify([o.mode === "surplace" ? "surplace" : "emporter", o.mode === "surplace" ? o.table : o.name, o.phone ?? "", o.when ?? "", (o.notes ?? "").trim(), o.server ?? "", o.lines.map((l) => [l.name, l.size ?? "", l.qty])]);
  const changed =
    !!order &&
    sig(order) !==
      sig({ mode, table, name: mode === "surplace" ? `Table ${table}` : name, phone: mode === "emporter" ? phone : "", when: mode === "surplace" ? "Sur place" : when || order.when, notes, server: mode === "surplace" ? server : "", lines });
  function close() {
    if (order && changed && lines.length && !busy) return void send();
    onClose();
  }

  async function send() {
    setError("");
    if (!lines.length) return setError("Ajoutez au moins un plat.");
    if (mode === "surplace" && !table) return setError("Choisissez la table.");
    if (mode === "emporter" && !name.trim()) return setError("Indiquez le nom du client.");
    setBusy(true);
    try {
      const sub = Math.round(subtotal * 100) / 100;
      if (order) {
        const next = lines.map(({ name, size, price, qty, category }) => ({ name, size, price, qty, category }));
        // Dishes added since the kitchen got the order reach it as a new round of their own,
        // with the sound (except on this device). The server works this out again on its side.
        const added = addedLines(order.lines, next);
        const additions = added.length ? [...(order.additions ?? []), { at: new Date().toISOString(), lines: added, status: "nouvelle" as const }] : order.additions;
        if (added.length) markOrderTakenHere(`${order.id}+${additions!.length}`);
        update("orders", order.id, {
          ...(added.length ? { additions } : {}),
          mode,
          table: mode === "surplace" ? table : undefined,
          name: mode === "surplace" ? `Table ${table}` : name.trim(),
          phone: mode === "emporter" ? phone.trim() : "",
          when: mode === "surplace" ? "Sur place" : when.trim() || "Dès que possible",
          notes: notes.trim(),
          server: mode === "surplace" && server ? server : undefined,
          lines: next,
          subtotal: sub,
          discount,
          charges: chargeLines.length ? chargeLines : undefined,
          total,
        });
        onClose();
        return;
      }
      const row = await submit("orders", {
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
        charges: chargeLines.length ? chargeLines : undefined,
        total,
        status: "nouvelle",
        paid: false,
      });
      // The kitchen hears it; this device doesn't (whoever took it knows).
      markOrderTakenHere(row.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau. Réessayez.");
      setBusy(false);
    }
  }

  const segment = (active: boolean) =>
    `relative rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors duration-200 ${active ? "text-paper" : "text-ink/55 hover:text-ink"}`;

  // Three short steps instead of one busy screen: the table, who serves it, then the dishes.
  // Pickup orders skip the waiter. An order that already exists opens on its dishes.
  const hasWaiterStep = mode === "surplace" && servers.length > 0;
  const steps: Step[] = mode === "surplace" ? (hasWaiterStep ? ["table", "server", "items"] : ["table", "items"]) : ["table", "items"];
  const [step, setStep] = useState<Step>(order ? "items" : "table");
  const [dir, setDir] = useState(1);
  // Computer: the ticket can take the whole width, centred, with the menu out of the way.
  const [full, setFull] = useState(!!wide);
  // Rounds of dishes added after the order reached the kitchen, shown beside the wide ticket.
  const rounds = order ? orderRounds(order) : [];
  const showRounds = full && rounds.length > 1;
  // Measured once the dishes step (and its category tabs) is on screen.
  const chipFade = useEdgeFade(chips, !search.trim() && step === "items");
  const go = (to: Step) => {
    setError("");
    setDir(steps.indexOf(to) >= steps.indexOf(step) ? 1 : -1);
    setStep(to);
  };

  // A table that still has an open order: asked before a second one is started by mistake.
  const [clash, setClash] = useState<Stored<Order> | null>(null);

  // Where to go once the table is confirmed: the next step, or the one picked at the top.
  const afterTable = useRef<Step | null>(null);
  function confirmFirst(force = false, to?: Step) {
    if (to) afterTable.current = to;
    setError("");
    if (mode === "surplace" && !table) return setError("Entrez le numéro de la table.");
    if (mode === "surplace" && !force) {
      const open = list("orders").find((o) => o.mode === "surplace" && !o.closed && o.table === table && o.id !== order?.id);
      if (open) return setClash(open);
    }
    setClash(null);
    if (mode === "emporter" && !name.trim()) return setError("Indiquez le nom du client.");
    go(afterTable.current ?? (hasWaiterStep ? "server" : "items"));
    afterTable.current = null;
  }

  // The steps at the top can be clicked to move between them. Leaving the first step
  // still checks the table (or the customer's name) first.
  const ready = mode === "surplace" ? !!table : !!name.trim();
  function jump(to: Step) {
    if (to === step) return;
    if (step === "table") return confirmFirst(false, to);
    go(to);
  }

  // The table can also be typed on a keyboard: digits, ⌫ and Entrée.
  const confirmRef = useRef(confirmFirst);
  confirmRef.current = confirmFirst;
  useEffect(() => {
    if (step !== "table" || mode !== "surplace" || clash) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) setTable((t) => (t + e.key).slice(0, 3));
      else if (e.key === "Backspace") setTable((t) => t.slice(0, -1));
      else if (e.key === "Enter") confirmRef.current();
      else if (e.key === "Escape") setClash(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, mode, clash]);

  // Waiter cards: big for a few, smaller for a dozen, small pills (with a search) beyond.
  const [who, setWho] = useState("");
  const size = servers.length <= 6 ? "lg" : servers.length <= 12 ? "md" : "sm";
  const shownServers = servers.length > 12 && who.trim() ? servers.filter((n) => n.toLowerCase().includes(who.trim().toLowerCase())) : servers;

  const stepTabs = (id: string, compact = false) => (
    <SegmentedTabs
      id={id}
      compact={compact}
      label="Étapes"
      value={step}
      onChange={jump}
      items={steps.map((s) => ({ id: s, label: labels[s], icon: s === "table" && mode === "emporter" ? STEP_ICONS.server : STEP_ICONS[s], disabled: s !== "table" && !ready }))}
    />
  );

  const title = order ? (order.mode === "surplace" ? `Table ${order.table}` : order.name) : "Nouvelle commande";
  const labels: Record<Step, string> = { table: mode === "surplace" ? "Table" : "Client", server: "Serveur·euse", items: "Commande" };

  return (
    <div className="fixed inset-0 z-[95] flex items-stretch md:items-center justify-center bg-ink/50 md:p-6" data-lenis-prevent>
      <div role="dialog" aria-modal="true" aria-labelledby="new-order-title" className="flex h-full w-full flex-col bg-white text-ink md:h-[92vh] md:max-w-6xl md:rounded-3xl md:overflow-hidden">
        <header className="flex justify-between sm:grid sm:grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-ink/10 px-4 py-3.5 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="new-order-title" className="truncate font-display font-extrabold text-lg md:text-xl">
              {title}
            </h2>
          </div>
          <div className="hidden sm:block">{stepTabs("order-steps")}</div>
          <button onClick={close} aria-label={changed ? "Enregistrer et fermer" : "Fermer"} className="relative h-10 w-10 justify-self-end rounded-full text-ink/60 hover:bg-ink/5">
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 bg-current rotate-45" />
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 bg-current -rotate-45" />
          </button>
        </header>
        {/* Phones: the steps get their own row under the title. */}
        <div className="flex justify-center border-b border-ink/10 py-2 sm:hidden">{stepTabs("order-steps-phone", true)}</div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={step}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 48, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -48, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col"
            >
              {step === "table" && (
                <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 py-8 md:justify-center">
                  {/* Most orders taken here are at a table, so the choice stays small. */}
                  <div className="inline-flex rounded-full bg-ink/5 p-1">
                    {(
                      [
                        ["surplace", "Sur place"],
                        ["emporter", "Pour emporter"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => {
                          setError("");
                          setMode(id);
                        }}
                        aria-pressed={mode === id}
                        className={segment(mode === id)}
                      >
                        {mode === id && (
                          <motion.span layoutId="order-mode-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-ink" />
                        )}
                        <span className="relative">{label}</span>
                      </button>
                    ))}
                  </div>

                  {mode === "surplace" ? (
                    <>
                      <p className="mt-6 font-display text-2xl font-bold">Quelle table ?</p>
                      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
                        <div className="flex h-56 w-64 flex-col sm:h-auto items-center justify-center rounded-3xl border border-ink/10 bg-[#fbfafa]">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Table</span>
                          <span aria-live="polite" className={`font-display font-extrabold leading-none tabular-nums ${table ? "text-[8.5rem] text-red-600" : "text-7xl text-ink/15"}`}>
                            {table || "—"}
                          </span>
                          {table && tables.length > 0 && !tables.some((t) => t.code === table) && (
                            <span className="mt-1 text-center text-xs leading-tight text-orange">Pas dans vos tables</span>
                          )}
                        </div>
                        {/* Typed on screen (tablets): no keyboard popping up. */}
                        <div className="grid w-56 shrink-0 grid-cols-3 gap-2">
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "ok"].map((k) =>
                            k === "ok" ? (
                              <button
                                key={k}
                                onClick={() => confirmFirst()}
                                disabled={!table}
                                aria-label="Valider la table"
                                className="flex items-center justify-center rounded-xl bg-red-600 py-3 text-paper shadow-md shadow-red-600/20 transition hover:bg-red-700 active:scale-95 disabled:bg-ink/10 disabled:text-ink/30 disabled:shadow-none"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-6 w-6" aria-hidden="true">
                                  <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                key={k}
                                onClick={() => setTable((t) => (k === "⌫" ? t.slice(0, -1) : (t + k).slice(0, 3)))}
                                aria-label={k === "⌫" ? "Effacer le dernier chiffre" : undefined}
                                className={`rounded-xl border py-3 text-lg font-bold tabular-nums transition-colors active:scale-95 ${
                                  k === "⌫" ? "border-ink/10 bg-ink/5 text-ink/60 hover:bg-ink/10" : "border-ink/15 bg-white hover:border-ink/40"
                                }`}
                              >
                                {k}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        confirmFirst();
                      }}
                      className="mt-6 flex w-full max-w-sm flex-col gap-3"
                    >
                      <p className="mb-2 text-center font-display text-2xl font-bold">Pour qui ?</p>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du client" aria-label="Nom du client" autoComplete="off" autoFocus className={inputCls} />
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="Téléphone (facultatif)" aria-label="Téléphone" autoComplete="off" className={inputCls} />
                      <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Heure (dès que possible)" aria-label="Heure de cueillette" className={inputCls} />
                      <button type="submit" className="mt-3 self-center rounded-full bg-red-600 px-10 py-3.5 text-sm font-bold text-paper shadow-lg shadow-red-600/20 hover:bg-red-700">
                        Continuer
                      </button>
                    </form>
                  )}
                  {error && (
                    <p role="alert" className="mt-5 text-sm font-semibold text-red-600">
                      {error}
                    </p>
                  )}
                  <AnimatePresence>
                    {clash && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 p-5 backdrop-blur-[2px]"
                        onClick={() => setClash(null)}
                      >
                        <motion.div
                          role="alertdialog"
                          aria-labelledby="clash-title"
                          initial={{ scale: 0.96, y: 8 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.96, y: 8 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-[0_20px_50px_-15px_rgba(43,28,20,0.35)] ring-1 ring-ink/5"
                        >
                          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange/15 text-orange">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                              <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
                              <path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <p id="clash-title" className="mt-4 font-display text-xl font-bold">
                            La table {table} a déjà une commande
                          </p>
                          <p className="mt-1.5 text-sm text-ink/55">
                            {clash.lines.reduce((n, l) => n + l.qty, 0)} article{clash.lines.reduce((n, l) => n + l.qty, 0) > 1 ? "s" : ""} · {money.format(clash.total)}
                            {clash.server ? ` · ${clash.server}` : ""}. Est-ce bien cette table ?
                          </p>
                          <div className="mt-5 flex flex-col gap-2">
                            {onOpenOrder && (
                              <button onClick={() => onOpenOrder(clash.id)} className="rounded-full bg-red-600 py-3 text-sm font-bold text-paper hover:bg-red-700">
                                Ouvrir sa commande
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setClash(null);
                                setTable("");
                                afterTable.current = null;
                              }}
                              className="rounded-full bg-ink/5 py-3 text-sm font-bold hover:bg-ink/10"
                            >
                              Changer de table
                            </button>
                            <button onClick={() => confirmFirst(true)} className="py-2 text-xs font-bold text-ink/45 hover:text-ink">
                              Créer une autre commande quand même
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {step === "server" && (
                // Centred whatever the count. The cards shrink as the team grows, and past 12
                // a search narrows the list, so even 50 waiters fit without spilling off screen.
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-8">
                  <div className="m-auto flex w-full max-w-3xl flex-col items-center">
                    <p className="text-center font-display text-2xl font-bold">Qui sert la table {table} ?</p>
                    {servers.length > 12 && (
                      <label className="relative mt-6 block w-full max-w-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden="true">
                          <circle cx="11" cy="11" r="6.5" />
                          <path d="m16 16 4 4" strokeLinecap="round" />
                        </svg>
                        <input
                          type="search"
                          value={who}
                          onChange={(e) => setWho(e.target.value)}
                          placeholder="Chercher un nom…"
                          aria-label="Chercher un serveur·euse"
                          className={`${inputCls} pl-12`}
                        />
                      </label>
                    )}
                    <div className={`mt-8 flex w-full flex-wrap justify-center ${size === "lg" ? "gap-3" : "gap-2"}`}>
                      {shownServers.map((n) => {
                        const on = server === n;
                        return (
                          <button
                            key={n}
                            onClick={() => {
                              setServer(n);
                              go("items");
                            }}
                            aria-pressed={on}
                            className={`border font-bold transition-colors active:scale-[0.98] ${on ? "border-red-600 bg-red-600 text-paper" : "border-ink/12 bg-white hover:border-ink/40"} ${
                              size === "lg"
                                ? "flex w-40 flex-col items-center gap-3 rounded-2xl px-4 py-6"
                                : size === "md"
                                  ? "flex w-32 flex-col items-center gap-2 rounded-2xl px-3 py-4 text-sm"
                                  : "inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm"
                            }`}
                          >
                            <span
                              className={`flex shrink-0 items-center justify-center rounded-full font-display ${on ? "bg-paper text-red-600" : "bg-ink/5 text-ink/70"} ${
                                size === "lg" ? "h-14 w-14 text-2xl" : size === "md" ? "h-10 w-10 text-lg" : "h-7 w-7 text-xs"
                              }`}
                            >
                              {n.charAt(0)}
                            </span>
                            <span className={size === "sm" ? "" : "max-w-full truncate"}>{n}</span>
                          </button>
                        );
                      })}
                      {!shownServers.length && <p className="py-6 text-sm text-ink/45">Aucun nom ne correspond.</p>}
                    </div>
                    <button
                      onClick={() => {
                        setServer("");
                        go("items");
                      }}
                      className="mt-6 text-sm font-bold text-ink/50 hover:text-ink"
                    >
                      Continuer sans serveur·euse
                    </button>
                  </div>
                </div>
              )}

              {step === "items" && (
                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                  {/* Menu */}
                <section className={`min-h-0 min-w-0 flex-1 flex-col lg:border-r lg:border-ink/10 ${full ? "lg:hidden" : "lg:flex"} ${view === "menu" ? "flex" : "hidden"}`}>
                  <div className="border-b border-ink/10 px-5 pt-4 pb-3 md:px-7">
                    {/* Says what the search is for: what is picked here goes on the ticket. */}
                    <p className="mb-2.5 font-display text-lg font-bold">Ajouter un plat</p>
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
                      <div ref={chips} style={chipFade} className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-7 md:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                                            {/* The size is what staff look for; the price comes second. */}
                                            {o.size && <span className="text-base font-bold leading-tight">{o.size}</span>}
                                            <span className={`tabular-nums ${o.size ? "text-xs opacity-60" : "font-bold"}`}>{money.format(o.price)}</span>
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


                  {/* Ticket */}
                  <section className={`relative min-h-0 flex-col bg-[#f3f1ee] lg:flex lg:shrink-0 ${full ? "lg:w-full" : "lg:w-1/2"} ${view === "order" ? "flex flex-1" : "hidden"}`}>
                    <div
                      className={`min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:pb-28 ${
                        showRounds ? "lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-8" : ""
                      }`}
                    >
                      <Ticket
                        mode={mode}
                        table={table}
                        name={name}
                        server={server}
                        onEditTable={() => go("table")}
                        onEditServer={hasWaiterStep ? () => go("server") : undefined}
                      >
                        {lines.length ? (
                          <ul className="flex flex-col">
                            {shownLines.map((l) => {
                              const extra = freshQty(l);
                              return (
                              <li
                                key={l.key}
                                className={`group flex items-center gap-2 py-2 ${extra ? "-mx-3 my-0.5 rounded-xl bg-red-600/[0.07] px-3 text-red-700" : ""}`}
                              >
                                <span className="min-w-0 flex-1 text-sm leading-tight">
                                  {extra > 0 && (
                                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-red-600">
                                      {extra === l.qty ? "Nouveau" : `+${extra} nouveau${extra > 1 ? "x" : ""}`}
                                    </span>
                                  )}
                                  {l.name}
                                  {l.size && <span className={`block text-xs ${extra ? "text-red-700/70" : "text-ink/45"}`}>{l.size}</span>}
                                </span>
                                <span className="flex items-center">
                                  <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={`Retirer un ${l.name}`} className="h-7 w-7 rounded-full font-bold text-ink/60 hover:bg-ink/5">
                                    −
                                  </button>
                                  <span className="w-5 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                                  <button onClick={() => setQty(l.key, l.qty + 1)} aria-label={`Ajouter un ${l.name}`} className="h-7 w-7 rounded-full font-bold text-ink/60 hover:bg-ink/5">
                                    +
                                  </button>
                                </span>
                                <span className="w-16 text-right text-sm font-semibold tabular-nums">{money.format(l.price * l.qty)}</span>
                                <button
                                  onClick={() => setQty(l.key, 0)}
                                  aria-label={`Retirer ${l.name} de la commande`}
                                  title="Retirer"
                                  className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/30 hover:bg-red-600/10 hover:text-red-600 transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="py-6 text-center text-sm text-ink/40">Touchez un plat dans le menu pour l’ajouter.</p>
                        )}

                        {lines.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1 border-t border-ink/10 pt-3">
                            {(discount > 0 || chargeLines.length > 0) && (
                              <p className="flex justify-between text-sm text-ink/55">
                                <span>Sous-total</span>
                                <span className="tabular-nums">{money.format(subtotal)}</span>
                              </p>
                            )}
                            {discount > 0 && (
                              <p className="flex justify-between text-sm text-ink/55">
                                <span>Rabais{order?.promoCode ? ` (${order.promoCode})` : ""}</span>
                                <span className="tabular-nums">−{money.format(discount)}</span>
                              </p>
                            )}
                            {chargeLines.map((c) => (
                              <p key={c.id} className="flex justify-between text-sm text-ink/55">
                                <span>
                                  {c.name} ({c.percent} %)
                                </span>
                                <span className="tabular-nums">{money.format(c.amount)}</span>
                              </p>
                            ))}
                            <p className="mt-1 flex items-baseline justify-between">
                              <span className="font-semibold">
                                Total <span className="text-sm font-normal text-ink/45">· {count} article{count > 1 ? "s" : ""}</span>
                              </span>
                              <span className="font-display text-2xl font-bold tabular-nums">{money.format(total)}</span>
                            </p>
                          </div>
                        )}

                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          placeholder="Note pour la cuisine (allergies, sans oignons…)"
                          aria-label="Note pour la cuisine"
                          className="mt-4 w-full resize-none rounded-xl bg-ink/[0.04] px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/35 focus:bg-ink/[0.06]"
                        />
                      </Ticket>
                      {showRounds && order && <NewRounds order={order} rounds={rounds} focus={focusRound} />}
                    </div>

                    {/* The button floats over the ticket; what scrolls behind it fades into the background. */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden lg:flex flex-col items-center bg-linear-to-b from-[#f3f1ee]/0 to-[#f3f1ee] to-55% px-6 pb-5 pt-12">
                      <SendBar busy={busy} error={error} onSend={send} editing={!!order} pending={changed} expanded={full} onExpand={() => setFull((v) => !v)} />
                    </div>
                  </section>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Phones and tablets: one bar to switch between the menu and the ticket, and send. */}
        {step === "items" && (
          <div className="lg:hidden border-t border-ink/10 px-5 py-3">
            {view === "menu" ? (
              <button onClick={() => setView("order")} className="flex w-full items-center justify-between rounded-full bg-ink px-5 py-3.5 text-sm font-bold text-paper">
                <span>Voir la commande ({count})</span>
                <span className="tabular-nums">{money.format(total)}</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <SendBar busy={busy} error={error} onSend={send} editing={!!order} pending={changed} />
                <button onClick={() => setView("menu")} className="py-1.5 text-sm font-bold text-ink/60">
                  ← Ajouter des plats
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Step = "table" | "server" | "items";

const STEP_ICONS: Record<Step, React.ReactNode> = {
  table: <path d="M4 9h16M6 9v10M18 9v10M8 5h8" strokeLinecap="round" strokeLinejoin="round" />,
  server: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" strokeLinecap="round" />
    </>
  ),
  items: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
    </>
  ),
};

const clock = new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit" });

/** How long ago, in words: "à l'instant", "il y a 4 min", "il y a 1 h 05". */
function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  return `il y a ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

/** A round just started stays "En préparation" this long before the button offers to finish it. */
const PREP_LOCK = 60_000;

/**
 * Beside the wide ticket: every round the table sent to the kitchen, newest first.
 * One button per round moves it along: Commencer à préparer → (a minute) → Terminer.
 */
function NewRounds({ order, rounds, focus }: { order: Stored<Order>; rounds: Round[]; focus?: number }) {
  const waiting = rounds.filter((r) => r.status === "nouvelle").length;
  // When each round was started here, so its button waits a minute before offering « Terminer ».
  const [started, setStarted] = useState<Record<string, number>>({});
  const [, tick] = useState(0);
  const locked = (key: string) => started[key] !== undefined && Date.now() - started[key] < PREP_LOCK;
  useEffect(() => {
    const soon = Object.values(started).filter((t) => Date.now() - t < PREP_LOCK);
    if (!soon.length) return;
    const t = window.setTimeout(() => tick((n) => n + 1), Math.max(250, PREP_LOCK - (Date.now() - Math.max(...soon)) + 50));
    return () => window.clearTimeout(t);
  });

  return (
    <section aria-labelledby="new-rounds-title" className="mt-8 hidden lg:mt-0 lg:block">
      <h3 id="new-rounds-title" className="flex items-center gap-2 font-display text-xl font-bold">
        Commandes de la {order.mode === "surplace" ? `table ${order.table}` : "commande"}
        {waiting > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-paper">
            {waiting} nouvelle{waiting > 1 ? "s" : ""}
          </span>
        )}
      </h3>
      <p className="mt-1 text-sm text-ink/50">Chaque envoi en cuisine, le plus récent en haut.</p>
      <ol className="mt-4 flex flex-col gap-3">
        {[...rounds].reverse().map((r) => {
          const done = r.status === "terminee" || r.status === "prete";
          const count = r.lines.reduce((n, l) => n + l.qty, 0);
          return (
            <li
              key={r.key}
              className={`rounded-2xl bg-white p-5 transition-opacity ${r.n === focus ? "ring-2 ring-red-600" : "ring-1 ring-ink/5"} ${done && r.n !== focus ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {r.status === "nouvelle" && (
                    <span className="mb-1.5 inline-block rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-paper">Nouvelle</span>
                  )}
                  <p className="font-bold">{r.n === 0 ? "1re commande" : `Ajout n° ${r.n}`}</p>
                  <p className="mt-0.5 text-xs text-ink/45 tabular-nums">
                    {clock.format(new Date(r.at))} · {ago(r.at)} · {count} article{count > 1 ? "s" : ""}
                  </p>
                </div>
                {/* One button that moves the round along. */}
                {r.status === "nouvelle" ? (
                  <button
                    onClick={() => {
                      setStarted((m) => ({ ...m, [r.key]: Date.now() }));
                      updateRound(order, r.n, { status: "preparation" });
                    }}
                    className="shrink-0 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-paper shadow-md shadow-red-600/20 transition-colors hover:bg-red-700"
                  >
                    Commencer à préparer
                  </button>
                ) : r.status === "preparation" ? (
                  locked(r.key) ? (
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-orange/20 px-4 py-2.5 text-sm font-bold text-ink">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/25 border-t-ink" aria-hidden="true" />
                      En préparation
                    </span>
                  ) : (
                    <button
                      onClick={() => updateRound(order, r.n, { status: "terminee" })}
                      className="shrink-0 rounded-full bg-green-700 px-5 py-2.5 text-sm font-bold text-paper shadow-md shadow-green-700/20 transition-colors hover:bg-green-800"
                    >
                      Terminer
                    </button>
                  )
                ) : (
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-green-700/10 px-3 py-1.5 text-sm font-bold text-green-800">✓ Terminée</span>
                    <button onClick={() => updateRound(order, r.n, { status: "preparation" })} className="text-[11px] font-bold text-ink/40 hover:text-ink">
                      Rouvrir
                    </button>
                  </span>
                )}
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {r.lines.map((l, j) => (
                  <li key={j} className="flex items-baseline gap-3">
                    <span className="w-8 shrink-0 font-display text-lg font-bold tabular-nums text-red-600">{l.qty}×</span>
                    <span className="font-semibold leading-tight">
                      {l.name}
                      {l.size && <span className="ml-2 font-bold text-ink">{l.size}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The order as a ticket: the restaurant's logo, who it is for, a torn-off line, then the dishes. */
function Ticket({
  mode,
  table,
  name,
  server,
  onEditTable,
  onEditServer,
  children,
}: {
  mode: "surplace" | "emporter";
  table: string;
  name: string;
  server: string;
  onEditTable: () => void;
  onEditServer?: () => void;
  children: React.ReactNode;
}) {
  const pencil = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" strokeLinejoin="round" />
    </svg>
  );
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white">
      <div className="flex flex-col items-center px-6 pt-6 pb-5 text-center">
        <LogoMark className="h-8 text-red-600" />
        <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ink/40">{mode === "surplace" ? "Sur place" : "Pour emporter"}</p>
        <div className="flex items-center gap-2">
          <p className="font-display text-3xl font-extrabold leading-tight">{mode === "surplace" ? `Table ${table}` : name}</p>
          <button
            onClick={onEditTable}
            aria-label={mode === "surplace" ? "Changer le numéro de table" : "Modifier le client"}
            title="Modifier"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink/60 transition-colors hover:bg-ink hover:text-paper"
          >
            {pencil}
          </button>
        </div>
        {mode === "surplace" && (
          <button
            onClick={onEditServer}
            disabled={!onEditServer}
            aria-label={server ? `Servi par ${server}, changer` : "Choisir un serveur·euse"}
            className="group mt-2 inline-flex items-center gap-2 rounded-full bg-ink/[0.04] py-1 pl-1 pr-1 text-sm text-ink/65 transition-colors enabled:hover:bg-ink/[0.08]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-ink/70">{server ? server.charAt(0) : "?"}</span>
            {server ? `Servi par ${server}` : "Choisir un serveur·euse"}
            {onEditServer && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-ink/50 transition-colors group-hover:bg-ink group-hover:text-paper">{pencil}</span>
            )}
          </button>
        )}
      </div>
      {/* The torn-off line, with a notch on each side. */}
      <div className="relative h-5" aria-hidden="true">
        <span className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-[#f3f1ee]" />
        <span className="absolute -right-2.5 top-0 h-5 w-5 rounded-full bg-[#f3f1ee]" />
        <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-ink/10" />
      </div>
      <div className="px-6 pt-3 pb-6">{children}</div>
    </div>
  );
}

function SendBar({
  busy,
  error,
  onSend,
  editing,
  pending,
  expanded,
  onExpand,
}: {
  busy: boolean;
  error: string;
  onSend: () => void;
  /** An order already sent: it saves itself when the ticket closes, so no button. */
  editing: boolean;
  /** Something changed that will be saved on closing. */
  pending?: boolean;
  /** Computer only: the ticket takes the whole width (the menu hides) or goes back to half. */
  expanded?: boolean;
  onExpand?: () => void;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="mb-2 rounded-full bg-white px-3 py-1 text-center text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="pointer-events-auto flex items-center justify-center gap-2 self-center">
        {onExpand && (
          <button
            onClick={onExpand}
            aria-label={expanded ? "Réduire le ticket" : "Agrandir le ticket"}
            title={expanded ? "Réduire" : "Agrandir"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink/70 ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-paper"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5" aria-hidden="true">
              {expanded ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        )}
        {editing ? (
          pending && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-ink/65 ring-1 ring-ink/10">
              <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
              {busy ? "Envoi…" : "Envoyé en cuisine en fermant le ticket"}
            </span>
          )
        ) : (
          <button
            onClick={onSend}
            disabled={busy}
            className="rounded-full bg-red-600 px-10 py-3.5 text-sm font-bold text-paper shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {busy ? "Envoi…" : "Envoyer en cuisine"}
          </button>
        )}
      </div>
    </>
  );
}

/** Fades a horizontal scroller's edges: the right while more is hidden there, the left once scrolled. */
function useEdgeFade(ref: RefObject<HTMLDivElement | null>, active: boolean) {
  const [mask, setMask] = useState<string | undefined>();
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const update = () => {
      const left = el.scrollLeft > 4 ? 48 : 0;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4 ? 48 : 0;
      setMask(`linear-gradient(to right, transparent, #000 ${left}px, #000 calc(100% - ${right}px), transparent)`);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref, active]);
  return mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined;
}
