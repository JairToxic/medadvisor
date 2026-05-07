import type { Metadata, Viewport } from "next";
import { Geist, Newsreader, JetBrains_Mono } from "next/font/google";
import { ProveedorPreferencias } from "@/componentes/ProveedorPreferencias";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["400", "500", "600"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MedAdvisor AI · Asistente médico-financiero",
  description:
    "En 30 segundos sabes qué te pasa, a dónde ir y cuánto pagas. HackIAthon Viamatica 2026.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const scriptTemaInicial = `
try {
  var t = localStorage.getItem('medadvisor:tema') || 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geist.variable} ${newsreader.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTemaInicial }} />
      </head>
      <body>
        <ProveedorPreferencias>{children}</ProveedorPreferencias>
      </body>
    </html>
  );
}
