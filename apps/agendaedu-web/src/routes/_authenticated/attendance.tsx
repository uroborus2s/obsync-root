import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createTeacherRouteCheck } from '@/utils/route-permission'

export const Route = createFileRoute('/_authenticated/attendance')({
  beforeLoad: createTeacherRouteCheck(),
  component: () => <Outlet />,
})
