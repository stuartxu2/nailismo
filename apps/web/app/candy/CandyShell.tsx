import "./candy.css";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

/** Applies the scoped `.candy` design system and the shared chrome
 *  (announcement ticker, header, footer) that wraps every route. Fonts
 *  (`--font-nunito`, `--font-ekster`) are provided globally by the root
 *  layout + globals.css, so this wrapper only switches on the candy scope.
 *  Pages render only their own `<main>`; chrome lives here so it mounts
 *  once and persists across navigation. */
export function CandyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="candy">
      <AnnouncementTicker />
      <Header />
      {children}
      <Footer />
    </div>
  );
}
