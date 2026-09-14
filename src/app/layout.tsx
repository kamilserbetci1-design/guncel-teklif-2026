import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ProductLoader from "@/components/ProductLoader";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Teklif Yönetim Sistemi",
  description: "MutPro & Güçlü Mutfak - Profesyonel Teklif Hazırlama ve Yönetim Paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${inter.className}`}>
        <ProductLoader />
        {children}
      </body>
    </html>
  );
}
