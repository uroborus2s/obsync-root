import { createFileRoute } from '@tanstack/react-router'
import { FailedCheckinLogsPage } from '@/features/attendance/pages/failed-checkin-logs-page'

export const Route = createFileRoute('/_authenticated/attendance/failed-logs')({
  component: FailedCheckinLogsPage,
})

