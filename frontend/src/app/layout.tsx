import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  JetBrains_Mono,
  Libre_Baskerville,
  Source_Sans_3,
} from "next/font/google";

import "./globals.css";

const headingFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-heading",
});

const bodyFont = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

const uiFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-ui",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "EM Foundation — CR-Lite",
  description: "Continuity Receipts Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${uiFont.variable} ${monoFont.variable}`}
    >
      <body className={`${bodyFont.className} antialiased`}>{children}</body>
    </html>
  );
}
