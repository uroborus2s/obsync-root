import { ErrorShell } from '@/features/errors/components/error-shell'

interface GeneralErrorProps {
  error: Error
  reset: () => void
}

export default function GeneralError({
  error,
  reset,
}: GeneralErrorProps) {
  return (
    <ErrorShell
      code='500'
      description={error.message || 'An unexpected error interrupted the admin shell.'}
      onReset={reset}
      title='Something interrupted the workspace'
    />
  )
}
