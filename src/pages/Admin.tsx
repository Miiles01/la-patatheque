import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoMark } from "../components/LogoMark";
import { dishVisual, menuCategories, specials, testimonials } from "../data/menu";
import { asset } from "../lib/asset";
import { saveSettings, useSettings } from "../lib/settings";
import { FIELD_TYPES, resetCareersFields, saveCareersFields, useCareersFields, type CareersField, type FieldType } from "../lib/careersForm";
import { PROMO_CODE } from "../lib/cart";
import {
  clear,
  downloadCsv,
  list,
  onStoreChange,
  record,
  update,
  type Collection,
  type Order,
  type OrderStatus,
  type Stored,
} from "../lib/demoStore";
import { Link } from "../lib/router";
import {
  addMember,
  authenticate,
  ensureOwner,
  generatePassword,
  listTeam,
  onTeamChange,
  OWNER_DEMO_PASSWORD,
  OWNER_EMAIL,
  removeMember,
  ROLES,
  setPassword,
  updateMember,
  type AdminTab,
  type Member,
  type Role,
} from "../lib/team";

// The dashboard is French only: it's for the restaurant staff.
const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
const dateTime = new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" });
const dayLabel = new Intl.DateTimeFormat("fr-CA", { weekday: "short", day: "numeric" });

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  nouvelle: { label: "Nouvelle", cls: "bg-red-600 text-paper" },
  preparation: { label: "En préparation", cls: "bg-orange text-ink" },
  prete: { label: "Prête", cls: "bg-green-700 text-paper" },
  terminee: { label: "Terminée", cls: "bg-ink/10 text-ink/70" },
};

type Tab = AdminTab;

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "orders", label: "Commandes" },
  { id: "subscribers", label: "Courriels 10 %" },
  { id: "applications", label: "Candidatures" },
  { id: "catering", label: "Traiteur" },
  // "Contenu du site" (content) is hidden for now; its view stays below for later.
  { id: "settings", label: "Paramètres" },
  { id: "team", label: "Équipe" },
];

function useStore() {
  const newest = <T extends { createdAt: string }>(rows: T[]) => [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const read = () => ({
    orders: newest(list("orders")),
    subscribers: newest(list("subscribers")),
    applications: newest(list("applications")),
    catering: newest(list("catering")),
    events: list("events"),
  });
  const [data, setData] = useState(read);
  useEffect(() => onStoreChange(() => setData(read())), []);
  return data;
}

const SESSION = "patatheque-admin-session"; // sessionStorage: id of the signed-in member

function sessionMember(): Member | null {
  try {
    const id = sessionStorage.getItem(SESSION);
    const member = listTeam().find((m) => m.id === id);
    return member?.active ? member : null;
  } catch {
    return null;
  }
}

function useTeam() {
  const [team, setTeam] = useState(listTeam);
  useEffect(() => onTeamChange(() => setTeam(listTeam())), []);
  return team;
}

export function AdminPage() {
  const team = useTeam();
  const [userId, setUserId] = useState(() => sessionMember()?.id ?? null);
  // A member who is removed or deactivated is signed out on their next render.
  const user = team.find((m) => m.id === userId && m.active) ?? null;

  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION);
    } catch {
      // ignore
    }
    setUserId(null);
  };

  if (!user) {
    return (
      <Login
        onSuccess={(m) => {
          try {
            sessionStorage.setItem(SESSION, m.id);
          } catch {
            // ignore
          }
          setUserId(m.id);
        }}
      />
    );
  }
  return <Panel user={user} onLogout={logout} />;
}

const inputCls =
  "w-full rounded-xl border-2 border-ink/15 bg-white px-4 py-3 text-ink focus:border-red-600 focus:outline-none transition-colors";

function Login({ onSuccess }: { onSuccess: (m: Member) => void }) {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureOwner();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const member = await authenticate(String(f.get("user")), String(f.get("password")));
    setBusy(false);
    if (member) onSuccess(member);
    else setError(true);
  }

  return (
    <div className="min-h-svh bg-white text-ink flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" aria-label="Retour au site" className="text-red-600">
            <LogoMark className="h-10" />
          </Link>
          <span className="mt-4 rounded-full bg-ink/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink/60">
            Espace admin
          </span>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-white border border-ink/10 p-7 flex flex-col gap-4">
          <h1 className="font-display font-extrabold text-2xl">Connexion</h1>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Courriel
            <input name="user" type="email" defaultValue={OWNER_EMAIL} autoComplete="username" required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Mot de passe
            <input
              name="password"
              type="password"
              defaultValue={OWNER_DEMO_PASSWORD}
              autoComplete="current-password"
              required
              className={inputCls}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              Courriel ou mot de passe incorrect, ou accès désactivé.
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-full bg-red-600 px-8 py-4 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {busy ? "Connexion…" : "Se connecter"}
          </button>
          <p className="text-xs text-ink/50 text-center">
            Démo : les identifiants du propriétaire sont déjà remplis. Les membres de l'équipe entrent avec ceux que le
            propriétaire leur a créés.
          </p>
        </form>
      </div>
    </div>
  );
}

const TAB_ICONS: Record<Tab, ReactNode> = {
  dashboard: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z" strokeLinejoin="round" />,
  orders: (
    <>
      <path d="M5 8h14l-1 12H6z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  subscribers: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" strokeLinejoin="round" />
    </>
  ),
  applications: (
    <>
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <path d="M9 12h7M9 16h5" strokeLinecap="round" />
    </>
  ),
  catering: <path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 8V6M10 6h4M3 20h18" strokeLinecap="round" />,
  content: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" strokeLinejoin="round" />
      <path d="m13 7 4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" strokeLinecap="round" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 14.2c2.3.2 4 1.8 4.5 4.3" strokeLinecap="round" />
    </>
  ),
};

function TabIcon({ tab }: { tab: Tab }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 shrink-0" aria-hidden="true">
      {TAB_ICONS[tab]}
    </svg>
  );
}

function Panel({ user, onLogout }: { user: Member; onLogout: () => void }) {
  const data = useStore();
  const allowed = TABS.filter((t) => ROLES[user.role].tabs.includes(t.id));
  const [tab, setTab] = useState<Tab>(allowed[0].id);
  // Open by default on desktop, closed on phones where it slides over the content.
  const [sidebar, setSidebar] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const counts: Partial<Record<Tab, number>> = {
    orders: data.orders.filter((o) => o.status === "nouvelle").length,
    subscribers: data.subscribers.length,
    applications: data.applications.length,
    catering: data.catering.length,
  };
  const current = allowed.find((t) => t.id === tab) ?? allowed[0];

  const open = (t: Tab) => {
    if (!allowed.some((a) => a.id === t)) return;
    setTab(t);
    if (!window.matchMedia("(min-width: 1024px)").matches) setSidebar(false);
  };

  return (
    <div className="min-h-svh bg-white text-ink">
      {/* Phones: the sidebar slides over a dimmed page. */}
      {sidebar && <div className="lg:hidden fixed inset-0 z-30 bg-ink/30" onClick={() => setSidebar(false)} />}

      {/* Desktop: hiding the sidebar shrinks it to an icon rail. Phones: it slides away entirely. */}
      <aside
        aria-label="Sections de l'admin"
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-ink/10 flex flex-col transition-[width,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${
          sidebar ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-[72px] lg:translate-x-0"
        }`}
      >
        <div className={`h-16 flex items-center border-b border-ink/10 ${sidebar ? "justify-between px-5" : "justify-center px-0"}`}>
          {sidebar ? (
            <>
              <Link to="/" aria-label="Retour au site" className="text-red-600">
                <LogoMark className="h-7" />
              </Link>
              <button
                onClick={() => setSidebar(false)}
                aria-label="Masquer le menu"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-ink/50 hover:bg-ink/5 hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M9 4v16M15 10l-2 2 2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : (
            <Link to="/" aria-label="Retour au site" title="La Patathèque">
              <img src={asset("/favicon.svg")} alt="" className="h-9 w-9" />
            </Link>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto flex flex-col gap-1 ${sidebar ? "p-3" : "p-3 items-center"}`}>
          {allowed.map((t) => (
            <button
              key={t.id}
              onClick={() => open(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              aria-label={sidebar ? undefined : t.label}
              title={sidebar ? undefined : t.label}
              className={`relative flex items-center rounded-xl text-sm font-semibold transition-colors ${
                sidebar ? "gap-3 px-3 py-2.5" : "w-11 h-11 justify-center"
              } ${tab === t.id ? "bg-red-600/8 text-red-600" : "text-ink/65 hover:bg-ink/5 hover:text-ink"}`}
            >
              <TabIcon tab={t.id} />
              {sidebar && <span className="flex-1 text-left">{t.label}</span>}
              {!!counts[t.id] &&
                (sidebar ? (
                  <span className="rounded-full bg-red-600 px-1.5 min-w-5 text-[11px] leading-5 text-paper text-center">{counts[t.id]}</span>
                ) : (
                  <span className="absolute top-1 right-1 min-w-4 h-4 rounded-full bg-red-600 px-1 text-[9px] font-bold leading-4 text-paper text-center">
                    {counts[t.id]}
                  </span>
                ))}
            </button>
          ))}
        </nav>

        <div className={`border-t border-ink/10 ${sidebar ? "p-4" : "py-4 flex flex-col items-center gap-2"}`}>
          {sidebar ? (
            <>
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-full bg-red-600 text-paper flex items-center justify-center font-display font-bold text-sm">
                  {user.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 text-xs leading-tight">
                  <span className="block truncate font-semibold text-sm text-ink">{user.name}</span>
                  <span className="block text-ink/50">{ROLES[user.role].label}</span>
                </span>
              </div>
              <button
                onClick={onLogout}
                className="mt-3 w-full rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5 hover:text-ink"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <span
                title={`${user.name} · ${ROLES[user.role].label}`}
                className="w-9 h-9 rounded-full bg-red-600 text-paper flex items-center justify-center font-display font-bold text-sm"
              >
                {user.name.charAt(0)}
              </span>
              <button
                onClick={onLogout}
                aria-label="Déconnexion"
                title="Déconnexion"
                className="w-11 h-11 flex items-center justify-center rounded-xl text-ink/55 hover:bg-ink/5 hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
                  <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" strokeLinecap="round" />
                  <path d="M10 8l-4 4 4 4M6 12h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      </aside>

      <div className={`transition-[padding] duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${sidebar ? "lg:pl-64" : "lg:pl-[72px]"}`}>
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-ink/10">
          <div className="h-full px-5 md:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Only shown while the sidebar is hidden; the sidebar has its own hide button. */}
              {!sidebar && (
                <button
                  onClick={() => setSidebar(true)}
                  aria-label="Afficher le menu"
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M9 4v16M13 10l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <span className="font-display font-bold text-lg truncate">{current.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                title="Démo : les données sont enregistrées dans ce navigateur. En production, elles iront dans la base de données et par courriel au restaurant."
                className="rounded-full bg-orange/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink/70"
              >
                Démo
              </span>
            {user.owner && (
              <>
                <button onClick={loadSamples} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold hover:border-ink/40">
                  Charger des exemples
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Effacer toutes les données de démonstration de ce navigateur ?")) {
                      (["orders", "subscribers", "applications", "catering", "events"] as Collection[]).forEach(clear);
                    }
                  }}
                  className="hidden sm:block rounded-full px-4 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5"
                >
                  Vider
                </button>
              </>
            )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 md:px-8 py-8 md:py-10">
          {tab === "dashboard" && <Dashboard data={data} onOpen={open} />}
          {tab === "orders" && <Orders orders={data.orders} />}
          {tab === "subscribers" && <Subscribers rows={data.subscribers} />}
          {tab === "applications" && <Applications rows={data.applications} />}
          {tab === "catering" && <Catering rows={data.catering} />}
          {tab === "content" && <Content />}
          {tab === "settings" && <SettingsView />}
          {tab === "team" && <Team currentUser={user} />}
        </main>
      </div>
    </div>
  );
}

type Data = ReturnType<typeof useStore>;

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white border border-ink/10 p-5 md:p-6 ${className}`}>{children}</section>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-2 font-display font-black text-3xl md:text-4xl tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink/50">{sub}</p>}
    </Card>
  );
}

function Dashboard({ data, onOpen }: { data: Data; onOpen: (t: Tab) => void }) {
  const { orders, subscribers, applications, catering, events } = data;
  const revenue = orders.reduce((n, o) => n + o.total, 0);
  const clicks = events.filter((e) => e.event === "commander_click").length;
  const delivery = orders.filter((o) => o.mode === "livraison").length;
  const conversion = clicks ? Math.round((orders.length / clicks) * 100) : 0;

  const days = useMemo(() => {
    const out: { date: Date; count: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const inDay = orders.filter((o) => {
        const at = new Date(o.createdAt);
        return at >= d && at < next;
      });
      out.push({ date: d, count: inDay.length, total: inDay.reduce((n, o) => n + o.total, 0) });
    }
    return out;
  }, [orders]);

  const topItems = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => o.lines.forEach((l) => counts.set(l.name, (counts.get(l.name) ?? 0) + l.qty)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <Stat label="Commandes" value={String(orders.length)} sub={`${orders.filter((o) => o.status === "nouvelle").length} à traiter`} />
        <Stat label="Ventes (avant taxes)" value={money.format(revenue)} sub={orders.length ? `Panier moyen ${money.format(revenue / orders.length)}` : "—"} />
        <Stat label="Courriels 10 %" value={String(subscribers.length)} sub={`${subscribers.filter((s) => s.consent).length} avec consentement`} />
        <Stat label="Clics « Commander »" value={String(clicks)} sub={clicks ? `${conversion} % deviennent une commande` : "Mesuré sur tout le site"} />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 md:gap-5">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-6">
            <h2 className="font-display font-bold text-lg">Commandes, 7 derniers jours</h2>
            <span className="text-xs text-ink/50">{orders.length ? `${delivery} livraisons · ${orders.length - delivery} pour emporter` : ""}</span>
          </div>
          <OrdersAreaChart days={days} />
        </Card>

        <Card>
          <h2 className="font-display font-bold text-lg mb-4">Les plus commandés</h2>
          {topItems.length ? (
            <ol className="flex flex-col gap-3">
              {topItems.map(([name, qty], i) => (
                <li key={name} className="flex items-center gap-3 text-sm">
                  <span className="w-5 font-display font-black text-red-600">{i + 1}</span>
                  <span className="flex-1 truncate">{name}</span>
                  <span className="font-semibold tabular-nums">×{qty}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink/50">Aucune commande pour l'instant.</p>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 md:gap-5">
        <Shortcut title="Dernières commandes" count={orders.length} onOpen={() => onOpen("orders")}>
          {orders.slice(0, 3).map((o) => (
            <li key={o.id} className="flex justify-between gap-3">
              <span className="truncate">
                {o.name} · {o.mode === "livraison" ? "Livraison" : "Emporter"}
              </span>
              <span className="tabular-nums font-semibold">{money.format(o.total)}</span>
            </li>
          ))}
        </Shortcut>
        <Shortcut title="Candidatures" count={applications.length} onOpen={() => onOpen("applications")}>
          {applications.slice(0, 3).map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span className="truncate">{a.name}</span>
              <span className="text-ink/50">{a.cv ? "CV joint" : "Sans CV"}</span>
            </li>
          ))}
        </Shortcut>
        <Shortcut title="Demandes traiteur" count={catering.length} onOpen={() => onOpen("catering")}>
          {catering.slice(0, 3).map((c) => (
            <li key={c.id} className="flex justify-between gap-3">
              <span className="truncate">{c.name}</span>
              <span className="text-ink/50 truncate">{c.eventType}</span>
            </li>
          ))}
        </Shortcut>
      </div>
    </div>
  );
}

type Day = { date: Date; count: number; total: number };

/** Smooth path through evenly spaced points that never overshoots the data (monotone cubic). */
function monotonePath(p: { x: number; y: number }[]) {
  const n = p.length;
  if (n < 2) return "";
  const dx = p[1].x - p[0].x;
  const slope = p.slice(0, -1).map((pt, i) => (p[i + 1].y - pt.y) / dx);
  const m = p.map((_, i) =>
    i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2,
  );
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    d += ` C ${p[i].x + dx / 3} ${p[i].y + (m[i] * dx) / 3} ${p[i + 1].x - dx / 3} ${p[i + 1].y - (m[i + 1] * dx) / 3} ${p[i + 1].x} ${p[i + 1].y}`;
  }
  return d;
}

/** Single-series area chart: soft gradient fill, 2px line, crosshair and tooltip on hover. */
function OrdersAreaChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 200;
  const TOP = 14;
  const max = Math.max(1, ...days.map((d) => d.count));
  const pts = days.map((d, i) => ({ x: (i / (days.length - 1)) * W, y: TOP + (1 - d.count / max) * (H - TOP) }));
  const line = monotonePath(pts);
  const active = hover === null ? null : days[hover];
  const pct = (i: number) => (i / (days.length - 1)) * 100;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(rel * (days.length - 1)));
  }

  return (
    <div>
      <div className="relative h-48 touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible text-red-600" aria-hidden="true">
          <defs>
            <linearGradient id="orders-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={TOP + (1 - f) * (H - TOP)}
              y2={TOP + (1 - f) * (H - TOP)}
              stroke="#2b1c14"
              strokeOpacity="0.07"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line x1="0" x2={W} y1={H} y2={H} stroke="#2b1c14" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />
          <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill="url(#orders-area)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {active && hover !== null && (
          <>
            <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-ink/20" style={{ left: `${pct(hover)}%` }} />
            <span
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 ring-[3px] ring-white shadow"
              style={{ left: `${pct(hover)}%`, top: `${(pts[hover].y / H) * 100}%` }}
            />
            <span
              className={`pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-paper shadow-lg ${
                hover > days.length / 2 ? "-translate-x-[calc(100%+10px)]" : "translate-x-[10px]"
              }`}
              style={{ left: `${pct(hover)}%` }}
            >
              <span className="block capitalize text-paper/60">{dayLabel.format(active.date)}</span>
              <span className="block font-semibold">
                {active.count} commande{active.count > 1 ? "s" : ""} · {money.format(active.total)}
              </span>
            </span>
          </>
        )}
      </div>

      <div className="relative mt-2 h-4">
        {days.map((d, i) => (
          <span
            key={d.date.toISOString()}
            className={`absolute whitespace-nowrap text-[11px] capitalize ${hover === i ? "text-ink font-semibold" : "text-ink/45"} ${
              i === 0 ? "" : i === days.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{ left: `${pct(i)}%` }}
          >
            {dayLabel.format(d.date)}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Commandes par jour</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date.toISOString()}>
              <th>{dayLabel.format(d.date)}</th>
              <td>{d.count} commandes</td>
              <td>{money.format(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shortcut({ title, count, onOpen, children }: { title: string; count: number; onOpen: () => void; children: ReactNode }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display font-bold">{title}</h2>
        <span className="text-sm text-ink/50 tabular-nums">{count}</span>
      </div>
      <ul className="flex flex-col gap-2 text-sm flex-1">{count ? children : <li className="text-ink/50">Rien pour l'instant.</li>}</ul>
      <button onClick={onOpen} className="mt-5 self-start text-sm font-bold text-red-600 hover:underline underline-offset-4">
        Tout voir →
      </button>
    </Card>
  );
}

function SectionHead({ title, desc, onExport }: { title: string; desc?: string; onExport?: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display font-extrabold text-3xl">{title}</h1>
        {desc && <p className="text-sm text-ink/55 mt-1 max-w-xl">{desc}</p>}
      </div>
      {onExport && (
        <button onClick={onExport} className="self-start sm:self-auto rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper hover:bg-ink/85">
          Exporter en CSV
        </button>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="text-center text-ink/50 py-14">{text}</Card>;
}

function SampleTag({ show }: { show?: boolean }) {
  return show ? <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink/45">Exemple</span> : null;
}

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "nouvelle", title: "Nouvelles" },
  { status: "preparation", title: "En préparation" },
  { status: "prete", title: "Prêtes / En livraison" },
  { status: "terminee", title: "Terminées" },
];

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  nouvelle: "preparation",
  preparation: "prete",
  prete: "terminee",
  terminee: null,
};

/** Label of the button that moves an order to its next step, worded for pickup or delivery. */
function nextLabel(o: Order) {
  const pickup = o.mode === "emporter";
  switch (o.status) {
    case "nouvelle":
      return "Commencer la préparation";
    case "preparation":
      return pickup ? "Prête à récupérer" : "Partie en livraison";
    case "prete":
      return pickup ? "Récupérée par le client" : "Livrée";
    default:
      return null;
  }
}

function DishThumb({ category, size = "h-11 w-11" }: { category?: string; size?: string }) {
  const visual = dishVisual(category);
  return visual.image ? (
    <img src={asset(visual.image)} alt="" className={`${size} shrink-0 rounded-lg bg-red-700 object-contain p-0.5`} />
  ) : (
    <span className={`${size} shrink-0 rounded-lg bg-red-700 text-paper flex items-center justify-center script text-[11px] leading-none text-center px-0.5`}>
      {visual.word}
    </span>
  );
}

const timeOnly = new Intl.DateTimeFormat("fr-CA", { hour: "2-digit", minute: "2-digit" });

function OrderCard({ o }: { o: Stored<Order> }) {
  const [details, setDetails] = useState(false);
  const pickup = o.mode === "emporter";
  const next = NEXT[o.status];
  const label = nextLabel(o);
  const items = o.lines.reduce((n, l) => n + l.qty, 0);

  return (
    <article className="rounded-xl bg-white border border-ink/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-ink/80">
          #{o.id}
          <SampleTag show={o.sample} />
        </span>
        <span className="text-ink/45 tabular-nums">{timeOnly.format(new Date(o.createdAt))}</span>
      </div>

      <div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            pickup ? "bg-ink/5 text-ink/70" : "bg-orange/15 text-ink"
          }`}
        >
          {pickup ? "Cueillette" : "Livraison"}
        </span>
        <p className="mt-2 font-semibold leading-tight">{o.name}</p>
        <a href={`tel:${o.phone}`} className="text-sm text-red-600 font-semibold">
          {o.phone}
        </a>
        {o.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`}
            target="_blank"
            rel="noreferrer"
            className="block text-sm text-ink/65 underline decoration-ink/20 underline-offset-2 mt-0.5"
          >
            {o.address}
          </a>
        )}
        <p className="text-xs text-ink/45 mt-1">{o.when}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {o.lines.slice(0, 4).map((l, i) => (
          <DishThumb key={i} category={l.category} />
        ))}
        {o.lines.length > 4 && <span className="text-xs font-bold text-ink/50 pl-1">+{o.lines.length - 4}</span>}
      </div>

      <button onClick={() => setDetails((v) => !v)} aria-expanded={details} className="text-left text-sm text-ink/70">
        {details ? (
          <ul className="flex flex-col gap-2">
            {o.lines.map((l, i) => (
              <li key={i} className="flex items-center gap-2">
                <DishThumb category={l.category} size="h-8 w-8" />
                <span className="flex-1 leading-tight">
                  {l.qty}× {l.name}
                  {l.size && <span className="block text-xs text-ink/45">{l.size}</span>}
                </span>
                <span className="tabular-nums text-xs">{money.format(l.price * l.qty)}</span>
              </li>
            ))}
            {o.notes && <li className="rounded-lg bg-orange/10 px-2.5 py-2 text-xs">Note : {o.notes}</li>}
          </ul>
        ) : (
          <span>
            {items} article{items > 1 ? "s" : ""} · <span className="underline underline-offset-2 decoration-ink/20">voir le détail</span>
          </span>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-3">
        <span className="font-display font-bold tabular-nums">{money.format(o.total)}</span>
        <button
          onClick={() => update("orders", o.id, { paid: !o.paid })}
          aria-pressed={!!o.paid}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            o.paid ? "bg-green-700/10 text-green-800" : "bg-orange/15 text-ink hover:bg-orange/25"
          }`}
        >
          {o.paid ? "Payé ✓" : pickup ? "À payer au comptoir" : "À payer au livreur"}
        </button>
      </div>

      {next && label && (
        <button
          onClick={() => update("orders", o.id, { status: next, ...(next === "terminee" && !o.paid ? { paid: true } : {}) })}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-paper hover:bg-ink/85 transition-colors"
        >
          {label} →
        </button>
      )}
    </article>
  );
}

function Orders({ orders }: { orders: Stored<Order>[] }) {
  const [mode, setMode] = useState<"all" | Order["mode"]>("all");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const shown = orders.filter((o) => (mode === "all" || o.mode === mode) && (!unpaidOnly || !o.paid));

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-xs font-bold transition-colors ${active ? "bg-ink text-paper" : "bg-ink/5 text-ink/65 hover:bg-ink/10"}`;

  return (
    <>
      <SectionHead
        title="Commandes"
        desc="Cueillette et livraison. Aucun paiement en ligne : le client paie au comptoir ou au livreur. Avancez chaque commande d'une colonne à l'autre."
        onExport={
          orders.length
            ? () =>
                downloadCsv("commandes.csv", [
                  ["No", (o: Stored<Order>) => o.id],
                  ["Date", (o: Stored<Order>) => dateTime.format(new Date(o.createdAt))],
                  ["Mode", (o: Stored<Order>) => (o.mode === "emporter" ? "Cueillette" : "Livraison")],
                  ["Client", (o: Stored<Order>) => o.name],
                  ["Téléphone", (o: Stored<Order>) => o.phone],
                  ["Adresse", (o: Stored<Order>) => o.address],
                  ["Articles", (o: Stored<Order>) => o.lines.map((l) => `${l.qty}× ${l.name}${l.size ? ` ${l.size}` : ""}`).join(" | ")],
                  ["Code promo", (o: Stored<Order>) => o.promoCode],
                  ["Total", (o: Stored<Order>) => o.total.toFixed(2)],
                  ["Payé", (o: Stored<Order>) => (o.paid ? "oui" : "non")],
                  ["Statut", (o: Stored<Order>) => STATUS[o.status].label],
                ] as never, orders)
            : undefined
        }
      />

      {!orders.length ? (
        <Empty text="Aucune commande. Passez une commande sur le site (bouton Commander) pour la voir apparaître ici." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button onClick={() => setMode("all")} className={chip(mode === "all")}>
              Toutes
            </button>
            <button onClick={() => setMode("emporter")} className={chip(mode === "emporter")}>
              Cueillette
            </button>
            <button onClick={() => setMode("livraison")} className={chip(mode === "livraison")}>
              Livraison
            </button>
            <span className="mx-1 h-5 w-px bg-ink/10" />
            <button onClick={() => setUnpaidOnly((v) => !v)} aria-pressed={unpaidOnly} className={chip(unpaidOnly)}>
              Non payées
            </button>
          </div>

          <div className="-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto pb-2">
            <div className="grid grid-flow-col auto-cols-[minmax(270px,1fr)] xl:grid-flow-row xl:grid-cols-4 gap-4">
              {COLUMNS.map((c) => {
                const rows = shown.filter((o) => o.status === c.status);
                return (
                  <section key={c.status} className="rounded-2xl bg-ink/[0.03] p-3 flex flex-col gap-3 min-h-[200px]">
                    <h2 className="flex items-center justify-between px-1 text-sm font-bold">
                      {c.title}
                      <span className="rounded-full bg-white border border-ink/10 px-2 text-xs tabular-nums">{rows.length}</span>
                    </h2>
                    {rows.map((o) => (
                      <OrderCard key={o.id} o={o} />
                    ))}
                    {!rows.length && <p className="px-1 py-6 text-center text-xs text-ink/40">Aucune commande</p>}
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white border border-ink/10">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-wider text-ink/45 border-b border-ink/10">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 md:px-5 py-3 font-bold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ink/5 last:border-0 align-top">
              {r.map((c, j) => (
                <td key={j} className="px-4 md:px-5 py-3.5">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Subscribers({ rows }: { rows: Data["subscribers"] }) {
  return (
    <>
      <SectionHead
        title="Courriels 10 %"
        desc={`Inscriptions au pop-up de bienvenue (code ${PROMO_CODE}). Exportez la liste vers votre outil d'infolettre ; seuls les contacts avec consentement peuvent recevoir des offres.`}
        onExport={
          rows.length
            ? () =>
                downloadCsv("courriels-10.csv", [
                  ["Courriel", (r: Data["subscribers"][number]) => r.email],
                  ["Consentement", (r: Data["subscribers"][number]) => (r.consent ? "oui" : "non")],
                  ["Langue", (r: Data["subscribers"][number]) => r.lang],
                  ["Date", (r: Data["subscribers"][number]) => dateTime.format(new Date(r.createdAt))],
                ] as never, rows)
            : undefined
        }
      />
      {!rows.length ? (
        <Empty text="Aucune inscription. Le pop-up apparaît après quelques secondes sur le site, une fois par visite." />
      ) : (
        <Table
          head={["Courriel", "Consentement", "Langue", "Date"]}
          rows={rows.map((r) => [
            <>
              {r.email}
              <SampleTag show={r.sample} />
            </>,
            r.consent ? "✓ Oui" : "Non",
            r.lang.toUpperCase(),
            dateTime.format(new Date(r.createdAt)),
          ])}
        />
      )}
    </>
  );
}

type Cv = NonNullable<Data["applications"][number]["cv"]>;

/** In-panel CV viewer: PDFs open inline; Word files can only be downloaded. */
function CvViewer({ cv, name, onClose }: { cv: Cv; name: string; onClose: () => void }) {
  const src = cv.url ? asset(cv.url) : cv.dataUrl;
  const isPdf = cv.type === "application/pdf" || cv.name.toLowerCase().endsWith(".pdf");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Browsers block data: URLs in frames, so stored PDFs are shown through a blob URL.
  useEffect(() => {
    if (!cv.dataUrl || !isPdf) return;
    let url: string | null = null;
    fetch(cv.dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [cv.dataUrl, isPdf]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const frameSrc = cv.url ? asset(cv.url) : blobUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3 md:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`CV de ${name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">CV · {name}</p>
            <p className="text-xs text-ink/50 truncate">
              {cv.name} · {Math.round(cv.size / 1024)} Ko
            </p>
          </div>
          <div className="flex items-center gap-2">
            {src && (
              <a href={src} download={cv.name} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold hover:border-ink/40">
                Télécharger
              </a>
            )}
            <button onClick={onClose} aria-label="Fermer" className="relative h-9 w-9 rounded-full text-ink/60 hover:bg-ink/5">
              <span className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
              <span className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
            </button>
          </div>
        </div>
        {isPdf && frameSrc ? (
          <iframe title={`CV de ${name}`} src={frameSrc} className="flex-1 w-full bg-ink/5" />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-ink/60">
            <p>{isPdf ? "Chargement…" : "Aperçu non disponible pour les fichiers Word."}</p>
            {!isPdf && src && (
              <a href={src} download={cv.name} className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper">
                Télécharger le CV
              </a>
            )}
            {!src && <p className="text-sm">Fichier trop lourd pour la démo : en production il est conservé sur le serveur.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Applications({ rows }: { rows: Data["applications"] }) {
  const [view, setView] = useState<"list" | "form">("list");
  const [viewing, setViewing] = useState<Data["applications"][number] | null>(null);

  const tabCls = (active: boolean) =>
    `rounded-full px-4 py-2 text-xs font-bold transition-colors ${active ? "bg-ink text-paper" : "bg-ink/5 text-ink/65 hover:bg-ink/10"}`;

  return (
    <>
      <SectionHead
        title="Candidatures"
        desc="Reçues depuis la page Carrières. En production, chaque candidature est aussi envoyée par courriel au restaurant et le CV est stocké de façon privée."
        onExport={
          view === "list" && rows.length
            ? () =>
                downloadCsv("candidatures.csv", [
                  ["Nom", (r: Data["applications"][number]) => r.name],
                  ["Courriel", (r: Data["applications"][number]) => r.email],
                  ["Téléphone", (r: Data["applications"][number]) => r.phone],
                  ["Réponses", (r: Data["applications"][number]) => (r.answers ?? []).map((a) => `${a.label} : ${a.value}`).join(" | ")],
                  ["Message", (r: Data["applications"][number]) => r.message],
                  ["CV", (r: Data["applications"][number]) => r.cv?.name],
                  ["Date", (r: Data["applications"][number]) => dateTime.format(new Date(r.createdAt))],
                ] as never, rows)
            : undefined
        }
      />

      <div className="flex gap-2 mb-5">
        <button onClick={() => setView("list")} className={tabCls(view === "list")}>
          Candidatures ({rows.length})
        </button>
        <button onClick={() => setView("form")} className={tabCls(view === "form")}>
          Formulaire
        </button>
      </div>

      {view === "form" ? (
        <CareersFormEditor />
      ) : !rows.length ? (
        <Empty text="Aucune candidature pour l'instant." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 shrink-0 rounded-full bg-red-600 text-paper flex items-center justify-center font-display font-bold">
                    {r.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {r.name}
                      <SampleTag show={r.sample} />
                    </p>
                    <p className="text-xs text-ink/50">{dateTime.format(new Date(r.createdAt))}</p>
                  </div>
                </div>
                {r.cv && (
                  <button onClick={() => setViewing(r)} className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-ink/85">
                    Voir le CV
                  </button>
                )}
              </div>

              {!!r.answers?.length && (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-ink/[0.03] p-4 text-sm">
                  {r.answers.map((a) => (
                    <div key={a.label}>
                      <dt className="text-xs text-ink/50">{a.label}</dt>
                      <dd className="font-semibold">{a.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <p className="mt-4 text-sm text-ink/75 whitespace-pre-line flex-1">{r.message}</p>
              <p className="mt-4 text-sm">
                <a href={`mailto:${r.email}`} className="text-red-600 font-semibold">
                  {r.email}
                </a>{" "}
                ·{" "}
                <a href={`tel:${r.phone}`} className="text-red-600 font-semibold">
                  {r.phone}
                </a>
              </p>
            </Card>
          ))}
        </div>
      )}

      {viewing?.cv && <CvViewer cv={viewing.cv} name={viewing.name} onClose={() => setViewing(null)} />}
    </>
  );
}

function CareersFormEditor() {
  const fields = useCareersFields();
  const set = (next: CareersField[]) => saveCareersFields(next);
  const patch = (id: string, change: Partial<CareersField>) => set(fields.map((f) => (f.id === id ? { ...f, ...change } : f)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const fixed = ["Nom complet", "Courriel", "Téléphone", "Message", "CV (PDF ou DOCX)"];
  const field = "rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink/60 max-w-2xl">
        Choisissez les questions posées aux candidats sur la page Carrières. Les changements s'appliquent tout de suite au
        formulaire du site.
      </p>

      <Card>
        <p className="text-xs font-bold uppercase tracking-wider text-ink/45 mb-3">Toujours demandés</p>
        <div className="flex flex-wrap gap-2">
          {fixed.map((f) => (
            <span key={f} className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink/70">
              {f}
            </span>
          ))}
        </div>
      </Card>

      <ul className="flex flex-col gap-3">
        {fields.map((f, i) => (
          <li key={f.id} className="rounded-2xl bg-white border border-ink/10 p-4 md:p-5">
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Question (FR)
                <input value={f.label} onChange={(e) => patch(f.id, { label: e.target.value })} className={field} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Question (EN)
                <input value={f.labelEn ?? ""} onChange={(e) => patch(f.id, { labelEn: e.target.value })} className={field} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Type
                <select value={f.type} onChange={(e) => patch(f.id, { type: e.target.value as FieldType })} className={field}>
                  {(Object.keys(FIELD_TYPES) as FieldType[]).map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPES[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {f.type === "select" && (
              <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Choix (séparés par des virgules)
                <input
                  value={(f.options ?? []).join(", ")}
                  onChange={(e) => patch(f.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                  className={field}
                />
              </label>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={f.required} onChange={(e) => patch(f.id, { required: e.target.checked })} className="h-4 w-4 accent-red-600" />
                Obligatoire
              </label>
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="h-8 w-8 rounded-lg text-ink/60 hover:bg-ink/5 disabled:opacity-30">
                  ↑
                </button>
                <button onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Descendre" className="h-8 w-8 rounded-lg text-ink/60 hover:bg-ink/5 disabled:opacity-30">
                  ↓
                </button>
                <button
                  onClick={() => set(fields.filter((x) => x.id !== f.id))}
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600/5"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            set([...fields, { id: Math.random().toString(36).slice(2, 8), label: "Nouvelle question", type: "text", required: false }])
          }
          className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-700"
        >
          + Ajouter une question
        </button>
        <button
          onClick={() => window.confirm("Revenir aux questions par défaut ?") && resetCareersFields()}
          className="rounded-full px-4 py-2.5 text-sm font-bold text-ink/60 hover:bg-ink/5"
        >
          Questions par défaut
        </button>
      </div>
    </div>
  );
}

function Catering({ rows }: { rows: Data["catering"] }) {
  return (
    <>
      <SectionHead
        title="Demandes traiteur"
        desc="Personnes intéressées par le service traiteur (lancement prévu en 2027)."
        onExport={
          rows.length
            ? () =>
                downloadCsv("traiteur.csv", [
                  ["Nom", (r: Data["catering"][number]) => r.name],
                  ["Courriel", (r: Data["catering"][number]) => r.email],
                  ["Téléphone", (r: Data["catering"][number]) => r.phone],
                  ["Événement", (r: Data["catering"][number]) => r.eventType],
                  ["Date", (r: Data["catering"][number]) => r.date],
                  ["Personnes", (r: Data["catering"][number]) => r.guests],
                  ["Message", (r: Data["catering"][number]) => r.message],
                ] as never, rows)
            : undefined
        }
      />
      {!rows.length ? (
        <Empty text="Aucune demande pour l'instant." />
      ) : (
        <Table
          head={["Nom", "Événement", "Date", "Personnes", "Contact"]}
          rows={rows.map((r) => [
            <>
              {r.name}
              <SampleTag show={r.sample} />
              {r.message && <span className="block text-xs text-ink/50 mt-1 max-w-xs">{r.message}</span>}
            </>,
            r.eventType,
            r.date ?? "—",
            r.guests ?? "—",
            <>
              <span className="block">{r.email}</span>
              <span className="block text-ink/55">{r.phone}</span>
            </>,
          ])}
        />
      )}
    </>
  );
}

function Content() {
  const items = menuCategories.reduce((n, c) => n + c.items.length, 0);
  const blocks = [
    { title: "Menu pour emporter / livraison", value: `${menuCategories.length} catégories · ${items} plats`, note: "Prix, formats et descriptions" },
    { title: "Menu sur place et déjeuner", value: "En attente", note: "Le restaurant doit transmettre ces menus et prix" },
    { title: "Super spéciaux", value: `${specials.length} spéciaux`, note: "Choisir les 3 mis en avant sur l'accueil" },
    { title: "Avis clients", value: `${testimonials.length} avis`, note: "Texte, nom, photo du client et du plat" },
    { title: "Heures et coordonnées", value: "3 plages horaires", note: "Téléphone, adresse, courriel" },
    { title: "Pop-up 10 %", value: PROMO_CODE, note: "Activer/désactiver, taux et conditions" },
  ];
  return (
    <>
      <SectionHead
        title="Contenu du site"
        desc="Tout ce que le restaurant pourra modifier lui-même une fois le site branché à sa base de données. Dans la démo, le contenu est en lecture seule."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blocks.map((b) => (
          <Card key={b.title} className="flex flex-col">
            <p className="text-sm text-ink/55">{b.title}</p>
            <p className="mt-2 font-display font-bold text-xl">{b.value}</p>
            <p className="mt-1 text-sm text-ink/50 flex-1">{b.note}</p>
            <button disabled className="mt-5 self-start rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/40 cursor-not-allowed">
              Modifier · avec le back-end
            </button>
          </Card>
        ))}
      </div>
    </>
  );
}

function Toggle({ on, onChange, label, desc, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-6 py-5 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink/55 mt-0.5">{desc}</span>
      </span>
      <span className="relative mt-1 shrink-0">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-7 w-12 rounded-full bg-ink/15 transition-colors peer-checked:bg-green-700 peer-focus-visible:ring-4 peer-focus-visible:ring-red-600/20" />
        <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function SettingsView() {
  const settings = useSettings();
  const onlyOne = settings.pickup !== settings.delivery;

  return (
    <>
      <SectionHead title="Paramètres" desc="Choisissez comment vos clients reçoivent leur commande. Le site s'adapte tout de suite : boutons, panier et page de commande." />
      <div className="rounded-2xl bg-white border border-ink/10 px-5 md:px-6 divide-y divide-ink/10">
        <Toggle
          label="Cueillette (pour emporter)"
          desc="Le client commande en ligne et passe chercher sa commande au comptoir."
          on={settings.pickup}
          disabled={onlyOne && settings.pickup}
          onChange={(v) => saveSettings({ pickup: v })}
        />
        <Toggle
          label="Livraison"
          desc="Le restaurant livre à l'adresse du client."
          on={settings.delivery}
          disabled={onlyOne && settings.delivery}
          onChange={(v) => saveSettings({ delivery: v })}
        />
        <label className={`flex flex-wrap items-center justify-between gap-4 py-5 ${settings.delivery ? "" : "opacity-50"}`}>
          <span>
            <span className="block font-semibold">Minimum pour la livraison</span>
            <span className="block text-sm text-ink/55 mt-0.5">Sous-total minimum avant taxes.</span>
          </span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={settings.deliveryMinimum}
              disabled={!settings.delivery}
              onChange={(e) => saveSettings({ deliveryMinimum: Math.max(0, Number(e.target.value)) })}
              className="w-24 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-right tabular-nums focus:border-red-600 focus:outline-none"
            />
            <span className="font-semibold">$</span>
          </span>
        </label>
      </div>
      <p className="mt-3 text-xs text-ink/45">
        Au moins un mode doit rester actif. Démo : ces réglages s'appliquent au site ouvert dans ce navigateur.
      </p>
    </>
  );
}

const ROLE_OPTIONS = (Object.keys(ROLES) as Role[]).filter((r) => r !== "proprietaire");

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(true);
  return (
    <div className="flex gap-2">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        aria-label="Mot de passe"
        className={`${inputCls} font-mono`}
      />
      <button type="button" onClick={() => setVisible((v) => !v)} className="shrink-0 rounded-xl border border-ink/15 px-3 text-xs font-bold text-ink/60 hover:bg-ink/5">
        {visible ? "Masquer" : "Afficher"}
      </button>
      <button type="button" onClick={() => onChange(generatePassword())} className="shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paper">
        Générer
      </button>
    </div>
  );
}

function Team({ currentUser }: { currentUser: Member }) {
  const team = useTeam();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("comptoir");
  const [password, setPw] = useState(generatePassword);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const m = await addMember({ name, email, role, password });
      setCreated({ email: m.email, password });
      setName("");
      setEmail("");
      setPw(generatePassword());
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const members = [...team].sort((a, b) => Number(!!b.owner) - Number(!!a.owner) || a.name.localeCompare(b.name));

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display font-extrabold text-3xl">Équipe</h1>
          <p className="text-sm text-ink/55 mt-1 max-w-xl">
            Donnez un accès à chaque membre : un courriel, un mot de passe et un rôle. Chaque rôle ne voit que les sections
            dont il a besoin.
          </p>
        </div>
        <button
          onClick={() => {
            setAdding((v) => !v);
            setCreated(null);
          }}
          className="self-start sm:self-auto rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-700"
        >
          {adding ? "Annuler" : "+ Ajouter un membre"}
        </button>
      </div>

      {created && (
        <div role="status" className="mb-5 rounded-2xl border border-green-700/20 bg-green-700/5 p-5 text-sm">
          <p className="font-semibold text-green-800">Accès créé. Transmettez ces identifiants au membre :</p>
          <p className="mt-2 font-mono">
            {created.email} · {created.password}
          </p>
          <p className="mt-1 text-xs text-ink/50">Le mot de passe ne sera plus affiché ensuite.</p>
        </div>
      )}

      {adding && (
        <form onSubmit={create} className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 md:p-6 grid md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nom
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Courriel d'accès
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Rôle
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLES[r].label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-ink/50">Accès : {ROLES[role].access}</span>
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            Mot de passe
            <PasswordInput value={password} onChange={setPw} />
            <span className="text-xs font-normal text-ink/50">8 caractères minimum.</span>
          </div>
          {error && (
            <p role="alert" className="md:col-span-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="md:col-span-2">
            <button type="submit" className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper">
              Créer l'accès
            </button>
          </div>
        </form>
      )}

      <ul className="flex flex-col gap-3">
        {members.map((m) => (
          <li key={m.id} className={`rounded-2xl bg-white border border-ink/10 ${m.active ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4 md:p-5">
              <span className="w-10 h-10 shrink-0 rounded-full bg-red-600 text-paper flex items-center justify-center font-display font-bold">
                {m.name.charAt(0)}
              </span>
              <div className="flex-1 min-w-[180px]">
                <p className="font-semibold">
                  {m.name}
                  {m.id === currentUser.id && <span className="ml-2 text-xs font-normal text-ink/45">(vous)</span>}
                  {!m.active && <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink/50">Désactivé</span>}
                </p>
                <p className="text-sm text-ink/55">{m.email}</p>
                <p className="text-xs text-ink/40 mt-0.5">
                  {m.lastLogin ? `Dernière connexion : ${dateTime.format(new Date(m.lastLogin))}` : "Jamais connecté"}
                </p>
              </div>

              {m.owner ? (
                <span className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink/70">{ROLES[m.role].label}</span>
              ) : (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => updateMember(m.id, { role: e.target.value as Role })}
                    aria-label={`Rôle de ${m.name}`}
                    className="rounded-full border border-ink/15 bg-white px-3 py-2 text-xs font-bold"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {ROLES[r].label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setResetting(resetting === m.id ? null : m.id);
                        setNewPassword(generatePassword());
                      }}
                      className="rounded-full px-3 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5"
                    >
                      Mot de passe
                    </button>
                    <button
                      onClick={() => updateMember(m.id, { active: !m.active })}
                      className="rounded-full px-3 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5"
                    >
                      {m.active ? "Désactiver" : "Réactiver"}
                    </button>
                    <button
                      onClick={() => window.confirm(`Supprimer l'accès de ${m.name} ?`) && removeMember(m.id)}
                      className="rounded-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600/5"
                    >
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>

            {resetting === m.id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await setPassword(m.id, newPassword);
                  setCreated({ email: m.email, password: newPassword });
                  setResetting(null);
                }}
                className="border-t border-ink/10 px-4 md:px-5 py-4 flex flex-col sm:flex-row sm:items-end gap-3"
              >
                <div className="flex-1 flex flex-col gap-1.5 text-sm font-medium">
                  Nouveau mot de passe pour {m.name}
                  <PasswordInput value={newPassword} onChange={setNewPassword} />
                </div>
                <button type="submit" className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper">
                  Enregistrer
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <h2 className="font-display font-bold text-lg mb-3">Rôles et accès</h2>
        <div className="overflow-x-auto rounded-2xl bg-white border border-ink/10">
          <table className="w-full text-sm text-left">
            <tbody>
              {(Object.keys(ROLES) as Role[]).map((r) => (
                <tr key={r} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 md:px-5 py-3 font-semibold whitespace-nowrap">{ROLES[r].label}</td>
                  <td className="px-4 md:px-5 py-3 text-ink/65">{ROLES[r].access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/45">
          Démo : les accès sont enregistrés dans ce navigateur, avec les mots de passe chiffrés. En production, ils seront
          vérifiés par le serveur.
        </p>
      </section>
    </>
  );
}

/** Fills the dashboard with clearly tagged example records so the client can see every view. */
function loadSamples() {
  const ago = (days: number, hours = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(11 + hours, 15 + days * 7, 0, 0);
    return d.toISOString();
  };
  const sampleOrders: [number, number, Order][] = [
    [0, 1, { mode: "livraison", name: "Client exemple A", phone: "514 555-0101", address: "12 rue Exemple", when: "Dès que possible", lines: [{ name: "Pizza Toute garnie", size: 'Large 14"', price: 25.45, qty: 1, category: "notre-delicieuse-pizza" }, { name: "Liqueur en canette", price: 2.5, qty: 2, category: "les-breuvages" }], subtotal: 30.45, discount: 0, total: 30.45, status: "nouvelle" }],
    [0, 3, { mode: "emporter", name: "Client exemple B", phone: "514 555-0102", when: "18:30", lines: [{ name: "Sous-marin Le Super (tout garni)", size: '10"', price: 16.5, qty: 2, category: "sous-marins" }], subtotal: 33, discount: 3.3, total: 29.7, promoCode: PROMO_CODE, status: "preparation" }],
    [1, 2, { mode: "emporter", name: "Client exemple C", phone: "514 555-0103", when: "Dès que possible", lines: [{ name: "Poutine Toute garnie", size: "Petite", price: 13.95, qty: 2, category: "poutines-speciales" }], subtotal: 27.9, discount: 0, total: 27.9, status: "prete" }],
    [2, 4, { mode: "livraison", name: "Client exemple D", phone: "514 555-0104", address: "45 avenue Exemple", when: "Dès que possible", lines: [{ name: "Brochette de poulet (2 bâtons)", price: 24.95, qty: 1, category: "les-repas" }, { name: "Pizza Toute garnie", size: 'Moyenne 12"', price: 25.45, qty: 1, category: "notre-delicieuse-pizza" }], subtotal: 50.4, discount: 0, total: 50.4, status: "terminee", paid: true }],
    [3, 1, { mode: "emporter", name: "Client exemple E", phone: "514 555-0105", when: "12:15", lines: [{ name: "Spécial no 3", price: 28.95, qty: 1, category: "super-speciaux" }], subtotal: 28.95, discount: 0, total: 28.95, status: "terminee", paid: true }],
    [5, 5, { mode: "livraison", name: "Client exemple F", phone: "514 555-0106", address: "8 boulevard Exemple", when: "Dès que possible", lines: [{ name: "Pizza Toute garnie", size: 'Large 14"', price: 25.45, qty: 2, category: "notre-delicieuse-pizza" }], subtotal: 50.9, discount: 5.09, total: 45.81, promoCode: PROMO_CODE, status: "terminee", paid: true }],
  ];
  const write = <T,>(key: string, rows: T[]) => {
    try {
      const current = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify([...rows, ...current]));
    } catch {
      // ignore
    }
  };
  write(
    "patatheque-demo-orders",
    sampleOrders.map(([d, h, o], i) => ({ ...o, id: `EX${i + 1}`, createdAt: ago(d, h), sample: true })),
  );
  record("subscribers", { email: "exemple.un@courriel.test", consent: true, code: PROMO_CODE, lang: "fr" }, true);
  record("subscribers", { email: "example.two@email.test", consent: true, code: PROMO_CODE, lang: "en" }, true);
  record(
    "applications",
    {
      name: "Candidat exemple",
      email: "candidat@courriel.test",
      phone: "514 555-0199",
      message: "Disponible les soirs et fins de semaine, expérience au comptoir.",
      answers: [
        { label: "Poste souhaité", value: "Comptoir" },
        { label: "Disponibilités", value: "Soirs" },
        { label: "Date de début possible", value: "2026-12-01" },
        { label: "Expérience en restauration", value: "1 à 3 ans" },
        { label: "Permis de conduire valide", value: "Non" },
      ],
      cv: { name: "cv-exemple.pdf", size: 1336, type: "application/pdf", url: "/demo/cv-exemple.pdf" },
    },
    true,
  );
  record("catering", { name: "Entreprise exemple", email: "evenements@courriel.test", phone: "514 555-0177", eventType: "Événement d'entreprise", date: "2027-03", guests: "40", message: "Dîner d'équipe, pizzas et salades." }, true);
  for (let i = 0; i < 9; i++) record("events", { event: "commander_click", from: "exemple" }, true);
}
