'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Hammer, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface NavbarProps {
  dict: any
}

export default function Navbar({ dict }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const isAdminRoute = pathname.startsWith('/admin')
  const isOperatorRoute = pathname === '/' || pathname.startsWith('/log')

  const navLinks = user 
    ? [
        { name: dict.nav.admin_dashboard, href: '/admin' },
        { name: dict.nav.admin_correction, href: '/admin/log/update' },
        { name: dict.nav.update_log, href: '/log/update' },
        { name: dict.nav.home, href: '/' },
      ]
    : [
        { name: dict.nav.home, href: '/' },
        { name: dict.nav.update_log, href: '/log/update' },
        { name: dict.nav.login, href: '/login' },
      ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Hammer className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-900 tracking-tight">HIV Logbook</span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === link.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
            {user && isAdminRoute && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
                <Shield className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</span>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === link.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
