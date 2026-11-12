import { useEffect, useState } from "react";

/**
 * A value the admin edits and the site reads, kept in localStorage for the demo
 * (the real site will load and save it through the API). `use()` re-renders
 * when the value changes, in this tab or another one.
 */
export function createStore<T>(key: string, fallback: () => T) {
  const event = `${key}-change`;

  const get = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback();
    } catch {
      return fallback();
    }
  };

  const set = (value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked: the change lasts until reload.
    }
    window.dispatchEvent(new Event(event));
  };

  const reset = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(event));
  };

  const use = (): T => {
    const [value, setValue] = useState(get);
    useEffect(() => {
      const sync = () => setValue(get());
      window.addEventListener(event, sync);
      window.addEventListener("storage", sync);
      return () => {
        window.removeEventListener(event, sync);
        window.removeEventListener("storage", sync);
      };
    }, []);
    return value;
  };

  return { get, set, reset, use };
}
