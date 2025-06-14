/**
 * API健康检查组件
 */

import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import React from 'react';
import taskApi from '../api/client';
import { apiConfig, shouldUseMockApi } from '../config/api';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card';

interface HealthStatus {
  status: 'checking' | 'success' | 'error';
  message: string;
  details?: string;
}

export function ApiHealthCheck() {
  const [healthStatus, setHealthStatus] = React.useState<HealthStatus>({
    status: 'checking',
    message: '检查中...'
  });

  const checkHealth = React.useCallback(async () => {
    setHealthStatus({ status: 'checking', message: '检查API连接...' });

    try {
      // 首先检查配置
      console.log('🔧 当前API配置:', {
        baseUrl: apiConfig.baseUrl,
        useMockApi: shouldUseMockApi,
        timeout: apiConfig.timeout
      });

      if (shouldUseMockApi) {
        setHealthStatus({
          status: 'success',
          message: '使用Mock API模式',
          details: JSON.stringify(
            { mode: 'mock', baseUrl: apiConfig.baseUrl },
            null,
            2
          )
        });
        return;
      }

      // 检查健康状态
      const healthResponse = await taskApi.healthCheck();

      setHealthStatus({
        status: 'success',
        message: 'API连接正常',
        details: JSON.stringify(healthResponse, null, 2)
      });

      // 尝试获取任务列表
      const tasks = await taskApi.queryTasks({ limit: 1 });
      console.log('✅ 任务查询测试成功:', tasks);
    } catch (error) {
      console.error('❌ API健康检查失败:', error);

      const errorDetails = {
        error: error instanceof Error ? error.message : String(error),
        baseUrl: apiConfig.baseUrl,
        useMockApi: shouldUseMockApi,
        timestamp: new Date().toISOString()
      };

      setHealthStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'API连接失败',
        details: JSON.stringify(errorDetails, null, 2)
      });
    }
  }, []);

  React.useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'checking':
        return <Loader2 className='h-5 w-5 animate-spin text-blue-500' />;
      case 'success':
        return <CheckCircle className='h-5 w-5 text-green-500' />;
      case 'error':
        return <AlertCircle className='h-5 w-5 text-red-500' />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'checking':
        return 'border-blue-200';
      case 'success':
        return 'border-green-200';
      case 'error':
        return 'border-red-200';
    }
  };

  return (
    <Card className={`${getStatusColor()}`}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {getStatusIcon()}
          API连接状态
        </CardTitle>
        <CardDescription>检查Tasks API的连接状态和配置</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div>
          <p className='font-medium'>{healthStatus.message}</p>
        </div>

        {/* 配置信息 */}
        <div className='space-y-2'>
          <h4 className='text-sm font-medium'>配置信息:</h4>
          <div className='text-muted-foreground space-y-1 text-sm'>
            <div>API地址: {apiConfig.baseUrl}</div>
            <div>使用Mock: {shouldUseMockApi ? '是' : '否'}</div>
            <div>超时时间: {apiConfig.timeout}ms</div>
          </div>
        </div>

        {/* 详细信息 */}
        {healthStatus.details && (
          <div className='space-y-2'>
            <h4 className='text-sm font-medium'>详细信息:</h4>
            <pre className='bg-muted overflow-auto rounded p-2 text-xs'>
              {healthStatus.details}
            </pre>
          </div>
        )}

        {/* 操作按钮 */}
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={checkHealth}
            disabled={healthStatus.status === 'checking'}
          >
            <RefreshCw className='mr-1 h-4 w-4' />
            重新检查
          </Button>

          {healthStatus.status === 'error' && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                console.log('🔧 API配置详情:', apiConfig);
                console.log('🌐 环境变量:', {
                  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
                  VITE_USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API,
                  VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,
                  DEV: import.meta.env.DEV,
                  MODE: import.meta.env.MODE
                });
              }}
            >
              打印调试信息
            </Button>
          )}
        </div>

        {/* 故障排除建议 */}
        {healthStatus.status === 'error' && (
          <div className='space-y-2'>
            <h4 className='text-sm font-medium text-red-600'>故障排除建议:</h4>
            <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
              <li>检查Tasks API服务器是否正在运行</li>
              <li>确认API地址 {apiConfig.baseUrl} 是否正确</li>
              <li>检查网络连接和防火墙设置</li>
              <li>查看浏览器开发者工具的网络标签页</li>
              <li>检查CORS配置（如果是跨域请求）</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
