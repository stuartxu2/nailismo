"use client";

import Link from "next/link";
import { useFavoriteCount } from "@/lib/favorites";

// Header entry to the Compare board with a live favorites count. Count hydrates
// from localStorage after mount (server snapshot is 0), so it never forces a
// dynamic render — same approach as CartCount/CartBadge.
export function FavLink() {
  const count = useFavoriteCount();
  return (
    <Link
      href="/compare"
      className="candy-iconbtn candy-favlink"
      aria-label={count > 0 ? `Favorites, ${count} saved` : "Favorites"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20.7C7.5 16.9 2.5 13.3 2.5 8.9 2.5 6.4 4.5 4.5 7 4.5c1.7 0 3.3 1 4 2.5.7-1.5 2.3-2.5 4-2.5 2.5 0 4.5 1.9 4.5 4.4 0 4.4-5 8-9.5 11.8z" />
      </svg>
      {count > 0 && (
        <span className="candy-favlink-badge" aria-hidden>
          {count}
        </span>
      )}
    </Link>
  );
}
