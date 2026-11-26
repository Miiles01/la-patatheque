import { useMemo, useState, type ReactNode } from "react";
import type { Order } from "../../lib/demoStore";
import { promosStore, type Promo, type PromoType } from "../../lib/promos";
import { Card, ConfirmDialog, Empty, inputCls, SectionHead, Toggle } from "./ui";

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

/** Discount codes: create them, give them an end date and a limit of uses, switch them off, see how often they were used. */
/** Inside Marketing ("embedded") the section title comes from Marketing; the intro stays. */
export function PromosView({ orders, embedded = false }: { orders: Order[]; embedded?: boolean }) {
  const promos = promosStore.use();
  const [draft, setDraft] = useState<Promo>(empty);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Promo | null>(null);

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

  const save = (next: Promo[]) => promosStore.set(next);
  const patch = (id: string, change: Partial<Promo>) => save(promos.map((p) => (p.id === id ? { ...p, ...change } : p)));

  function create() {
    const code = draft.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return setError("Écrivez un code (ou cliquez sur « Générer »).");
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setError("Le code ne peut contenir que des lettres, des chiffres, - et _ (3 à 30 caractères).");
    if (promos.some((p) => p.code.toUpperCase() === code)) return setError("Ce code existe déjà.");
    if (!(draft.value > 0)) return setError("La valeur doit être plus grande que 0.");
    if (draft.type === "percent" && draft.value > 100) return setError("Un pourcentage ne peut pas dépasser 100.");
    if (draft.startsAt && draft.expiresAt && draft.expiresAt < draft.startsAt) return setError("La date de fin est avant la date de début.");
    setError("");
    const clean: Promo = { ...draft, code, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` };
    if (!clean.expiresAt) delete clean.expiresAt;
    if (!clean.startsAt) delete clean.startsAt;
    if (!clean.maxUses) delete clean.maxUses;
    if (!clean.minSubtotal) delete clean.minSubtotal;
    if (!clean.note) delete clean.note;
    save([clean, ...promos]);
    setDraft(empty());
  }

  const num = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <>
      {embedded ? (
        <p className="mb-5 max-w-2xl text-sm text-ink/55">
          Créez des codes de rabais pour les commandes en ligne : avec une date de fin, une limite d'utilisations (par exemple les 1000 premiers) et, si vous voulez, une seule utilisation par client.
        </p>
      ) : (
        <SectionHead
          title="Codes promo"
          desc="Créez des codes de rabais pour les commandes en ligne : avec une date de fin, une limite d'utilisations (par exemple les 1000 premiers) et, si vous voulez, une seule utilisation par client."
        />
      )}

      <Card className="mb-6">
        <h2 className="font-display font-bold text-lg mb-4">Nouveau code</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Code">
            <div className="flex gap-2">
              <input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="NOEL15"
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
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <button onClick={create} className="mt-5 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-paper hover:bg-red-700">
          Créer le code
        </button>
      </Card>

      {!promos.length ? (
        <Empty text="Aucun code pour l'instant. Les clients ne peuvent pas utiliser de rabais en ligne." />
      ) : (
        <ul className="flex flex-col gap-3">
          {promos.map((p) => {
            const u = usage.get(p.code.toUpperCase()) ?? { uses: 0, given: 0 };
            const st = statusOf(p, u.uses);
            return (
              <li key={p.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-ink px-3 py-1 font-mono text-sm font-bold tracking-wider text-paper">{p.code}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone[st.tone]}`}>{st.label}</span>
                      </div>
                      <p className="mt-2 text-sm text-ink/70">{describe(p)}</p>
                      <p className="mt-1 text-xs text-ink/50">
                        {p.startsAt ? `Dès le ${dayLabel(p.startsAt)} · ` : ""}
                        {p.expiresAt ? `Jusqu'au ${dayLabel(p.expiresAt)}` : "Sans date de fin"}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl font-extrabold tabular-nums">
                        {u.uses}
                        {p.maxUses ? <span className="text-base font-bold text-ink/45"> / {p.maxUses}</span> : null}
                      </p>
                      <p className="text-xs text-ink/50">utilisations{u.given ? ` · ${money.format(u.given)} offerts` : ""}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 border-t border-ink/10 pt-4 sm:grid-cols-3">
                    <Field label="Expire le">
                      <input type="date" value={p.expiresAt ?? ""} onChange={(e) => patch(p.id, { expiresAt: e.target.value || undefined })} className={inputCls} />
                    </Field>
                    <Field label="Limite d'utilisations" hint="Vide : illimité.">
                      <input
                        type="number"
                        min={1}
                        value={p.maxUses ?? ""}
                        onChange={(e) => patch(p.id, { maxUses: num(e.target.value) })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label={p.type === "percent" ? "Valeur (%)" : "Valeur ($)"}>
                      <input type="number" min={0} step="0.5" value={p.value} onChange={(e) => patch(p.id, { value: Number(e.target.value) })} className={inputCls} />
                    </Field>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-[14rem] flex-1">
                      <Toggle on={p.active} onChange={(v) => patch(p.id, { active: v })} label="Actif" desc="Désactivé : les clients ne peuvent plus l'utiliser." />
                    </div>
                    <button onClick={() => setToDelete(p)} className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600/10">
                      Supprimer
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Supprimer ${toDelete.code} ?`}
          text="Le code ne fonctionnera plus. Les commandes déjà passées avec ce code gardent leur rabais."
          confirmLabel="Supprimer"
          onConfirm={() => {
            save(promos.filter((p) => p.id !== toDelete.id));
            setToDelete(null);
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
