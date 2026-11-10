// Admin accounts for the demo. The owner account always exists; the owner adds
// staff with an email, a password and a role, and each role sees only part of
// the panel. Passwords are stored as SHA-256 hashes (salted with the email) so
// they never sit in plain text, even in the demo's localStorage. The real site
// checks them on the server.

export type AdminTab = "dashboard" | "orders" | "subscribers" | "applications" | "catering" | "content" | "settings" | "team";

export type Role = "proprietaire" | "gerant" | "marketing" | "comptoir" | "serveur" | "cuisine" | "livreur";

export const ROLES: Record<Role, { label: string; access: string; tabs: AdminTab[] }> = {
  proprietaire: {
    label: "Propriétaire",
    access: "Tout le panneau, y compris les paramètres et l'équipe",
    tabs: ["dashboard", "orders", "subscribers", "applications", "catering", "content", "settings", "team"],
  },
  gerant: {
    label: "Gérant(e)",
    access: "Tableau de bord, commandes, candidatures, traiteur et paramètres",
    tabs: ["dashboard", "orders", "applications", "catering", "settings"],
  },
  marketing: {
    label: "Marketing",
    access: "Tableau de bord et courriels 10 %",
    tabs: ["dashboard", "subscribers", "content"],
  },
  comptoir: { label: "Comptoir", access: "Commandes", tabs: ["orders"] },
  serveur: { label: "Serveur(euse)", access: "Commandes", tabs: ["orders"] },
  cuisine: { label: "Cuisine", access: "Commandes", tabs: ["orders"] },
  livreur: { label: "Livreur(euse)", access: "Commandes", tabs: ["orders"] },
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  active: boolean;
  owner?: boolean;
  createdAt: string;
  lastLogin?: string;
};

export const OWNER_EMAIL = "admin@patatheque.ca";
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
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
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

/** Creates the owner account the first time the panel is opened in this browser. */
export async function ensureOwner() {
  if (listTeam().some((m) => m.owner)) return;
  save([
    {
      id: "owner",
      name: "Propriétaire",
      email: OWNER_EMAIL,
      role: "proprietaire",
      passwordHash: await hashPassword(OWNER_EMAIL, OWNER_DEMO_PASSWORD),
      active: true,
      owner: true,
      createdAt: new Date().toISOString(),
    },
    ...listTeam(),
  ]);
}

export async function authenticate(email: string, password: string): Promise<Member | null> {
  await ensureOwner();
  const member = listTeam().find((m) => m.email === normalize(email));
  if (!member || !member.active) return null;
  if (member.passwordHash !== (await hashPassword(member.email, password))) return null;
  updateMember(member.id, { lastLogin: new Date().toISOString() });
  return member;
}

export async function addMember(input: { name: string; email: string; role: Role; password: string }) {
  const email = normalize(input.email);
  if (listTeam().some((m) => m.email === email)) throw new Error("Ce courriel a déjà un accès.");
  const member: Member = {
    id: Math.random().toString(36).slice(2, 10),
    name: input.name.trim(),
    email,
    role: input.role,
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
