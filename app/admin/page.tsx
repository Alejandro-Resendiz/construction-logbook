import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminDashboardWrapper from '@/app/components/AdminDashboardWrapper'

export default async function AdminDashboardPage() {
  const dict = getDictionary('es')
  const supabase = await createClient()

  // Correct server-side user check for Next.js App Router
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
const { data: machinery } = await supabase.from('machinery').select('*')

return (
  <main className="min-h-screen bg-gray-50 p-4 md:p-8">
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{dict.admin.dashboard_title}</h1>
          <Link href="/admin/log/update" className="text-sm text-blue-600 hover:underline">
            {dict.admin.correction.title}
          </Link>
        </div>
        <form action={async () => {
          'use server'
          const supabase = await createClient()
          await supabase.auth.signOut()
          redirect('/login')
        }}>
          <button 
            type="submit"
            className="text-sm text-red-600 hover:underline self-start"
          >
            {dict.admin.logout}
          </button>
        </form>
      </header>

      {/* This wrapper is a Client Component that uses dynamic(..., { ssr: false }) */}
      <AdminDashboardWrapper 
        machinery={machinery || []} 
        dict={dict.admin}
        common={dict.common}
      />
    </div>
  </main>
)
}
