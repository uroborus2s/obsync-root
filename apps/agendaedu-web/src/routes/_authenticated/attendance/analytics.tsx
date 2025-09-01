import { createFileRoute } from '@tanstack/react-router'
import { AttendanceAnalyticsPage } from '@/features/attendance/pages/attendance-analytics-page'

export const Route = createFileRoute('/_authenticated/attendance/analytics')({
  component: AttendanceAnalyticsPage,
})
