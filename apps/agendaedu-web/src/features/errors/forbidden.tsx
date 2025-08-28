import { useEffect, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Home,
  Shield,
  User,
} from 'lucide-react'
import { getStoredErrorInfo, type ErrorInfo } from '@/utils/error-handler'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export default function ForbiddenError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // 使用错误处理工具函数获取错误详情
    const storedError = getStoredErrorInfo('last_403_error')
    if (storedError) {
      setErrorInfo(storedError)
      console.log('📋 403错误页面: 加载错误详情', storedError)
    }
  }, [])

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '未知时间'
    try {
      return new Date(timestamp).toLocaleString('zh-CN')
    } catch {
      return timestamp
    }
  }

  const handleContactSupport = () => {
    // 构建支持邮件内容
    const subject = encodeURIComponent('权限访问问题报告')
    const body = encodeURIComponent(
      `
尊敬的技术支持团队：

我在访问系统时遇到了权限问题，详情如下：

错误时间：${formatTimestamp(errorInfo?.timestamp)}
访问路径：${errorInfo?.currentPath || window.location.href}
请求接口：${errorInfo?.method} ${errorInfo?.url}
错误信息：${errorInfo?.message || '权限不足'}

请协助解决此权限问题。

谢谢！
    `.trim()
    )

    // 这里可以替换为实际的支持邮箱
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`
  }

  return (
    <div className='min-h-svh bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950'>
      <div className='flex min-h-svh items-center justify-center p-4'>
        <Card className='w-full max-w-lg'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900'>
              <Shield className='h-8 w-8 text-orange-600 dark:text-orange-400' />
            </div>
            <CardTitle className='text-2xl font-bold text-orange-900 dark:text-orange-100'>
              403 - 访问被拒绝
            </CardTitle>
            <CardDescription className='text-base'>
              您没有访问此资源的权限
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-4'>
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                您当前的账户权限不足以访问请求的资源。如果您认为这是一个错误，请联系系统管理员。
              </AlertDescription>
            </Alert>

            {errorInfo && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant='outline' className='w-full justify-between'>
                    查看错误详情
                    {showDetails ? (
                      <ChevronUp className='h-4 w-4' />
                    ) : (
                      <ChevronDown className='h-4 w-4' />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-3 space-y-3'>
                  <div className='bg-muted/50 rounded-lg border p-3 text-sm'>
                    <div className='space-y-2'>
                      {errorInfo.timestamp && (
                        <div className='flex items-center gap-2'>
                          <Clock className='text-muted-foreground h-4 w-4' />
                          <span className='font-medium'>时间:</span>
                          <span>{formatTimestamp(errorInfo.timestamp)}</span>
                        </div>
                      )}

                      {errorInfo.url && (
                        <div className='flex items-start gap-2'>
                          <Globe className='text-muted-foreground mt-0.5 h-4 w-4' />
                          <span className='font-medium'>接口:</span>
                          <div className='flex flex-col gap-1'>
                            <Badge variant='outline' className='w-fit'>
                              {errorInfo.method || 'GET'}
                            </Badge>
                            <code className='text-xs break-all'>
                              {errorInfo.url}
                            </code>
                          </div>
                        </div>
                      )}

                      {errorInfo.message && (
                        <div className='flex items-start gap-2'>
                          <AlertTriangle className='text-muted-foreground mt-0.5 h-4 w-4' />
                          <span className='font-medium'>错误:</span>
                          <span>{errorInfo.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className='space-y-3'>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() => history.go(-1)}
                  className='flex-1'
                >
                  <ArrowLeft className='mr-2 h-4 w-4' />
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

              <Button
                onClick={handleContactSupport}
                variant='secondary'
                className='w-full'
              >
                <User className='mr-2 h-4 w-4' />
                联系技术支持
              </Button>
            </div>

            <div className='text-muted-foreground mt-6 text-center text-sm'>
              <p>如需申请相关权限，请联系您的系统管理员</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
