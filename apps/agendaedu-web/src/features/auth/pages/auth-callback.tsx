import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { authManager } from '@/lib/gateway-auth-manager'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

type CallbackStatus = 'processing' | 'success' | 'error'

export function AuthCallback() {
  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 处理认证回调
        authManager.handleAuthCallback()
        
        // 等待认证状态更新
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 检查认证状态
        await authManager.checkAuthStatus()
        const state = authManager.getState()
        
        if (state.isAuthenticated) {
          setStatus('success')
          
          // 延迟跳转，让用户看到成功状态
          setTimeout(() => {
            // 尝试跳转到保存的返回URL，否则跳转到首页
            const returnUrl = sessionStorage.getItem('wps_auth_return_url')
            if (returnUrl) {
              sessionStorage.removeItem('wps_auth_return_url')
              window.location.href = returnUrl
            } else {
              navigate({ to: '/dashboard' })
            }
          }, 2000)
        } else {
          setStatus('error')
          setErrorMessage('认证失败，请重试')
        }
      } catch (error) {
        console.error('认证回调处理失败:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : '认证处理失败')
      }
    }

    handleCallback()
  }, [navigate])

  const handleRetry = () => {
    // 重新跳转到WPS授权页面
    authManager.redirectToAuth(window.location.origin + '/dashboard')
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <RefreshCw className='h-8 w-8 animate-spin text-blue-500' />,
          title: '正在处理认证...',
          description: '请稍等，正在验证您的登录信息',
          color: 'text-blue-600',
        }
      case 'success':
        return {
          icon: <CheckCircle2 className='h-8 w-8 text-green-500' />,
          title: '登录成功！',
          description: '正在跳转到应用...',
          color: 'text-green-600',
        }
      case 'error':
        return {
          icon: <AlertCircle className='h-8 w-8 text-red-500' />,
          title: '登录失败',
          description: errorMessage || '认证过程中出现错误',
          color: 'text-red-600',
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-xl'>
        {/* 头部 */}
        <div className='mb-8 text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100'>
            {statusDisplay.icon}
          </div>
          <h1 className='mb-2 text-2xl font-bold text-gray-900'>
            WPS 登录认证
          </h1>
          <p className='text-sm text-gray-600'>安全认证处理中</p>
        </div>

        {/* 状态显示 */}
        <div className='mb-6 text-center'>
          <div className='mb-2 flex items-center justify-center space-x-3'>
            <span className={`font-medium ${statusDisplay.color}`}>
              {statusDisplay.title}
            </span>
          </div>
          <p className='text-sm text-gray-600'>{statusDisplay.description}</p>
        </div>

        {/* 错误状态的操作按钮 */}
        {status === 'error' && (
          <div className='space-y-3'>
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                {errorMessage || '认证过程中出现错误，请重试'}
              </AlertDescription>
            </Alert>
            
            <div className='flex space-x-3'>
              <Button onClick={handleRetry} className='flex-1'>
                <RefreshCw className='mr-2 h-4 w-4' />
                重新登录
              </Button>
              <Button
                onClick={() => navigate({ to: '/dashboard' })}
                variant='outline'
                className='flex-1'
              >
                返回首页
              </Button>
            </div>
          </div>
        )}

        {/* 成功状态的进度指示 */}
        {status === 'success' && (
          <div className='text-center'>
            <Spinner size='sm' className='mx-auto' />
            <p className='mt-2 text-sm text-gray-500'>正在跳转...</p>
          </div>
        )}

        {/* 页脚信息 */}
        <div className='mt-8 border-t border-gray-100 pt-6'>
          <p className='text-center text-xs text-gray-500'>
            由 WPS 官方认证服务提供技术支持
          </p>
        </div>
      </div>
    </div>
  )
}
