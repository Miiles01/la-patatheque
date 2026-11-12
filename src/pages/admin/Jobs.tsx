import { useEffect, useState } from "react";
import { asset } from "../../lib/asset";
import { downloadCsv, type Application, type Stored } from "../../lib/demoStore";
import { DESCRIPTION_TEMPLATE, JOB_AREAS, JOB_SCHEDULES, deleteJob, jobsStore, newJob, saveJob, uid, type Job, type JobQuestion, type JobStatus } from "../../lib/jobs";
import { Card, Empty, SectionHead } from "./ui";

const dateTime = new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" });
type Row = Stored<Application>;

const STATUS: Record<JobStatus, { label: string; cls: string }> = {
  published: { label: "Publiée", cls: "bg-green-700/10 text-green-800" },
  draft: { label: "Brouillon", cls: "bg-ink/5 text-ink/60" },
  closed: { label: "Fermée", cls: "bg-ink/5 text-ink/40" },
};

const SPONTANEOUS = "__spontaneous";

/** Candidatures: job openings as cards (plus a "+" card), each with its applicants. */
export function JobsView({ applications }: { applications: Row[] }) {
  const jobs = jobsStore.use();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Job | null>(null);

  if (editing) {
    return (
      <JobEditor
        job={editing}
        onCancel={() => setEditing(null)}
        onSaved={(job) => {
          saveJob(job);
          setEditing(null);
          setOpen(job.id);
        }}
      />
    );
  }

  if (open) {
    const job = jobs.find((j) => j.id === open);
    const rows = applications.filter((a) => (open === SPONTANEOUS ? !a.jobId : a.jobId === open));
    return (
      <>
        <button onClick={() => setOpen(null)} className="mb-4 text-sm font-bold text-ink/60 hover:text-red-600">
          ← Toutes les vacantes
        </button>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl">{job ? job.title || "Sans titre" : "Candidatures spontanées"}</h1>
            {job && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS[job.status].cls}`}>{STATUS[job.status].label}</span>
                <span className="text-ink/55">
                  {job.area} · {job.schedule}
                  {job.showSalary && job.salary ? ` · ${job.salary}` : ""}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {job && (
              <>
                <button onClick={() => setEditing(job)} className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-ink/40">
                  Modifier
                </button>
                <button
                  onClick={() => saveJob({ ...job, status: job.status === "published" ? "closed" : "published" })}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${job.status === "published" ? "bg-ink/5 text-ink/70" : "bg-red-600 text-paper"}`}
                >
                  {job.status === "published" ? "Fermer la vacante" : "Publier"}
                </button>
              </>
            )}
            {rows.length > 0 && (
              <button
                onClick={() =>
                  downloadCsv("candidatures.csv", [
                    ["Vacante", (r: Row) => r.jobTitle ?? "Spontanée"],
                    ["Nom", (r: Row) => r.name],
                    ["Courriel", (r: Row) => r.email],
                    ["Téléphone", (r: Row) => r.phone],
                    ["Réponses", (r: Row) => (r.answers ?? []).map((a) => `${a.label} : ${a.value}`).join(" | ")],
                    ["Message", (r: Row) => r.message],
                    ["Portfolio", (r: Row) => r.portfolio],
                    ["CV", (r: Row) => r.cv?.name],
                    ["Date", (r: Row) => dateTime.format(new Date(r.createdAt))],
                  ] as never, rows)
                }
                className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper"
              >
                Exporter en CSV
              </button>
            )}
          </div>
        </div>
        <ApplicantsList rows={rows} />
      </>
    );
  }

  const count = (id: string) => applications.filter((a) => (id === SPONTANEOUS ? !a.jobId : a.jobId === id)).length;

  return (
    <>
      <SectionHead
        title="Candidatures"
        desc="Publiez vos vacantes : elles apparaissent sur la page Carrières avec leur propre formulaire. Ouvrez une vacante pour voir qui a postulé."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => setEditing(newJob())}
          className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 text-ink/50 hover:border-red-600 hover:text-red-600 transition-colors"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-2xl text-paper">+</span>
          <span className="font-bold">Nouvelle vacante</span>
        </button>
        {jobs.map((j) => (
          <button key={j.id} onClick={() => setOpen(j.id)} className="text-left rounded-2xl border border-ink/10 bg-white p-5 flex flex-col hover:border-ink/30 transition-colors">
            <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${STATUS[j.status].cls}`}>{STATUS[j.status].label}</span>
            <span className="mt-4 font-display font-bold text-xl leading-tight">{j.title || "Sans titre"}</span>
            <span className="mt-1 text-sm text-ink/55">
              {j.area} · {j.schedule}
            </span>
            <span className="mt-auto pt-5 flex items-center justify-between text-sm">
              <span>
                <strong className="font-display text-2xl">{count(j.id)}</strong> <span className="text-ink/55">candidature{count(j.id) > 1 ? "s" : ""}</span>
              </span>
              <span className="font-bold text-red-600">Voir →</span>
            </span>
          </button>
        ))}
        <button onClick={() => setOpen(SPONTANEOUS)} className="text-left rounded-2xl border border-ink/10 bg-white p-5 flex flex-col hover:border-ink/30 transition-colors">
          <span className="self-start rounded-full bg-ink/5 px-3 py-1 text-xs font-bold text-ink/60">Toujours ouverte</span>
          <span className="mt-4 font-display font-bold text-xl leading-tight">Candidatures spontanées</span>
          <span className="mt-1 text-sm text-ink/55">Sans vacante précise</span>
          <span className="mt-auto pt-5 flex items-center justify-between text-sm">
            <span>
              <strong className="font-display text-2xl">{count(SPONTANEOUS)}</strong> <span className="text-ink/55">candidature{count(SPONTANEOUS) > 1 ? "s" : ""}</span>
            </span>
            <span className="font-bold text-red-600">Voir →</span>
          </span>
        </button>
      </div>
    </>
  );
}

function ApplicantsList({ rows }: { rows: Row[] }) {
  const [viewing, setViewing] = useState<Row | null>(null);
  if (!rows.length) return <Empty text="Personne n'a encore postulé." />;

  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((r) => (
          <Card key={r.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 shrink-0 rounded-full bg-red-600 text-paper flex items-center justify-center font-display font-bold">{r.name.charAt(0)}</span>
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {r.name}
                    {r.sample && <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink/45">Exemple</span>}
                  </p>
                  <p className="text-xs text-ink/50">{dateTime.format(new Date(r.createdAt))}</p>
                </div>
              </div>
              {r.cv && (
                <button onClick={() => setViewing(r)} className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-ink/85">
                  Voir le CV
                </button>
              )}
            </div>

            {!!r.answers?.length && (
              <dl className="mt-4 grid gap-3 rounded-xl bg-ink/[0.03] p-4 text-sm">
                {r.answers.map((a) => (
                  <div key={a.label}>
                    <dt className="text-xs text-ink/50">{a.label}</dt>
                    <dd className="font-semibold whitespace-pre-line">{a.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <p className="mt-4 text-sm text-ink/75 whitespace-pre-line flex-1">{r.message}</p>
            {r.coverLetter && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-ink/70">Lettre de présentation</summary>
                <p className="mt-2 whitespace-pre-line text-ink/70">{r.coverLetter}</p>
              </details>
            )}
            {r.portfolio && (
              <a href={r.portfolio} target="_blank" rel="noreferrer" className="mt-3 text-sm font-semibold text-red-600 underline underline-offset-2 truncate">
                Portfolio : {r.portfolio}
              </a>
            )}
            <p className="mt-4 text-sm">
              <a href={`mailto:${r.email}`} className="text-red-600 font-semibold">
                {r.email}
              </a>{" "}
              ·{" "}
              <a href={`tel:${r.phone}`} className="text-red-600 font-semibold">
                {r.phone}
              </a>
            </p>
          </Card>
        ))}
      </div>
      {viewing?.cv && <CvViewer cv={viewing.cv} name={viewing.name} onClose={() => setViewing(null)} />}
    </>
  );
}

// -------------------------------------------------------------- editor

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-ink/10 px-4 py-3 cursor-pointer">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-ink/50">{hint}</span>}
      </span>
      <span className="relative shrink-0">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block h-6 w-11 rounded-full bg-ink/15 transition-colors peer-checked:bg-green-700" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function JobEditor({ job: initial, onCancel, onSaved }: { job: Job; onCancel: () => void; onSaved: (job: Job) => void }) {
  const [job, setJob] = useState<Job>(initial);
  const set = (patch: Partial<Job>) => setJob((j) => ({ ...j, ...patch }));
  const setQ = (id: string, patch: Partial<JobQuestion>) => set({ questions: job.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  const field = "w-full rounded-xl border-2 border-ink/15 bg-white px-4 py-3 text-ink focus:border-red-600 focus:outline-none";
  const isNew = !jobsStore.get().some((j) => j.id === job.id);

  return (
    <div className="max-w-3xl">
      <button onClick={onCancel} className="mb-4 text-sm font-bold text-ink/60 hover:text-red-600">
        ← Annuler
      </button>
      <h1 className="font-display font-extrabold text-3xl mb-6">{isNew ? "Nouvelle vacante" : "Modifier la vacante"}</h1>

      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Titre de la vacante
            <input value={job.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex. Cuisinier(ère) de ligne" className={field} required />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Poste / secteur
              <select value={job.area} onChange={(e) => set({ area: e.target.value })} className={field}>
                {JOB_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Horaire
              <select value={job.schedule} onChange={(e) => set({ schedule: e.target.value })} className={field}>
                {JOB_SCHEDULES.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span className="flex items-center justify-between">
              Description
              <button type="button" onClick={() => set({ description: DESCRIPTION_TEMPLATE })} className="text-xs font-bold text-red-600">
                Insérer le modèle
              </button>
            </span>
            <textarea value={job.description} onChange={(e) => set({ description: e.target.value })} rows={14} className={`${field} font-normal leading-relaxed`} />
            <span className="text-xs font-normal text-ink/50">
              Suggestion : le poste, les responsabilités, les exigences et ce que vous offrez. Écrivez ce que vous voulez.
            </span>
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-lg">Salaire</h2>
          <input value={job.salary} onChange={(e) => set({ salary: e.target.value })} placeholder="Ex. 18 $ / heure + pourboires" className={field} />
          <Switch on={job.showSalary} onChange={(v) => set({ showSalary: v })} label="Afficher le salaire sur le site" hint="Facultatif : laissez désactivé pour ne pas le montrer." />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-lg">Documents demandés</h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 px-4 py-3">
            <span className="text-sm font-semibold">CV (PDF ou DOCX)</span>
            <div role="radiogroup" aria-label="CV" className="flex gap-1 rounded-full bg-ink/5 p-1">
              {(
                [
                  ["required", "Obligatoire"],
                  ["optional", "Facultatif"],
                  ["off", "Non demandé"],
                ] as const
              ).map(([value, label]) => {
                const current = !job.requestCv ? "off" : job.cvRequired ? "required" : "optional";
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={current === value}
                    onClick={() => set({ requestCv: value !== "off", cvRequired: value === "required" })}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${current === value ? "bg-white text-ink shadow-sm" : "text-ink/55"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <Switch on={job.requestCoverLetter} onChange={(v) => set({ requestCoverLetter: v })} label="Lettre de présentation" hint="Suggestion : utile pour les postes de gestion." />
          <Switch on={job.requestPortfolio} onChange={(v) => set({ requestPortfolio: v })} label="Lien vers un portfolio" hint="Le candidat partage un lien (site, Instagram, Drive…) vers ses travaux antérieurs." />
        </Card>

        <Card className="flex flex-col gap-3">
          <div>
            <h2 className="font-display font-bold text-lg">Questions pour cette vacante</h2>
            <p className="text-sm text-ink/55">Deux types : réponse libre ou choix multiple.</p>
          </div>
          {job.questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-ink/10 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span className="mt-2.5 text-xs font-bold text-ink/40 w-5">{i + 1}.</span>
                <input value={q.label} onChange={(e) => setQ(q.id, { label: e.target.value })} placeholder="Votre question" className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm" />
                <button
                  type="button"
                  onClick={() => set({ questions: job.questions.filter((x) => x.id !== q.id) })}
                  aria-label="Supprimer la question"
                  className="h-9 w-9 shrink-0 rounded-lg text-ink/40 hover:bg-red-600/10 hover:text-red-600"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-7">
                {(["open", "choice"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setQ(q.id, { type, options: type === "choice" && !q.options.length ? ["Oui", "Non"] : q.options })}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${q.type === type ? "bg-ink text-paper" : "bg-ink/5 text-ink/60"}`}
                  >
                    {type === "open" ? "✎ Réponse libre" : "◉ Choix multiple"}
                  </button>
                ))}
                <label className="ml-auto flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" checked={q.required} onChange={(e) => setQ(q.id, { required: e.target.checked })} className="h-4 w-4 accent-red-600" />
                  Obligatoire
                </label>
              </div>
              {q.type === "choice" && (
                <div className="pl-7 flex flex-wrap items-center gap-2">
                  {q.options.map((o, j) => (
                    <span key={j} className="flex items-center rounded-full border border-ink/15 pl-3">
                      <input
                        value={o}
                        onChange={(e) => setQ(q.id, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })}
                        className="w-28 bg-transparent py-1.5 text-xs focus:outline-none"
                        aria-label={`Choix ${j + 1}`}
                      />
                      <button type="button" onClick={() => setQ(q.id, { options: q.options.filter((_, k) => k !== j) })} className="h-7 w-7 text-ink/40 hover:text-red-600" aria-label="Retirer le choix">
                        ×
                      </button>
                    </span>
                  ))}
                  <button type="button" onClick={() => setQ(q.id, { options: [...q.options, `Choix ${q.options.length + 1}`] })} className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink/60">
                    + Choix
                  </button>
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set({ questions: [...job.questions, { id: uid(), label: "", type: "open", options: [], required: false }] })}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-ink/40"
            >
              + Question libre
            </button>
            <button
              type="button"
              onClick={() => set({ questions: [...job.questions, { id: uid(), label: "", type: "choice", options: ["Oui", "Non"], required: false }] })}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-ink/40"
            >
              + Choix multiple
            </button>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={!job.title.trim()}
            onClick={() => onSaved({ ...job, status: "published" })}
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-paper hover:bg-red-700 disabled:opacity-40"
          >
            Publier sur le site
          </button>
          <button
            disabled={!job.title.trim()}
            onClick={() => onSaved({ ...job, status: job.status === "published" ? "published" : "draft" })}
            className="rounded-full border border-ink/15 px-6 py-3 text-sm font-bold disabled:opacity-40"
          >
            {job.status === "published" ? "Enregistrer" : "Enregistrer le brouillon"}
          </button>
          {!isNew && (
            <button
              onClick={() => {
                if (window.confirm("Supprimer cette vacante ? Les candidatures reçues restent dans le panneau.")) {
                  deleteJob(job.id);
                  onCancel();
                }
              }}
              className="ml-auto text-sm font-bold text-red-600"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- CV viewer

type Cv = NonNullable<Application["cv"]>;

/** In-panel CV viewer: PDFs open inline; Word files can only be downloaded. */
function CvViewer({ cv, name, onClose }: { cv: Cv; name: string; onClose: () => void }) {
  const src = cv.url ? asset(cv.url) : cv.dataUrl;
  const isPdf = cv.type === "application/pdf" || cv.name.toLowerCase().endsWith(".pdf");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Browsers block data: URLs in frames, so stored PDFs are shown through a blob URL.
  useEffect(() => {
    if (!cv.dataUrl || !isPdf) return;
    let url: string | null = null;
    fetch(cv.dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [cv.dataUrl, isPdf]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const frameSrc = cv.url ? asset(cv.url) : blobUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3 md:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`CV de ${name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">CV · {name}</p>
            <p className="text-xs text-ink/50 truncate">
              {cv.name} · {Math.round(cv.size / 1024)} Ko
            </p>
          </div>
          <div className="flex items-center gap-2">
            {src && (
              <a href={src} download={cv.name} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold hover:border-ink/40">
                Télécharger
              </a>
            )}
            <button onClick={onClose} aria-label="Fermer" className="relative h-9 w-9 rounded-full text-ink/60 hover:bg-ink/5">
              <span className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
              <span className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
            </button>
          </div>
        </div>
        {isPdf && frameSrc ? (
          <iframe title={`CV de ${name}`} src={frameSrc} className="flex-1 w-full bg-ink/5" />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-ink/60">
            <p>{isPdf ? "Chargement…" : "Aperçu non disponible pour les fichiers Word."}</p>
            {!isPdf && src && (
              <a href={src} download={cv.name} className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper">
                Télécharger le CV
              </a>
            )}
            {!src && <p className="text-sm">Fichier trop lourd pour la démo : en production il est conservé sur le serveur.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

