'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  History, 
  Briefcase, 
  Truck, 
  User,
  ShieldCheck,
  Menu,
  X,
  FileText
} from 'lucide-react'
import LogoutButton from './LogoutButton'

interface AuthSidenavProps {
  dict: any
  role: string | null
}

export default function AuthSidenav({ dict, role }: AuthSidenavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const links = [
    { 
      name: dict.nav.admin_dashboard, 
      href: '/app', 
      icon: LayoutDashboard,
      roles: ['admin', 'resident']
    },
    { 
      name: dict.nav.machinery_logbook, 
      href: '/app/logbook', 
      icon: FileText,
      roles: ['admin', 'resident']
    },
    { 
      name: dict.nav.admin_correction, 
      href: '/app/log/correct', 
      icon: History,
      roles: ['admin', 'resident']
    },
    { 
      name: dict.nav.manage_projects, 
      href: '/app/projects', 
      icon: Briefcase,
      roles: ['admin']
    },
    { 
      name: dict.nav.manage_machinery, 
      href: '/app/machinery', 
      icon: Truck,
      roles: ['admin']
    }
  ]

  const filteredLinks = links.filter(link => !link.roles || link.roles.includes(role || ''))

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          <span className="font-bold text-lg text-gray-900 tracking-tight">HIV App</span>
        </Link>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex lg:flex-col
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <span className="font-bold text-xl text-gray-900 tracking-tight">HIV App</span>
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {filteredLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                {link.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate uppercase leading-none mb-1">
                {role ?? 'User'}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-none">
                {role === 'admin' ? 'Administrator' : 'Resident'}
              </p>
            </div>
          </div>
          
          <LogoutButton 
            label={dict.admin.logout} 
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            iconSize={20}
          />
        </div>
      </aside>
    </>
  )
}
