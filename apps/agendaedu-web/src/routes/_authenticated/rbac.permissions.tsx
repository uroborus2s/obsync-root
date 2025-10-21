import { createFileRoute } from '@tanstack/react-router'
import PermissionsPage from '@/features/rbac/permissions'

export const Route = createFileRoute('/_authenticated/rbac/permissions')({
  component: PermissionsPage,
})

