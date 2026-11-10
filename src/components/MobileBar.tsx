import type { ReactNode } from "react";
import { track } from "../lib/analytics";
import { useCart } from "../lib/cart";
import { useI18n } from "../lib/i18n";
import { navigate, useRoute, type Route } from "../lib/router";

/** Phones only: fixed bottom bar with a raised "Commander" button in the middle. */
export function MobileBar() {
  const { t } = useI18n();
  const route = useRoute();
  const cart = useCart();

  if (route === "/admin") return null;

  const tab = (to: Route, label: string, icon: ReactNode) => (
    <button
      onClick={() => navigate(to)}
      aria-current={route === to ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
        route === to ? "text-red-600" : "text-ink/60"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <nav
      aria-label="Navigation rapide"
      className="md:hidden fixed inset-x-0 bottom-0 z-[65] bg-paper/95 backdrop-blur-md border-t border-ink/10 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative flex h-16 items-stretch px-2">
        {tab("/", t("bar.home"), <HomeIcon />)}
        {tab("/menu", t("bar.menu"), <MenuIcon />)}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => {
              track("commander_click", { from: "mobile-bar" });
              navigate("/commander");
            }}
            className="-mt-6 flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-red-600 text-paper shadow-lg shadow-red-700/30 ring-4 ring-paper"
          >
            <BagIcon />
            <span className="text-[10px] font-bold uppercase tracking-wide mt-0.5">{t("nav.commander")}</span>
          </button>
        </div>
        <button
          onClick={() => cart.setOpen(true)}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink/60"
        >
          <span className="relative">
            <CartIcon />
            {cart.count > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-red-600 px-1 text-[10px] font-bold leading-[18px] text-paper text-center">
                {cart.count}
              </span>
            )}
          </span>
          {t("bar.cart")}
        </button>
        {tab("/nous-joindre", t("bar.contact"), <PinIcon />)}
      </div>
    </nav>
  );
}

const icon = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, className: "w-6 h-6", "aria-hidden": true } as const;

function HomeIcon() {
  return (
    <svg {...icon}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg {...icon}>
      <path d="M6 3h12v18H6z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg {...icon} className="w-6 h-6">
      <path d="M5 8h14l-1 12H6z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg {...icon}>
      <path d="M3 4h2l2.4 11h10.2L20 7H6.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg {...icon}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
