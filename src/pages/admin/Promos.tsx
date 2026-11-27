import { useMemo, useState, type ReactNode } from "react";
import type { Order } from "../../lib/demoStore";
import { promosStore, type Promo, type PromoType } from "../../lib/promos";
import { BackButton, Card, ConfirmDialog, inputCls, SectionHead, Toggle } from "./ui";

const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
const dayFmt = new Intl.DateTimeFormat("fr-CA", { dateStyle: "long" });

const today = () => new Date().toISOString().slice(0, 10);
const dayLabel = (iso: string) => dayFmt.format(new Date(`${iso}T12:00:00`));

function randomCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `PAT-${s}`;
}

function describe(p: Promo) {
  const bits = [p.type === "amount" ? `${money.format(p.value)} de rabais` : `${p.value} % de rabais`];
  if (p.minSubtotal) bits.push(`dès ${money.format(p.minSubtotal)}`);
  if (p.oncePerCustomer) bits.push("une fois par client");
  return bits.join(" · ");
}

type Status = { label: string; tone: "ok" | "off" | "warn" };

function statusOf(p: Promo, uses: number): Status {
  if (!p.active) return { label: "Désactivé", tone: "off" };
  if (p.expiresAt && today() > p.expiresAt) return { label: "Expiré", tone: "warn" };
  if (p.maxUses && uses >= p.maxUses) return { label: "Épuisé", tone: "warn" };
  if (p.startsAt && today() < p.startsAt) return { label: "Pas encore actif", tone: "off" };
  return { label: "Actif", tone: "ok" };
}

const tone = {
  ok: "bg-green-700/10 text-green-800",
  off: "bg-ink/10 text-ink/60",
  warn: "bg-red-600/10 text-red-700",
} as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
      {label}
      {children}
      {hint && <span className="font-normal text-ink/45">{hint}</span>}
    </label>
  );
}

const empty = (): Promo => ({ id: "", code: "", type: "percent", value: 10, active: true });

/**
 * Discount codes as cards (adding one always first). A code opens on its own screen to
 * change, switch off or delete it; a new one is filled in there too, then OK goes back.
 * Inside Marketing ("embedded") the section title comes from Marketing; the intro stays.
 */
export function PromosView({ orders, embedded = false }: { orders: Order[]; embedded?: boolean }) {
  const promos = promosStore.use();
  // null: the cards; "new": adding; otherwise the id of the code open.
  const [screen, setScreen] = useState<string | null>(null);

  // How often each code was used, and the discount it gave away.
  const usage = useMemo(() => {
    const m = new Map<string, { uses: number; given: number }>();
    for (const o of orders) {
      if (!o.promoCode) continue;
      const k = o.promoCode.toUpperCase();
      const cur = m.get(k) ?? { uses: 0, given: 0 };
      cur.uses += 1;
      cur.given += o.discount ?? 0;
      m.set(k, cur);
    }
    return m;
  }, [orders]);
  const usageOf = (p: Promo) => usage.get(p.code.toUpperCase()) ?? { uses: 0, given: 0 };

  const intro = "Créez des codes de rabais pour les commandes en ligne : avec une date de fin, une limite d'utilisations (par exemple les 1000 premiers) et, si vous voulez, une seule utilisation par client.";
  const open = screen && screen !== "new" ? promos.find((p) => p.id === screen) : undefined;

  if (screen === "new" || open) {
    return <PromoForm key={screen} promos={promos} promo={open} usage={open ? usageOf(open) : undefined} onDone={() => setScreen(null)} />;
  }

  return (
    <>
      {embedded ? <p className="mb-5 max-w-2xl text-sm text-ink/55">{intro}</p> : <SectionHead title="Codes promo" desc={intro} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Always the first card. */}
        <button
          onClick={() => setScreen("new")}
          className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 text-ink/50 transition-colors hover:border-red-600 hover:text-red-600"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-2xl leading-none text-paper">+</span>
          <span className="font-bold">Nouveau code</span>
        </button>
        {promos.map((p) => {
          const u = usageOf(p);
          const st = statusOf(p, u.uses);
          return (
            <button
              key={p.id}
              onClick={() => setScreen(p.id)}
              className={`flex min-h-[190px] flex-col rounded-2xl border border-ink/10 bg-white p-5 text-left transition-colors hover:border-ink/30 ${st.tone === "ok" ? "" : "opacity-75"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-lg bg-ink px-3 py-1 font-mono text-sm font-bold tracking-wider text-paper">{p.code}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${tone[st.tone]}`}>{st.label}</span>
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-red-600">{p.type === "amount" ? `−${money.format(p.value)}` : `−${p.value} %`}</p>
              <p className="mt-1 text-sm text-ink/60">{describe(p).split(" · ").slice(1).join(" · ") || "Sur toute commande"}</p>
              <div className="mt-auto flex items-end justify-between gap-2 border-t border-ink/10 pt-3 text-xs text-ink/50">
                <span>{p.expiresAt ? `Jusqu'au ${dayLabel(p.expiresAt)}` : "Sans date de fin"}</span>
                <span className="font-semibold tabular-nums text-ink/70">
                  {u.uses}
                  {p.maxUses ? ` / ${p.maxUses}` : ""} utilisation{u.uses > 1 ? "s" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {!promos.length && <p className="mt-4 text-sm text-ink/50">Aucun code pour l'instant : les clients ne peuvent pas utiliser de rabais en ligne.</p>}
    </>
  );
}

/** One code on its own screen: a new one, or one to change, switch off or delete. */
function PromoForm({ promos, promo, usage, onDone }: { promos: Promo[]; promo?: Promo; usage?: { uses: number; given: number }; onDone: () => void }) {
  const [draft, setDraft] = useState<Promo>(() => promo ?? empty());
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const num = (v: string) => (v === "" ? undefined : Number(v));

  function ok() {
    const code = draft.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return setError("Écrivez un code (ou cliquez sur « Générer »).");
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setError("Le code ne peut contenir que des lettres, des chiffres, - et _ (3 à 30 caractères).");
    if (promos.some((p) => p.id !== promo?.id && p.code.toUpperCase() === code)) return setError("Ce code existe déjà.");
    if (!(draft.value > 0)) return setError("La valeur doit être plus grande que 0.");
    if (draft.type === "percent" && draft.value > 100) return setError("Un pourcentage ne peut pas dépasser 100.");
    if (draft.startsAt && draft.expiresAt && draft.expiresAt < draft.startsAt) return setError("La date de fin est avant la date de début.");
    const clean: Promo = { ...draft, code, id: promo?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` };
    for (const k of ["expiresAt", "startsAt", "maxUses", "minSubtotal", "note"] as const) if (!clean[k]) delete clean[k];
    promosStore.set(promo ? promos.map((p) => (p.id === promo.id ? clean : p)) : [clean, ...promos]);
    onDone();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="self-start">
        <BackButton label="Codes promo" onClick={onDone} />
      </div>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ok();
          }}
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold">{promo ? promo.code : "Nouveau code"}</h2>
            {usage && (
              <p className="text-right text-sm text-ink/55">
                <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
                  {usage.uses}
                  {promo?.maxUses ? <span className="text-base text-ink/45"> / {promo.maxUses}</span> : null}
                </span>{" "}
                utilisations{usage.given ? ` · ${money.format(usage.given)} offerts` : ""}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Code" hint={promo ? "Changer le code : l'ancien ne marchera plus." : undefined}>
              <div className="flex gap-2">
                <input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                  placeholder="NOEL15"
                  autoFocus={!promo}
                  className={`${inputCls} uppercase`}
                  maxLength={30}
                />
                <button type="button" onClick={() => setDraft({ ...draft, code: randomCode() })} className="shrink-0 rounded-xl bg-ink/5 px-3 text-xs font-bold hover:bg-ink/10">
                  Générer
                </button>
              </div>
            </Field>
            <Field label="Type de rabais">
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as PromoType })} className={inputCls}>
                <option value="percent">Pourcentage (%)</option>
                <option value="amount">Montant fixe ($)</option>
              </select>
            </Field>
            <Field label={draft.type === "percent" ? "Valeur (%)" : "Valeur ($)"}>
              <input type="number" min={0} step="0.5" value={draft.value || ""} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Expire le (dernier jour valide)" hint="Laissez vide : sans date de fin.">
              <input type="date" value={draft.expiresAt ?? ""} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || undefined })} className={inputCls} />
            </Field>
            <Field label="Limite d'utilisations" hint="Ex. 1000 = les 1000 premières commandes. Vide : illimité.">
              <input type="number" min={1} step="1" value={draft.maxUses ?? ""} onChange={(e) => setDraft({ ...draft, maxUses: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Commande minimale ($, avant taxes)" hint="Vide : aucun minimum.">
              <input type="number" min={0} step="1" value={draft.minSubtotal ?? ""} onChange={(e) => setDraft({ ...draft, minSubtotal: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Valide à partir du" hint="Vide : dès maintenant.">
              <input type="date" value={draft.startsAt ?? ""} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value || undefined })} className={inputCls} />
            </Field>
            <Field label="Note interne (facultatif)">
              <input value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value || undefined })} placeholder="Ex. campagne Instagram" className={inputCls} />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={!!draft.oncePerCustomer} onChange={(e) => setDraft({ ...draft, oncePerCustomer: e.target.checked })} className="h-4 w-4 accent-red-600" />
            Une seule utilisation par client (même téléphone ou même courriel)
          </label>
          {promo && (
            <div className="mt-2 max-w-md">
              <Toggle on={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Actif" desc="Désactivé : les clients ne peuvent plus l'utiliser." />
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-5">
            <button type="submit" className="rounded-full bg-red-600 px-8 py-3.5 text-sm font-bold text-paper hover:bg-red-700">
              {promo ? "OK" : "Créer le code"}
            </button>
            <button type="button" onClick={onDone} className="rounded-full px-5 py-3.5 text-sm font-bold text-ink/60 hover:bg-ink/5">
              Annuler
            </button>
            {promo && (
              <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto rounded-full px-5 py-3.5 text-sm font-bold text-red-600 hover:bg-red-600/10">
                Supprimer le code
              </button>
            )}
          </div>
        </form>
      </Card>

      {confirmDelete && promo && (
        <ConfirmDialog
          title={`Supprimer ${promo.code} ?`}
          text="Le code ne fonctionnera plus. Les commandes déjà passées avec ce code gardent leur rabais."
          confirmLabel="Supprimer"
          onConfirm={() => {
            promosStore.set(promos.filter((p) => p.id !== promo.id));
            onDone();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
