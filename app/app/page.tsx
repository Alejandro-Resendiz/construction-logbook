import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, History, Briefcase, Truck, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const dict = getDictionary('es')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const role = user?.user_metadata?.role || null

  const stats = [
    { 
      name: dict.nav.machinery_logbook, 
      href: '/app/logbook', 
      icon: LayoutDashboard, 
      color: 'bg-blue-500',
      description: 'Ver y exportar reportes de maquinaria.'
    },
    { 
      name: dict.admin.correction.title, 
      href: '/app/log/correct', 
      icon: History, 
      color: 'bg-orange-500',
      description: 'Corregir registros de cierre de turno.'
    },
  ]

  if (role === 'admin') {
    stats.push(
      { 
        name: dict.nav.manage_projects, 
        href: '/app/projects', 
        icon: Briefcase, 
        color: 'bg-purple-500',
        description: 'Administrar proyectos y obras.'
      },
      { 
        name: dict.nav.manage_machinery, 
        href: '/app/machinery', 
        icon: Truck, 
        color: 'bg-green-500',
        description: 'Administrar catálogo de maquinaria.'
      }
    )
  }

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dict.admin.tablero_title}</h1>
          <p className="text-gray-500">Bienvenido de nuevo al sistema de control HIVACO.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-blue-200"
              >
                <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 shadow-sm`}>
                  <Icon size={24} />
                </div>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  {item.name}
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {item.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
