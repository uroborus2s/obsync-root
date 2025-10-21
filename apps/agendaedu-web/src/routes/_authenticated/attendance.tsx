import { AttendancePage } from '@/features/attendance/pages/attendance-page'
import { createTeacherRouteCheck } from '@/utils/route-permission'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/attendance')({
  beforeLoad: createTeacherRouteCheck(),
  component: AttendancePage,
})
