import { useEffect, useRef, useState } from "react";
import { live } from "../../lib/api";
import { list, onStoreChange, refresh, type Collection } from "../../lib/demoStore";
import { refreshBookings } from "../../lib/reservations";
import { loadConfig, SAVE_ERROR } from "../../lib/store";
import { memberTabs, refreshTeam, type AdminTab, type Member } from "../../lib/team";

const READS: [Collection, AdminTab][] = [
  ["orders", "orders"],
  ["subscribers", "subscribers"],
  ["applications", "applications"],
  ["catering", "catering"],
  ["events", "dashboard"],
];

/**
 * Real site: keeps the panel up to date while it is open. New orders and
 * bookings are checked every 8 seconds, everything else every minute; a chime
 * plays when a new order comes in.
 */
export function useLiveSync(user: Member) {
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

  useNewOrderChime();
}

function useNewOrderChime() {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!live) return;
    return onStoreChange(() => {
      const ids = list("orders")
        .filter((o) => o.status === "nouvelle")
        .map((o) => o.id);
      // The first load only records what is already there.
      if (seen.current && ids.some((id) => !seen.current!.has(id))) chime();
      seen.current = new Set([...(seen.current ?? []), ...ids]);
    });
  }, []);
}

/** Two short tones; browsers allow it once the page has been clicked (signing in counts). */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    window.setTimeout(() => ctx.close(), 1500);
  } catch {
    // No audio available.
  }
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
