'use client'

import { supabase } from '@/lib/supabase'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  label: string
  className?: string
  iconSize?: number
  showIcon?: boolean
}

export default function LogoutButton({ label, className, iconSize = 16, showIcon = true }: LogoutButtonProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Hard redirect to clear all memory state and cookies
    window.location.href = '/'
  }

  return (
    <button 
      onClick={handleLogout}
      className={className || "text-sm text-red-600 hover:underline flex items-center gap-2"}
    >
      {showIcon && <LogOut size={iconSize} />}
      {label}
    </button>
  )
}
