import { useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { jobsStore, type Job, type JobQuestion } from "../lib/jobs";
import { LineButton } from "../components/LineLink";
import { commander } from "../components/Navigation";
import { Alt, btnOutline, btnPrimary, headingLg, PageHero, Success, TextArea, TextField } from "../components/ui";
import { restaurant } from "../data/menu";
import { track } from "../lib/analytics";
import { asset } from "../lib/asset";
import { record, type Application } from "../lib/demoStore";
import { businessInfo, groupedHours, openingHours, telHref } from "../lib/business";
import { useI18n } from "../lib/i18n";
import { gsap, reducedMotion } from "../lib/motion";

/** Opening hours as set in the admin, grouped for display. */
export function useHours() {
  const { lang } = useI18n();
  return groupedHours(openingHours.use(), lang);
}

export function AboutPage() {
  const { t } = useI18n();
  const numberRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = numberRef.current;
    if (!el) return;
    if (reducedMotion) {
      el.textContent = String(restaurant.yearsOpen);
      return;
    }
    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: restaurant.yearsOpen,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = String(Math.round(counter.val));
      },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const triptych = [
    { image: "/gallery/sauce.webp", caption: t("about.sauce"), drift: 10 },
    { image: "/gallery/pate.webp", caption: t("about.dough"), drift: -8 },
    { image: "/gallery/pain.webp", caption: t("about.bread"), drift: 4 },
  ];

  return (
    <>
      <PageHero kicker={t("about.kicker")} title={t("story.title")} alt={t("story.titleAlt")}>
        <p data-fade="0.2" data-intro className="mt-8 max-w-2xl text-lg leading-relaxed text-ink/70">
          {t("story.p1", { n: restaurant.yearsOpen })}
        </p>
        <p data-fade="0.3" data-intro className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
          {t("story.p2")}
        </p>
        <dl data-fade="0.4" data-intro className="mt-12 grid grid-cols-3 gap-4 max-w-2xl border-y border-ink/10 py-8">
          <div>
            <dt className="sr-only">{t("story.years")}</dt>
            <dd className="font-display font-black text-4xl md:text-6xl text-red-600 tabular-nums">
              <span ref={numberRef}>0</span>+
            </dd>
            <dd className="alt text-ink/60 mt-1">{t("story.years")}</dd>
          </div>
          <div>
            <dt className="sr-only">Google</dt>
            <dd className="font-display font-black text-4xl md:text-6xl text-ink">
              {String(restaurant.rating).replace(".", ",")}
              <span className="text-orange">★</span>
            </dd>
            <dd className="alt text-ink/60 mt-1">{t("story.reviews", { n: restaurant.reviewCount })}</dd>
          </div>
          <div>
            <dt className="sr-only">{t("story.dishes")}</dt>
            <dd className="font-display font-black text-4xl md:text-6xl text-ink">100+</dd>
            <dd className="alt text-ink/60 mt-1">{t("story.dishes")}</dd>
          </div>
        </dl>
      </PageHero>

      <section className="relative bg-paper overflow-hidden py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-10 grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-12 md:gap-6">
          <div className="relative flex justify-center md:justify-start md:-ml-24 lg:-ml-40">
            <img
              data-spin
              src={asset("/images/pizza.webp")}
              alt="Pizza pepperoni de La Patathèque vue de haut"
              width={760}
              height={760}
              loading="lazy"
              className="w-[78vw] max-w-[26rem] md:w-[34rem] md:max-w-none lg:w-[40rem] drop-shadow-2xl"
            />
          </div>
          <h2 data-reveal className={`${headingLg} md:text-right`}>
            <Alt>{t("about.statement", { n: restaurant.yearsOpen })}</Alt> {t("about.statementRest")} <Alt>{t("about.statementAnd")}</Alt>{" "}
            {t("about.statementEnd")}
          </h2>
        </div>
      </section>

      <section className="bg-paper pb-20 md:pb-32" aria-label={t("about.kitchenKicker")}>
        <div className="mx-auto max-w-7xl px-5 md:px-10 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {triptych.map((item, i) => (
            <figure key={item.image} data-drift={item.drift} className={i === 2 ? "hidden md:block" : ""}>
              <div className="aspect-[2/3] overflow-hidden rounded-sm">
                <img data-zoom src={asset(item.image)} alt={item.caption} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <figcaption className="alt text-ink/70 text-base md:text-lg mt-3">{item.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-cream py-24 md:py-36 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 md:px-10 grid md:grid-cols-2 gap-12 md:gap-10 items-center">
          <div className="relative z-10 md:-mr-[15%]">
            <p data-fade className="script text-red-600 text-5xl md:text-6xl mb-4">{t("about.kitchenKicker")}</p>
            <h2 data-reveal className={headingLg}>
              {t("about.kitchenTitle")} <Alt>{t("about.kitchenAlt")}</Alt> {t("about.kitchenEnd")}
            </h2>
            <p data-fade className="mt-8 max-w-md text-lg leading-relaxed text-ink/70">{t("about.kitchenText")}</p>
            <div data-fade className="mt-10">
              <button onClick={() => commander("about")} className={btnPrimary}>
                {t("home.cta")}
              </button>
            </div>
          </div>
          <div className="aspect-[4/5] overflow-hidden rounded-sm">
            <img data-parallax="-20" src={asset("/images/story-pizza.webp")} alt="" loading="lazy" className="h-[120%] w-full object-cover" />
          </div>
        </div>
      </section>
    </>
  );
}

const MAX_CV = 5 * 1024 * 1024;
const CV_TYPES = [".pdf", ".docx"];

const careersInput =
  "w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink/35 focus:border-red-600 focus:outline-none transition-colors";

/** A job's own question: open text or one answer among choices. */
function JobQuestionField({ q }: { q: JobQuestion }) {
  const { t } = useI18n();
  const name = `q-${q.id}`;
  const optional = q.required ? null : <span className="text-ink/45 font-normal"> ({t("form.optional")})</span>;

  if (q.type === "choice") {
    return (
      <fieldset className="flex flex-col gap-2 text-sm font-medium">
        <legend className="mb-1.5">
          {q.label}
          {optional}
        </legend>
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => (
            <label key={o} className="flex items-center gap-2 rounded-xl border-2 border-ink/15 bg-paper px-4 py-2.5 cursor-pointer has-[:checked]:border-red-600 has-[:checked]:text-red-700">
              <input type="radio" name={name} value={o} required={q.required} className="accent-red-600" />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span>
        {q.label}
        {optional}
      </span>
      <textarea name={name} required={q.required} rows={3} className={careersInput} />
    </label>
  );
}

function ApplicationForm({ job, onSent }: { job?: Job; onSent: () => void }) {
  const { t } = useI18n();
  const [cv, setCv] = useState<File | null>(null);
  const [cvError, setCvError] = useState("");
  const askCv = job ? job.requestCv : true;
  const cvRequired = job ? job.requestCv && job.cvRequired : false;

  function pickCv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCvError("");
    if (!file) return setCv(null);
    if (!CV_TYPES.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setCvError(t("careers.cvBadType"));
      e.target.value = "";
      return setCv(null);
    }
    if (file.size > MAX_CV) {
      setCvError(t("careers.cvTooBig"));
      e.target.value = "";
      return setCv(null);
    }
    setCv(file);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cvRequired && !cv) {
      setCvError(t("form.required"));
      return;
    }
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    let cvRecord: Application["cv"];
    if (cv) {
      // The demo keeps small files so the dashboard can show them; the real site
      // uploads them to private storage on the server.
      const dataUrl =
        cv.size < 1.5 * 1024 * 1024
          ? await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.readAsDataURL(cv);
            })
          : undefined;
      cvRecord = { name: cv.name, size: cv.size, type: cv.type, dataUrl };
    }
    const answers = (job?.questions ?? []).map((q) => ({ label: q.label, value: get(`q-${q.id}`) })).filter((a) => a.value);
    record("applications", {
      jobId: job?.id,
      jobTitle: job?.title,
      name: get("name"),
      email: get("email"),
      phone: get("phone"),
      message: get("message"),
      portfolio: get("portfolio") || undefined,
      coverLetter: get("coverLetter") || undefined,
      answers,
      cv: cvRecord,
    });
    track("job_application", { job: job?.title ?? "spontanée" });
    onSent();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField label={t("form.fullName")} name="name" required autoComplete="name" />
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField label={t("form.email")} name="email" type="email" required autoComplete="email" />
        <TextField label={t("form.phone")} name="phone" type="tel" required autoComplete="tel" />
      </div>
      {job?.questions.map((q) => <JobQuestionField key={q.id} q={q} />)}
      <TextArea label={t("careers.message")} name="message" required rows={4} placeholder={t("careers.messageHint")} />
      {job?.requestCoverLetter && <TextArea label={t("jobs.coverLetter")} name="coverLetter" optional={t("form.optional")} rows={5} />}
      {job?.requestPortfolio && <TextField label={t("jobs.portfolio")} name="portfolio" type="url" optional={t("form.optional")} placeholder="https://" />}
      {askCv && (
        <div>
          <span className="text-sm font-medium">
            {t("careers.cv")}
            {!cvRequired && <span className="text-ink/45 font-normal"> ({t("form.optional")})</span>}
          </span>
          <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-ink/20 bg-paper px-4 py-4 hover:border-red-600 transition-colors">
            <span className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper">{t("careers.cvPick")}</span>
            <span className="text-sm text-ink/60 truncate">{cv ? `${cv.name} · ${(cv.size / 1024).toFixed(0)} Ko` : "PDF · DOCX"}</span>
            <input
              type="file"
              name="cv"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={pickCv}
              className="sr-only"
            />
          </label>
          {cvError && (
            <p role="alert" className="mt-1.5 text-sm text-red-600">
              {cvError}
            </p>
          )}
        </div>
      )}
      <button type="submit" className={`${btnPrimary} mt-2`}>
        {t("careers.submit")}
      </button>
    </form>
  );
}

const SPONTANEOUS = "__spontaneous";

export function CareersPage() {
  const { t } = useI18n();
  const jobs = jobsStore.use().filter((j) => j.status === "published");
  const [selected, setSelected] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const job = jobs.find((j) => j.id === selected);

  return (
    <>
      <PageHero kicker={t("careers.kicker")} title={t("careers.title")} alt={t("careers.titleAlt")} intro={t("careers.intro")}>
        <ul data-fade="0.3" data-intro className="mt-8 flex flex-wrap gap-2">
          {(["careers.perk1", "careers.perk2", "careers.perk3"] as const).map((k) => (
            <li key={k} className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink/80">
              {t(k)}
            </li>
          ))}
        </ul>
      </PageHero>

      <section className="bg-paper pb-24 md:pb-36">
        <div className="mx-auto max-w-5xl px-5 md:px-10">
          {sent ? (
            <Success title={t("cart.thanks")} text={t("careers.thanks")} />
          ) : selected ? (
            <div>
              <button onClick={() => setSelected(null)} className="mb-6 text-sm font-bold text-ink/60 hover:text-red-600">
                ← {t("jobs.back")}
              </button>
              <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 items-start">
                <div>
                  <h2 className="font-display font-extrabold text-3xl md:text-4xl tracking-[-0.02em]">
                    {job ? job.title : t("jobs.spontaneous")}
                  </h2>
                  {job && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-cream px-3 py-1.5 font-semibold">{job.area}</span>
                        <span className="rounded-full bg-cream px-3 py-1.5 font-semibold">{job.schedule}</span>
                        {job.showSalary && job.salary && (
                          <span className="rounded-full bg-red-600/10 px-3 py-1.5 font-semibold text-red-700">{job.salary}</span>
                        )}
                      </div>
                      <div className="mt-6 leading-relaxed text-ink/75">
                        {job.description.split("\n").map((line, i) =>
                          // Short lines without a bullet read as section titles (Le poste, Exigences…).
                          line.trim() && !line.trim().startsWith("-") && line.trim().length < 40 && !line.trim().endsWith(".") ? (
                            <p key={i} className="mt-5 first:mt-0 font-display font-bold text-ink">
                              {line}
                            </p>
                          ) : (
                            <p key={i} className={line.trim() ? "" : "h-1"}>
                              {line}
                            </p>
                          ),
                        )}
                      </div>
                    </>
                  )}
                  {!job && <p className="mt-3 text-ink/70">{t("jobs.spontaneousDesc")}</p>}
                </div>
                <div className="rounded-3xl bg-cream p-6 md:p-8">
                  <ApplicationForm job={job} onSent={() => setSent(true)} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display font-extrabold text-2xl mb-5">{t("jobs.open")}</h2>
              {!jobs.length && <p className="mb-6 max-w-2xl text-ink/65">{t("jobs.none")}</p>}
              <div className="grid md:grid-cols-2 gap-4">
                {jobs.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setSelected(j.id)}
                    className="group text-left rounded-3xl bg-cream p-6 md:p-8 flex flex-col hover:bg-red-600 hover:text-paper transition-colors"
                  >
                    <span className="flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full bg-paper/70 px-3 py-1 text-ink">{j.area}</span>
                      <span className="rounded-full bg-paper/70 px-3 py-1 text-ink">{j.schedule}</span>
                    </span>
                    <span className="mt-5 font-display font-extrabold text-2xl md:text-3xl">{j.title}</span>
                    {j.showSalary && j.salary && <span className="mt-1 text-sm font-semibold opacity-80">{j.salary}</span>}
                    <span className="mt-3 text-sm text-ink/60 group-hover:text-paper/80 line-clamp-2">
                      {j.description.split("\n").filter((l) => l.trim() && !/^(Le poste|Responsabilités|Exigences|Ce qu'on offre)$/.test(l.trim()))[0]}
                    </span>
                    <span className="mt-6 text-sm font-bold">{t("jobs.apply")} →</span>
                  </button>
                ))}
                <button
                  onClick={() => setSelected(SPONTANEOUS)}
                  className="text-left rounded-3xl border-2 border-dashed border-ink/15 p-6 md:p-8 flex flex-col hover:border-red-600 transition-colors"
                >
                  <span className="font-display font-extrabold text-2xl">{t("jobs.spontaneous")}</span>
                  <span className="mt-2 text-sm text-ink/60">{t("jobs.spontaneousDesc")}</span>
                  <span className="mt-6 text-sm font-bold text-red-600">{t("jobs.apply")} →</span>
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export function ContactPage() {
  const { t } = useI18n();
  const hours = useHours();
  const info = businessInfo.use();
  const mapQuery = encodeURIComponent(info.address);

  return (
    <>
      <PageHero kicker={t("contact.kicker")} title={t("contact.title")} alt={t("contact.titleAlt")}>
        <div data-fade="0.3" data-intro className="mt-10 flex flex-wrap gap-3">
          <a href={telHref(info.phoneDisplay)} onClick={() => track("call_click", { from: "contact" })} className={btnPrimary}>
            {t("contact.call")} · {info.phoneDisplay}
          </a>
          <a
            href={restaurant.mapsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("directions_click", { from: "contact" })}
            className={btnOutline}
          >
            {t("contact.directions")}
          </a>
        </div>
      </PageHero>

      <section className="bg-paper pb-24 md:pb-36">
        <div className="mx-auto max-w-7xl px-5 md:px-10 grid lg:grid-cols-2 gap-12">
          <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-8 content-start">
            <div data-fade className="sm:col-span-2">
              <dt className="alt text-lg text-ink/60 mb-1">{t("contact.address")}</dt>
              <dd className="text-lg font-semibold">{info.address}</dd>
            </div>
            <div data-fade>
              <dt className="alt text-lg text-ink/60 mb-1">{t("contact.phone")}</dt>
              <dd>
                <a href={telHref(info.phoneDisplay)} className="text-lg font-semibold hover:text-red-600">
                  {info.phoneDisplay}
                </a>
              </dd>
            </div>
            {info.email && (
              <div data-fade>
                <dt className="alt text-lg text-ink/60 mb-1">{t("contact.email")}</dt>
                <dd>
                  <a href={`mailto:${info.email}`} className="text-lg font-semibold hover:text-red-600">
                    {info.email}
                  </a>
                </dd>
              </div>
            )}
            <div data-fade>
              <dt className="alt text-lg text-ink/60 mb-1">{t("contact.delivery")}</dt>
              <dd className="text-ink/80">{t("footer.delivery")}</dd>
            </div>
            <div data-fade className="sm:col-span-2">
              <dt className="alt text-lg text-ink/60 mb-2">{t("contact.hours")}</dt>
              <dd>
                <ul className="flex flex-col gap-2 max-w-sm">
                  {hours.map((h) => (
                    <li key={h.day} className="flex justify-between gap-6 border-b border-ink/10 pb-2 text-ink/80">
                      <span>{h.day}</span>
                      <span className="font-semibold tabular-nums">{h.time}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div data-fade className="sm:col-span-2">
              <LineButton href="#/commander" onClick={() => commander("contact")} className="text-ink">
                {t("home.cta")}
              </LineButton>
            </div>
          </dl>

          <div className="rounded-2xl overflow-hidden min-h-[380px] border border-ink/10">
            <iframe
              title={t("contact.mapTitle")}
              src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 380 }}
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </>
  );
}
