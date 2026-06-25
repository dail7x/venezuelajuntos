import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://venezuelajuntos.com"),
  title: "Venezuela Juntos | Emergencia",
  description: "Plataforma ciudadana para reportar desaparecidos, encontrados y solicitudes de ayuda.",
  openGraph: {
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
