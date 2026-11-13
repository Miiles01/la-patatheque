// Talks to the PHP API on Hostinger. Builds made with VITE_API set (the real
// site) use it; builds without it (the GitHub Pages demo) keep everything in
// the browser as before.

export const API = (import.meta.env.VITE_API as string | undefined) ?? "";
export const live = API !== "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(API + path, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: {
      // The API refuses changes without it (see require_same_origin in server/api/lib.php).
      "X-Patatheque": "1",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? "Erreur réseau. Réessayez.", res.status);
  return data as T;
}
