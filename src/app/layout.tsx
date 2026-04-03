import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { BrandProvider } from "@/lib/brand-context";
import { DEFAULT_BRAND } from "@/lib/brand";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const brandHeader = headersList.get("x-brand-config");
  let brand = DEFAULT_BRAND;
  if (brandHeader) {
      try {
          brand = JSON.parse(decodeURIComponent(brandHeader));
      } catch (e) {
          console.error("Failed to decode brand for metadata:", e);
      }
  }
  return {
    title: `${brand.name} — Telegram Ordering`,
    description: `Browse menus, place orders, and pay via Telegram for ${brand.name}. No app downloads. Zero friction.`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const brandHeader = headersList.get("x-brand-config");
  let brand = DEFAULT_BRAND;

  if (brandHeader) {
    try {
      brand = JSON.parse(decodeURIComponent(brandHeader));
    } catch (e) {
      console.error("Failed to parse brand config header from middleware", e);
    }
  }

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0a0a0f] text-white`}
        style={{"--brand-primary": brand.primaryColor, "--brand-secondary": brand.secondaryColor} as React.CSSProperties}
      >
        <BrandProvider brand={brand}>
          {children}
        </BrandProvider>
      </body>
    </html>
  );
}
