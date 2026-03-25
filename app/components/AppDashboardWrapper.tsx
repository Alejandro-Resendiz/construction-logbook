'use client'

import dynamic from 'next/dynamic'

// This component is a Client Component, so it can safely use next/dynamic with ssr: false
const AppDashboardClient = dynamic(
  () => import('./AppDashboardClient'),
  { ssr: false }
)

interface AppDashboardWrapperProps {
  machinery: any[]
  dict: any
  common: any
}

export default function AppDashboardWrapper(props: AppDashboardWrapperProps) {
  return <AppDashboardClient {...props} />
}
