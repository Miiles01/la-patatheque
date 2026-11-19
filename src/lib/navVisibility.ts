import { useSyncExternalStore } from "react";

// Whether the header is tucked away because the visitor is scrolling down on /menu.
// The cart bar at the bottom of the menu shows while it is hidden, and gives way when the header returns.
let hidden = false;
const listeners = new Set<() => void>();

export function setNavHidden(value: boolean) {
  if (hidden === value) return;
  hidden = value;
  listeners.forEach((l) => l());
}

export function useNavHidden() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => hidden,
  );
}
