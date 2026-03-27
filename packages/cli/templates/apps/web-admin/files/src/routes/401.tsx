import { createFileRoute } from '@tanstack/react-router'

import { ErrorShell } from '@/features/errors/components/error-shell'

export const Route = createFileRoute('/401')({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  return (
    <ErrorShell
      code='401'
      description='Your session is missing or expired. Sign back in to continue operating the workspace.'
      title='Authentication required'
    />
  )
}
