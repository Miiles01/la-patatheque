import { lazy, Suspense, useEffect } from "react";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Navigation } from "./components/Navigation";
import { PolicyModal } from "./components/PolicyModal";
import { PromoPopup } from "./components/PromoPopup";
import { ReservationModal } from "./components/ReservationModal";
import { CartProvider } from "./lib/cart";
import { I18nProvider, useI18n } from "./lib/i18n";
import { scrollToTop, useScrollEffects, useSmoothScroll } from "./lib/motion";
import { useRoute, type Route } from "./lib/router";
import { usePageMeta } from "./lib/seo";
import { Home } from "./pages/Home";
import { AboutPage, CareersPage, ContactPage } from "./pages/InfoPages";
import { CateringPage, MenuPage, OrderPage, SurPlacePage } from "./pages/MenuPages";

// The admin panel is only for staff: load its code on demand so visitors don't download it.
const AdminPage = lazy(() => import("./pages/Admin").then((m) => ({ default: m.AdminPage })));

function PageMeta({ route }: { route: Route }) {
  usePageMeta(route, useI18n().lang);
  return null;
}

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
      <PageMeta route={route} />
      <CartProvider>
        {route === "/admin" ? (
          <Suspense fallback={null}>
            <AdminPage />
          </Suspense>
        ) : (
          <Site route={route} />
        )}
      </CartProvider>
    </I18nProvider>
  );
}
