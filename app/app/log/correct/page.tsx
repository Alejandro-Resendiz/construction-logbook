import { getDictionary } from '@/lib/i18n'
import CorrectionLogForm from '@/app/components/CorrectionLogForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminUpdateLogPage() {
  const dict = getDictionary('es')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {dict.admin.correction.title}
          </h1>
          <CorrectionLogForm dict={dict.update_log} adminDict={dict.admin} />
        </div>
      </div>
    </main>
  )
}
