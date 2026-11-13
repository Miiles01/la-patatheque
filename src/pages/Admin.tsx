import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoMark } from "../components/LogoMark";
import { dishVisual, menuCategories, specials, testimonials } from "../data/menu";
import { asset } from "../lib/asset";
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
import { live } from "../lib/api";
import { Link } from "../lib/router";
import { useLiveSync, useSaveError } from "./admin/live";
import { ESSENTIALS, essentialsStore } from "../lib/essentials";
import { addBooking, todayIso } from "../lib/reservations";
import { JobsView } from "./admin/Jobs";
import { MenuEditor } from "./admin/MenuEditor";
import { ReservationsView } from "./admin/Reservations";
import { HoursView, SettingsView } from "./admin/SettingsHours";
import { Card, Empty, inputCls, SectionHead } from "./admin/ui";
import {
  addMember,
  authenticate,
  ensureOwner,
  generatePassword,
  listTeam,
  memberTabs,
  nextEmployeeNumber,
  onTeamChange,
  OWNER_DEMO_PASSWORD,
  OWNER_EMAIL,
  removeMember,
  restoreSession,
  ROLES,
  setPassword,
  setupOwner,
  signOut,
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
  { id: "reservations", label: "Réservations" },
  { id: "menu", label: "Menu" },
  { id: "hours", label: "Horaires" },
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
  const [userId, setUserId] = useState(() => (live ? null : (sessionMember()?.id ?? null)));
  // Real site: ask the server who is signed in before showing anything.
  const [boot, setBoot] = useState<"loading" | "login" | "setup">(live ? "loading" : "login");
  useEffect(() => {
    if (!live) return;
    restoreSession()
      .then((r) => {
        if (r.member) setUserId(r.member.id);
        setBoot(r.needsSetup ? "setup" : "login");
      })
      .catch(() => setBoot("login"));
  }, []);
  // A member who is removed or deactivated is signed out on their next render.
  const user = team.find((m) => m.id === userId && m.active) ?? null;

  const logout = () => {
    signOut();
    try {
      sessionStorage.removeItem(SESSION);
    } catch {
      // ignore
    }
    setUserId(null);
  };

  if (!user) {
    if (boot === "loading") return <div className="min-h-svh bg-white" />;
    if (boot === "setup") return <OwnerSetup onSuccess={(m) => setUserId(m.id)} />;
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


/** Real site, first visit: the owner creates their own account (only possible while there is none). */
function OwnerSetup({ onSuccess }: { onSuccess: (m: Member) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return setError("Le mot de passe doit avoir au moins 8 caractères.");
    if (password !== String(f.get("confirm"))) return setError("Les deux mots de passe ne sont pas identiques.");
    setBusy(true);
    setError("");
    try {
      onSuccess(await setupOwner({ name: String(f.get("name")), email: String(f.get("email")), password }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-svh bg-white text-ink flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" aria-label="Retour au site" className="text-red-600">
            <LogoMark className="h-10" />
          </Link>
          <span className="mt-4 rounded-full bg-ink/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink/60">
            Première connexion
          </span>
        </div>
        <form onSubmit={submit} className="rounded-3xl bg-white border border-ink/10 p-7 flex flex-col gap-4">
          <h1 className="font-display font-extrabold text-2xl">Créer le compte propriétaire</h1>
          <p className="text-sm text-ink/60">
            Ce compte a accès à tout le panneau et ajoute ensuite l'équipe. Votre numéro d'employé sera le 100.
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nom
            <input name="name" type="text" autoComplete="name" required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Courriel
            <input name="email" type="email" autoComplete="username" required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Mot de passe (8 caractères minimum)
            <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Confirmer le mot de passe
            <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-full bg-red-600 px-8 py-4 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {busy ? "Création…" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: (m: Member) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureOwner();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const member = await authenticate(String(f.get("user")), String(f.get("password")));
      if (member) onSuccess(member);
      else setError("Identifiant ou mot de passe incorrect, ou accès désactivé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau. Réessayez.");
    } finally {
      setBusy(false);
    }
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
            Courriel ou no d'employé
            <input name="user" type="text" inputMode="email" defaultValue={live ? undefined : OWNER_EMAIL} autoComplete="username" required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Mot de passe
            <input
              name="password"
              type="password"
              defaultValue={live ? undefined : OWNER_DEMO_PASSWORD}
              autoComplete="current-password"
              required
              className={inputCls}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
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
            Entrez avec votre courriel ou votre numéro d'employé.
            {!live && " Démo : les identifiants du propriétaire sont déjà remplis."}
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
  reservations: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  menu: (
    <>
      <path d="M6 3h12v18H6z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
    </>
  ),
  hours: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
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

/**
 * Red "Essentiels" button above the profile: progress through the basics a
 * restaurant should set up before going live, each linking to its section.
 * It turns into a small green badge once everything is checked.
 */
function EssentialsButton({ compact, allowed, onOpen }: { compact: boolean; allowed: Tab[]; onOpen: (t: Tab) => void }) {
  const done = essentialsStore.use();
  const [open, setOpen] = useState(false);
  const items = ESSENTIALS.filter((e) => allowed.includes(e.tab));
  if (!items.length) return null;
  const count = items.filter((e) => done[e.id]).length;
  const complete = count === items.length;
  const pct = Math.round((count / items.length) * 100);

  return (
    <div className={`relative ${compact ? "flex justify-center py-3" : "px-3 pb-3"}`}>
      {open && (
        <div
          className={`absolute z-50 w-72 rounded-2xl border border-ink/10 bg-white p-4 shadow-xl ${
            compact ? "left-full bottom-2 ml-2" : "left-3 right-3 bottom-full mb-2 w-auto"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-display font-bold">Essentiels</p>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="h-7 w-7 rounded-full text-ink/50 hover:bg-ink/5">
              ×
            </button>
          </div>
          <p className="text-xs text-ink/55 mb-3">
            {complete ? "Tout est prêt ! Explorez maintenant les autres sections." : "Vérifiez ces points avant d'ouvrir les commandes en ligne."}
          </p>
          <ol className="flex flex-col gap-1.5">
            {items.map((e, i) => (
              <li key={e.id}>
                <button
                  onClick={() => {
                    onOpen(e.tab);
                    setOpen(false);
                  }}
                  className="w-full flex items-start gap-3 rounded-xl p-2 text-left hover:bg-ink/5"
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done[e.id] ? "bg-green-700 text-paper" : "border-2 border-red-600 text-red-600"
                    }`}
                  >
                    {done[e.id] ? "✓" : i + 1}
                  </span>
                  <span>
                    <span className={`block text-sm font-semibold ${done[e.id] ? "text-ink/45 line-through" : ""}`}>{e.title}</span>
                    {!done[e.id] && <span className="block text-xs text-ink/50">{e.why}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {compact ? (
        <button
          onClick={() => setOpen((v) => !v)}
          title={`Essentiels ${count}/${items.length}`}
          aria-label={`Essentiels : ${count} sur ${items.length}`}
          className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-xs font-black ${complete ? "bg-green-700/10 text-green-800" : "bg-red-600 text-paper"}`}
        >
          {complete ? "✓" : `${count}/${items.length}`}
        </button>
      ) : complete ? (
        <button onClick={() => setOpen((v) => !v)} className="w-full rounded-xl bg-green-700/10 px-3 py-2 text-left text-xs font-bold text-green-800">
          ✓ Essentiels complétés
        </button>
      ) : (
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full rounded-xl bg-red-600 p-3 text-left text-paper hover:bg-red-700 transition-colors">
          <span className="flex items-center justify-between text-sm font-bold">
            Essentiels
            <span className="tabular-nums text-paper/80">
              {count}/{items.length}
            </span>
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-paper/25">
            <span className="block h-full rounded-full bg-paper transition-all" style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-2 block text-[11px] text-paper/80">
            Prochaine étape : {items.find((e) => !done[e.id])?.title}
          </span>
        </button>
      )}
    </div>
  );
}

function Panel({ user, onLogout }: { user: Member; onLogout: () => void }) {
  const data = useStore();
  useLiveSync(user);
  const saveError = useSaveError();
  const permitted = memberTabs(user);
  const allowed = TABS.filter((t) => permitted.includes(t.id));
  const [tab, setTab] = useState<Tab>(allowed[0]?.id ?? "dashboard");
  // Open by default on desktop, closed on phones where it slides over the content.
  const [sidebar, setSidebar] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  // Only new orders get a counter: they are the one thing staff must act on right away.
  const counts: Partial<Record<Tab, number>> = {
    orders: data.orders.filter((o) => o.status === "nouvelle").length,
  };
  const current = allowed.find((t) => t.id === tab) ?? allowed[0] ?? { id: "dashboard" as Tab, label: "Aucun accès" };

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

        <EssentialsButton compact={!sidebar} allowed={permitted} onOpen={open} />
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
              {!live && (
              <span
                title="Démo : les données sont enregistrées dans ce navigateur. En production, elles vont dans la base de données."
                className="rounded-full bg-orange/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink/70"
              >
                Démo
              </span>
              )}
            {!live && user.owner && (
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

        {saveError && (
          <p role="alert" className="sticky top-16 z-20 bg-red-600 px-5 md:px-8 py-2.5 text-sm font-medium text-paper">
            Modification non enregistrée : {saveError}
          </p>
        )}
        <main className="mx-auto max-w-6xl px-5 md:px-8 py-8 md:py-10">
          {!allowed.length && (
            <Empty text="Votre compte n'a accès à aucune page pour l'instant. Demandez au propriétaire de vous en attribuer dans Équipe." />
          )}
          {allowed.length > 0 && tab === "dashboard" && allowed.some((t) => t.id === "dashboard") && <Dashboard data={data} onOpen={open} />}
          {tab === "orders" && <Orders orders={data.orders} />}
          {tab === "subscribers" && <Subscribers rows={data.subscribers} />}
          {tab === "applications" && <JobsView applications={data.applications} />}
          {tab === "catering" && <Catering rows={data.catering} />}
          {tab === "content" && <Content />}
          {tab === "reservations" && <ReservationsView />}
          {tab === "menu" && <MenuEditor />}
          {tab === "hours" && <HoursView />}
          {tab === "settings" && <SettingsView onOpen={open} />}
          {tab === "team" && <Team currentUser={user} />}
        </main>
      </div>
    </div>
  );
}

type Data = ReturnType<typeof useStore>;


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
            <span className="text-xs text-ink/50">Pour emporter</span>
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



function SampleTag({ show }: { show?: boolean }) {
  return show ? <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink/45">Exemple</span> : null;
}

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "nouvelle", title: "Nouvelles" },
  { status: "preparation", title: "En préparation" },
  { status: "prete", title: "Prêtes à récupérer" },
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
        desc="Commandes pour emporter. Aucun paiement en ligne : le client paie au comptoir. Avancez chaque commande d'une colonne à l'autre."
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



/** Checkbox grid of the panel pages a member may open. Équipe stays with the owner. */
function PermissionPicker({ value, onChange }: { value: Tab[]; onChange: (tabs: Tab[]) => void }) {
  const assignable = TABS.filter((t) => t.id !== "team");
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {assignable.map((t) => {
        const on = value.includes(t.id);
        return (
          <label
            key={t.id}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
              on ? "border-red-600/40 bg-red-600/5 text-ink" : "border-ink/10 text-ink/60 hover:bg-ink/[0.03]"
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => onChange(e.target.checked ? [...value, t.id] : value.filter((x) => x !== t.id))}
              className="h-4 w-4 accent-red-600"
            />
            <TabIcon tab={t.id} />
            <span className="font-semibold">{t.label}</span>
          </label>
        );
      })}
    </div>
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
        minLength={4}
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
  const [tabs, setTabs] = useState<Tab[]>(ROLES.comptoir.tabs);
  const [password, setPw] = useState(generatePassword);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; number: string; password: string } | null>(null);
  const [employeeNumber, setEmployeeNumber] = useState(() => nextEmployeeNumber(listTeam()));
  const [resetting, setResetting] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const m = await addMember({ name, email, employeeNumber, role, password, tabs });
      setCreated({ email: m.email, number: m.employeeNumber, password });
      setEmployeeNumber(nextEmployeeNumber(listTeam()));
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
            No d'employé {created.number} · {created.email} · mot de passe {created.password}
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
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Courriel d'accès
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              No d'employé
              <input
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                required
                className={`${inputCls} font-mono text-center`}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Rôle
            <select
              value={role}
              onChange={(e) => {
                const r = e.target.value as Role;
                setRole(r);
                setTabs(ROLES[r].tabs);
              }}
              className={inputCls}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLES[r].label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-ink/50">Le rôle propose des permissions ; ajustez-les ci-dessous.</span>
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            Mot de passe
            <PasswordInput value={password} onChange={setPw} />
            <span className="text-xs font-normal text-ink/50">4 caractères minimum.</span>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium mb-2">Pages visibles dans le panneau</p>
            <PermissionPicker value={tabs} onChange={setTabs} />
          </div>
          {error && (
            <p role="alert" className="md:col-span-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="md:col-span-2">
            <button type="submit" disabled={!tabs.length} className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper disabled:opacity-40">
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
                <p className="text-sm text-ink/55">
                  <span className="mr-2 rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs font-bold text-ink/70">No {m.employeeNumber}</span>
                  {m.email}
                </p>
                <p className="text-xs text-ink/40 mt-0.5">
                  {m.lastLogin ? `Dernière connexion : ${dateTime.format(new Date(m.lastLogin))}` : "Jamais connecté"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {TABS.filter((t) => memberTabs(m).includes(t.id)).map((t) => (
                    <span key={t.id} className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink/60">
                      {t.label}
                    </span>
                  ))}
                  {!m.owner && !TABS.some((t) => memberTabs(m).includes(t.id)) && (
                    <span className="text-[11px] text-red-600">Aucune page</span>
                  )}
                </div>
              </div>

              {m.owner ? (
                <span className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink/70">{ROLES[m.role].label}</span>
              ) : (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => {
                      const r = e.target.value as Role;
                      updateMember(m.id, { role: r, tabs: ROLES[r].tabs });
                    }}
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
                      onClick={() => setEditing(editing === m.id ? null : m.id)}
                      aria-expanded={editing === m.id}
                      className="rounded-full px-3 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5"
                    >
                      Permissions
                    </button>
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

            {editing === m.id && (
              <div className="border-t border-ink/10 px-4 md:px-5 py-4">
                <p className="text-sm font-medium mb-2">Pages visibles pour {m.name}</p>
                <PermissionPicker value={memberTabs(m)} onChange={(next) => updateMember(m.id, { tabs: next })} />
                <p className="mt-2 text-xs text-ink/45">Enregistré automatiquement. Le membre voit le changement à sa prochaine action.</p>
              </div>
            )}

            {resetting === m.id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await setPassword(m.id, newPassword);
                  setCreated({ email: m.email, number: m.employeeNumber, password: newPassword });
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
    [0, 1, { mode: "emporter", name: "Client exemple A", phone: "514 555-0101", when: "Dès que possible", lines: [{ name: "Pizza Toute garnie", size: 'Large 14"', price: 25.45, qty: 1, category: "notre-delicieuse-pizza" }, { name: "Liqueur en canette", price: 2.5, qty: 2, category: "les-breuvages" }], subtotal: 30.45, discount: 0, total: 30.45, status: "nouvelle" }],
    [0, 3, { mode: "emporter", name: "Client exemple B", phone: "514 555-0102", when: "18:30", lines: [{ name: "Sous-marin Le Super (tout garni)", size: '10"', price: 16.5, qty: 2, category: "sous-marins" }], subtotal: 33, discount: 3.3, total: 29.7, promoCode: PROMO_CODE, status: "preparation" }],
    [1, 2, { mode: "emporter", name: "Client exemple C", phone: "514 555-0103", when: "Dès que possible", lines: [{ name: "Poutine Toute garnie", size: "Petite", price: 13.95, qty: 2, category: "poutines-speciales" }], subtotal: 27.9, discount: 0, total: 27.9, status: "prete" }],
    [2, 4, { mode: "emporter", name: "Client exemple D", phone: "514 555-0104", when: "Dès que possible", lines: [{ name: "Brochette de poulet (2 bâtons)", price: 24.95, qty: 1, category: "les-repas" }, { name: "Pizza Toute garnie", size: 'Moyenne 12"', price: 25.45, qty: 1, category: "notre-delicieuse-pizza" }], subtotal: 50.4, discount: 0, total: 50.4, status: "terminee", paid: true }],
    [3, 1, { mode: "emporter", name: "Client exemple E", phone: "514 555-0105", when: "12:15", lines: [{ name: "Spécial no 3", price: 28.95, qty: 1, category: "super-speciaux" }], subtotal: 28.95, discount: 0, total: 28.95, status: "terminee", paid: true }],
    [5, 5, { mode: "emporter", name: "Client exemple F", phone: "514 555-0106", when: "Dès que possible", lines: [{ name: "Pizza Toute garnie", size: 'Large 14"', price: 25.45, qty: 2, category: "notre-delicieuse-pizza" }], subtotal: 50.9, discount: 5.09, total: 45.81, promoCode: PROMO_CODE, status: "terminee", paid: true }],
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
      jobId: "commis-comptoir",
      jobTitle: "Commis au comptoir",
      name: "Candidat exemple",
      email: "candidat@courriel.test",
      phone: "514 555-0199",
      message: "Disponible les soirs et fins de semaine, expérience au comptoir.",
      answers: [
        { label: "Quelles sont tes disponibilités ?", value: "Soirs et fins de semaine" },
        { label: "As-tu déjà travaillé en restauration ?", value: "Oui" },
        { label: "Pourquoi La Patathèque ?", value: "J'habite le quartier et j'y mange depuis que je suis petit." },
      ],
      cv: { name: "cv-exemple.pdf", size: 1336, type: "application/pdf", url: "/demo/cv-exemple.pdf" },
    },
    true,
  );
  record("catering", { name: "Entreprise exemple", email: "evenements@courriel.test", phone: "514 555-0177", eventType: "Événement d'entreprise", date: "2027-03", guests: "40", message: "Dîner d'équipe, pizzas et salades." }, true);
  for (let i = 0; i < 9; i++) record("events", { event: "commander_click", from: "exemple" }, true);
  const today = todayIso();
  const sampleBookings = [
    { time: "12:00", party: 2, name: "Réservation exemple A", phone: "514 555-0110", highChairs: 0, accessible: false },
    { time: "18:00", party: 4, name: "Réservation exemple B", phone: "514 555-0111", highChairs: 1, accessible: false, occasion: "Anniversaire" },
    { time: "18:30", party: 6, name: "Réservation exemple C", phone: "514 555-0112", highChairs: 0, accessible: false },
    { time: "19:00", party: 3, name: "Réservation exemple D", phone: "514 555-0113", highChairs: 0, accessible: true, notes: "Près de l'entrée si possible" },
  ];
  sampleBookings.forEach((b) => addBooking({ date: today, ...b }, true));
}
