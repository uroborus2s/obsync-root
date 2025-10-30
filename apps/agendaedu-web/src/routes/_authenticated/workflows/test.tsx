import { createFileRoute } from '@tanstack/react-router'
import WorkflowTest from '@/features/workflows/pages/workflow-test'

export const Route = createFileRoute('/_authenticated/workflows/test')({
  component: WorkflowTest,
})
