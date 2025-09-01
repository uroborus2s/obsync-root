import { createFileRoute } from '@tanstack/react-router'
import WorkflowInstancesPage from '@/features/workflows/pages/workflow-instances-page'

export const Route = createFileRoute('/_authenticated/workflows/instances/')({
  component: WorkflowInstancesPage,
})
