import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Undrive — Your Drive, unseen.",
    short_name: "Undrive",
    description:
      "Hidden file storage inside your own Google Drive. Invisible, private, and free.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
