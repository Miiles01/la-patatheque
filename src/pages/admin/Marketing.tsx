import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PopupCard } from "../../components/PromoPopup";
import { DEFAULT_POPUP, popupStore, usePopup, type PopupConfig, type PopupTexts } from "../../lib/popup";
import { ActivationButton, Card, inputCls, SectionHead, SegmentedTabs } from "./ui";

// Marketing: the email pop-up (on/off, texts in French and English, live preview)
// and the contacts it collects.

type Sub = "popup" | "contacts";

const FIELDS: { key: keyof PopupTexts; label: string; hint?: string; long?: boolean }[] = [
  { key: "kicker", label: "Petit titre", hint: "En écriture manuscrite, au-dessus du titre." },
  { key: "title", label: "Titre" },
  { key: "text", label: "Texte", hint: "Sous le titre, à l'ordinateur.", long: true },
  { key: "submit", label: "Bouton" },
  { key: "success", label: "Message après l'inscription", long: true },
  { key: "note", label: "Petite note après l'inscription (facultatif)", hint: "Date du tirage, règlement…", long: true },
];

export function MarketingView({ contacts }: { contacts: ReactNode }) {
  const [sub, setSub] = useState<Sub>("popup");
  const saved = usePopup();

  return (
    <>
      <SectionHead title="Marketing" desc="Le pop-up que voient les nouveaux visiteurs, et les contacts qu'il vous apporte." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          id="marketing-view"
          label="Section"
          value={sub}
          onChange={setSub}
          items={[
            { id: "popup", label: "Pop-up", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h6M7 14h10" strokeLinecap="round" /></> },
            { id: "contacts", label: "Contacts", icon: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 7.5h4.5M16 11h4.5" strokeLinecap="round" /></> },
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
      {sub === "popup" ? <PopupEditor saved={saved} /> : contacts}
    </>
  );
}

function PopupEditor({ saved }: { saved: PopupConfig }) {
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
        <label className="flex items-start gap-3 rounded-xl bg-ink/[0.03] p-3 text-sm">
          <input
            type="checkbox"
            checked={draft.showCode}
            onChange={(e) => {
              setPublished(false);
              setDraft((d) => ({ ...d, showCode: e.target.checked }));
            }}
            className="mt-0.5 h-4 w-4 accent-red-600"
          />
          <span>
            <span className="font-semibold">Donner le code de bienvenue après l'inscription</span>
            <span className="block text-xs text-ink/55">Pour une offre de 10 % : le code BIENVENUE10 s'affiche à la place du message.</span>
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
        <ScaledPreview>
          <PopupCard texts={draft[lang]} showCode={draft.showCode} done={stage === "done"} onClose={() => {}} preview />
        </ScaledPreview>
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
