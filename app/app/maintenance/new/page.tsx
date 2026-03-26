import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import MaintenanceRequestForm from '@/app/components/MaintenanceRequestForm'

export default async function NewMaintenancePage() {
  const dict = getDictionary('es')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: machinery } = await supabase
    .from('machinery')
    .select('machinery_id, machinery_full_name, external_code')
    .order('machinery_full_name')

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dict.maintenance.new_request}</h1>
          <p className="text-gray-500">Registrar un nuevo servicio de mantenimiento para maquinaria.</p>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <MaintenanceRequestForm 
            machinery={machinery || []} 
            dict={dict} 
          />
        </div>
      </div>
    </main>
  )
}
