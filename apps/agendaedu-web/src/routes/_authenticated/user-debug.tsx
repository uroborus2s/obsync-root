import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_authenticated/user-debug')({
  component: UserDebugPage,
})

function UserDebugPage() {
  const { user, isAuthenticated, loading } = useUser()

  if (loading) {
    return <div className='p-8'>加载中...</div>
  }

  if (!isAuthenticated || !user) {
    return <div className='p-8'>未登录</div>
  }

  return (
    <div className='container mx-auto p-8'>
      <h1 className='text-3xl font-bold mb-6'>用户信息调试</h1>

      <div className='grid gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div>
              <strong>用户ID:</strong> {user.id}
            </div>
            <div>
              <strong>姓名:</strong> {user.name}
            </div>
            <div>
              <strong>用户编号:</strong> {user.number}
            </div>
            <div>
              <strong>用户类型:</strong> {user.type}
            </div>
            <div>
              <strong>学院:</strong> {user.college}
            </div>
            <div>
              <strong>部门:</strong> {user.department}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>角色信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mb-2'>
              <strong>角色列表:</strong>
            </div>
            {user.roles && user.roles.length > 0 ? (
              <div className='flex gap-2 flex-wrap'>
                {user.roles.map((role) => (
                  <Badge key={role} variant='default'>
                    {role}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className='text-muted-foreground'>无角色</div>
            )}
            <div className='mt-4'>
              <strong>是否为管理员:</strong>{' '}
              {user.roles?.includes('admin') || user.roles?.includes('super_admin') ? (
                <Badge variant='default'>是</Badge>
              ) : (
                <Badge variant='destructive'>否</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>权限信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mb-2'>
              <strong>权限列表:</strong>
            </div>
            {user.permissions && user.permissions.length > 0 ? (
              <div className='flex gap-2 flex-wrap'>
                {user.permissions.map((permission) => (
                  <Badge key={permission} variant='secondary'>
                    {permission}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className='text-muted-foreground'>无权限</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>完整用户对象（JSON）</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='bg-muted p-4 rounded-lg overflow-auto text-sm'>
              {JSON.stringify(user, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

