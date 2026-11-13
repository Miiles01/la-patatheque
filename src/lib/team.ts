import { api, live } from "./api";

// Admin accounts. On the real site they live in the database and the server
// checks passwords and permissions; this file then keeps the list it returns
// (cache). The demo below keeps them in this browser.
//
// Demo: The owner account always exists; the owner adds
// staff with an email, a password and a role, and each role sees only part of
// the panel. Passwords are stored as SHA-256 hashes (salted with the email) so
// they never sit in plain text, even in the demo's localStorage. The real site
// checks them on the server.

export type AdminTab =
  | "dashboard"
  | "orders"
  | "reservations"
  | "menu"
  | "hours"
  | "subscribers"
  | "applications"
  | "catering"
  | "content"
  | "settings"
  | "team";

export type Role = "proprietaire" | "gerant" | "marketing" | "comptoir" | "serveur" | "cuisine";

export const ROLES: Record<Role, { label: string; access: string; tabs: AdminTab[] }> = {
  proprietaire: {
    label: "Propriétaire",
    access: "Tout le panneau, y compris les paramètres et l'équipe",
    tabs: ["dashboard", "orders", "reservations", "menu", "hours", "subscribers", "applications", "catering", "content", "settings", "team"],
  },
  gerant: {
    label: "Gérant(e)",
    access: "Tableau de bord, commandes, réservations, menu, horaires, candidatures, traiteur et paramètres",
    tabs: ["dashboard", "orders", "reservations", "menu", "hours", "applications", "catering", "settings"],
  },
  marketing: {
    label: "Marketing",
    access: "Tableau de bord et courriels 10 %",
    tabs: ["dashboard", "subscribers", "content"],
  },
  comptoir: { label: "Comptoir", access: "Commandes et réservations", tabs: ["orders", "reservations"] },
  serveur: { label: "Serveur(euse)", access: "Commandes et réservations", tabs: ["orders", "reservations"] },
  cuisine: { label: "Cuisine", access: "Commandes", tabs: ["orders"] },
};

export type Member = {
  id: string;
  name: string;
  email: string;
  /** Short number staff can sign in with instead of their email. */
  employeeNumber: string;
  role: Role;
  /** Panel pages this member can open; set per member, starting from the role's defaults. */
  tabs?: AdminTab[];
  passwordHash: string;
  active: boolean;
  owner?: boolean;
  createdAt: string;
  lastLogin?: string;
};

/** Pages a member can open. The owner sees everything; only the owner manages the team. */
export function memberTabs(m: Member): AdminTab[] {
  if (m.owner) return ROLES.proprietaire.tabs;
  return (m.tabs ?? ROLES[m.role].tabs).filter((t) => t !== "team");
}

export const OWNER_EMAIL = "admin@patatheque.ca";
export const OWNER_NUMBER = "100";

/** Next number after the highest one in use (owner is 100, staff 101, 102…). */
export function nextEmployeeNumber(team: Pick<Member, "employeeNumber">[]) {
  const used = team.map((m) => Number(m.employeeNumber)).filter((n) => Number.isFinite(n));
  return String(Math.max(Number(OWNER_NUMBER), ...used) + 1);
}
/** Demo only: pre-filled on the login screen so the client can walk in. */
export const OWNER_DEMO_PASSWORD = "Patatheque2026";

const KEY = "patatheque-demo-team";
const CHANGE = "patatheque-team-change";

const normalize = (email: string) => email.trim().toLowerCase();

export async function hashPassword(email: string, password: string) {
  const data = new TextEncoder().encode(`patatheque:${normalize(email)}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

let cache: Member[] = [];
let signedIn: Member | null = null;

/** Real site: the signed-in member (null when signed out), set by the server. */
export function currentMember() {
  return signedIn;
}

function setCache(team: Member[], me: Member | null = signedIn) {
  cache = team;
  signedIn = me ? (team.find((m) => m.id === me.id) ?? me) : null;
  window.dispatchEvent(new Event(CHANGE));
}

/** Real site: re-reads the team (the owner gets everyone, others themselves). */
export async function refreshTeam() {
  if (!live || !signedIn) return;
  setCache(await api<Member[]>("team"));
}

/** Real site: who is signed in, or whether the owner account still has to be created. */
export async function restoreSession(): Promise<{ member: Member | null; needsSetup: boolean }> {
  const res = await api<{ member: Member | null; needsSetup?: boolean }>("auth");
  setCache(res.member ? [res.member] : [], res.member);
  if (res.member) await refreshTeam();
  return { member: res.member, needsSetup: !!res.needsSetup };
}

/** Real site: creates the owner account, once, on the first visit to the panel. */
export async function setupOwner(input: { name: string; email: string; password: string }) {
  const res = await api<{ member: Member }>("auth/setup", { method: "POST", body: input });
  setCache([res.member], res.member);
  return res.member;
}

export async function signOut() {
  if (live) await api("auth", { method: "DELETE" }).catch(() => {});
  setCache([], null);
}

export function listTeam(): Member[] {
  if (live) return cache;
  try {
    const rows: Member[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Drop duplicates an earlier double owner seed may have left behind.
    const unique = rows.filter((m, i) => rows.findIndex((x) => x.id === m.id) === i);
    // Accounts made before employee numbers existed get the next free one.
    for (const m of unique) if (!m.employeeNumber) m.employeeNumber = m.owner ? OWNER_NUMBER : nextEmployeeNumber(unique);
    // Roles that no longer exist (the old delivery role) become Comptoir, keeping their pages.
    for (const m of unique) if (!(m.role in ROLES)) m.role = "comptoir";
    return unique;
  } catch {
    return [];
  }
}

function save(team: Member[]) {
  if (live) return setCache(team);
  try {
    localStorage.setItem(KEY, JSON.stringify(team));
  } catch {
    // Storage blocked: changes last until reload.
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function onTeamChange(fn: () => void) {
  window.addEventListener(CHANGE, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(CHANGE, fn);
    window.removeEventListener("storage", fn);
  };
}

let seeding: Promise<void> | null = null;

/** Creates the owner account the first time the panel is opened in this browser. */
export function ensureOwner() {
  if (live) return Promise.resolve();
  // Hashing is async, so concurrent callers share one run instead of each adding an owner.
  seeding ??= seedOwner();
  return seeding;
}

async function seedOwner() {
  if (listTeam().some((m) => m.owner)) return;
  const passwordHash = await hashPassword(OWNER_EMAIL, OWNER_DEMO_PASSWORD);
  if (listTeam().some((m) => m.owner)) return;
  save([
    {
      id: "owner",
      name: "Propriétaire",
      email: OWNER_EMAIL,
      employeeNumber: OWNER_NUMBER,
      role: "proprietaire",
      passwordHash,
      active: true,
      owner: true,
      createdAt: new Date().toISOString(),
    },
    ...listTeam(),
  ]);
}

/** Signs in with an email or an employee number. */
export async function authenticate(login: string, password: string): Promise<Member | null> {
  if (live) {
    try {
      const res = await api<{ member: Member }>("auth", { method: "POST", body: { login, password } });
      setCache([res.member], res.member);
      await refreshTeam();
      return res.member;
    } catch (e) {
      if (e instanceof Error && "status" in e && e.status === 401) return null;
      throw e;
    }
  }
  await ensureOwner();
  const id = login.trim();
  const member = listTeam().find((m) => (id.includes("@") ? m.email === normalize(id) : m.employeeNumber === id));
  if (!member || !member.active) return null;
  if (member.passwordHash !== (await hashPassword(member.email, password))) return null;
  updateMember(member.id, { lastLogin: new Date().toISOString() });
  return member;
}

export async function addMember(input: {
  name: string;
  email: string;
  employeeNumber: string;
  role: Role;
  password: string;
  tabs: AdminTab[];
}) {
  if (live) {
    const member = await api<Member>("team", { method: "POST", body: input });
    setCache([...cache, member]);
    return member;
  }
  const email = normalize(input.email);
  const employeeNumber = input.employeeNumber.trim();
  if (listTeam().some((m) => m.email === email)) throw new Error("Ce courriel a déjà un accès.");
  if (listTeam().some((m) => m.employeeNumber === employeeNumber)) throw new Error(`Le numéro ${employeeNumber} est déjà utilisé.`);
  const member: Member = {
    id: Math.random().toString(36).slice(2, 10),
    name: input.name.trim(),
    email,
    employeeNumber,
    role: input.role,
    tabs: input.tabs.filter((t) => t !== "team"),
    passwordHash: await hashPassword(email, input.password),
    active: true,
    createdAt: new Date().toISOString(),
  };
  save([...listTeam(), member]);
  return member;
}

export function updateMember(id: string, patch: Partial<Omit<Member, "id" | "owner">>) {
  if (live) {
    setCache(cache.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    if (patch.lastLogin === undefined) api(`team/${id}`, { method: "PATCH", body: patch }).catch(() => refreshTeam());
    return;
  }
  save(listTeam().map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export async function setPassword(id: string, password: string) {
  if (live) {
    await api(`team/${id}`, { method: "PATCH", body: { password } });
    return;
  }
  const member = listTeam().find((m) => m.id === id);
  if (!member) return;
  updateMember(id, { passwordHash: await hashPassword(member.email, password) });
}

export function removeMember(id: string) {
  if (live) {
    setCache(cache.filter((m) => m.id !== id || m.owner));
    api(`team/${id}`, { method: "DELETE" }).catch(() => refreshTeam());
    return;
  }
  save(listTeam().filter((m) => m.id !== id || m.owner));
}

/** Readable 12-character password without look-alike characters. */
export function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
