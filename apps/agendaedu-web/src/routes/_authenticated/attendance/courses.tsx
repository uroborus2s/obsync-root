import { createFileRoute } from '@tanstack/react-router'
import { AttendanceCoursesPage } from '@/features/attendance/pages/attendance-courses-page'

export const Route = createFileRoute('/_authenticated/attendance/courses')({
  component: AttendanceCoursesPage,
})
