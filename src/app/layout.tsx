import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/ThemeProvider";
import { I18N_BOOTSTRAP_SCRIPT } from "@/lib/i18n/I18nProvider";
import { CSP_META } from "@/lib/security/csp";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "روتيني | Routini",
  description: "منظّم حياتك اليومية — مواعيدك، مهامك، عاداتك، وأذكارك في مكان واحد",
  applicationName: "روتيني",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "روتيني",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1216",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable} suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP_META} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: I18N_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
