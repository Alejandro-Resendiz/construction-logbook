import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import AuthSidenav from '@/app/components/AuthSidenav'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dict = getDictionary('es')
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const role = user?.user_metadata?.role || null

  // Fetch avatar path from profile and generate signed URL (safe when profile doesn't exist yet)
  let initialAvatarUrl: string | null = null
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.avatar_path) {
    const { data: signedData } = await supabase.storage
      .from('avatars')
      .createSignedUrl(profile.avatar_path, 3600)
    initialAvatarUrl = signedData?.signedUrl ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidenav (contains mobile header internally) */}
      <AuthSidenav dict={dict} role={role} initialAvatarUrl={initialAvatarUrl} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
