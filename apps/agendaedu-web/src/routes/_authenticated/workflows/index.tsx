import WorkflowsPage from '@/features/workflows/pages/workflows-page'
import { createAdminRouteCheck } from '@/utils/route-permission'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/workflows/')({
  beforeLoad: createAdminRouteCheck(),
  component: WorkflowsPage,
})
