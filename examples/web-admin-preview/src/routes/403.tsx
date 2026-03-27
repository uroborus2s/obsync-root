import { createFileRoute } from '@tanstack/react-router'

import { ErrorShell } from '@/features/errors/components/error-shell'

export const Route = createFileRoute('/403')({
  component: ForbiddenPage,
})

function ForbiddenPage() {
  return (
    <ErrorShell
      code='403'
      description='You reached a valid admin route, but your role does not have access to this area yet.'
      title='You do not have access to this route'
    />
  )
}
