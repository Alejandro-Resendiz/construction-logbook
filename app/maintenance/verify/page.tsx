import { createClient } from '@supabase/supabase-js'
import { getDictionary } from '@/lib/i18n'
import Link from 'next/link'
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from 'lucide-react'

// Use admin client to bypass RLS for status updates via token
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function MaintenanceVerifyPage({
  searchParams,
}: {
  searchParams: { token: string; action: string }
}) {
  const { token, action } = await searchParams
  const dict = getDictionary('es')

  if (!token || !action) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h1 className="text-xl font-bold text-gray-900">Enlace Inválido</h1>
          <p className="text-gray-500">Faltan parámetros de verificación.</p>
        </div>
      </main>
    )
  }

  // 1. Find the request
  const { data: request, error: findError } = await supabaseAdmin
    .from('maintenance_requests')
    .select('maintenance_request_id, status, machinery(machinery_name)')
    .eq('hash_id', token)
    .single()

  if (findError || !request) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h1 className="text-xl font-bold text-gray-900">No Encontrado</h1>
          <p className="text-gray-500">No se pudo encontrar la solicitud de mantenimiento especificada.</p>
        </div>
      </main>
    )
  }

  // 2. Check if already processed
  if (request.status !== 'pending') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="mx-auto text-blue-500" size={48} />
          <h1 className="text-xl font-bold text-gray-900">Ya Procesado</h1>
          <p className="text-gray-500">
            Esta solicitud para <strong>{request.machinery?.machinery_name}</strong> ya ha sido marcada como{' '}
            <span className="font-bold">{dict.maintenance[request.status]}</span>.
          </p>
          <Link href="/app/maintenance" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline pt-4">
            <ArrowLeft size={16} />
            Ir a Mantenimiento
          </Link>
        </div>
      </main>
    )
  }

  // 3. Process action
  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const { error: updateError } = await supabaseAdmin
    .from('maintenance_requests')
    .update({ status: newStatus })
    .eq('maintenance_request_id', request.maintenance_request_id)

  if (updateError) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h1 className="text-xl font-bold text-gray-900">Error</h1>
          <p className="text-gray-500">No se pudo actualizar el estado de la solicitud.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
        {action === 'approve' ? (
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
        ) : (
          <XCircle className="mx-auto text-red-500" size={48} />
        )}
        <h1 className="text-xl font-bold text-gray-900">
          Solicitud {action === 'approve' ? 'Autorizada' : 'Denegada'}
        </h1>
        <p className="text-gray-500">
          El registro para <strong>{request.machinery?.machinery_name}</strong> ha sido{' '}
          <span className={`font-bold ${action === 'approve' ? 'text-green-600' : 'text-red-600'}`}>
            {action === 'approve' ? 'autorizado' : 'denegado'}
          </span>{' '}
          exitosamente.
        </p>
        <Link href="/app/maintenance" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline pt-4">
          <ArrowLeft size={16} />
          Ver todos los registros
        </Link>
      </div>
    </main>
  )
}
