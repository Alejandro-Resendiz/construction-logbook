import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import MaintenanceList from '@/app/components/MaintenanceList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function MaintenancePage() {
  const dict = getDictionary('es')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const role = user?.user_metadata?.role || null

  const { data: machinery } = await supabase
    .from('machinery')
    .select('machinery_id, machinery_full_name, external_code')
    .order('machinery_full_name')

  // Initial fetch of requests
  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      machinery(machinery_name, machinery_full_name, external_code)
    `)
    .order('date', { ascending: false })

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dict.maintenance.title}</h1>
            <p className="text-gray-500 text-sm">Historial y seguimiento de servicios de mantenimiento.</p>
          </div>
          <Link 
            href="/app/maintenance/new"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus size={20} />
            {dict.maintenance.new_request}
          </Link>
        </header>

        <MaintenanceList 
          initialRequests={requests || []} 
          machinery={machinery || []} 
          dict={dict}
          role={role}
        />
      </div>
    </main>
  )
}
