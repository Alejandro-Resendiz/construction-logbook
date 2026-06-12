import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { getDictionary } from "@/lib/i18n";
import LayoutOrchestrator from "@/app/components/layouts/LayoutOrchestrator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HIV Logbook",
  description: "SIGMA Machinery Logbook",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dict = await getDictionary('es');
  
  const brandProps = {
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'SIGMA Logbook',
    publisher: process.env.NEXT_PUBLIC_BRAND_PUBLISHER || 'RMA',
    email: process.env.NEXT_PUBLIC_BRAND_EMAIL || '',
    linkedin: process.env.NEXT_PUBLIC_BRAND_LINKEDIN || '',
  };

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Toaster richColors position="top-right" />
        <LayoutOrchestrator dict={dict} brandProps={brandProps}>
          {children}
        </LayoutOrchestrator>
      </body>
    </html>
  );
}
