import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { appConfig } from '@/lib/config'

export const Route = createFileRoute('/_authenticated/debug/config')({
  component: ConfigDebugPage,
})

function ConfigDebugPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">配置调试信息</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 应用配置 */}
        <Card>
          <CardHeader>
            <CardTitle>应用配置 (appConfig)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>API 基础 URL:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {appConfig.apiBaseUrl}
              </code>
            </div>
            <div>
              <strong>认证基础 URL:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {appConfig.authBaseUrl}
              </code>
            </div>
            <div>
              <strong>环境:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {appConfig.environment}
              </code>
            </div>
            <div>
              <strong>开发模式:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {appConfig.isDevelopment ? 'true' : 'false'}
              </code>
            </div>
            <div>
              <strong>生产模式:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {appConfig.isProduction ? 'true' : 'false'}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* 环境变量 */}
        <Card>
          <CardHeader>
            <CardTitle>环境变量 (import.meta.env)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>VITE_API_BASE_URL:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {import.meta.env.VITE_API_BASE_URL || '(未设置)'}
              </code>
            </div>
            <div>
              <strong>MODE:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {import.meta.env.MODE}
              </code>
            </div>
            <div>
              <strong>DEV:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {import.meta.env.DEV ? 'true' : 'false'}
              </code>
            </div>
            <div>
              <strong>PROD:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {import.meta.env.PROD ? 'true' : 'false'}
              </code>
            </div>
            <div>
              <strong>BASE_URL:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {import.meta.env.BASE_URL}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* 浏览器信息 */}
        <Card>
          <CardHeader>
            <CardTitle>浏览器信息 (window.location)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>hostname:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {window.location.hostname}
              </code>
            </div>
            <div>
              <strong>href:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs">
                {window.location.href}
              </code>
            </div>
            <div>
              <strong>origin:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {window.location.origin}
              </code>
            </div>
            <div>
              <strong>protocol:</strong>
              <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                {window.location.protocol}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* 所有环境变量 */}
        <Card>
          <CardHeader>
            <CardTitle>所有环境变量</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-4 text-xs">
              {JSON.stringify(import.meta.env, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* 测试 API 请求 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>API 请求测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-gray-600">
                打开浏览器开发者工具的 Network 标签，然后刷新页面查看实际的 API
                请求地址
              </p>
              <p className="text-sm">
                <strong>预期的 API 基础地址:</strong>
                <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                  {appConfig.apiBaseUrl}
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

