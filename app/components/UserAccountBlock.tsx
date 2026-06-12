'use client'

import { memo } from 'react'
import { ShieldCheck, Settings } from 'lucide-react'
import LogoutButton from './LogoutButton'

interface UserAccountBlockProps {
  user: any
  role: string | null
  logoutLabel: string
}

const UserAccountBlock = memo(function UserAccountBlock({ user, role, logoutLabel }: UserAccountBlockProps) {
  if (!user) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-3">
        {role === 'admin' ? (
          <Settings className="h-4 w-4 text-purple-500" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-orange-500" />
        )}
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {role ?? 'User'}
        </span>
      </div>
      <LogoutButton label={logoutLabel} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2" />
    </div>
  )
})

export default UserAccountBlock
