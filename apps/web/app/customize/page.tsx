import type { Metadata } from "next";
import CustomizeStudio from "./CustomizeStudio";

export const metadata: Metadata = {
  title: "Customize to Order | Nailismo",
  description:
    "Upload your inspo and our AI designs one custom press-on set, shown 3 ways, in about a minute. Love it? We hand-make it for your nails. $2 to preview, credited to your order.",
  alternates: { canonical: "/customize" },
};

export default function CustomizePage() {
  return <CustomizeStudio />;
}
