import { createFileRoute } from '@tanstack/react-router'
import { AttendanceOverviewPage } from '@/features/attendance/pages/attendance-overview-page'

export const Route = createFileRoute('/_authenticated/attendance/overview')({
  component: AttendanceOverviewPage,
})
