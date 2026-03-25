import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppDashboardWrapper from '@/app/components/AppDashboardWrapper'
import LogoutButton from '@/app/components/LogoutButton'

export default async function LogbookPage() {
  const dict = getDictionary('es')
  const supabase = await createClient()

  // Correct server-side user check for Next.js App Router
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: machinery } = await supabase.from('machinery').select('*')

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dict.admin.dashboard_title}</h1>
            <Link href="/app/log/correct" className="text-sm text-blue-600 hover:underline">
              {dict.admin.correction.title}
            </Link>
          </div>
        </header>

      {/* This wrapper is a Client Component that uses dynamic(..., { ssr: false }) */}
      <AppDashboardWrapper 
        machinery={machinery || []} 
        dict={dict.admin}
        common={dict.common}
      />
    </div>
  </main>
)
}

