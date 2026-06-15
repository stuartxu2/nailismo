import type { Metadata } from "next";
import CustomizeStudio from "./CustomizeStudio";

export const metadata: Metadata = {
  title: "Customize to Order | Nailismo",
  description:
    "Upload your inspo and our AI designs 3 custom press-on nail sets in about a minute. Pick your favorite — we hand-make it for your nails. $2 to preview, credited to your order.",
  alternates: { canonical: "/customize" },
};

export default function CustomizePage() {
  return <CustomizeStudio />;
}
