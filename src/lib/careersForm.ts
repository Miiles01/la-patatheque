import { useEffect, useState } from "react";

// Extra questions on the Carrières form, chosen by the restaurant in the admin
// panel. Name, email, phone, message and CV are always asked; these come after.

export type FieldType = "text" | "textarea" | "select" | "yesno" | "date";

export type CareersField = {
  id: string;
  label: string;
  labelEn?: string;
  type: FieldType;
  /** Choices for "select". */
  options?: string[];
  required: boolean;
};

export const FIELD_TYPES: Record<FieldType, string> = {
  text: "Texte court",
  textarea: "Texte long",
  select: "Liste de choix",
  yesno: "Oui / Non",
  date: "Date",
};

const DEFAULT_FIELDS: CareersField[] = [
  {
    id: "poste",
    label: "Poste souhaité",
    labelEn: "Position wanted",
    type: "select",
    options: ["Cuisine", "Comptoir", "Service en salle", "Livraison"],
    required: true,
  },
  {
    id: "disponibilites",
    label: "Disponibilités",
    labelEn: "Availability",
    type: "select",
    options: ["Temps plein", "Temps partiel", "Soirs", "Fins de semaine"],
    required: true,
  },
  { id: "debut", label: "Date de début possible", labelEn: "Possible start date", type: "date", required: false },
  {
    id: "experience",
    label: "Expérience en restauration",
    labelEn: "Restaurant experience",
    type: "select",
    options: ["Aucune", "Moins d'un an", "1 à 3 ans", "Plus de 3 ans"],
    required: false,
  },
  { id: "permis", label: "Permis de conduire valide", labelEn: "Valid driver's licence", type: "yesno", required: false },
];

const KEY = "patatheque-demo-careers-form";
const CHANGE = "patatheque-careers-form-change";

export function getCareersFields(): CareersField[] {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS;
  } catch {
    return DEFAULT_FIELDS;
  }
}

export function saveCareersFields(fields: CareersField[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(fields));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function resetCareersFields() {
  saveCareersFields(DEFAULT_FIELDS);
}

export function useCareersFields() {
  const [fields, setFields] = useState(getCareersFields);
  useEffect(() => {
    const sync = () => setFields(getCareersFields());
    window.addEventListener(CHANGE, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return fields;
}
