import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import MachineryCostDashboard from '@/app/components/MachineryCostDashboard'

export default async function DashboardPage() {
  const dict = getDictionary('es')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <MachineryCostDashboard dict={dict} />
      </div>
    </main>
  )
}
