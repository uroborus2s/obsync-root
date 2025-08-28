import WorkflowInstancesPage from '@/features/workflows/pages/workflow-instances-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/workflows/instances')({
  component: WorkflowInstancesPage,
})
