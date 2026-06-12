'use client'

import MVPBanner from '@/app/components/ui/MVPBanner'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/ui/Footer'

interface LayoutProps {
  children: React.ReactNode
  dict: any
  brandProps: {
    brandName: string
    publisher: string
    email: string
    linkedin: string
  }
}

export default function PublicLayout({ children, dict, brandProps }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Fixed Top: Banner + Navbar */}
      <header className="shrink-0 z-50 shadow-sm">
        <MVPBanner lang="es" />
        <Navbar dict={dict} brandProps={brandProps} />
      </header>

      {/* Scrollable Middle: Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>

      {/* Fixed Bottom: Brand Footer */}
      <footer className="shrink-0 z-50">
        <Footer 
          publisher={brandProps.publisher}
          email={brandProps.email}
          linkedin={brandProps.linkedin}
          variant="page"
        />
      </footer>
    </div>
  )
}
