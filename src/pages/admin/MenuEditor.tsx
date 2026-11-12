import { useRef, useState } from "react";
import { dishVisual, type MenuCategory, type MenuItem } from "../../data/menu";
import { asset } from "../../lib/asset";
import { essentialsStore, markEssential } from "../../lib/essentials";
import { compressPhoto, menuStore } from "../../lib/menuStore";
import { Card, EssentialBanner, SectionHead } from "./ui";

const SPECIALS = "__specials";
const field = "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none";

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.8" />
      {off && <path d="M4 20 20 4" strokeLinecap="round" />}
    </svg>
  );
}

/** Photo slot: shows the dish photo (or the category tile) and opens a file picker on click. */
function PhotoSlot({ item, category, onChange }: { item: MenuItem; category: string; onChange: (photo?: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const visual = dishVisual(category);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => input.current?.click()}
        title={item.photo ? "Changer la photo" : "Ajouter une photo"}
        className="group relative h-16 w-16 overflow-hidden rounded-xl border border-dashed border-ink/20 bg-ink/[0.03] hover:border-red-600"
      >
        {item.photo ? (
          <img src={item.photo} alt="" className="h-full w-full object-cover" />
        ) : visual.image ? (
          <img src={asset(visual.image)} alt="" className="h-full w-full object-contain p-1 opacity-50" />
        ) : null}
        <span
          className={`absolute inset-0 flex flex-col items-center justify-center text-[10px] font-bold ${
            item.photo ? "bg-ink/40 text-paper opacity-0 group-hover:opacity-100" : "text-ink/50"
          }`}
        >
          {busy ? "…" : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
                <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              {item.photo ? "Changer" : "Photo"}
            </>
          )}
        </span>
      </button>
      {item.photo && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="Retirer la photo"
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-ink text-[11px] font-bold text-paper"
        >
          ×
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            onChange(await compressPhoto(file));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

export function MenuEditor() {
  const menu = menuStore.use();
  const essentials = essentialsStore.use();
  const [selected, setSelected] = useState(menu.categories[0]?.id ?? SPECIALS);
  const category = menu.categories.find((c) => c.id === selected);

  const saveCategory = (id: string, patch: Partial<MenuCategory>) =>
    menuStore.set({ ...menu, categories: menu.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const saveItem = (cat: MenuCategory, index: number, patch: Partial<MenuItem>) =>
    saveCategory(cat.id, { items: cat.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });

  return (
    <>
      <SectionHead
        title="Menu"
        desc="Ce que les clients voient et commandent sur le site. Chaque modification s'affiche tout de suite."
      />
      <EssentialBanner
        done={essentials.menu}
        text="parcourez vos sections, vérifiez les plats et les prix, puis confirmez."
        onConfirm={() => markEssential("menu")}
      />

      <div className="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
        <Card className="!p-2 lg:sticky lg:top-24">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto [scrollbar-width:none]">
            {menu.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`shrink-0 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  selected === c.id ? "bg-red-600/8 text-red-600" : "text-ink/70 hover:bg-ink/5"
                } ${c.hidden ? "opacity-50" : ""}`}
              >
                <span className="truncate">{c.name}</span>
                <span className="text-xs font-normal text-ink/40">{c.items.filter((i) => !i.hidden).length}</span>
              </button>
            ))}
            <button
              onClick={() => setSelected(SPECIALS)}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                selected === SPECIALS ? "bg-red-600/8 text-red-600" : "text-ink/70 hover:bg-ink/5"
              }`}
            >
              Super spéciaux
            </button>
          </nav>
        </Card>

        {category ? (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-[200px] flex flex-col gap-1 text-xs font-semibold text-ink/60">
                  Nom de la section
                  <input value={category.name} onChange={(e) => saveCategory(category.id, { name: e.target.value })} className={field} />
                </label>
                <button
                  onClick={() => saveCategory(category.id, { hidden: !category.hidden })}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
                    category.hidden ? "bg-ink/5 text-ink/60" : "bg-green-700/10 text-green-800"
                  }`}
                >
                  <EyeIcon off={category.hidden} />
                  {category.hidden ? "Section masquée" : "Visible sur le site"}
                </button>
              </div>
              <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-ink/60">
                Note sous le titre
                <input value={category.note ?? ""} onChange={(e) => saveCategory(category.id, { note: e.target.value || undefined })} className={field} />
              </label>
              <div className="mt-3">
                <p className="text-xs font-semibold text-ink/60 mb-1">Formats</p>
                <div className="flex flex-wrap gap-2">
                  {category.sizes.map((size, i) => (
                    <input
                      key={i}
                      value={size}
                      onChange={(e) => saveCategory(category.id, { sizes: category.sizes.map((s, j) => (j === i ? e.target.value : s)) })}
                      className="w-28 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold focus:border-red-600 focus:outline-none"
                      aria-label={`Format ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </Card>

            <ul className="flex flex-col gap-3">
              {category.items.map((item, i) => (
                <li key={i} className={`rounded-2xl bg-white border border-ink/10 p-4 ${item.hidden ? "opacity-55" : ""}`}>
                  <div className="flex gap-4">
                    <PhotoSlot item={item} category={category.id} onChange={(photo) => saveItem(category, i, { photo })} />
                    <div className="flex-1 min-w-0 grid gap-2">
                      <div className="flex gap-2">
                        <input value={item.name} onChange={(e) => saveItem(category, i, { name: e.target.value })} className={`${field} font-semibold`} aria-label="Nom du plat" />
                        <button
                          onClick={() => saveItem(category, i, { hidden: !item.hidden })}
                          title={item.hidden ? "Afficher sur le site" : "Masquer du site"}
                          className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-lg ${item.hidden ? "bg-ink/5 text-ink/50" : "text-green-700 hover:bg-green-700/10"}`}
                        >
                          <EyeIcon off={item.hidden} />
                        </button>
                        <button
                          onClick={() => window.confirm(`Supprimer « ${item.name} » ?`) && saveCategory(category.id, { items: category.items.filter((_, j) => j !== i) })}
                          title="Supprimer"
                          className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-ink/40 hover:bg-red-600/10 hover:text-red-600"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" aria-hidden="true">
                            <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                      <input
                        value={item.desc ?? ""}
                        placeholder="Description (facultatif)"
                        onChange={(e) => saveItem(category, i, { desc: e.target.value || undefined })}
                        className={field}
                        aria-label="Description"
                      />
                      <div className="flex flex-wrap gap-2">
                        {category.sizes.map((size, j) => (
                          <label key={j} className="flex items-center gap-1.5 rounded-lg bg-ink/[0.03] pl-2.5 pr-1 py-1 text-xs text-ink/60">
                            {size}
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={item.prices[j] ?? ""}
                              placeholder="—"
                              onChange={(e) =>
                                saveItem(category, i, {
                                  prices: category.sizes.map((_, k) => (k === j ? (e.target.value === "" ? null : Number(e.target.value)) : item.prices[k] ?? null)),
                                })
                              }
                              className="w-20 rounded-md border border-ink/15 bg-white px-2 py-1 text-right text-sm font-semibold text-ink tabular-nums focus:border-red-600 focus:outline-none"
                            />
                            $
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() =>
                saveCategory(category.id, { items: [...category.items, { name: "Nouveau plat", prices: category.sizes.map(() => null) }] })
              }
              className="self-start rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-paper hover:bg-red-700"
            >
              + Ajouter un plat
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink/60">Les 3 spéciaux « En vedette » apparaissent en grand sur l'accueil.</p>
            {menu.specials.map((s, i) => (
              <div key={s.id} className={`rounded-2xl bg-white border border-ink/10 p-4 flex flex-wrap items-center gap-3 ${s.hidden ? "opacity-55" : ""}`}>
                <span className="w-9 font-display font-black text-red-600">{s.id}</span>
                <input
                  value={s.name}
                  onChange={(e) => menuStore.set({ ...menu, specials: menu.specials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                  className={`${field} flex-1 min-w-[220px]`}
                  aria-label={`Spécial ${s.id}`}
                />
                <label className="flex items-center gap-1 text-xs text-ink/60">
                  <input
                    type="number"
                    step="0.05"
                    value={s.price}
                    onChange={(e) => menuStore.set({ ...menu, specials: menu.specials.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })}
                    className="w-24 rounded-md border border-ink/15 bg-white px-2 py-1.5 text-right text-sm font-semibold text-ink tabular-nums"
                    aria-label={`Prix du spécial ${s.id}`}
                  />
                  $
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.featured}
                    onChange={(e) => menuStore.set({ ...menu, specials: menu.specials.map((x, j) => (j === i ? { ...x, featured: e.target.checked } : x)) })}
                    className="h-4 w-4 accent-red-600"
                  />
                  En vedette
                </label>
                <button
                  onClick={() => menuStore.set({ ...menu, specials: menu.specials.map((x, j) => (j === i ? { ...x, hidden: !x.hidden } : x)) })}
                  title={s.hidden ? "Afficher" : "Masquer"}
                  className={`h-9 w-9 flex items-center justify-center rounded-lg ${s.hidden ? "bg-ink/5 text-ink/50" : "text-green-700 hover:bg-green-700/10"}`}
                >
                  <EyeIcon off={s.hidden} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => window.confirm("Revenir au menu d'origine ? Vos modifications et photos seront effacées.") && menuStore.reset()}
        className="mt-8 text-xs font-bold text-ink/45 hover:text-red-600"
      >
        Revenir au menu d'origine
      </button>
    </>
  );
}
