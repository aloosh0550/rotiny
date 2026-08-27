import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "روتيني | Routini",
    short_name: "روتيني",
    description: "منظّم حياتك اليومية — مواعيدك، مهامك، عاداتك، وأذكارك في مكان واحد",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "إضافة مهمة",
        short_name: "مهمة جديدة",
        url: "/tasks?add=1",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "الأذكار",
        short_name: "الأذكار",
        url: "/adhkar",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
