/**
 * 权限调试页面
 * 用于测试和调试权限保护功能
 */
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle,
  Key,
  Shield,
  User,
  XCircle,
} from 'lucide-react'
import { getJWTFromCookie, parseUserFromCookie } from '@/utils/jwt.utils'
import { useUser } from '@/hooks/use-user'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AdminGuard,
  PermissionGuard,
  StudentGuard,
  TeacherGuard,
} from '@/components/auth/permission-guard'

export const Route = createFileRoute('/_authenticated/permission-debug')({
  component: PermissionDebugPage,
})

function PermissionDebugPage() {
  const { user, isAuthenticated, loading, hasRole, hasPermission } = useUser()
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleDebugCookie = () => {
    const token = getJWTFromCookie()
    const userResult = parseUserFromCookie()

    // 详细分析JWT结构
    let jwtAnalysis: any = null
    if (token) {
      const parts = token.split('.')
      jwtAnalysis = {
        totalParts: parts.length,
        headerLength: parts[0]?.length || 0,
        payloadLength: parts[1]?.length || 0,
        signatureLength: parts[2]?.length || 0,
        fullToken: token,
      }

      // 尝试手动解析header和payload
      try {
        if (parts.length >= 2) {
          const headerDecoded = atob(
            parts[0].replace(/-/g, '+').replace(/_/g, '/')
          )
          const payloadDecoded = atob(
            parts[1].replace(/-/g, '+').replace(/_/g, '/')
          )
          jwtAnalysis.header = JSON.parse(headerDecoded)
          jwtAnalysis.payload = JSON.parse(payloadDecoded)
        }
      } catch (e: any) {
        jwtAnalysis.manualParseError = e?.message || '解析错误'
      }
    }

    setDebugInfo({
      token: token ? token.substring(0, 50) + '...' : null,
      userResult,
      cookieExists: !!token,
      parseSuccess: userResult.success,
      jwtAnalysis,
    })
  }

  if (loading) {
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center'>加载中...</div>
      </div>
    )
  }

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* 页面标题 */}
      <div className='flex items-center gap-3'>
        <Shield className='h-8 w-8 text-blue-600' />
        <div>
          <h1 className='text-3xl font-bold'>权限调试页面</h1>
          <p className='text-muted-foreground'>测试和调试权限保护功能</p>
        </div>
      </div>

      {/* 用户认证状态 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <User className='h-5 w-5' />
            用户认证状态
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span>认证状态:</span>
            {isAuthenticated ? (
              <Badge variant='default' className='flex items-center gap-1'>
                <CheckCircle className='h-3 w-3' />
                已认证
              </Badge>
            ) : (
              <Badge variant='destructive' className='flex items-center gap-1'>
                <XCircle className='h-3 w-3' />
                未认证
              </Badge>
            )}
          </div>

          {user && (
            <>
              <div>
                <span className='font-medium'>用户信息:</span>
                <div className='mt-2 rounded bg-gray-50 p-3 text-sm'>
                  <div>ID: {user.id}</div>
                  <div>姓名: {user.name}</div>
                  <div>编号: {user.number}</div>
                  <div>类型: {user.type}</div>
                  <div>学院: {user.college}</div>
                  <div>部门: {user.department}</div>
                </div>
              </div>

              <div>
                <span className='font-medium'>角色列表:</span>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {user.roles.map((role) => (
                    <Badge key={role} variant='secondary'>
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className='font-medium'>权限列表:</span>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {user.permissions.map((permission) => (
                    <Badge key={permission} variant='outline'>
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cookie调试 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Key className='h-5 w-5' />
            Cookie调试
          </CardTitle>
          <CardDescription>检查JWT Cookie的解析情况</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button onClick={handleDebugCookie}>检查Cookie状态</Button>

          {debugInfo && (
            <div className='space-y-2 rounded bg-gray-50 p-3 text-sm'>
              <div>Cookie存在: {debugInfo.cookieExists ? '是' : '否'}</div>
              <div>解析成功: {debugInfo.parseSuccess ? '是' : '否'}</div>
              {debugInfo.token && <div>Token: {debugInfo.token}</div>}
              {debugInfo.userResult.error && (
                <div className='text-red-600'>
                  错误: {debugInfo.userResult.error}
                </div>
              )}

              {debugInfo.jwtAnalysis && (
                <div className='mt-4 rounded border bg-white p-2'>
                  <div className='mb-2 font-medium'>JWT结构分析:</div>
                  <div>
                    总部分数: {debugInfo.jwtAnalysis.totalParts} (应该是3)
                  </div>
                  <div>Header长度: {debugInfo.jwtAnalysis.headerLength}</div>
                  <div>Payload长度: {debugInfo.jwtAnalysis.payloadLength}</div>
                  <div>
                    Signature长度: {debugInfo.jwtAnalysis.signatureLength}
                  </div>

                  {debugInfo.jwtAnalysis.header && (
                    <div className='mt-2'>
                      <div className='font-medium'>Header:</div>
                      <pre className='rounded bg-gray-100 p-1 text-xs'>
                        {JSON.stringify(debugInfo.jwtAnalysis.header, null, 2)}
                      </pre>
                    </div>
                  )}

                  {debugInfo.jwtAnalysis.payload && (
                    <div className='mt-2'>
                      <div className='font-medium'>Payload:</div>
                      <pre className='max-h-40 overflow-y-auto rounded bg-gray-100 p-1 text-xs'>
                        {JSON.stringify(debugInfo.jwtAnalysis.payload, null, 2)}
                      </pre>
                    </div>
                  )}

                  {debugInfo.jwtAnalysis.manualParseError && (
                    <div className='mt-2 text-red-600'>
                      手动解析错误: {debugInfo.jwtAnalysis.manualParseError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 权限检查测试 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            权限检查测试
          </CardTitle>
          <CardDescription>测试不同权限级别的检查结果</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* 角色检查 */}
          <div className='space-y-2'>
            <h4 className='font-medium'>角色检查:</h4>
            <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
              {['admin', 'super_admin', 'teacher', 'student'].map((role) => (
                <div
                  key={role}
                  className='flex items-center justify-between rounded border p-2'
                >
                  <span className='text-sm'>{role}:</span>
                  {hasRole(role) ? (
                    <Badge variant='default' className='text-xs'>
                      ✓
                    </Badge>
                  ) : (
                    <Badge variant='secondary' className='text-xs'>
                      ✗
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 权限检查 */}
          <div className='space-y-2'>
            <h4 className='font-medium'>权限检查:</h4>
            <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
              {[
                'admin',
                'admin:users',
                'admin:system',
                'teacher:profile',
                'teacher:courses',
                'student:profile',
              ].map((permission) => (
                <div
                  key={permission}
                  className='flex items-center justify-between rounded border p-2'
                >
                  <span className='text-sm'>{permission}:</span>
                  {hasPermission(permission) ? (
                    <Badge variant='default' className='text-xs'>
                      ✓
                    </Badge>
                  ) : (
                    <Badge variant='secondary' className='text-xs'>
                      ✗
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 组件权限保护测试 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5' />
            组件权限保护测试
          </CardTitle>
          <CardDescription>测试权限保护组件的显示效果</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* AdminGuard测试 */}
          <div>
            <h4 className='mb-2 font-medium'>AdminGuard 测试:</h4>
            <AdminGuard>
              <Alert>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>
                  ✅ 您有管理员权限，可以看到这个内容
                </AlertDescription>
              </Alert>
            </AdminGuard>
          </div>

          {/* TeacherGuard测试 */}
          <div>
            <h4 className='mb-2 font-medium'>TeacherGuard 测试:</h4>
            <TeacherGuard>
              <Alert>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>
                  ✅ 您有教师权限，可以看到这个内容
                </AlertDescription>
              </Alert>
            </TeacherGuard>
          </div>

          {/* StudentGuard测试 */}
          <div>
            <h4 className='mb-2 font-medium'>StudentGuard 测试:</h4>
            <StudentGuard>
              <Alert>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>
                  ✅ 您有学生权限，可以看到这个内容
                </AlertDescription>
              </Alert>
            </StudentGuard>
          </div>

          {/* 特定权限测试 */}
          <div>
            <h4 className='mb-2 font-medium'>特定权限测试 (admin:users):</h4>
            <PermissionGuard requiredPermissions={['admin:users']}>
              <Alert>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>
                  ✅ 您有 admin:users 权限，可以看到这个内容
                </AlertDescription>
              </Alert>
            </PermissionGuard>
          </div>

          {/* 多权限AND测试 */}
          <div>
            <h4 className='mb-2 font-medium'>
              多权限AND测试 (admin角色 + admin:system权限):
            </h4>
            <PermissionGuard
              requiredRoles={['admin']}
              requiredPermissions={['admin:system']}
              mode='and'
            >
              <Alert>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>
                  ✅ 您同时拥有admin角色和admin:system权限
                </AlertDescription>
              </Alert>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
