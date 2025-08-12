/**
 * 加载状态组件
 * 提供统一的加载UI和空状态UI
 */
import { Loader2, AlertCircle, FileX } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface LoadingStateProps {
  isLoading?: boolean
  error?: string | Error | null
  isEmpty?: boolean
  emptyMessage?: string
  emptyDescription?: string
  loadingMessage?: string
  onRetry?: () => void
  children?: React.ReactNode
  className?: string
}

export function LoadingState({
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyMessage = '暂无数据',
  emptyDescription = '当前没有可显示的内容',
  loadingMessage = '加载中...',
  onRetry,
  children,
  className = '',
}: LoadingStateProps) {
  // 错误状态
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return (
      <div className={`flex min-h-[200px] items-center justify-center p-4 ${className}`}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-900 dark:text-red-100">
              加载失败
            </CardTitle>
            <CardDescription>
              {errorMessage}
            </CardDescription>
          </CardHeader>
          {onRetry && (
            <CardContent>
              <Button onClick={onRetry} className="w-full" variant="outline">
                重试
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className={`flex min-h-[200px] items-center justify-center p-4 ${className}`}>
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  // 空状态
  if (isEmpty) {
    return (
      <div className={`flex min-h-[200px] items-center justify-center p-4 ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileX className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">{emptyMessage}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </div>
    )
  }

  // 正常内容
  return <>{children}</>
}

/**
 * 表格加载状态组件
 */
interface TableLoadingStateProps {
  isLoading?: boolean
  error?: string | Error | null
  isEmpty?: boolean
  emptyMessage?: string
  loadingMessage?: string
  onRetry?: () => void
  colSpan?: number
  children?: React.ReactNode
}

export function TableLoadingState({
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyMessage = '暂无数据',
  loadingMessage = '加载中...',
  onRetry,
  colSpan = 6,
  children,
}: TableLoadingStateProps) {
  // 错误状态
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return (
      <tr>
        <td colSpan={colSpan} className="py-8 text-center">
          <div className="flex flex-col items-center space-y-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-red-600">{errorMessage}</p>
            {onRetry && (
              <Button onClick={onRetry} size="sm" variant="outline">
                重试
              </Button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  // 加载状态
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="py-8 text-center">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
        </td>
      </tr>
    )
  }

  // 空状态
  if (isEmpty) {
    return (
      <tr>
        <td colSpan={colSpan} className="py-8 text-center">
          <div className="flex flex-col items-center space-y-2">
            <FileX className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </td>
      </tr>
    )
  }

  // 正常内容
  return <>{children}</>
}

/**
 * 页面级加载状态组件
 */
interface PageLoadingStateProps {
  isLoading?: boolean
  error?: string | Error | null
  onRetry?: () => void
  children?: React.ReactNode
}

export function PageLoadingState({
  isLoading = false,
  error = null,
  onRetry,
  children,
}: PageLoadingStateProps) {
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-900 dark:text-red-100">
              页面加载失败
            </CardTitle>
            <CardDescription>
              {errorMessage}
            </CardDescription>
          </CardHeader>
          {onRetry && (
            <CardContent>
              <Button onClick={onRetry} className="w-full">
                重新加载
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">页面加载中...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
