import { createFileRoute } from '@tanstack/react-router'
import SyncManagementPage from '@/features/tasks/pages/sync-management-page'

export const Route = createFileRoute('/_authenticated/tasks/sync')({
  component: SyncManagementPage,
})
