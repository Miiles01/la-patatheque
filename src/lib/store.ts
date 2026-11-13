import { useEffect, useState } from "react";
import { api, ApiError, live } from "./api";

/**
 * A value the admin edits and the site reads (menu, hours, tables…). `use()`
 * re-renders when it changes.
 *
 * Demo build: kept in this browser's localStorage.
 * Real site: loaded from the API once at start-up (loadConfig) and saved back
 * to it, a moment after the last change so typing doesn't send a request per key.
 */

const remote = new Map<string, unknown>();
const stores: (() => void)[] = [];
/** Keys with a change not yet saved: a reload from the server must not overwrite them. */
const pending = new Set<string>();
export const SAVE_ERROR = "patatheque-save-error";

/** Fetches every saved value; the site waits for this before it renders. */
export async function loadConfig() {
  if (!live) return;
  const data = await api<Record<string, unknown>>("config");
  for (const [k, v] of Object.entries(data)) if (!pending.has(k)) remote.set(k, v);
  stores.forEach((notify) => notify());
}

export function createStore<T>(key: string, fallback: () => T, { shared = true } = {}) {
  const event = `${key}-change`;
  // Server name: "patatheque-demo-menu" → "menu".
  const remoteKey = key.replace(/^patatheque-demo-/, "");
  const onServer = live && shared;
  const notify = () => window.dispatchEvent(new Event(event));
  stores.push(notify);

  let timer: number | undefined;
  let version = 0;
  const save = (value: T | null) => {
    window.clearTimeout(timer);
    pending.add(remoteKey);
    const mine = ++version;
    timer = window.setTimeout(async () => {
      try {
        const res = await api<{ value?: T }>(`config/${remoteKey}`, { method: "PUT", body: value });
        // Photos come back as file URLs; take them unless the admin has kept editing.
        if (res.value !== undefined && mine === version) {
          remote.set(remoteKey, res.value);
          notify();
        }
      } catch (e) {
        window.dispatchEvent(new CustomEvent(SAVE_ERROR, { detail: e instanceof ApiError ? e.message : "Erreur réseau." }));
      } finally {
        if (mine === version) pending.delete(remoteKey);
      }
    }, 700);
  };

  const get = (): T => {
    if (live) return remote.has(remoteKey) ? (remote.get(remoteKey) as T) : fallback();
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback();
    } catch {
      return fallback();
    }
  };

  /** Changes the value here only, without saving it anywhere (data the server already has). */
  const setLocal = (value: T) => {
    remote.set(remoteKey, value);
    notify();
  };

  const set = (value: T) => {
    if (onServer) {
      remote.set(remoteKey, value);
      save(value);
    } else if (live) {
      remote.set(remoteKey, value);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage blocked: the change lasts until reload.
      }
    }
    notify();
  };

  const reset = () => {
    if (onServer) {
      remote.delete(remoteKey);
      save(null);
    } else if (live) {
      remote.delete(remoteKey);
    } else {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    notify();
  };

  const use = (): T => {
    const [value, setValue] = useState(get);
    useEffect(() => {
      const sync = () => setValue(get());
      sync();
      window.addEventListener(event, sync);
      window.addEventListener("storage", sync);
      return () => {
        window.removeEventListener(event, sync);
        window.removeEventListener("storage", sync);
      };
    }, []);
    return value;
  };

  return { get, set, setLocal, reset, use };
}
