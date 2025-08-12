import WorkflowsPage from '@/features/workflows/pages/workflows-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/workflows/')({
  component: WorkflowsPage,
})
