"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/collections/new-drops", label: "New" },
  { href: "/fit", label: "Fit" },
  { href: "/lookbook", label: "Lookbook" },
];

export function MobileMenu({ count = 0 }: { count?: number }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard for createPortal
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="candy-iconbtn md:hidden"
        style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <span style={{ width: 16, height: 2.5, borderRadius: 2, background: "var(--ink)" }} />
        <span style={{ width: 16, height: 2.5, borderRadius: 2, background: "var(--ink)" }} />
        <span style={{ width: 16, height: 2.5, borderRadius: 2, background: "var(--ink)" }} />
      </button>

      {mounted &&
        createPortal(
          <div
            id="mobile-menu"
            className="candy"
            style={{ position: "fixed", inset: 0, zIndex: 60, display: open ? "flex" : "none", flexDirection: "column" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="candy-wrap flex items-center justify-between h-[70px]" style={{ borderBottom: "2px solid var(--marshmallow)" }}>
              <Link href="/" aria-label="Nailismo home" onClick={() => setOpen(false)} style={{ display: "inline-flex", alignItems: "center" }}>
                <Image
                  src="/images/logo/nailismo-wordmark.avif"
                  alt="Nailismo — press on, show off"
                  width={153}
                  height={38}
                  style={{ height: 38, width: "auto" }}
                />
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="candy-iconbtn" aria-label="Close menu">
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13" />
                  <line x1="13" y1="1" x2="1" y2="13" />
                </svg>
              </button>
            </div>

            <nav className="candy-wrap" style={{ flex: 1, overflowY: "auto", paddingTop: 28, paddingBottom: 28 }}>
              <span className="candy-eyebrow">Browse</span>
              <Link
                href="/products/nailismo-gift-card"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 18,
                  fontFamily: "var(--body)",
                  fontWeight: 800,
                  fontSize: 20,
                  padding: "14px 20px",
                  borderRadius: 999,
                  background: "var(--bubblegum)",
                  color: "var(--ink)",
                  border: "2.5px solid var(--ink)",
                  boxShadow: "0 4px 0 var(--ink)",
                }}
              >
                <span aria-hidden style={{ fontSize: 24 }}>🎁</span> Gift Card
              </Link>
              <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0" }}>
                {navLinks.map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      style={{
                        display: "block",
                        fontFamily: "var(--display)",
                        fontSize: 34,
                        lineHeight: 1.15,
                        padding: "12px 0",
                        borderBottom: "2px solid var(--marshmallow)",
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 32, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/account" onClick={() => setOpen(false)} className="candy-chip">Account</Link>
                <Link href="/search" onClick={() => setOpen(false)} className="candy-chip">Search</Link>
                <Link href="/cart" onClick={() => setOpen(false)} className="candy-chip">Cart · {count}</Link>
              </div>

              <div style={{ marginTop: 32 }}>
                <Link href="/shop" onClick={() => setOpen(false)} className="candy-btn" style={{ width: "100%" }}>
                  Shop Sets <span className="pop" aria-hidden>🍬</span>
                </Link>
                <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                  S–XL fit · ready in minutes · clean removal
                </p>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
