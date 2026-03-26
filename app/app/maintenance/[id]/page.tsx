import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { notFound, redirect } from 'next/navigation'
import MaintenanceEditForm from '@/app/components/MaintenanceEditForm'

export default async function EditMaintenancePage({ params }: { params: { id: string } }) {
  const { id } = await params
  const dict = getDictionary('es')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: request } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      machinery(machinery_name, machinery_full_name, external_code)
    `)
    .eq('maintenance_request_id', id)
    .single()

  if (!request) {
    notFound()
  }

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dict.maintenance.edit_request}</h1>
          <p className="text-gray-500">Actualizar observaciones y adjuntos del servicio.</p>
        </header>

        <MaintenanceEditForm 
          request={request} 
          dict={dict} 
        />
      </div>
    </main>
  )
}
