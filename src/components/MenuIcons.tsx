import { ICON_PATHS } from "./menuIconPaths";

export const SPECIALS_ICON = "super-speciaux";

/** Icon for a menu section (SVG Repo "Minimalistic Food Line Icons", public domain). Unknown ids get a generic bowl. */
export function MenuIcon({ id, className = "h-6 w-6" }: { id: string; className?: string }) {
  const paths = ICON_PATHS[id] ?? ICON_PATHS["les-casse-croutes"]!;
  return (
    <svg viewBox="0 0 1024 1024" className={className} fill="currentColor" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** Icons an admin can pick for a menu section. */
export const MENU_ICON_CHOICES: { id: string; label: string }[] = [
  { id: "notre-delicieuse-pizza", label: "Pizza" },
  { id: "promos-pizza", label: "Fromage / promo" },
  { id: "sous-marins", label: "Sous-marin" },
  { id: "sandwichs", label: "Sandwich / hamburger" },
  { id: "poutines-speciales", label: "Poutine / frites" },
  { id: "specialites-italiennes", label: "Pâtes" },
  { id: "les-repas", label: "Repas / steak" },
  { id: "ailes-de-poulet", label: "Poulet" },
  { id: "les-salades", label: "Salade" },
  { id: "les-casse-croutes", label: "Casse-croûte" },
  { id: "les-breuvages", label: "Breuvage" },
  { id: SPECIALS_ICON, label: "Spécial / gâteau" },
];
