import { createFileRoute } from '@tanstack/react-router'
import { createAdminRouteCheck } from '@/utils/route-permission'
import WorkflowTest from '@/features/workflows/pages/workflow-test'

export const Route = createFileRoute('/_authenticated/workflows/test')({
  beforeLoad: createAdminRouteCheck(),
  component: WorkflowTest,
})
