import WorkflowLogsPage from '@/features/workflows/pages/workflow-logs-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/workflows/logs')({
  component: WorkflowLogsPage,
})
