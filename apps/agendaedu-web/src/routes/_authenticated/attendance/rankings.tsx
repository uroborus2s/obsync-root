import { createFileRoute } from '@tanstack/react-router'
import { AttendanceRankingsPage } from '@/features/attendance/pages/attendance-rankings-page'

export const Route = createFileRoute('/_authenticated/attendance/rankings')({
  component: AttendanceRankingsPage,
})
