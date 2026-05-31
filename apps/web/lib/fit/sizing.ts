/**
 * Press-on nail sizing for the web /fit guide.
 *
 * The pure, platform-neutral math + size chart live in the shared
 * `@nailismo/fit-sizing` package (consumed by web and the mobile app). This file
 * re-exports all of it, then adds the web-only persistence layer (localStorage)
 * used to resume an in-progress fitting across reloads.
 */
export * from "@nailismo/fit-sizing";

import type { SavedFit } from "@nailismo/fit-sizing";

const STORAGE_KEY = "nailismo_fit_v1";

export function loadFit(): SavedFit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedFit;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFit(state: SavedFit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode) — fitting still works in-memory.
  }
}

export function clearFit(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
