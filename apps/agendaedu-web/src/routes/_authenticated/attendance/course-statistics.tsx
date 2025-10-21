import { createFileRoute } from '@tanstack/react-router'
import { CourseAttendanceStatisticsPage } from '@/features/attendance/pages/course-attendance-statistics-page'

export const Route = createFileRoute('/_authenticated/attendance/course-statistics')({
  component: CourseAttendanceStatisticsPage,
})
