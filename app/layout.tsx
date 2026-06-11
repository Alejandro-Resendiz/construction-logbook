import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import { getDictionary } from "@/lib/i18n";
import { Toaster } from 'sonner';
import MVPBanner from '@/app/components/ui/MVPBanner';
import Footer from '@/app/components/ui/Footer';

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
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Hivaco';
  const email = process.env.NEXT_PUBLIC_BRAND_EMAIL || '';
  const linkedin = process.env.NEXT_PUBLIC_BRAND_LINKEDIN || '';

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 pt-10">
        <Toaster richColors position="top-right" />
        
        <header className="sticky top-0 z-50 shadow-sm">
          <MVPBanner lang="es" />
          <Navbar dict={dict} />
          <Footer 
            brandName={brandName}
            email={email}
            linkedin={linkedin}
            variant="compact"
          />
        </header>

        <main className="flex-1">
          {children}
        </main>

        <Footer 
          brandName={brandName}
          email={email}
          linkedin={linkedin}
          variant="standard"
        />
      </body>
    </html>
  );
}
