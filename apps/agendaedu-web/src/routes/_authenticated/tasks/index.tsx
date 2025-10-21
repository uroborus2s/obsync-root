import { createFileRoute } from '@tanstack/react-router'
import { createAdminRouteCheck } from '@/utils/route-permission'
import Tasks from '@/features/tasks'

export const Route = createFileRoute('/_authenticated/tasks/')({
  beforeLoad: createAdminRouteCheck(),
  component: Tasks,
})
