/** Bridge publishing closed windows of the current page to the Clippy mascot. */
export type HiddenWindow = { id: string; label: string };
export type HiddenSnapshot = {
  items: HiddenWindow[];
  restore: (id: string) => void;
};

const empty: HiddenSnapshot = { items: [], restore: () => {} };
let snapshot = empty;
const listeners = new Set<() => void>();

export function publishHidden(next: HiddenSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export const clearHidden = () => publishHidden(empty);
export const getHidden = () => snapshot;
export function subscribeHidden(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
