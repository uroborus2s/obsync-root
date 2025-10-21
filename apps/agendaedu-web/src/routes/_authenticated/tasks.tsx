import TasksPage from '@/features/tasks/pages/tasks-page'
import { createAdminRouteCheck } from '@/utils/route-permission'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/tasks')({
  beforeLoad: createAdminRouteCheck(),
  component: TasksPage,
})
