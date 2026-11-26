import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CodeCard, PopupCard } from "../../components/PromoPopup";
import type { Order } from "../../lib/demoStore";
import { promosStore } from "../../lib/promos";
import { PromosView } from "./Promos";
import { DEFAULT_POPUP, popupStore, usePopup, type PopupConfig, type PopupTexts } from "../../lib/popup";
import { ActivationButton, Card, inputCls, SectionHead, SegmentedTabs } from "./ui";

// Marketing: the email pop-up (on/off, texts in French and English, live preview)
// and the contacts it collects.

type Sub = "popup" | "contacts" | "promos";

const FIELDS: { key: keyof PopupTexts; label: string; hint?: string; long?: boolean }[] = [
  { key: "kicker", label: "Petit titre", hint: "En écriture manuscrite, au-dessus du titre." },
  { key: "title", label: "Titre" },
  { key: "text", label: "Texte", hint: "Sous le titre, à l'ordinateur.", long: true },
  { key: "submit", label: "Bouton" },
  { key: "success", label: "Message après l'inscription", long: true },
  { key: "note", label: "Petite note après l'inscription (facultatif)", hint: "Date du tirage, règlement…", long: true },
];

export function MarketingView({ contacts, orders, can }: { contacts: ReactNode; orders: Order[]; can: { contacts: boolean; promos: boolean } }) {
  const [sub, setSub] = useState<Sub>(can.contacts ? "popup" : "promos");
  const saved = usePopup();

  return (
    <>
      <SectionHead title="Marketing" desc="Le pop-up que voient les nouveaux visiteurs, les contacts qu'il vous apporte et vos codes promo." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          id="marketing-view"
          label="Section"
          value={sub}
          onChange={setSub}
          items={[
            ...(can.contacts
              ? ([
                  { id: "popup", label: "Pop-up", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h6M7 14h10" strokeLinecap="round" /></> },
                  { id: "contacts", label: "Contacts", icon: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 7.5h4.5M16 11h4.5" strokeLinecap="round" /></> },
                ] as const)
              : []),
            ...(can.promos
              ? ([
                  {
                    id: "promos",
                    label: "Codes promo",
                    icon: <><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z" strokeLinejoin="round" /><circle cx="8" cy="8" r="1.5" /></>,
                  },
                ] as const)
              : []),
          ]}
        />
        {sub === "popup" && (
          <ActivationButton
            on={saved.enabled}
            what="le pop-up"
            status={{ on: "Pop-up affiché aux nouveaux visiteurs", off: "Pop-up désactivé" }}
            onChange={(enabled) => popupStore.set({ ...saved, enabled })}
          />
        )}
      </div>
      {sub === "popup" && <PopupEditor saved={saved} />}
      {sub === "contacts" && contacts}
      {sub === "promos" && <PromosView orders={orders} embedded />}
    </>
  );
}

function PopupEditor({ saved }: { saved: PopupConfig }) {
  const promos = promosStore.use();
  const [draft, setDraft] = useState<PopupConfig>(saved);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [stage, setStage] = useState<"form" | "done">("form");
  const [published, setPublished] = useState(false);

  const changed = JSON.stringify({ ...draft, enabled: 0, campaign: 0 }) !== JSON.stringify({ ...saved, enabled: 0, campaign: 0 });
  const setText = (key: keyof PopupTexts, value: string) => {
    setPublished(false);
    setDraft((d) => ({ ...d, [lang]: { ...d[lang], [key]: value } }));
  };

  function publish() {
    // A new campaign id: visitors who already saw the old pop-up will see this one, once.
    popupStore.set({ ...draft, enabled: saved.enabled, campaign: `c-${Date.now().toString(36)}` });
    setPublished(true);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg">Textes</h2>
          <SegmentedTabs
            id="popup-lang"
            label="Langue"
            value={lang}
            onChange={setLang}
            items={[
              { id: "fr", label: "Français" },
              { id: "en", label: "English" },
            ]}
          />
        </div>
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5 text-sm font-medium">
            {f.label}
            {f.long ? (
              <textarea value={draft[lang][f.key]} onChange={(e) => setText(f.key, e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            ) : (
              <input value={draft[lang][f.key]} onChange={(e) => setText(f.key, e.target.value)} className={inputCls} />
            )}
            {f.hint && <span className="text-xs font-normal text-ink/45">{f.hint}</span>}
          </label>
        ))}
        <label className="flex flex-col gap-1.5 rounded-xl bg-ink/[0.03] p-3 text-sm font-medium">
          Code promo offert après l'inscription
          <select
            value={draft.code}
            onChange={(e) => {
              setPublished(false);
              setDraft((d) => ({ ...d, code: e.target.value }));
            }}
            className={inputCls}
          >
            <option value="">Aucun code (concours, infolettre…)</option>
            {promos.map((p) => (
              <option key={p.id} value={p.code} disabled={!p.active}>
                {p.code} · {p.type === "percent" ? `${p.value} %` : `${p.value} $`}
                {p.active ? "" : " (inactif)"}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-ink/50">
            Avec un code, le pop-up se ferme après l'inscription et une petite fenêtre affiche le code, avec « Copier » et « Utiliser maintenant » (qui l'applique au panier quand les commandes en ligne sont ouvertes). Créez vos codes dans l'onglet Codes promo.
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={publish}
            disabled={!changed}
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            Publier
          </button>
          {changed && (
            <button onClick={() => setDraft(saved)} className="rounded-full px-4 py-3 text-sm font-bold text-ink/60 hover:bg-ink/5">
              Annuler les changements
            </button>
          )}
          {published && !changed && <span className="text-sm font-semibold text-green-700">Publié ✓</span>}
          <button
            onClick={() => {
              setPublished(false);
              setDraft({ ...DEFAULT_POPUP, enabled: draft.enabled });
            }}
            className="ml-auto text-xs font-bold text-ink/45 hover:text-ink"
          >
            Textes par défaut
          </button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg">
            Aperçu <span className="text-sm font-normal text-ink/45">({lang === "fr" ? "français" : "anglais"})</span>
          </h2>
          <SegmentedTabs
            id="popup-stage"
            label="Étape"
            value={stage}
            onChange={setStage}
            items={[
              { id: "form", label: "Formulaire" },
              { id: "done", label: "Après l'inscription" },
            ]}
          />
        </div>
        {stage === "done" && draft.code ? (
          // The small code card is shown at its real size (it isn't scaled down like the big pop-up).
          <div className="flex justify-center rounded-2xl bg-ink/[0.04] px-4 py-10">
            <div className="w-full max-w-[26rem]" inert>
              <CodeCard code={draft.code} texts={draft[lang]} onClose={() => {}} preview />
            </div>
          </div>
        ) : (
          <ScaledPreview>
            <PopupCard texts={draft[lang]} done={stage === "done"} onClose={() => {}} preview />
          </ScaledPreview>
        )}
        <p className="text-xs text-ink/45">
          L'aperçu reprend exactement le pop-up du site (mêmes polices et couleurs). Sur téléphone, la photo passe en haut et le texte en dessous.
        </p>
      </Card>
    </div>
  );
}

/** Shows the full-size card (1180 px wide on a computer) shrunk to fit the column. */
function ScaledPreview({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 0.5, height: 330 });

  useLayoutEffect(() => {
    const measure = () => {
      if (!box.current || !inner.current) return;
      const scale = Math.min(1, box.current.clientWidth / inner.current.offsetWidth);
      setSize({ scale, height: inner.current.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="relative overflow-hidden rounded-2xl" style={{ height: size.height }}>
      <div ref={inner} className="pointer-events-none absolute left-0 top-0 origin-top-left md:w-max" style={{ transform: `scale(${size.scale})` }} inert>
        {children}
      </div>
    </div>
  );
}
