import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { track } from "./analytics";

export type CartLine = { key: string; name: string; size?: string; price: number; qty: number };
export type OrderMode = "emporter" | "livraison";

type Cart = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  mode: OrderMode;
  setMode: (m: OrderMode) => void;
  add: (item: { name: string; size?: string; price: number }) => void;
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

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const value = useMemo<Cart>(() => {
    const { lines, mode } = state;
    return {
      lines,
      mode,
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
  }, [state, open]);

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
