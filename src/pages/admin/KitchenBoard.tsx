import { useEffect, useRef, useState, type ReactNode } from "react";
import type { OrderStatus } from "../../lib/demoStore";

// Kitchen board: three columns, cards moved by dragging. Mouse drags start after
// a few pixels; on touch screens a short press picks the card up, so swiping still
// scrolls. A red line shows where the card will land, in its column or another.
// A card is one round of an order or a whole table, depending on the view.

/** Anything the board can place: its status picks the column, rank (or arrival) the order within it. */
export type BoardItem = { key: string; status: OrderStatus; rank?: number; at: string };

const COLUMNS: { status: OrderStatus; also?: OrderStatus[]; title: string }[] = [
  { status: "nouvelle", title: "Nouvelles" },
  { status: "preparation", title: "En préparation" },
  // Orders saved as "prête" before the kitchen had three steps count as done.
  { status: "terminee", also: ["prete"], title: "Terminées" },
];

/** Position in a column: set when a card is dropped, otherwise its arrival time (oldest on top). */
const rankOf = (o: BoardItem) => o.rank ?? Date.parse(o.at);

type Drag = { id: string; x: number; y: number; dx: number; dy: number; width: number; col: number | null; index: number };

export function KitchenBoard<T extends BoardItem>({
  items,
  renderCard,
  onOpen,
  onMove,
  onAdd,
}: {
  items: T[];
  renderCard: (o: T) => ReactNode;
  onOpen: (o: T) => void;
  /** Dropped somewhere: its new place, and its new status when it changed column. */
  onMove: (o: T, patch: { rank: number; status?: OrderStatus }) => void;
  onAdd: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const columns = COLUMNS.map((c) => ({
    ...c,
    rows: items.filter((o) => o.status === c.status || c.also?.includes(o.status)).sort((a, b) => rankOf(a) - rankOf(b)),
  }));

  // Where the pointer would drop the card: which column, and before which card.
  function target(x: number, y: number, id: string) {
    const colEl = document.elementsFromPoint(x, y).find((el) => (el as HTMLElement).dataset?.col !== undefined) as HTMLElement | undefined;
    if (!colEl) return { col: null, index: 0 };
    const cards = [...colEl.querySelectorAll<HTMLElement>("[data-card]")].filter((el) => el.dataset.card !== id);
    const index = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return { col: Number(colEl.dataset.col), index: index === -1 ? cards.length : index };
  }

  function drop(d: Drag) {
    if (d.col === null) return;
    const column = columns[d.col];
    const rest = column.rows.filter((o) => o.key !== d.id);
    const before = rest[d.index - 1];
    const after = rest[d.index];
    const rank =
      before && after ? (rankOf(before) + rankOf(after)) / 2 : before ? rankOf(before) + 60_000 : after ? rankOf(after) - 60_000 : Date.now();
    const moved = items.find((o) => o.key === d.id);
    if (!moved) return;
    onMove(moved, { rank, ...(column.status !== moved.status && !column.also?.includes(moved.status) ? { status: column.status } : {}) });
  }

  function onPointerDown(e: React.PointerEvent, o: T) {
    if (e.button !== 0 || (e.target as HTMLElement).closest("a,button[data-no-drag]")) return;
    const card = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    const touch = e.pointerType !== "mouse";
    let started = false;
    let timer: number | undefined;
    // Kept here as well as in state: a quick release must drop where the card is now.
    let current: Drag | null = null;
    const show = (d: Drag) => {
      current = d;
      setDrag(d);
    };

    const begin = (x: number, y: number) => {
      started = true;
      show({ id: o.key, x, y, dx: start.x - card.left, dy: start.y - card.top, width: card.width, ...target(x, y, o.key) });
      if (touch && navigator.vibrate) navigator.vibrate(15);
    };
    if (touch) timer = window.setTimeout(() => begin(start.x, start.y), 220);

    const move = (ev: PointerEvent) => {
      if (!started) {
        const far = Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6;
        if (touch && far) return cleanup(); // a swipe: let the page scroll
        if (!touch && far) begin(ev.clientX, ev.clientY);
        return;
      }
      ev.preventDefault();
      // Near the sides of a scrolling board (phones), keep it moving.
      const box = scroller.current?.getBoundingClientRect();
      if (box && scroller.current) {
        if (ev.clientX < box.left + 40) scroller.current.scrollLeft -= 12;
        else if (ev.clientX > box.right - 40) scroller.current.scrollLeft += 12;
      }
      if (current) show({ ...current, x: ev.clientX, y: ev.clientY, ...target(ev.clientX, ev.clientY, current.id) });
    };
    const up = () => {
      if (started && current) drop(current);
      // A tap or click that never became a drag opens the order.
      else if (!started) onOpen(o);
      cleanup();
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cleanup);
      setDrag(null);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cleanup);
  }

  // While dragging on touch, stop the page from scrolling under the finger.
  useEffect(() => {
    if (!drag) return;
    const stop = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", stop, { passive: false });
    return () => document.removeEventListener("touchmove", stop);
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragged = drag && items.find((o) => o.key === drag.id);
  const line = <div aria-hidden="true" className="h-1 rounded-full bg-red-600 shadow-[0_0_0_3px_rgb(220_38_38/0.15)]" />;

  return (
    <div ref={scroller} className="-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto pb-2">
      <div className={`grid grid-flow-col auto-cols-[minmax(270px,1fr)] lg:grid-flow-row lg:grid-cols-3 gap-4 ${drag ? "select-none" : ""}`}>
        {columns.map((c, ci) => {
          const visible = c.rows.filter((o) => o.key !== drag?.id);
          return (
            <section
              key={c.title}
              data-col={ci}
              className={`rounded-2xl p-3 flex flex-col gap-3 min-h-[240px] bg-linear-to-b to-white ${drag?.col === ci ? "from-red-600/10" : "from-ink/[0.07]"}`}
            >
              <h2 className="flex items-center justify-between px-1 text-sm font-bold">
                {c.title}
                <span className="rounded-full bg-white border border-ink/10 px-2 text-xs tabular-nums">{c.rows.length}</span>
              </h2>
              {ci === 0 && (
                <button
                  onClick={onAdd}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/15 py-4 text-sm font-bold text-ink/50 hover:border-red-600 hover:text-red-600 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-lg leading-none text-paper">+</span>
                  Nouvelle commande
                </button>
              )}
              {visible.map((o, i) => (
                <div key={o.key} className="flex flex-col gap-3">
                  {drag?.col === ci && drag.index === i && line}
                  <div data-card={o.key} onPointerDown={(e) => onPointerDown(e, o)} className="cursor-pointer active:cursor-grabbing touch-pan-y">
                    {renderCard(o)}
                  </div>
                </div>
              ))}
              {drag?.col === ci && drag.index >= visible.length && line}
              {!c.rows.length && drag?.col !== ci && <p className="px-1 py-6 text-center text-xs text-ink/40">Glissez une commande ici</p>}
            </section>
          );
        })}
      </div>

      {drag && dragged && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] rotate-2 opacity-95 shadow-2xl rounded-xl"
          style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.width }}
        >
          {renderCard(dragged)}
        </div>
      )}
    </div>
  );
}
