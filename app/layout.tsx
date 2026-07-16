import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Francesco Crivello | Personal Trainer", template: "%s | Francesco Crivello" },
  description: "Allenamento personalizzato, metodo e supporto costante per risultati concreti e sostenibili.",
  openGraph: {
    title: "Francesco Crivello | Personal Trainer",
    description: "Un percorso di allenamento costruito intorno a te.",
    type: "website",
    locale: "it_IT",
    images: ["/images/francesco-hero.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#102a2b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
