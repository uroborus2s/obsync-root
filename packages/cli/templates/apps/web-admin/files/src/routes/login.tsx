import { createFileRoute, redirect } from '@tanstack/react-router'

import { isAuthenticated } from '@/features/auth/lib/session'
import { LoginPage } from '@/features/auth/pages/login-page'

export interface LoginSearch {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  const search = Route.useSearch()

  return <LoginPage redirectTo={search.redirect} />
}
