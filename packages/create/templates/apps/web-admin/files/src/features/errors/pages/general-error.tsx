import type { ErrorComponentProps } from '@tanstack/react-router'
import { getErrorMessage } from '@/lib/api/api-error'
import { ErrorShell } from '@/features/errors/components/error-shell'

export default function GeneralError({
  error,
  reset,
}: ErrorComponentProps) {
  return (
    <ErrorShell
      code='500'
      description={getErrorMessage(error)}
      onReset={reset}
      title='Something interrupted the workspace'
    />
  )
}
