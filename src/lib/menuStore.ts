import { useMemo } from "react";
import { menuCategories, specials, type MenuCategory, type Special } from "../data/menu";
import { createStore } from "./store";

// The menu as edited in the admin (names, descriptions, prices, photos, what's
// shown). It starts from the printed menu in data/menu.json.

export type EditableMenu = { categories: MenuCategory[]; specials: Special[] };

export const menuStore = createStore<EditableMenu>("patatheque-demo-menu", () => ({
  categories: menuCategories,
  specials,
}));

/** What the site shows: hidden dishes, empty sections and hidden specials left out. */
export function useMenu() {
  const menu = menuStore.use();
  return useMemo(
    () => ({
      categories: menu.categories
        .filter((c) => !c.hidden)
        .map((c) => ({ ...c, items: c.items.filter((i) => !i.hidden) }))
        .filter((c) => c.items.length > 0),
      specials: menu.specials.filter((s) => !s.hidden),
    }),
    [menu],
  );
}

/** Shrinks an uploaded photo to a light WebP so the demo can keep it in the browser. */
export function compressPhoto(file: File, maxSize = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/webp", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
