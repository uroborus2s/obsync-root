import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { wpsSDK } from '@/lib/wps-sdk-manager'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type LoginStatus = 'loading' | 'ready' | 'scanned' | 'success' | 'error'

export function WpsLoginPage() {
  const [status, setStatus] = useState<LoginStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const qrContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // 初始化二维码
  const initQRCode = async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      // 等待SDK加载完成
      await wpsSDK.waitForSDK()

      // 清理之前可能存在的二维码
      const existingQrCodes = document.querySelectorAll('.kso-qr-code-sdk')
      existingQrCodes.forEach((element) => element.remove())

      // 生成二维码
      const authUrl = wpsSDK.buildAuthUrl('web_login')

      if (window.qrcode && typeof window.qrcode.generateQrCode === 'function') {
        window.qrcode.generateQrCode({
          app_id: wpsSDK.getConfig().appId,
          auth_url: authUrl,
        })

        // 轮询等待二维码生成
        let attempts = 0
        const maxAttempts = 10
        const checkInterval = setInterval(() => {
          attempts++
          const qrCodeElement = document.querySelector(
            '.kso-qr-code-sdk'
          ) as HTMLElement

          if (qrCodeElement && qrContainerRef.current) {
            clearInterval(checkInterval)

            // 移动二维码到指定容器
            qrContainerRef.current.innerHTML = ''
            qrContainerRef.current.appendChild(qrCodeElement)

            // 调整样式
            qrCodeElement.style.width = '100%'
            qrCodeElement.style.height = '100%'
            qrCodeElement.style.maxWidth = '350px'
            qrCodeElement.style.maxHeight = '350px'
            qrCodeElement.style.margin = '0 auto'
            qrCodeElement.style.borderRadius = '12px'
            qrCodeElement.style.overflow = 'hidden'
            qrCodeElement.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'

            const qrImg = qrCodeElement.querySelector('img') as HTMLImageElement
            if (qrImg) {
              qrImg.style.width = '100%'
              qrImg.style.height = '100%'
              qrImg.style.objectFit = 'contain'
            }

            setStatus('ready')
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            throw new Error('二维码生成超时，请检查网络连接')
          }
        }, 500)
      } else {
        throw new Error('WPS SDK未加载，请刷新页面重试')
      }
    } catch (error) {
      setStatus('error')
      const errorMsg = error instanceof Error ? error.message : '加载失败'
      setErrorMessage(errorMsg)
    }
  }

  // 刷新二维码
  const refreshQrCode = () => {
    initQRCode()
  }

  // 监听登录状态变化
  useEffect(() => {
    // 监听URL变化以处理登录回调
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')

      if (code && state === 'web_login') {
        setStatus('success')

        // 清理URL参数
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )

        // 延迟跳转，让用户看到成功状态
        setTimeout(() => {
          navigate({ to: '/' })
        }, 2000)
      }
    }

    // 监听popstate事件
    window.addEventListener('popstate', handleUrlChange)
    handleUrlChange() // 初始检查

    return () => {
      window.removeEventListener('popstate', handleUrlChange)
      // 清理二维码
      const existingQrCodes = document.querySelectorAll('.kso-qr-code-sdk')
      existingQrCodes.forEach((element) => element.remove())
    }
  }, [navigate])

  // 组件挂载时初始化二维码
  useEffect(() => {
    initQRCode()
  }, [])

  const getStatusDisplay = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <RefreshCw className='h-8 w-8 animate-spin text-blue-500' />,
          title: '正在加载...',
          description: '请稍等，正在为您准备登录二维码',
          color: 'text-blue-600',
        }
      case 'ready':
        return {
          icon: <QrCode className='h-8 w-8 text-green-500' />,
          title: '请扫描二维码登录',
          description: '使用 WPS 移动端扫描上方二维码完成登录',
          color: 'text-green-600',
        }
      case 'scanned':
        return {
          icon: <Smartphone className='h-8 w-8 text-orange-500' />,
          title: '已扫描，请确认',
          description: '请在手机上确认登录',
          color: 'text-orange-600',
        }
      case 'success':
        return {
          icon: <CheckCircle2 className='h-8 w-8 text-green-500' />,
          title: '登录成功！',
          description: '正在跳转到主页...',
          color: 'text-green-600',
        }
      case 'error':
        return {
          icon: <AlertCircle className='h-8 w-8 text-red-500' />,
          title: '加载失败',
          description: errorMessage || '二维码加载失败，请重试',
          color: 'text-red-600',
        }
      default:
        return {
          icon: <QrCode className='h-8 w-8' />,
          title: '',
          description: '',
          color: '',
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
            <QrCode className='h-8 w-8 text-blue-600' />
          </div>
          <h1 className='mb-2 text-2xl font-bold text-gray-900'>
            WPS 扫码登录
          </h1>
          <p className='text-sm text-gray-600'>安全、快速的登录方式</p>
        </div>

        {/* 二维码区域 */}
        <div className='mb-8'>
          <div className='relative flex min-h-[300px] items-center justify-center rounded-xl bg-gray-50 p-6'>
            {status === 'loading' && (
              <div className='flex flex-col items-center space-y-4'>
                <RefreshCw className='h-12 w-12 animate-spin text-gray-400' />
                <span className='text-sm text-gray-500'>加载中...</span>
              </div>
            )}

            {status === 'error' && (
              <div className='flex flex-col items-center space-y-4'>
                <AlertCircle className='h-12 w-12 text-red-400' />
                <div className='text-center'>
                  <p className='mb-3 text-sm text-red-600'>{errorMessage}</p>
                  <Button onClick={refreshQrCode} size='sm' variant='outline'>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    重新加载
                  </Button>
                </div>
              </div>
            )}

            {(status === 'ready' || status === 'scanned') && (
              <div
                ref={qrContainerRef}
                className='flex h-full w-full items-center justify-center'
              />
            )}

            {status === 'success' && (
              <div className='flex flex-col items-center space-y-4'>
                <CheckCircle2 className='h-16 w-16 text-green-500' />
                <div className='text-center'>
                  <p className='text-lg font-semibold text-green-600'>
                    登录成功！
                  </p>
                  <p className='text-sm text-gray-500'>正在跳转...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 状态信息 */}
        <div className='mb-6 text-center'>
          <div className='mb-2 flex items-center justify-center space-x-3'>
            {statusDisplay.icon}
            <span className={`font-medium ${statusDisplay.color}`}>
              {statusDisplay.title}
            </span>
          </div>
          <p className='text-sm text-gray-600'>{statusDisplay.description}</p>
        </div>

        {/* 操作按钮 */}
        {status === 'error' && (
          <div className='flex space-x-3'>
            <Button onClick={refreshQrCode} className='flex-1'>
              <RefreshCw className='mr-2 h-4 w-4' />
              重新加载
            </Button>
            <Button
              onClick={() => navigate({ to: '/sign-in' })}
              variant='outline'
              className='flex-1'
            >
              其他方式登录
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <div className='space-y-3'>
            <Alert>
              <Smartphone className='h-4 w-4' />
              <AlertDescription>
                <strong>操作步骤：</strong>
                <br />
                1. 打开 WPS 移动端应用
                <br />
                2. 扫描上方二维码
                <br />
                3. 在手机上确认登录
              </AlertDescription>
            </Alert>

            <div className='flex space-x-3'>
              <Button
                onClick={refreshQrCode}
                variant='outline'
                className='flex-1'
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                刷新二维码
              </Button>
              <Button
                onClick={() => navigate({ to: '/sign-in' })}
                variant='outline'
                className='flex-1'
              >
                其他方式登录
              </Button>
            </div>
          </div>
        )}

        {/* 页脚信息 */}
        <div className='mt-8 border-t border-gray-100 pt-6'>
          <p className='text-center text-xs text-gray-500'>
            由 WPS 官方 SDK 提供技术支持
            <br />
            <span className='text-blue-500'>cloudcdn.wpscdn.cn</span>
          </p>
        </div>
      </div>
    </div>
  )
}
