import type { ReactNode } from "react";

// Building blocks shared by the admin panel views.

export const inputCls =
  "w-full rounded-xl border-2 border-ink/15 bg-white px-4 py-3 text-ink focus:border-red-600 focus:outline-none transition-colors";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white border border-ink/10 p-5 md:p-6 ${className}`}>{children}</section>;
}

export function SectionHead({ title, desc, onExport }: { title: string; desc?: string; onExport?: () => void }) {
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

export function Empty({ text }: { text: string }) {
  return <Card className="text-center text-ink/50 py-14">{text}</Card>;
}

export function Toggle({ on, onChange, label, desc, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string; disabled?: boolean }) {
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

/** Shown at the top of a section that is one of the Essentiels until the owner confirms it. */
export function EssentialBanner({ done, text, onConfirm }: { done: boolean; text: string; onConfirm: () => void }) {
  if (done) {
    return (
      <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-green-700/10 px-3 py-1.5 text-xs font-bold text-green-800">
        ✓ Essentiel vérifié
      </p>
    );
  }
  return (
    <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-red-600/25 bg-red-600/5 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-paper">!</span>
      <p className="flex-1 text-sm text-ink/80">
        <strong>Essentiel :</strong> {text}
      </p>
      <button onClick={onConfirm} className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-paper hover:bg-red-700">
        C'est vérifié
      </button>
    </div>
  );
}
