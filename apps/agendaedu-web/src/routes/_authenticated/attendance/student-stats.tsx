import { createFileRoute } from '@tanstack/react-router'
import { StudentAbsenceStatsPage } from '@/features/attendance/pages/student-absence-stats-page'

export const Route = createFileRoute('/_authenticated/attendance/student-stats')({
  component: StudentAbsenceStatsPage,
})

