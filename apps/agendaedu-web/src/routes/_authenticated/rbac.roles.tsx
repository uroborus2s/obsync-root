import { createFileRoute } from '@tanstack/react-router'
import RolesPage from '@/features/rbac/roles'

export const Route = createFileRoute('/_authenticated/rbac/roles')({
  component: RolesPage,
})

