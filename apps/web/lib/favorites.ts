"use client";

import { useSyncExternalStore } from "react";

// Client-side favorites bucket. Persisted in localStorage (anonymous, per-device)
// — never read on the server, so every route stays statically ISR-cached (same
// reasoning as app/components/CartCount.tsx). Components subscribe via
// useSyncExternalStore + a window "favorites-changed" event so a heart toggled in
// one place updates the header badge, the cards, and /compare in lockstep. The
// browser "storage" event keeps separate tabs in sync.

export type FavItem = {
  id: string;
  handle: string;
  title: string;
  image: string | null;
  price: string;
  currency: string;
  variantId: string | null;
  available: boolean;
};

const KEY = "nailismo_favorites";
const EVENT = "favorites-changed";

// ---- pure list helpers (no DOM — unit-tested) ----

export function has(list: FavItem[], handle: string): boolean {
  return list.some((f) => f.handle === handle);
}

/** Add the item, or replace the existing entry with the same handle (de-dupe). */
export function add(list: FavItem[], item: FavItem): FavItem[] {
  return has(list, item.handle)
    ? list.map((f) => (f.handle === item.handle ? item : f))
    : [...list, item];
}

export function remove(list: FavItem[], handle: string): FavItem[] {
  return list.filter((f) => f.handle !== handle);
}

export function removeMany(list: FavItem[], handles: string[]): FavItem[] {
  const drop = new Set(handles);
  return list.filter((f) => !drop.has(f.handle));
}

// ---- localStorage layer ----

export function readFavorites(): FavItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as FavItem[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(list: FavItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota exceeded / private mode — fail soft
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Toggle membership. Returns the new favorited state for the handle. */
export function toggleFavorite(item: FavItem): boolean {
  const list = readFavorites();
  const next = has(list, item.handle) ? remove(list, item.handle) : add(list, item);
  writeFavorites(next);
  return has(next, item.handle);
}

export function removeFavorite(handle: string): void {
  writeFavorites(remove(readFavorites(), handle));
}

/** Bulk remove (e.g. items just added to cart leave Favorites). */
export function removeFavorites(handles: string[]): void {
  if (handles.length === 0) return;
  writeFavorites(removeMany(readFavorites(), handles));
}

// ---- React subscription (external store) ----

const EMPTY: FavItem[] = [];
let cache: FavItem[] = EMPTY;
let cacheRaw = "";

function getSnapshot(): FavItem[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY) ?? "";
  // Cache by raw string so useSyncExternalStore gets a stable reference until the
  // stored value actually changes (re-parsing every render would loop).
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = readFavorites();
  }
  return cache;
}

function getServerSnapshot(): FavItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useFavorites(): FavItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useFavoriteCount(): number {
  return useFavorites().length;
}

export function useIsFavorite(handle: string): boolean {
  return has(useFavorites(), handle);
}
