import { createFileRoute } from '@tanstack/react-router'
import { AttendanceStudentsPage } from '@/features/attendance/pages/attendance-students-page'

export const Route = createFileRoute('/_authenticated/attendance/students')({
  component: AttendanceStudentsPage,
})
