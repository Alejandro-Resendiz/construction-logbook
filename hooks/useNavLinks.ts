import { useMemo } from 'react'
import { useAuth } from './useAuth'

export function useNavLinks(dict: any, isAdminRoute: boolean) {
  const { user, role } = useAuth()

  return useMemo(() => {
    const links: Array<{ name: string; href: string; iconName?: string }> = []

    if (user) {
      links.push(
        { name: dict.nav.admin_dashboard, href: '/app', iconName: 'LayoutDashboard' },
        { name: dict.nav.machinery_logbook, href: '/app/logbook', iconName: 'FileText' },
        { name: dict.nav.admin_correction, href: '/app/log/correct', iconName: 'History' },
        { name: dict.nav.maintenance, href: '/app/maintenance', iconName: 'Wrench' }
      )

      if (role === 'admin') {
        links.push(
          { name: dict.nav.manage_projects, href: '/app/projects', iconName: 'Briefcase' },
          { name: dict.nav.manage_machinery, href: '/app/machinery', iconName: 'Truck' },
          { name: dict.nav.manage_depreciation, href: '/app/machinery_depreciation', iconName: 'Hammer' }
        )
      }
    } else {
      links.push(
        { name: dict.nav.home, href: '/' },
        { name: dict.nav.update_log, href: '/log/update' },
        { name: dict.nav.login, href: '/login' }
      )
    }

    return links
  }, [user, role, dict])
}
