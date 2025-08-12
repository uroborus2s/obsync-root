/**
 * 错误边界组件
 * 捕获React组件树中的JavaScript错误，记录错误并显示备用UI
 */
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新state，下次渲染将显示错误UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // 这里可以将错误信息发送到错误报告服务
    // reportErrorToService(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-red-900 dark:text-red-100">
                出现了一些问题
              </CardTitle>
              <CardDescription>
                页面遇到了意外错误，请尝试刷新页面或联系技术支持
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-red-50 p-3 dark:bg-red-950">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    错误详情 (开发模式)
                  </h4>
                  <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                    <p className="font-mono">{this.state.error.message}</p>
                    {this.state.errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">组件堆栈</summary>
                        <pre className="mt-1 whitespace-pre-wrap text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  刷新页面
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 简化的错误边界Hook版本
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
