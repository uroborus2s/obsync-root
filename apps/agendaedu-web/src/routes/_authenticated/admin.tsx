/**
 * 管理员页面
 * 展示如何使用路由级别和组件级别的权限保护
 */
import { createFileRoute } from '@tanstack/react-router'
import { Activity, Database, Settings, Shield, Users } from 'lucide-react'
import { createAdminRouteCheck } from '@/utils/route-permission'
import { useUser } from '@/hooks/use-user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AdminGuard, PermissionGuard } from '@/components/auth/permission-guard'

// 路由定义 - 使用路由级别的权限检查
export const Route = createFileRoute('/_authenticated/admin')({
  // 在路由加载前检查管理员权限
  beforeLoad: createAdminRouteCheck(),
  component: AdminDashboard,
})

/**
 * 管理员仪表板组件
 */
function AdminDashboard() {
  const { user, hasRole, hasPermission } = useUser()

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* 页面标题 */}
      <div className='flex items-center gap-3'>
        <Shield className='h-8 w-8 text-blue-600' />
        <div>
          <h1 className='text-3xl font-bold'>管理员控制台</h1>
          <p className='text-muted-foreground'>
            欢迎，{user?.name}！您拥有管理员权限。
          </p>
        </div>
      </div>

      {/* 用户权限信息 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            当前用户权限
          </CardTitle>
          <CardDescription>显示您当前的角色和权限信息</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <h4 className='mb-2 font-medium'>角色:</h4>
            <div className='flex flex-wrap gap-2'>
              {user?.roles.map((role) => (
                <Badge key={role} variant='secondary'>
                  {role}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className='mb-2 font-medium'>权限:</h4>
            <div className='flex flex-wrap gap-2'>
              {user?.permissions.map((permission) => (
                <Badge key={permission} variant='outline'>
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 管理功能区域 */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {/* 用户管理 - 需要 admin:users 权限 */}
        <PermissionGuard requiredPermissions={['admin:users']}>
          <Card className='transition-shadow hover:shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Users className='h-5 w-5' />
                用户管理
              </CardTitle>
              <CardDescription>管理系统用户、角色和权限</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className='w-full'>进入用户管理</Button>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* 系统设置 - 需要 admin:system 权限 */}
        <PermissionGuard requiredPermissions={['admin:system']}>
          <Card className='transition-shadow hover:shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                系统设置
              </CardTitle>
              <CardDescription>配置系统参数和功能设置</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className='w-full'>进入系统设置</Button>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* 数据管理 - 需要超级管理员角色 */}
        <PermissionGuard requiredRoles={['super_admin']}>
          <Card className='transition-shadow hover:shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Database className='h-5 w-5' />
                数据管理
              </CardTitle>
              <CardDescription>数据库备份、恢复和维护</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className='w-full' variant='destructive'>
                进入数据管理
              </Button>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* 系统监控 - 使用自定义权限检查 */}
        <PermissionGuard
          customCheck={() =>
            hasRole('admin') &&
            (hasPermission('admin:system') || hasPermission('admin:monitor'))
          }
        >
          <Card className='transition-shadow hover:shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='h-5 w-5' />
                系统监控
              </CardTitle>
              <CardDescription>查看系统运行状态和性能指标</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className='w-full' variant='outline'>
                查看监控面板
              </Button>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* 通用管理功能 - 使用 AdminGuard 快捷组件 */}
        <AdminGuard>
          <Card className='transition-shadow hover:shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                管理员工具
              </CardTitle>
              <CardDescription>通用的管理员工具和功能</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className='w-full' variant='secondary'>
                打开工具箱
              </Button>
            </CardContent>
          </Card>
        </AdminGuard>
      </div>

      {/* 权限测试区域 */}
      <Card>
        <CardHeader>
          <CardTitle>权限测试</CardTitle>
          <CardDescription>测试不同权限级别的访问控制</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* 测试admin角色 */}
          <div className='flex items-center justify-between rounded border p-3'>
            <span>Admin 角色检查:</span>
            {hasRole('admin') ? (
              <Badge variant='default'>✓ 通过</Badge>
            ) : (
              <Badge variant='destructive'>✗ 未通过</Badge>
            )}
          </div>

          {/* 测试super_admin角色 */}
          <div className='flex items-center justify-between rounded border p-3'>
            <span>Super Admin 角色检查:</span>
            {hasRole('super_admin') ? (
              <Badge variant='default'>✓ 通过</Badge>
            ) : (
              <Badge variant='secondary'>✗ 未通过</Badge>
            )}
          </div>

          {/* 测试admin权限 */}
          <div className='flex items-center justify-between rounded border p-3'>
            <span>Admin 权限检查:</span>
            {hasPermission('admin') ? (
              <Badge variant='default'>✓ 通过</Badge>
            ) : (
              <Badge variant='destructive'>✗ 未通过</Badge>
            )}
          </div>

          {/* 测试admin:users权限 */}
          <div className='flex items-center justify-between rounded border p-3'>
            <span>Admin:Users 权限检查:</span>
            {hasPermission('admin:users') ? (
              <Badge variant='default'>✓ 通过</Badge>
            ) : (
              <Badge variant='secondary'>✗ 未通过</Badge>
            )}
          </div>

          {/* 测试admin:system权限 */}
          <div className='flex items-center justify-between rounded border p-3'>
            <span>Admin:System 权限检查:</span>
            {hasPermission('admin:system') ? (
              <Badge variant='default'>✓ 通过</Badge>
            ) : (
              <Badge variant='secondary'>✗ 未通过</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
