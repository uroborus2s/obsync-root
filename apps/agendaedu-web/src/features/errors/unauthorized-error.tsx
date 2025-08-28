import { useEffect, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { AlertCircle, Home, LogIn, RefreshCw } from 'lucide-react'
import { authManager } from '@/lib/gateway-auth-manager'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function UnauthorisedError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  const [countdown, setCountdown] = useState(10)
  const [autoRedirect, setAutoRedirect] = useState(true)

  // 自动重定向倒计时
  useEffect(() => {
    if (!autoRedirect) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleLogin()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoRedirect])

  const handleLogin = () => {
    // 获取当前页面路径作为返回URL
    const returnUrl = window.location.href
    console.log('🔐 401错误页面: 重定向到登录，返回URL:', returnUrl)

    // 使用认证管理器进行登录重定向
    authManager.redirectToAuth(returnUrl)
  }

  const handleCancelAutoRedirect = () => {
    setAutoRedirect(false)
    setCountdown(0)
  }

  return (
    <div className='min-h-svh bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950'>
      <div className='flex min-h-svh items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900'>
              <AlertCircle className='h-8 w-8 text-red-600 dark:text-red-400' />
            </div>
            <CardTitle className='text-2xl font-bold text-red-900 dark:text-red-100'>
              401 - 未授权访问
            </CardTitle>
            <CardDescription className='text-base'>
              您需要登录才能访问此资源
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-4'>
            {autoRedirect && countdown > 0 && (
              <Alert>
                <LogIn className='h-4 w-4' />
                <AlertDescription>
                  将在 {countdown} 秒后自动跳转到登录页面...
                  <Button
                    variant='link'
                    size='sm'
                    className='ml-2 h-auto p-0 text-xs'
                    onClick={handleCancelAutoRedirect}
                  >
                    取消自动跳转
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className='space-y-3'>
              <Button onClick={handleLogin} className='w-full' size='lg'>
                <LogIn className='mr-2 h-4 w-4' />
                立即登录
              </Button>

              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() => history.go(-1)}
                  className='flex-1'
                >
                  <RefreshCw className='mr-2 h-4 w-4' />
                  返回上页
                </Button>
                <Button
                  variant='outline'
                  onClick={() => navigate({ to: '/' })}
                  className='flex-1'
                >
                  <Home className='mr-2 h-4 w-4' />
                  回到首页
                </Button>
              </div>
            </div>

            <div className='text-muted-foreground mt-6 text-center text-sm'>
              <p>如果您认为这是一个错误，请联系系统管理员</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
