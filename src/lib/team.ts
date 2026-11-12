// Admin accounts for the demo. The owner account always exists; the owner adds
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

export type Role = "proprietaire" | "gerant" | "marketing" | "comptoir" | "serveur" | "cuisine" | "livreur";

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
  livreur: { label: "Livreur(euse)", access: "Commandes", tabs: ["orders"] },
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

export function listTeam(): Member[] {
  try {
    const rows: Member[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Drop duplicates an earlier double owner seed may have left behind.
    const unique = rows.filter((m, i) => rows.findIndex((x) => x.id === m.id) === i);
    // Accounts made before employee numbers existed get the next free one.
    for (const m of unique) if (!m.employeeNumber) m.employeeNumber = m.owner ? OWNER_NUMBER : nextEmployeeNumber(unique);
    return unique;
  } catch {
    return [];
  }
}

function save(team: Member[]) {
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
  save(listTeam().map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export async function setPassword(id: string, password: string) {
  const member = listTeam().find((m) => m.id === id);
  if (!member) return;
  updateMember(id, { passwordHash: await hashPassword(member.email, password) });
}

export function removeMember(id: string) {
  save(listTeam().filter((m) => m.id !== id || m.owner));
}

/** Readable 12-character password without look-alike characters. */
export function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
