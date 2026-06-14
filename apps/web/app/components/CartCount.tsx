"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Client-side cart count. The header used to read the cart cookie during server
// render, which forced every route to render dynamically (no edge caching). The
// count now hydrates from /api/cart after load so content pages stay static/ISR.
const CartCountContext = createContext<number>(0);

export function CartCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/cart", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => {
        if (active && typeof d?.count === "number") setCount(d.count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return <CartCountContext.Provider value={count}>{children}</CartCountContext.Provider>;
}

export function useCartCount(): number {
  return useContext(CartCountContext);
}

export function CartBadge() {
  const count = useCartCount();
  return (
    <span
      aria-hidden
      style={{
        display: "inline-grid",
        placeItems: "center",
        minWidth: 22,
        height: 22,
        padding: "0 6px",
        borderRadius: 999,
        background: "var(--bubblegum)",
        color: "var(--ink)",
        border: "2px solid var(--ink)",
        fontWeight: 800,
        fontSize: 12,
      }}
    >
      {count}
    </span>
  );
}
