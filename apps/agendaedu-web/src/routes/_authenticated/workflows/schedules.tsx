import WorkflowSchedulesPage from '@/features/workflows/pages/workflow-schedules-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/workflows/schedules')({
  component: WorkflowSchedulesPage,
})
