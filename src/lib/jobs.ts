import { createStore } from "./store";

// Job openings posted from the admin. A published opening shows on the
// Carrières page with its own application form: the documents it asks for and
// its own questions (open or multiple choice).

export type JobQuestion = {
  id: string;
  label: string;
  type: "open" | "choice";
  /** Choices for a multiple-choice question. */
  options: string[];
  required: boolean;
};

export type JobStatus = "draft" | "published" | "closed";

export type Job = {
  id: string;
  title: string;
  /** Kitchen, counter, service… */
  area: string;
  /** Full time, part time… */
  schedule: string;
  description: string;
  salary: string;
  showSalary: boolean;
  requestCv: boolean;
  cvRequired: boolean;
  requestPortfolio: boolean;
  requestCoverLetter: boolean;
  questions: JobQuestion[];
  status: JobStatus;
  createdAt: string;
};

export const JOB_AREAS = ["Cuisine", "Comptoir", "Service en salle", "Plonge", "Gestion", "Autre"];
export const JOB_SCHEDULES = ["Temps plein", "Temps partiel", "Soirs et fins de semaine", "Saisonnier"];

/** Suggested outline for the description, so every opening says what candidates need to know. */
export const DESCRIPTION_TEMPLATE = `Le poste
En quelques mots, ce que fait la personne au quotidien.

Responsabilités
- …
- …

Exigences
- …
- …

Ce qu'on offre
- Repas d'employé
- Horaires flexibles
- …`;

export const uid = () => Math.random().toString(36).slice(2, 9);

export function newJob(): Job {
  return {
    id: uid(),
    title: "",
    area: JOB_AREAS[1],
    schedule: JOB_SCHEDULES[1],
    description: DESCRIPTION_TEMPLATE,
    salary: "",
    showSalary: false,
    requestCv: true,
    cvRequired: true,
    requestPortfolio: false,
    requestCoverLetter: false,
    questions: [],
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

export const jobsStore = createStore<Job[]>("patatheque-demo-jobs", () => [
  {
    ...newJob(),
    id: "commis-comptoir",
    title: "Commis au comptoir",
    area: "Comptoir",
    schedule: "Temps partiel",
    description: `Le poste
Tu accueilles les clients, prends les commandes au comptoir et au téléphone, et prépares les commandes pour emporter.

Responsabilités
- Accueillir les clients et prendre les commandes
- Encaisser (Interac, cartes, comptant)
- Préparer et emballer les commandes pour emporter
- Garder le comptoir propre

Exigences
- Bon sens du service et sourire
- Disponible les soirs et fins de semaine
- Français fonctionnel ; l'anglais est un atout

Ce qu'on offre
- Repas d'employé
- Horaires flexibles
- Équipe de quartier`,
    salary: "17,50 $ / heure + pourboires",
    showSalary: true,
    questions: [
      { id: "q1", label: "Quelles sont tes disponibilités ?", type: "choice", options: ["Soirs", "Fins de semaine", "Soirs et fins de semaine", "Temps plein"], required: true },
      { id: "q2", label: "As-tu déjà travaillé en restauration ?", type: "choice", options: ["Oui", "Non"], required: true },
      { id: "q3", label: "Pourquoi La Patathèque ?", type: "open", options: [], required: false },
    ],
    status: "published",
  },
]);

export function saveJob(job: Job) {
  const jobs = jobsStore.get();
  jobsStore.set(jobs.some((j) => j.id === job.id) ? jobs.map((j) => (j.id === job.id ? job : j)) : [job, ...jobs]);
}

export function deleteJob(id: string) {
  jobsStore.set(jobsStore.get().filter((j) => j.id !== id));
}
