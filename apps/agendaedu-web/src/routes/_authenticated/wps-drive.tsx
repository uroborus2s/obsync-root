import { createFileRoute } from '@tanstack/react-router'
import { createRoutePermissionCheck } from '@/utils/route-permission'
import WpsDriveManagement from '@/features/wps-drive'

export const Route = createFileRoute('/_authenticated/wps-drive')({
  // TODO: 后续统一处理权限 - 临时允许teacher角色访问
  // 添加路由级别的权限检查
  beforeLoad: createRoutePermissionCheck({
    requiredRoles: ['teacher', 'admin', 'super_admin'],
    mode: 'or',
  }),
  component: WpsDriveManagement,
})
