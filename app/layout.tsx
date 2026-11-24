import type { Metadata } from "next";
import localFont from "next/font/local";
import { APP_NAME as name } from "@/lib/name";
import "./globals.css";

const archivo = localFont({
  src: "./fonts/Archivo.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
});

const code = localFont({
  src: "./fonts/JetBrainsMono.woff2",
  variable: "--font-code",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${name}: find who to write to, and why`,
  description: `Describe your product. ${name} finds who should buy it, proves every fact with a source, looks for a warm way in, and drafts outreach you approve.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${code.variable}`}>
      <body>{children}</body>
    </html>
  );
}
