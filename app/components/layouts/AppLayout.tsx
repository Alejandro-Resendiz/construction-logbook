'use client'

import { useState, useMemo} from 'react'
import {
  ShieldCheck, Menu, X, LayoutDashboard, FileText,
  History, Wrench, Briefcase, Truck, Hammer,
  type LucideIcon 
} from 'lucide-react'
import Link from 'next/link'
import Footer from '@/app/components/ui/Footer'
import UserAccountBlock from '@/app/components/UserAccountBlock'
import MVPBanner from '@/app/components/ui/MVPBanner'
import { useAuth } from '@/hooks/useAuth'
import { useNavLinks } from '@/hooks/useNavLinks'

interface AppLayoutProps {
  children: React.ReactNode
  dict: any
  brandProps: {
    brandName: string
    publisher: string
    email: string
    linkedin: string
  }
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FileText, History, Wrench, Briefcase, Truck, Hammer
}

export default function AppLayout({ children, dict, brandProps }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const isAdminRoute = true
  const navLinks = useNavLinks(dict, isAdminRoute)

  const sidebarContent = useMemo(() => (
    <>
      <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100 shrink-0">
        <ShieldCheck className="h-8 w-8 text-blue-600" />
        <span className="font-bold text-xl text-gray-900 tracking-tight">{brandProps.brandName}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="mt-4 px-2 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.iconName ? iconMap[link.iconName] : null
            return (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                {Icon && <Icon size={18} />}
                {link.name}
              </a>
            )
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-gray-100 p-3 space-y-3">
        <UserAccountBlock
          user={user}
          role={user?.user_metadata?.role ?? null}
          logoutLabel={dict.admin.logout}
        />
        <Footer
          publisher={brandProps.publisher}
          email={brandProps.email}
          linkedin={brandProps.linkedin}
          variant="sidebar"
        />
      </div>
    </>
  ), [brandProps, navLinks, user, dict?.admin?.logout])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 w-64 h-screen flex-col border-r border-gray-200 bg-white z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <aside className="lg:hidden fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-gray-200 bg-white shadow-xl flex">
          {sidebarContent}
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <div className="sticky top-0 z-10">
          <MVPBanner lang="es" />
        </div>
        {/* Mobile header */}
        <div className="lg:hidden shrink-0 w-full bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-blue-600" />
            <span className="font-bold text-base text-gray-900 tracking-tight">{brandProps.brandName}</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Overlay (mobile only) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
