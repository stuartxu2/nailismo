import "./candy.css";

/** Applies the scoped `.candy` design system. Fonts (`--font-nunito`,
 *  `--font-ekster`) are provided globally by the root layout + globals.css,
 *  so this wrapper only needs to switch on the candy scope. */
export function CandyShell({ children }: { children: React.ReactNode }) {
  return <div className="candy">{children}</div>;
}
