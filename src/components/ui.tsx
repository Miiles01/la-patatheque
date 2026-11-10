import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Italic serif accent used inside headings, as in an editorial menu card. */
export function Alt({ children, className = "text-red-600" }: { children: ReactNode; className?: string }) {
  return <span className={`alt ${className}`}>{children}</span>;
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-8 py-4 text-sm font-bold text-paper hover:bg-red-700 transition-colors disabled:opacity-60";
export const btnLight =
  "inline-flex items-center justify-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-bold text-red-700 hover:bg-cream transition-colors";
export const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 text-sm font-bold text-ink hover:border-red-600 hover:text-red-600 transition-colors";

export const headingXl = "font-display font-extrabold text-ink text-[clamp(2.4rem,6vw,5rem)] leading-[1.02] tracking-[-0.025em]";
export const headingLg = "font-display font-extrabold text-ink text-[clamp(2.2rem,4.4vw,4rem)] leading-[1.05] tracking-[-0.02em]";

/** Top of every inner page: script kicker, big heading, short intro. */
export function PageHero({
  kicker,
  title,
  alt,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  alt?: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 md:px-10 pt-32 md:pt-44 pb-12 md:pb-20">
        <p data-fade data-intro className="script text-red-600 text-5xl md:text-6xl mb-4">
          {kicker}
        </p>
        <h1 data-reveal data-intro className={`${headingXl} max-w-4xl`}>
          {title} {alt && <Alt>{alt}</Alt>}
        </h1>
        {intro && (
          <p data-fade="0.2" data-intro className="mt-8 max-w-2xl text-lg leading-relaxed text-ink/70">
            {intro}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

const field =
  "w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink/35 focus:border-red-600 focus:outline-none transition-colors";

function Label({ label, optional, children }: { label: string; optional?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      <span>
        {label}
        {optional && <span className="text-ink/45 font-normal"> ({optional})</span>}
      </span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  optional,
  ...props
}: { label: string; optional?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Label label={label} optional={optional}>
      <input {...props} className={field} />
    </Label>
  );
}

export function TextArea({
  label,
  optional,
  ...props
}: { label: string; optional?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Label label={label} optional={optional}>
      <textarea rows={3} {...props} className={field} />
    </Label>
  );
}

export function SelectField({
  label,
  options,
  ...props
}: { label: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Label label={label}>
      <select {...props} className={field}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Label>
  );
}

export function Consent({ text, ...props }: { text: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-start gap-3 text-sm text-ink/70 leading-snug cursor-pointer">
      <input type="checkbox" {...props} className="mt-0.5 h-5 w-5 shrink-0 accent-red-600" />
      <span>{text}</span>
    </label>
  );
}

export function Success({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-cream p-8 md:p-10 text-center" role="status">
      <p className="script text-red-600 text-5xl mb-3">{title}</p>
      <p className="text-ink/75 max-w-md mx-auto">{text}</p>
      {children}
    </div>
  );
}
