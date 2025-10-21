import { createFileRoute } from '@tanstack/react-router'
import MenusPage from '@/features/rbac/menus'

export const Route = createFileRoute('/_authenticated/rbac/menus')({
  component: MenusPage,
})

