import { Fragment, type ReactNode } from "react";
import { PageHero } from "../components/ui";
import en from "../content/privacy.en.md?raw";
import fr from "../content/privacy.fr.md?raw";
import { useI18n } from "../lib/i18n";

// The privacy policy, kept as plain text in src/content (one file per language)
// so it can be updated without touching the page. Only the few markdown forms
// those files use are rendered: # and ## headings, "- " lists, **bold** and
// lines ending a block of contact details.

/** **bold** spans and bare email / web addresses as links. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{inline(part.slice(2, -2))}</strong>;
    return part.split(/([\w.+-]+@[\w-]+\.[\w.]+|www\.[\w.-]+\.[a-z]{2,}(?:\/\S*)?)/g).map((piece, j) => {
      if (piece.includes("@")) return <a key={`${i}-${j}`} href={`mailto:${piece}`} className="text-red-600 underline underline-offset-2">{piece}</a>;
      if (piece.startsWith("www.")) return <a key={`${i}-${j}`} href={`https://${piece.replace(/[).]$/, "")}`} target="_blank" rel="noreferrer" className="text-red-600 underline underline-offset-2">{piece}</a>;
      return <Fragment key={`${i}-${j}`}>{piece}</Fragment>;
    });
  });
}

function render(md: string) {
  const blocks = md.trim().split(/\n\s*\n/);
  const title = blocks[0].replace(/^#\s+/, "");
  const effective = blocks[1];
  const body = blocks.slice(2).map((block, i) => {
    const lines = block.split("\n");
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-12 mb-4 font-display font-extrabold text-2xl md:text-3xl tracking-[-0.01em]">
          {block.slice(3)}
        </h2>
      );
    }
    if (lines.every((l) => l.startsWith("- "))) {
      return (
        <ul key={i} className="my-4 flex flex-col gap-2 pl-5 list-disc marker:text-red-600">
          {lines.map((l, j) => (
            <li key={j}>{inline(l.slice(2))}</li>
          ))}
        </ul>
      );
    }
    // Several lines in one block (an address): keep the line breaks.
    return (
      <p key={i} className="my-4">
        {lines.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(l)}
          </Fragment>
        ))}
      </p>
    );
  });
  return { title, effective, body };
}

export function PrivacyPage() {
  const { lang } = useI18n();
  const { title, effective, body } = render(lang === "en" ? en : fr);

  return (
    <>
      {/* Keyed by language: the heading animation splits the text once, so it is rebuilt on a switch. */}
      <PageHero key={lang} kicker={lang === "en" ? "Your data" : "Vos données"} title={title} />
      <section className="bg-paper pb-24 md:pb-36">
        {/* Lined up with the page title, at a comfortable reading width. */}
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <article className="max-w-3xl text-[17px] leading-relaxed text-ink/80">
            <p className="mb-8 text-sm text-ink/55">{inline(effective)}</p>
            {body}
          </article>
        </div>
      </section>
    </>
  );
}
