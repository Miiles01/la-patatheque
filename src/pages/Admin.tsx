import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoMark } from "../components/LogoMark";
import { menuCategories, specials, testimonials } from "../data/menu";
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

type Tab = "dashboard" | "orders" | "subscribers" | "applications" | "catering" | "content";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "orders", label: "Commandes" },
  { id: "subscribers", label: "Courriels 10 %" },
  { id: "applications", label: "Candidatures" },
  { id: "catering", label: "Traiteur" },
  { id: "content", label: "Contenu du site" },
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

// Demo only: the credentials ship pre-filled so the client can walk in. The real
// panel will check them on the server; nothing here protects any data.
const DEMO_USER = "admin@patatheque.ca";
const DEMO_PASSWORD = "Patatheque2026";
const SESSION = "patatheque-admin-session";

function isSignedIn() {
  try {
    return sessionStorage.getItem(SESSION) === "1";
  } catch {
    return false;
  }
}

export function AdminPage() {
  const [signedIn, setSignedIn] = useState(isSignedIn);

  if (!signedIn) return <Login onSuccess={() => setSignedIn(true)} />;
  return (
    <Panel
      onLogout={() => {
        try {
          sessionStorage.removeItem(SESSION);
        } catch {
          // ignore
        }
        setSignedIn(false);
      }}
    />
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("user") === DEMO_USER && f.get("password") === DEMO_PASSWORD) {
      try {
        sessionStorage.setItem(SESSION, "1");
      } catch {
        // ignore
      }
      onSuccess();
    } else {
      setError(true);
    }
  }

  const field =
    "w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 text-ink focus:border-red-600 focus:outline-none transition-colors";

  return (
    <div className="min-h-svh bg-cream text-ink flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" aria-label="Retour au site" className="text-red-600">
            <LogoMark className="h-10" />
          </Link>
          <span className="mt-4 rounded-full bg-ink/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink/60">
            Espace admin
          </span>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-paper p-7 flex flex-col gap-4 shadow-sm">
          <h1 className="font-display font-extrabold text-2xl">Connexion</h1>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Courriel
            <input name="user" type="email" defaultValue={DEMO_USER} autoComplete="username" required className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Mot de passe
            <input
              name="password"
              type="password"
              defaultValue={DEMO_PASSWORD}
              autoComplete="current-password"
              required
              className={field}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              Courriel ou mot de passe incorrect.
            </p>
          )}
          <button
            type="submit"
            className="mt-2 rounded-full bg-red-600 px-8 py-4 text-sm font-bold text-paper hover:bg-red-700 transition-colors"
          >
            Se connecter
          </button>
          <p className="text-xs text-ink/50 text-center">Démo : les identifiants sont déjà remplis.</p>
        </form>
      </div>
    </div>
  );
}

function Panel({ onLogout }: { onLogout: () => void }) {
  const data = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const counts: Partial<Record<Tab, number>> = {
    orders: data.orders.filter((o) => o.status === "nouvelle").length,
    subscribers: data.subscribers.length,
    applications: data.applications.length,
    catering: data.catering.length,
  };
  const empty = !data.orders.length && !data.subscribers.length && !data.applications.length && !data.catering.length;

  return (
    <div className="min-h-svh bg-cream text-ink">
      <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-ink/10">
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Retour au site" className="text-red-600">
              <LogoMark className="h-7" />
            </Link>
            <span className="hidden sm:inline rounded-full bg-ink/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink/60">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadSamples} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold hover:border-ink/40">
              Charger des exemples
            </button>
            <button
              onClick={() => {
                if (window.confirm("Effacer toutes les données de démonstration de ce navigateur ?")) {
                  (["orders", "subscribers", "applications", "catering", "events"] as Collection[]).forEach(clear);
                }
              }}
              className="rounded-full px-4 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5"
            >
              Vider
            </button>
            <button onClick={onLogout} className="rounded-full px-4 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5">
              Déconnexion
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl px-5 md:px-8 flex gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Sections de l'admin">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`shrink-0 flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                tab === t.id ? "border-red-600 text-ink" : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {t.label}
              {!!counts[t.id] && (
                <span className="rounded-full bg-red-600 px-1.5 min-w-5 text-[11px] leading-5 text-paper text-center">{counts[t.id]}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 md:px-8 py-8 md:py-10">
        <p className="mb-6 rounded-xl bg-orange/15 px-4 py-3 text-sm text-ink/80">
          <strong>Démo :</strong> les commandes, courriels et candidatures envoyés depuis le site sont enregistrés dans ce
          navigateur. En production, ils iront dans la base de données de l'hébergeur et par courriel au restaurant.
          {empty && " Cliquez sur « Charger des exemples » ou passez une commande sur le site pour voir le tableau se remplir."}
        </p>

        {tab === "dashboard" && <Dashboard data={data} onOpen={setTab} />}
        {tab === "orders" && <Orders orders={data.orders} />}
        {tab === "subscribers" && <Subscribers rows={data.subscribers} />}
        {tab === "applications" && <Applications rows={data.applications} />}
        {tab === "catering" && <Catering rows={data.catering} />}
        {tab === "content" && <Content />}
      </main>
    </div>
  );
}

type Data = ReturnType<typeof useStore>;

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-paper p-5 md:p-6 ${className}`}>{children}</section>;
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
  const max = Math.max(1, ...days.map((d) => d.count));

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
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display font-bold text-lg">Commandes, 7 derniers jours</h2>
            <span className="text-xs text-ink/50">{orders.length ? `${delivery} livraisons · ${orders.length - delivery} pour emporter` : ""}</span>
          </div>
          <div className="flex items-end gap-2 md:gap-3 h-48 border-b border-ink/15" role="list" aria-label="Commandes par jour">
            {days.map((d) => (
              <div key={d.date.toISOString()} role="listitem" className="group relative flex-1 h-full flex flex-col justify-end items-center">
                <span className="mb-1 text-xs font-semibold tabular-nums text-ink/70">{d.count || ""}</span>
                <div
                  className="w-full max-w-10 rounded-t-[4px] bg-red-600 group-hover:bg-red-700 transition-colors"
                  style={{ height: `${(d.count / max) * 85}%`, minHeight: d.count ? 4 : 0 }}
                />
                <span className="sr-only">
                  {dayLabel.format(d.date)} : {d.count} commandes, {money.format(d.total)}
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-paper shadow-lg z-10"
                >
                  {d.count} commande{d.count > 1 ? "s" : ""} · {money.format(d.total)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 md:gap-3 mt-2">
            {days.map((d) => (
              <span key={d.date.toISOString()} className="flex-1 text-center text-[11px] text-ink/50 capitalize">
                {dayLabel.format(d.date)}
              </span>
            ))}
          </div>
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

function Orders({ orders }: { orders: Stored<Order>[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <SectionHead
        title="Commandes"
        desc="Pour emporter et livraison. Aucun paiement en ligne : le client paie au comptoir ou au livreur."
        onExport={
          orders.length
            ? () =>
                downloadCsv("commandes.csv", [
                  ["No", (o: Stored<Order>) => o.id],
                  ["Date", (o: Stored<Order>) => dateTime.format(new Date(o.createdAt))],
                  ["Mode", (o: Stored<Order>) => o.mode],
                  ["Client", (o: Stored<Order>) => o.name],
                  ["Téléphone", (o: Stored<Order>) => o.phone],
                  ["Adresse", (o: Stored<Order>) => o.address],
                  ["Articles", (o: Stored<Order>) => o.lines.map((l) => `${l.qty}× ${l.name}${l.size ? ` ${l.size}` : ""}`).join(" | ")],
                  ["Code promo", (o: Stored<Order>) => o.promoCode],
                  ["Total", (o: Stored<Order>) => o.total.toFixed(2)],
                  ["Statut", (o: Stored<Order>) => STATUS[o.status].label],
                ] as never, orders)
            : undefined
        }
      />
      {!orders.length ? (
        <Empty text="Aucune commande. Passez une commande sur le site (bouton Commander) pour la voir apparaître ici." />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl bg-paper">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 md:p-5">
                <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="flex-1 min-w-[200px] text-left">
                  <p className="font-semibold">
                    #{o.id} · {o.name}
                    <SampleTag show={o.sample} />
                  </p>
                  <p className="text-sm text-ink/55">
                    {dateTime.format(new Date(o.createdAt))} · {o.mode === "livraison" ? "Livraison" : "Pour emporter"} · {o.when}
                  </p>
                </button>
                <span className="font-display font-bold tabular-nums">{money.format(o.total)}</span>
                <select
                  value={o.status}
                  onChange={(e) => update("orders", o.id, { status: e.target.value as OrderStatus })}
                  aria-label={`Statut de la commande ${o.id}`}
                  className={`rounded-full px-3 py-2 text-xs font-bold border-0 ${STATUS[o.status].cls}`}
                >
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              {open === o.id && (
                <div className="border-t border-ink/10 px-4 md:px-5 py-4 grid md:grid-cols-2 gap-5 text-sm">
                  <ul className="flex flex-col gap-1.5">
                    {o.lines.map((l, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span>
                          {l.qty}× {l.name}
                          {l.size && <span className="text-ink/50"> · {l.size}</span>}
                        </span>
                        <span className="tabular-nums">{money.format(l.price * l.qty)}</span>
                      </li>
                    ))}
                    {o.discount > 0 && (
                      <li className="flex justify-between text-green-700">
                        <span>Rabais {o.promoCode}</span>
                        <span>−{money.format(o.discount)}</span>
                      </li>
                    )}
                  </ul>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                    <dt className="text-ink/50">Téléphone</dt>
                    <dd>
                      <a href={`tel:${o.phone}`} className="font-semibold text-red-600">{o.phone}</a>
                    </dd>
                    {o.email && (
                      <>
                        <dt className="text-ink/50">Courriel</dt>
                        <dd>{o.email}</dd>
                      </>
                    )}
                    {o.address && (
                      <>
                        <dt className="text-ink/50">Adresse</dt>
                        <dd>{o.address}</dd>
                      </>
                    )}
                    {o.notes && (
                      <>
                        <dt className="text-ink/50">Note</dt>
                        <dd>{o.notes}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-paper">
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

function Applications({ rows }: { rows: Data["applications"] }) {
  return (
    <>
      <SectionHead
        title="Candidatures"
        desc="Reçues depuis la page Carrières. En production, chaque candidature est aussi envoyée par courriel au restaurant et le CV est stocké de façon privée."
        onExport={
          rows.length
            ? () =>
                downloadCsv("candidatures.csv", [
                  ["Nom", (r: Data["applications"][number]) => r.name],
                  ["Courriel", (r: Data["applications"][number]) => r.email],
                  ["Téléphone", (r: Data["applications"][number]) => r.phone],
                  ["Message", (r: Data["applications"][number]) => r.message],
                  ["CV", (r: Data["applications"][number]) => r.cv?.name],
                  ["Date", (r: Data["applications"][number]) => dateTime.format(new Date(r.createdAt))],
                ] as never, rows)
            : undefined
        }
      />
      {!rows.length ? (
        <Empty text="Aucune candidature pour l'instant." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {r.name}
                    <SampleTag show={r.sample} />
                  </p>
                  <p className="text-xs text-ink/50">{dateTime.format(new Date(r.createdAt))}</p>
                </div>
                {r.cv &&
                  (r.cv.dataUrl ? (
                    <a href={r.cv.dataUrl} download={r.cv.name} className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper">
                      Télécharger le CV
                    </a>
                  ) : (
                    <span className="shrink-0 rounded-full bg-ink/5 px-3 py-2 text-xs text-ink/60">{r.cv.name}</span>
                  ))}
              </div>
              <p className="mt-3 text-sm text-ink/75 whitespace-pre-line">{r.message}</p>
              <p className="mt-4 text-sm">
                <a href={`mailto:${r.email}`} className="text-red-600 font-semibold">{r.email}</a> ·{" "}
                <a href={`tel:${r.phone}`} className="text-red-600 font-semibold">{r.phone}</a>
              </p>
            </Card>
          ))}
        </div>
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

/** Fills the dashboard with clearly tagged example records so the client can see every view. */
function loadSamples() {
  const ago = (days: number, hours = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(11 + hours, 15 + days * 7, 0, 0);
    return d.toISOString();
  };
  const sampleOrders: [number, number, Order][] = [
    [0, 1, { mode: "livraison", name: "Client exemple A", phone: "514 555-0101", address: "12 rue Exemple", when: "Dès que possible", lines: [{ name: "Pizza Toute garnie", size: 'Large 14"', price: 25.45, qty: 1 }, { name: "Liqueur en canette", price: 2.5, qty: 2 }], subtotal: 30.45, discount: 0, total: 30.45, status: "nouvelle" }],
    [0, 3, { mode: "emporter", name: "Client exemple B", phone: "514 555-0102", when: "18:30", lines: [{ name: "Sous-marin Le Super (tout garni)", size: '10"', price: 16.5, qty: 2 }], subtotal: 33, discount: 3.3, total: 29.7, promoCode: PROMO_CODE, status: "preparation" }],
    [1, 2, { mode: "emporter", name: "Client exemple C", phone: "514 555-0103", when: "Dès que possible", lines: [{ name: "Poutine Toute garnie", size: "Petite", price: 13.95, qty: 2 }], subtotal: 27.9, discount: 0, total: 27.9, status: "terminee" }],
    [2, 4, { mode: "livraison", name: "Client exemple D", phone: "514 555-0104", address: "45 avenue Exemple", when: "Dès que possible", lines: [{ name: "Brochette de poulet (2 bâtons)", price: 24.95, qty: 1 }, { name: "Pizza Toute garnie", size: 'Moyenne 12"', price: 25.45, qty: 1 }], subtotal: 50.4, discount: 0, total: 50.4, status: "terminee" }],
    [3, 1, { mode: "emporter", name: "Client exemple E", phone: "514 555-0105", when: "12:15", lines: [{ name: "Spécial no 3", price: 28.95, qty: 1 }], subtotal: 28.95, discount: 0, total: 28.95, status: "terminee" }],
    [5, 5, { mode: "livraison", name: "Client exemple F", phone: "514 555-0106", address: "8 boulevard Exemple", when: "Dès que possible", lines: [{ name: "Pizza Toute garnie", size: 'Large 14"', price: 25.45, qty: 2 }], subtotal: 50.9, discount: 5.09, total: 45.81, promoCode: PROMO_CODE, status: "terminee" }],
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
  record("applications", { name: "Candidat exemple", email: "candidat@courriel.test", phone: "514 555-0199", message: "Disponible les soirs et fins de semaine, expérience au comptoir.", cv: { name: "cv-exemple.pdf", size: 120000, type: "application/pdf" } }, true);
  record("catering", { name: "Entreprise exemple", email: "evenements@courriel.test", phone: "514 555-0177", eventType: "Événement d'entreprise", date: "2027-03", guests: "40", message: "Dîner d'équipe, pizzas et salades." }, true);
  for (let i = 0; i < 9; i++) record("events", { event: "commander_click", from: "exemple" }, true);
}
