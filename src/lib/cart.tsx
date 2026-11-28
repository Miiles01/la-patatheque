import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { track } from "./analytics";
import { useSettings } from "./settings";
import { restaurant } from "../data/menu";

/**
 * TEMPORARY: while the site's own ordering is being set up, every « Commander » button
 * sends customers to the restaurant's RestoMenu page, which still takes their orders.
 * Set to null to switch back to ordering on this site (Paramètres → Commandes en ligne).
 */
export const ORDER_REDIRECT: string | null = restaurant.orderUrl;

/** The RestoMenu page in the visitor's language (the site's FR/EN switch). */
export function orderRedirectUrl(lang?: "fr" | "en"): string | null {
  if (!ORDER_REDIRECT) return null;
  const en = lang ? lang === "en" : typeof document !== "undefined" && document.documentElement.lang.startsWith("en");
  return en ? ORDER_REDIRECT.replace("/fr/", "/en/") : ORDER_REDIRECT;
}

export type CartLine = { key: string; name: string; size?: string; price: number; qty: number; category?: string };
export type OrderMode = "emporter" | "livraison";

type Cart = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Active mode; always one the restaurant currently offers. */
  mode: OrderMode;
  /** Modes switched on in the admin settings. */
  modes: OrderMode[];
  deliveryMinimum: number;
  setMode: (m: OrderMode) => void;
  add: (item: { name: string; size?: string; price: number; category?: string }) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CartContext = createContext<Cart | null>(null);
const STORAGE = "patatheque-cart";

function load(): { lines: CartLine[]; mode: OrderMode } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE) ?? "null");
    if (saved?.lines) return saved;
  } catch {
    // ignore
  }
  return { lines: [], mode: "emporter" };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load);
  const [open, setOpen] = useState(false);
  const settings = useSettings();

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const value = useMemo<Cart>(() => {
    const { lines } = state;
    // While orders go to RestoMenu, the site's own cart stays off.
    const modes: OrderMode[] = ORDER_REDIRECT ? [] : [...(settings.pickup ? ["emporter" as const] : []), ...(settings.delivery ? ["livraison" as const] : [])];
    const mode = modes.includes(state.mode) ? state.mode : modes[0];
    return {
      lines,
      mode,
      modes,
      deliveryMinimum: settings.deliveryMinimum,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
      setMode: (m) => setState((s) => ({ ...s, mode: m })),
      add: (item) => {
        const key = `${item.name}|${item.size ?? ""}`;
        track("add_to_cart", { item: item.name, size: item.size, price: item.price });
        setState((s) => {
          const found = s.lines.find((l) => l.key === key);
          return {
            ...s,
            lines: found
              ? s.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
              : [...s.lines, { ...item, key, qty: 1 }],
          };
        });
      },
      setQty: (key, qty) =>
        setState((s) => ({
          ...s,
          lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
        })),
      clear: () => setState((s) => ({ ...s, lines: [] })),
      open,
      setOpen,
    };
  }, [state, open, settings]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart outside CartProvider");
  return cart;
}

/** Code given by the 10 % welcome pop-up. */
export const PROMO_CODE = "BIENVENUE10";
export const PROMO_RATE = 0.1;

/** Whether customers can order on the site right now (Paramètres → Commandes en ligne). */
export function useOnlineOrdering() {
  return useCart().modes.length > 0;
}

/** Whether « Commander » buttons show: ordering here, or on RestoMenu for now. */
export function useCanOrder() {
  return useOnlineOrdering() || !!ORDER_REDIRECT;
}
