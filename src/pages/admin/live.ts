import { useEffect, useRef, useState } from "react";
import { live } from "../../lib/api";
import { list, onStoreChange, refresh, type Collection } from "../../lib/demoStore";
import { refreshBookings } from "../../lib/reservations";
import { getSettings } from "../../lib/settings";
import { playOrderSound } from "../../lib/sounds";
import { loadConfig, SAVE_ERROR } from "../../lib/store";
import { memberTabs, refreshTeam, type AdminTab, type Member } from "../../lib/team";

const READS: [Collection, AdminTab][] = [
  ["orders", "orders"],
  ["subscribers", "subscribers"],
  ["applications", "applications"],
  ["catering", "catering"],
];

/**
 * Real site: keeps the panel up to date while it is open. New orders and
 * bookings are checked every 8 seconds, everything else every minute. While
 * Commandes is open, the sound chosen in Paramètres plays when an order comes in.
 */
export function useLiveSync(user: Member, onOrders: boolean) {
  // Keyed on what the member may see, not the object, which is rebuilt on every team refresh.
  const access = memberTabs(user).join(",");
  useEffect(() => {
    if (!live) return;
    const tabs = access.split(",") as AdminTab[];
    const can = (tab: AdminTab) => tabs.includes(tab) || tabs.includes("dashboard");
    const fast = () => {
      if (can("orders")) refresh("orders").catch(() => {});
      if (tabs.includes("reservations")) refreshBookings().catch(() => {});
    };
    const slow = () => {
      // Signed-in staff also see draft job openings, which visitors don't get.
      loadConfig().catch(() => {});
      refreshTeam().catch(() => {});
      for (const [c, tab] of READS) if (c !== "orders" && can(tab)) refresh(c).catch(() => {});
    };
    fast();
    slow();
    const a = window.setInterval(fast, 8000);
    const b = window.setInterval(slow, 60000);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, [access]);

  useNewOrderChime(onOrders);
}

/** Orders taken on this device (Nouvelle commande): no sound for those. */
const takenHere = new Set<string>();
export function markOrderTakenHere(id: string) {
  takenHere.add(id);
}

function useNewOrderChime(onOrders: boolean) {
  const seen = useRef<Set<string> | null>(null);
  const active = useRef(onOrders);
  useEffect(() => {
    active.current = onOrders;
  }, [onOrders]);
  useEffect(() => {
    // Real site: the 8-second refresh brings new orders. Demo: an order placed on the
    // site in another tab of this browser arrives through the storage event.
    // Demo: the orders already in this browser are known from the start. Real site: the
    // list is empty until the first refresh, which then only records what is there.
    if (!live) seen.current = new Set(list("orders").filter((o) => o.status === "nouvelle").map((o) => o.id));
    // Checked a moment later, so an order just taken on this device is marked first.
    return onStoreChange(() => window.setTimeout(check, 0));
    function check() {
      const ids = list("orders")
        .filter((o) => o.status === "nouvelle")
        .map((o) => o.id);
      // The first load only records what is already there.
      const fresh = seen.current ? ids.filter((id) => !seen.current!.has(id) && !takenHere.has(id)) : [];
      if (fresh.length && active.current) playOrderSound(getSettings().orderSound);
      seen.current = new Set([...(seen.current ?? []), ...ids]);
    }
  }, []);
}

/** Last save error (shown as a banner), cleared after a few seconds. */
export function useSaveError() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer: number | undefined;
    const onError = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(""), 6000);
    };
    window.addEventListener(SAVE_ERROR, onError);
    return () => {
      window.removeEventListener(SAVE_ERROR, onError);
      window.clearTimeout(timer);
    };
  }, []);
  return message;
}
