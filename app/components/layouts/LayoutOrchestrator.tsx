'use client'

import { AuthProvider, useAuth } from '@/hooks/useAuth'
import PublicLayout from './PublicLayout'
import AppLayout from './AppLayout'

interface OrchestratorProps {
  children: React.ReactNode
  dict: any
  brandProps: {
    brandName: string
    publisher: string
    email: string
    linkedin: string
  }
}

function LayoutSwitch({ children, dict, brandProps }: OrchestratorProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <AppLayout children={children} dict={dict} brandProps={brandProps} />
  }

  return <PublicLayout children={children} dict={dict} brandProps={brandProps} />
}

export default function LayoutOrchestrator(props: OrchestratorProps) {
  return (
    <AuthProvider>
      <LayoutSwitch {...props} />
    </AuthProvider>
  )
}
