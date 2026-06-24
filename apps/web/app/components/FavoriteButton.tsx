"use client";

import { toggleFavorite, useIsFavorite, type FavItem } from "@/lib/favorites";

// Heart toggle for product cards + the PDP. Reads/writes the shared favorites
// store so its filled/empty state stays in sync with the header badge and the
// /compare board everywhere it's rendered.
export function FavoriteButton({
  item,
  className = "",
}: {
  item: FavItem;
  className?: string;
}) {
  const active = useIsFavorite(item.handle);

  return (
    <button
      type="button"
      onClick={(e) => {
        // Cards place the heart over a linked image — don't trigger navigation.
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(item);
      }}
      className={`candy-fav-btn ${active ? "is-active" : ""} ${className}`.trim()}
      aria-pressed={active}
      aria-label={
        active ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`
      }
      title={active ? "Saved to favorites" : "Save to favorites"}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 20.7C7.5 16.9 2.5 13.3 2.5 8.9 2.5 6.4 4.5 4.5 7 4.5c1.7 0 3.3 1 4 2.5.7-1.5 2.3-2.5 4-2.5 2.5 0 4.5 1.9 4.5 4.4 0 4.4-5 8-9.5 11.8z" />
      </svg>
    </button>
  );
}
