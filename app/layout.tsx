import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import { getDictionary } from "@/lib/i18n";
import { Toaster } from 'sonner';
import MVPBanner from '@/components/ui/MVPBanner'; // Import MVPBanner

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dict = getDictionary('es');

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 pb-10"> {/* Adjusted padding-bottom */}
        <Toaster richColors position="top-right" />
        <Navbar dict={dict} />
        <div className="flex-1">
          {children}
        </div>
        <MVPBanner lang="es" /> {/* Render MVPBanner */}
      </body>
    </html>
  );
}
