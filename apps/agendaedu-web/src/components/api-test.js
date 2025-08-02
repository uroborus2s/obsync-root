import { useState } from 'react';
import { AlertCircle, CheckCircle, Copy, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export function ApiTest() {
    const [results, setResults] = useState([]);
    const [isTestingAll, setIsTestingAll] = useState(false);
    // 测试不同的API基础URL
    const testUrls = [
        'https://chat.whzhsc.cn', // 同域名
        'https://chat.whzhsc.cn:8090', // 同域名8090端口
        'http://chat.whzhsc.cn:8090', // HTTP协议8090端口
        'http://localhost:8090', // 本地8090端口
        'http://127.0.0.1:8090', // 本地IP 8090端口
        'https://api.whzhsc.cn', // 可能的API子域名
        'http://api.whzhsc.cn', // HTTP API子域名
    ];
    const testApiEndpoint = async (baseUrl, endpoint) => {
        const startTime = Date.now();
        const url = `${baseUrl}${endpoint}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            if (response.ok) {
                const data = await response.json();
                return {
                    url: baseUrl,
                    status: 'success',
                    statusCode: response.status,
                    message: `API连接成功 - ${JSON.stringify(data).substring(0, 100)}...`,
                    responseTime,
                    endpoint,
                };
            }
            else {
                const errorText = await response.text();
                return {
                    url: baseUrl,
                    status: 'error',
                    statusCode: response.status,
                    message: `HTTP ${response.status}: ${response.statusText} - ${errorText.substring(0, 100)}`,
                    responseTime,
                    endpoint,
                };
            }
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            if (error instanceof DOMException && error.name === 'AbortError') {
                return {
                    url: baseUrl,
                    status: 'error',
                    message: '请求超时 (10秒)',
                    responseTime,
                    endpoint,
                };
            }
            let errorMessage = '未知错误';
            if (error instanceof TypeError) {
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = '网络连接失败 (可能是CORS或服务器不可达)';
                }
                else {
                    errorMessage = error.message;
                }
            }
            else if (error instanceof Error) {
                errorMessage = error.message;
            }
            return {
                url: baseUrl,
                status: 'error',
                message: errorMessage,
                responseTime,
                endpoint,
            };
        }
    };
    const testSingleUrl = async (baseUrl) => {
        setResults((prev) => [
            ...prev,
            {
                url: baseUrl,
                status: 'loading',
                message: '正在测试...',
            },
        ]);
        // 测试关键的API端点（按优先级排序）
        const endpoints = [
            '/tasks/running?page=1&page_size=5', // 当前失败的接口
            '/apiv2/tasks/statistics', // 任务统计
            '/apiv2/tasks', // 任务列表
            '/apiv2/tasks/tree', // 任务树
            '/apiv2/attendance-stats', // 考勤统计
        ];
        let bestResult = null;
        for (const endpoint of endpoints) {
            const result = await testApiEndpoint(baseUrl, endpoint);
            if (result.status === 'success') {
                bestResult = result;
                break; // 找到成功的就停止
            }
            // 记录最好的错误结果（状态码较小的）
            if (!bestResult || (result.statusCode && result.statusCode < 500)) {
                bestResult = result;
            }
        }
        setResults((prev) => prev.map((item) => item.url === baseUrl && item.status === 'loading'
            ? bestResult || item
            : item));
    };
    const testAllUrls = async () => {
        setIsTestingAll(true);
        setResults([]);
        for (const url of testUrls) {
            await testSingleUrl(url);
        }
        setIsTestingAll(false);
    };
    const clearResults = () => {
        setResults([]);
    };
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success('已复制到剪贴板');
        });
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className='h-4 w-4 text-green-500'/>;
            case 'error':
                return <XCircle className='h-4 w-4 text-red-500'/>;
            case 'loading':
                return <Loader2 className='h-4 w-4 animate-spin text-blue-500'/>;
        }
    };
    const getStatusBadge = (status, statusCode) => {
        switch (status) {
            case 'success':
                return (<Badge variant='default' className='bg-green-100 text-green-800'>
            成功 ({statusCode})
          </Badge>);
            case 'error':
                return (<Badge variant='destructive'>
            失败 {statusCode ? `(${statusCode})` : ''}
          </Badge>);
            case 'loading':
                return <Badge variant='outline'>测试中</Badge>;
        }
    };
    // 获取成功的API地址
    const successfulUrls = results.filter((r) => r.status === 'success');
    return (<Card className='mx-auto w-full max-w-4xl'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <AlertCircle className='h-5 w-5'/>
          API连接诊断工具
        </CardTitle>
        <Alert>
          <AlertDescription>
            此工具用于诊断前端与后端API服务器的连接问题。当前检测到的问题接口：
            <code className='mx-1 rounded bg-gray-100 px-2 py-1 text-sm'>
              /tasks/running
            </code>
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex gap-2'>
          <Button onClick={testAllUrls} disabled={isTestingAll} className='flex items-center gap-2'>
            {isTestingAll && <Loader2 className='h-4 w-4 animate-spin'/>}
            测试所有API地址
          </Button>
          <Button variant='outline' onClick={clearResults}>
            清除结果
          </Button>
        </div>

        {successfulUrls.length > 0 && (<Alert className='border-green-200 bg-green-50'>
            <CheckCircle className='h-4 w-4 text-green-600'/>
            <AlertDescription className='text-green-800'>
              <strong>找到可用的API服务器！</strong>
              <div className='mt-2 space-y-1'>
                {successfulUrls.map((result, index) => (<div key={index} className='flex items-center gap-2'>
                    <code className='rounded bg-white px-2 py-1 text-sm'>
                      {result.url}
                    </code>
                    <Button size='sm' variant='outline' onClick={() => copyToClipboard(result.url)} className='h-6 px-2'>
                      <Copy className='h-3 w-3'/>
                    </Button>
                  </div>))}
              </div>
            </AlertDescription>
          </Alert>)}

        {results.length > 0 && (<div className='space-y-3'>
            <h3 className='text-lg font-semibold'>测试结果</h3>
            {results.map((result, index) => (<div key={index} className='space-y-2 rounded-lg border p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    {getStatusIcon(result.status)}
                    <span className='font-mono text-sm'>{result.url}</span>
                    {result.endpoint && (<span className='text-xs text-gray-500'>
                        ({result.endpoint})
                      </span>)}
                  </div>
                  {getStatusBadge(result.status, result.statusCode)}
                </div>
                <div className='text-sm text-gray-600'>
                  {result.message}
                  {result.responseTime && (<span className='ml-2 text-gray-400'>
                      ({result.responseTime}ms)
                    </span>)}
                </div>
              </div>))}
          </div>)}

        <div className='mt-6 rounded-lg bg-gray-50 p-4'>
          <h4 className='mb-2 font-semibold'>解决方案建议：</h4>
          <ul className='space-y-2 text-sm'>
            <li>
              • <strong>如果找到可用地址</strong>
              ：复制成功的URL，更新前端API配置
            </li>
            <li>
              • <strong>如果所有测试都失败</strong>
              ：检查icalink-sync服务是否正在运行
            </li>
            <li>
              • <strong>如果只有HTTPS失败</strong>：检查SSL证书配置或使用HTTP
            </li>
            <li>
              • <strong>如果8090端口失败</strong>：检查防火墙设置或配置反向代理
            </li>
            <li>
              • <strong>如果本地连接成功</strong>：配置生产环境的反向代理
            </li>
          </ul>

          <div className='mt-4 rounded border border-blue-200 bg-blue-50 p-3'>
            <h5 className='mb-2 font-medium text-blue-800'>当前问题分析：</h5>
            <p className='text-sm text-blue-700'>
              页面正在请求 <code>/tasks/running</code>{' '}
              接口，但API服务器可能不在当前域名
              <code>https://chat.whzhsc.cn</code> 上运行。请检查：
            </p>
            <ol className='mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700'>
              <li>icalink-sync服务是否启动并监听8090端口</li>
              <li>是否需要配置反向代理将API请求转发到8090端口</li>
              <li>防火墙是否允许8090端口访问</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>);
}
//# sourceMappingURL=api-test.js.map