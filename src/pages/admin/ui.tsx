import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";

// Building blocks shared by the admin panel views.

export const inputCls =
  "w-full rounded-xl border-2 border-ink/15 bg-white px-4 py-3 text-ink focus:border-red-600 focus:outline-none transition-colors";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white border border-ink/10 p-5 md:p-6 ${className}`}>{children}</section>;
}

export function SectionHead({ title, desc, onExport, action }: { title: string; desc?: string; onExport?: () => void; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display font-extrabold text-3xl">{title}</h1>
        {desc && <p className="text-sm text-ink/55 mt-1 max-w-xl">{desc}</p>}
      </div>
      {action}
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

/** Asks before a change that can't be undone (deleting something). */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/50 p-5" onClick={onCancel} data-lenis-prevent>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-7 text-ink shadow-xl"
      >
        <h2 id="confirm-title" className="font-display font-extrabold text-xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink/60">{text}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} autoFocus className="rounded-full px-5 py-2.5 text-sm font-bold text-ink/70 hover:bg-ink/5">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Suppression…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const SPRING = { type: "spring", stiffness: 600, damping: 28 } as const;

/**
 * Buttons that open an editor: what it edits as an icon on the left at rest; on
 * hover that icon slides away and a pencil slides in on the right.
 */
export function EditButton({
  label,
  icon,
  onClick,
  title,
  className = "",
}: {
  label: string;
  /** SVG content (24×24 viewBox) of what the button edits. */
  icon: ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className={`relative inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-bold text-ink/75 hover:border-ink/35 hover:text-ink transition-colors duration-150 ${className}`}
    >
      <AnimatePresence mode="popLayout">
        {!hover && (
          <motion.span
            key="icon"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={SPRING}
            className="mr-2.5 flex shrink-0 items-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              {icon}
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
      {/* The label glides over as the icons swap sides. */}
      <motion.span layout transition={SPRING} className="tracking-tight">
        {label}
      </motion.span>
      <AnimatePresence mode="popLayout">
        {hover && (
          <motion.span
            key="pencil"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={SPRING}
            className="ml-2.5 flex shrink-0 items-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16z" strokeLinejoin="round" />
              <path d="m13 7 4 4" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
