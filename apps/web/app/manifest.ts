import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nailismo — Press-On Nails",
    short_name: "Nailismo",
    description:
      "Press-on nail sets for every hand. On in minutes, lasts up to 7 days.",
    start_url: "/",
    display: "standalone",
    background_color: "#FEDFE1",
    theme_color: "#FEDFE1",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
