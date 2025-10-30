import { createFileRoute } from '@tanstack/react-router'
import WorkflowsPage from '@/features/workflows/pages/workflows-page'

export const Route = createFileRoute('/_authenticated/workflows/')({
  component: WorkflowsPage,
})
