import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MARQSA | Constructora y Urbanizadora",
  description:
    "Construcción, urbanización, infraestructura y alquiler de maquinaria.",
  icons: {
    icon: "/images/retroexcavadora-icon.png",
    shortcut: "/images/retroexcavadora-icon.png",
    apple: "/images/retroexcavadora-icon.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={montserrat.variable}>{children}</body>
    </html>
  );
}