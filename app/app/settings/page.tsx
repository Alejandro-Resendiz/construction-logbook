import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import AccountSettingsClient from '@/app/components/AccountSettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const dict = getDictionary('es')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch the user's profile row (safe handling when user has no profile row yet)
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('user_id', user.id)
    .maybeSingle()

  const avatarPath = profile?.avatar_path ?? null

  // Generate a signed URL for the avatar if one exists
  let initialAvatarUrl: string | null = null
  if (avatarPath) {
    const { data: signedData } = await supabase.storage
      .from('avatars')
      .createSignedUrl(avatarPath, 3600)
    initialAvatarUrl = signedData?.signedUrl ?? null
  }

  return (
    <AccountSettingsClient
      initialAvatarUrl={initialAvatarUrl}
      userId={user.id}
      userEmail={user.email ?? ''}
      dict={dict}
    />
  )
}
