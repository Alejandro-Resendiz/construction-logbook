'use client'

import dynamic from 'next/dynamic'

// This component is a Client Component, so it can safely use next/dynamic with ssr: false
const AdminDashboardClient = dynamic(
  () => import('./AdminDashboardClient'),
  { ssr: false }
)

interface AdminDashboardWrapperProps {
  machinery: any[]
  dict: any
  common: any
}

export default function AdminDashboardWrapper(props: AdminDashboardWrapperProps) {
  return <AdminDashboardClient {...props} />
}
