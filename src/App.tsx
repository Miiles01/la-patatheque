import { useEffect } from "react";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Navigation } from "./components/Navigation";
import { PolicyModal } from "./components/PolicyModal";
import { PromoPopup } from "./components/PromoPopup";
import { ReservationModal } from "./components/ReservationModal";
import { CartProvider } from "./lib/cart";
import { I18nProvider } from "./lib/i18n";
import { scrollToTop, useScrollEffects, useSmoothScroll } from "./lib/motion";
import { useRoute, type Route } from "./lib/router";
import { AdminPage } from "./pages/Admin";
import { Home } from "./pages/Home";
import { AboutPage, CareersPage, ContactPage } from "./pages/InfoPages";
import { CateringPage, MenuPage, OrderPage, SurPlacePage } from "./pages/MenuPages";

const PAGES: Record<Exclude<Route, "/admin">, () => React.JSX.Element> = {
  "/": Home,
  "/menu": MenuPage,
  "/commander": OrderPage,
  "/sur-place": SurPlacePage,
  "/traiteur": CateringPage,
  "/a-propos": AboutPage,
  "/carrieres": CareersPage,
  "/nous-joindre": ContactPage,
};

function Site({ route }: { route: Exclude<Route, "/admin"> }) {
  useScrollEffects(route);
  const Page = PAGES[route];

  return (
    <>
      <Navigation />
      <main key={route}>
        <Page />
      </main>
      <Footer />
      <CartDrawer />
      <PromoPopup />
      <ReservationModal />
      <PolicyModal />
    </>
  );
}

export default function App() {
  const route = useRoute();
  useSmoothScroll();

  useEffect(() => {
    scrollToTop();
  }, [route]);

  return (
    <I18nProvider>
      <CartProvider>{route === "/admin" ? <AdminPage /> : <Site route={route} />}</CartProvider>
    </I18nProvider>
  );
}
