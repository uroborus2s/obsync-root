import WorkflowDefinitionsPage from '@/features/workflows/pages/workflow-definitions-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/workflows/definitions/')({
  component: WorkflowDefinitionsPage,
})
