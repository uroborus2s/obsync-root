import { createFileRoute } from '@tanstack/react-router'

import { ErrorShell } from '@/features/errors/components/error-shell'

export const Route = createFileRoute('/500')({
  component: ServerErrorPage,
})

function ServerErrorPage() {
  return (
    <ErrorShell
      code='500'
      description='This static route is useful for validating the error page visual system without throwing a runtime exception.'
      title='Server-side failure preview'
    />
  )
}
