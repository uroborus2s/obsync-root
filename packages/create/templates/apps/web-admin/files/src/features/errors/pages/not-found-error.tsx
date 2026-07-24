import { ErrorShell } from '@/features/errors/components/error-shell'

export default function NotFoundError() {
  return (
    <ErrorShell
      code='404'
      description='The page you requested is not part of this admin workspace, or the route moved while the shell was being upgraded.'
      title='This route does not exist'
    />
  )
}
