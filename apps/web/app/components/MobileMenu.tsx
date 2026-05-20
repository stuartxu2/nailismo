"use client";

import { useEffect, useState } from "react";

const navLinks = [
  { href: "#starter-gateway", label: "Shop" },
  { href: "#starter-gateway", label: "Starter Sets" },
  { href: "#edits", label: "Style", italic: "Edits" },
  { href: "#fit", label: "Fit Guide" },
  { href: "#lookbook", label: "Lookbook" },
  { href: "#bundle", label: "First Fit Kit" },
  { href: "#faq", label: "FAQ" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);

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
        className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] border border-hair"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <span className="block w-4 h-px bg-tetsu" />
        <span className="block w-4 h-px bg-tetsu" />
        <span className="block w-4 h-px bg-tetsu" />
      </button>

      <div
        id="mobile-menu"
        className="md:hidden fixed inset-0 z-[60] bg-paper flex-col"
        style={{ display: open ? "flex" : "none" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between h-[72px] px-5 border-b border-hair">
          <img src="/images/logo/01.png" alt="Nailismo" className="h-9 logo-natural" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-9 h-9 flex items-center justify-center border border-hair"
            aria-label="Close menu"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#281A14" strokeWidth="1.4">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-5 py-8">
          <span className="cap">Browse</span>
          <ul className="mt-5 space-y-1 font-display">
            {navLinks.map((link, i) => (
              <li key={i}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 border-b border-hair text-[28px] leading-[1.1] tracking-display"
                >
                  {link.label}
                  {link.italic && (
                    <>
                      {" "}
                      <span className="italic font-serif font-light">{link.italic}</span>
                    </>
                  )}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <span className="cap">Account</span>
            <ul className="mt-4 space-y-3 text-[14px] tracking-[0.18em] uppercase font-medium">
              <li>
                <a href="#" onClick={() => setOpen(false)} className="ulink">
                  Sign In
                </a>
              </li>
              <li>
                <a href="#" onClick={() => setOpen(false)} className="ulink">
                  Cart · <span className="font-mono">0</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="mt-10 pt-6 border-t border-hair">
            <a
              href="#starter-gateway"
              onClick={() => setOpen(false)}
              className="btn-primary w-full justify-center"
            >
              Shop Starter Sets <span className="arrow">→</span>
            </a>
            <p className="mt-4 text-[12px] text-rikyu">S–XL fit · tabs + liquid · no salon required</p>
          </div>
        </nav>
      </div>
    </>
  );
}
