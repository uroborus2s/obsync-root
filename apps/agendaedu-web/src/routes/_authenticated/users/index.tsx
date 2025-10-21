import { createFileRoute } from '@tanstack/react-router'
import { createRoutePermissionCheck } from '@/utils/route-permission'
import Users from '@/features/users'

export const Route = createFileRoute('/_authenticated/users/')({
  // 添加路由级别的权限检查 - 需要管理员权限或用户管理权限
  beforeLoad: createRoutePermissionCheck({
    requiredRoles: ['admin', 'super_admin'],
    requiredPermissions: ['admin:users'],
    mode: 'or', // 任一条件满足即可
  }),
  component: Users,
})
