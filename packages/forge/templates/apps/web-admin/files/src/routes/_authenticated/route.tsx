import { createFileRoute, redirect } from '@tanstack/react-router'

import { isAuthenticated } from '@/features/auth/lib/session'
import { AdminLayout } from '@/layouts/admin-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AdminLayout,
})
