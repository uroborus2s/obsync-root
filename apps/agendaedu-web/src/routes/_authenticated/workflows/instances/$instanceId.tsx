import { createFileRoute } from '@tanstack/react-router'
import WorkflowInstanceDetail from '@/features/workflows/pages/workflow-instance-detail'

export const Route = createFileRoute(
  '/_authenticated/workflows/instances/$instanceId'
)({
  component: WorkflowInstanceDetail,
})
