import { createFileRoute } from '@tanstack/react-router'
import UsersManagementPage from '@/features/rbac/users'

export const Route = createFileRoute('/_authenticated/rbac/users')({
  component: UsersManagementPage,
})

