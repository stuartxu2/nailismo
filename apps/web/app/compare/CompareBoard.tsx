"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import {
  removeFavorite,
  removeFavorites,
  useFavorites,
  type FavItem,
} from "@/lib/favorites";
import { addVariantsToCart } from "@/lib/shopify/cart";

const MAX_SLOTS = 4;
const FALLBACK_IMG = "/images/listing/black and white press on nails.avif";

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

function imgSrc(url: string | null) {
  const u = url ?? FALLBACK_IMG;
  return u.startsWith("http") ? u : encodeURI(u);
}

// Idiomatic "are we on the client yet" check — false during SSR + the hydration
// render, true afterward. Lets us hold the empty state until localStorage loads
// without a setState-in-effect.
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function CompareBoard() {
  const favorites = useFavorites();
  const hydrated = useHydrated();
  // Which favorites occupy the compare tray. Seeded once with the first 4, then
  // curated by the user (remove frees a slot; tapping a strip item fills one).
  // `null` slots means "not seeded yet". localStorage hydrates after mount, so on
  // a full page load the first render sees an empty list — we must NOT seed then
  // (that would lock the tray empty). Once Favorites actually load we seed with
  // the first four; after that we only reconcile (drop handles that left
  // Favorites — unfavorited or just purchased), never auto-refill, so the four
  // stay user-curated. The updater is pure (no refs mutated inside) so React
  // StrictMode's double-invoke is safe.
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startAdd] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reconcile ephemeral tray with the external favorites store
    setSlots((prev) => {
      const favHandles = favorites.map((f) => f.handle);
      if (prev === null) {
        // still unseeded — wait for favorites to hydrate, then seed once
        return favHandles.length === 0 ? null : favHandles.slice(0, MAX_SLOTS);
      }
      const favSet = new Set(favHandles);
      return prev.filter((h) => favSet.has(h));
    });
  }, [favorites]);

  const slotHandles = slots ?? [];
  const byHandle = new Map(favorites.map((f) => [f.handle, f]));
  const slotItems = slotHandles
    .map((h) => byHandle.get(h))
    .filter((f): f is FavItem => Boolean(f));
  const stripItems = favorites.filter((f) => !slotHandles.includes(f.handle));
  const isFull = slotHandles.length >= MAX_SLOTS;

  const buyable = slotItems.filter(
    (f) => selected.has(f.handle) && f.available && f.variantId,
  );

  function removeFromCompare(handle: string) {
    setSlots((s) => (s ?? []).filter((h) => h !== handle));
    setSelected((sel) => {
      if (!sel.has(handle)) return sel;
      const next = new Set(sel);
      next.delete(handle);
      return next;
    });
  }

  function addToCompare(handle: string) {
    setSlots((s) => {
      const cur = s ?? [];
      if (cur.includes(handle) || cur.length >= MAX_SLOTS) return cur;
      return [...cur, handle];
    });
  }

  function toggleSelect(handle: string) {
    setSelected((sel) => {
      const next = new Set(sel);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  function buyNow() {
    if (buyable.length === 0 || pending) return;
    const ids = buyable.map((f) => f.variantId as string);
    const handles = buyable.map((f) => f.handle);
    startAdd(async () => {
      const res = await addVariantsToCart(ids);
      if (res.ok) {
        // Purchased picks leave Favorites; the unticked ones stay.
        removeFavorites(handles);
        window.location.assign("/cart");
      }
    });
  }

  // Pre-hydration: render a neutral spacer so we don't flash the empty state
  // before localStorage favorites load in.
  if (!hydrated) return <div style={{ minHeight: 360 }} aria-hidden />;

  if (favorites.length === 0) {
    return (
      <div className="candy-empty" style={{ marginTop: 24 }}>
        <div className="emoji" aria-hidden>🤍</div>
        <h2>No favorites yet</h2>
        <p>Tap the heart on any set to save it here, then compare your top picks.</p>
        <Link href="/shop" className="candy-btn" style={{ marginTop: 22 }}>
          Shop the rack <span className="pop" aria-hidden>🍬</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* compare tray */}
      <div className="cmp-trayhead">
        <span className="candy-eyebrow" style={{ margin: 0 }}>
          Comparing {slotHandles.length} / {MAX_SLOTS}
        </span>
        {isFull && stripItems.length > 0 && (
          <span className="cmp-note">Tray full — remove one to swap in another.</span>
        )}
      </div>

      {slotItems.length === 0 ? (
        <div className="cmp-trayempty">
          <p>Add up to four favorites here to compare them side by side.</p>
        </div>
      ) : (
        <div className="cmp-tray">
          {slotItems.map((f) => {
            const isSel = selected.has(f.handle);
            return (
              <article key={f.handle} className={`cmp-tile ${isSel ? "is-selected" : ""}`}>
                <button
                  type="button"
                  className="cmp-x"
                  onClick={() => removeFromCompare(f.handle)}
                  aria-label={`Remove ${f.title} from compare`}
                  title="Remove from compare"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </button>

                <Link href={`/products/${f.handle}`} className="cmp-tile-img" aria-label={f.title}>
                  <Image src={imgSrc(f.image)} alt={f.title} fill sizes="(max-width:640px) 45vw, 22vw" />
                </Link>

                <div className="cmp-tile-meta">
                  <h3 className="cmp-tile-title">
                    <Link href={`/products/${f.handle}`}>{f.title}</Link>
                  </h3>
                  <span className="cmp-tile-price">{formatPrice(f.price, f.currency)}</span>
                </div>

                {f.available && f.variantId ? (
                  <label className="cmp-select">
                    <input
                      type="checkbox"
                      className="cmp-select-input"
                      checked={isSel}
                      onChange={() => toggleSelect(f.handle)}
                    />
                    <span className="cmp-select-box" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Add to bag</span>
                  </label>
                ) : (
                  <span className="cmp-select is-disabled" aria-disabled="true">
                    Sold out
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* action bar */}
      <div className="cmp-actionbar">
        <span className="cmp-actionbar-count">
          {buyable.length} selected
        </span>
        <button
          type="button"
          className="candy-btn"
          onClick={buyNow}
          disabled={buyable.length === 0 || pending}
          aria-disabled={buyable.length === 0 || pending}
        >
          {pending ? "Adding…" : "Add selected to bag"}
          <span className="pop" aria-hidden>🛍️</span>
        </button>
      </div>

      {/* favorites strip */}
      {stripItems.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <span className="candy-eyebrow" style={{ display: "block", marginBottom: 14 }}>
            Saved favorites
          </span>
          <div className="cmp-strip">
            {stripItems.map((f) => (
              <article key={f.handle} className="cmp-thumb">
                <div className="cmp-thumb-imgwrap">
                  <Link href={`/products/${f.handle}`} className="cmp-thumb-img" aria-label={f.title}>
                    <Image src={imgSrc(f.image)} alt={f.title} fill sizes="180px" />
                  </Link>
                  <button
                    type="button"
                    className="cmp-thumb-heart"
                    onClick={() => removeFavorite(f.handle)}
                    aria-label={`Remove ${f.title} from favorites`}
                    title="Remove from favorites"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path d="M12 20.7C7.5 16.9 2.5 13.3 2.5 8.9 2.5 6.4 4.5 4.5 7 4.5c1.7 0 3.3 1 4 2.5.7-1.5 2.3-2.5 4-2.5 2.5 0 4.5 1.9 4.5 4.4 0 4.4-5 8-9.5 11.8z" />
                    </svg>
                  </button>
                </div>
                <div className="cmp-thumb-meta">
                  <Link href={`/products/${f.handle}`} className="cmp-thumb-title">
                    {f.title}
                  </Link>
                  <span className="cmp-thumb-price">{formatPrice(f.price, f.currency)}</span>
                </div>
                <button
                  type="button"
                  className="candy-chip cmp-thumb-add"
                  onClick={() => addToCompare(f.handle)}
                  disabled={isFull}
                  aria-disabled={isFull}
                  title={isFull ? "Compare tray is full" : "Add to compare"}
                >
                  {isFull ? "Tray full" : "+ Compare"}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
