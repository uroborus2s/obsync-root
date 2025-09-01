import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
} from 'lucide-react'
import { toast } from 'sonner'
import { workflowApi } from '@/lib/workflow-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { EnhancedWorkflowVisualizer } from '../components/enhanced-workflow-visualizer'

export default function WorkflowInstanceDetail() {
  const { instanceId } = useParams({
    from: '/_authenticated/workflows/instances/$instanceId',
  })
  const [activeTab, setActiveTab] = useState('visualization')

  // 获取工作流实例详情
  const {
    data: instance,
    isLoading: instanceLoading,
    error: instanceError,
    refetch: refetchInstance,
  } = useQuery({
    queryKey: ['workflow-instance', instanceId],
    queryFn: () => workflowApi.getWorkflowInstanceById(Number(instanceId)),
    enabled: !!instanceId,
    refetchInterval: 5000, // 每5秒刷新
  })

  // 获取工作流定义
  const { data: definition, isLoading: _definitionLoading } = useQuery({
    queryKey: ['workflow-definition', instance?.workflowDefinitionId],
    queryFn: () =>
      workflowApi.getWorkflowDefinitionById(instance!.workflowDefinitionId),
    enabled: !!instance?.workflowDefinitionId,
  })

  // 获取执行日志
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['workflow-execution-logs', instanceId],
    queryFn: () =>
      workflowApi.getExecutionLogs({
        workflowInstanceId: Number(instanceId),
        page: 1,
        pageSize: 100,
      }),
    enabled: !!instanceId,
    refetchInterval: 5000,
  })

  // 处理实例操作
  const handlePauseInstance = () => {
    toast.info('暂停工作流实例功能开发中...')
  }

  const handleResumeInstance = () => {
    toast.info('恢复工作流实例功能开发中...')
  }

  const handleStopInstance = () => {
    toast.info('停止工作流实例功能开发中...')
  }

  const handleRestartInstance = () => {
    toast.info('重启工作流实例功能开发中...')
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      case 'pending':
        return '等待中'
      case 'cancelled':
        return '已取消'
      default:
        return '未知'
    }
  }

  if (instanceError) {
    return (
      <>
        <Header className='border-b'>
          <div className='flex h-16 items-center px-4'>
            <div className='ml-auto flex items-center space-x-4'>
              <Search />
              <ThemeSwitch />
              <UserNav />
            </div>
          </div>
        </Header>

        <Main>
          <div className='flex min-h-[400px] items-center justify-center'>
            <Card className='w-full max-w-md'>
              <CardContent className='pt-6'>
                <div className='flex flex-col items-center space-y-4 text-center'>
                  <AlertCircle className='h-12 w-12 text-red-500' />
                  <div>
                    <h3 className='text-lg font-semibold'>加载失败</h3>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      无法加载工作流实例详情，请检查网络连接或稍后重试
                    </p>
                  </div>
                  <Button onClick={() => refetchInstance()} className='gap-2'>
                    <RefreshCw className='h-4 w-4' />
                    重新加载
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header className='border-b'>
        <div className='flex h-16 items-center px-4'>
          <div className='ml-auto flex items-center space-x-4'>
            <Search />
            <ThemeSwitch />
            <UserNav />
          </div>
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* 页面标题和操作 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Link to='/workflows/instances'>
                <Button variant='outline' size='sm' className='gap-2'>
                  <ArrowLeft className='h-4 w-4' />
                  返回列表
                </Button>
              </Link>
              <div>
                <h1 className='text-3xl font-bold tracking-tight'>
                  工作流实例详情
                </h1>
                <p className='text-muted-foreground mt-2'>
                  查看工作流实例的执行状态和详细信息
                </p>
              </div>
            </div>

            {instance && (
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetchInstance()}
                  disabled={instanceLoading}
                  className='gap-2'
                >
                  <RefreshCw
                    className={`h-4 w-4 ${instanceLoading ? 'animate-spin' : ''}`}
                  />
                  刷新
                </Button>

                {instance.status === 'running' && (
                  <>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handlePauseInstance}
                      className='gap-2'
                    >
                      <Pause className='h-4 w-4' />
                      暂停
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleStopInstance}
                      className='gap-2'
                    >
                      <Square className='h-4 w-4' />
                      停止
                    </Button>
                  </>
                )}

                {(instance.status as string) === 'interrupted' && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleResumeInstance}
                    className='gap-2'
                  >
                    <Play className='h-4 w-4' />
                    恢复
                  </Button>
                )}

                {(instance.status === 'failed' ||
                  instance.status === 'completed') && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleRestartInstance}
                    className='gap-2'
                  >
                    <RotateCcw className='h-4 w-4' />
                    重新运行
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 实例基本信息 */}
          {instance && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Activity className='h-5 w-5' />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      实例ID
                    </label>
                    <p className='font-mono text-sm'>{instance.id}</p>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      状态
                    </label>
                    <div className='flex items-center gap-2'>
                      <div
                        className={`h-2 w-2 rounded-full ${getStatusColor(instance.status)}`}
                      />
                      <span className='text-sm'>
                        {getStatusText(instance.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      工作流定义
                    </label>
                    <p className='text-sm'>{definition?.name || '加载中...'}</p>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      业务键
                    </label>
                    <p className='font-mono text-sm'>
                      {instance.businessKey || '-'}
                    </p>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      开始时间
                    </label>
                    <p className='text-sm'>
                      {instance.startedAt
                        ? new Date(instance.startedAt).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      结束时间
                    </label>
                    <p className='text-sm'>
                      {instance.completedAt
                        ? new Date(instance.completedAt).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      创建时间
                    </label>
                    <p className='text-sm'>
                      {new Date(instance.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      更新时间
                    </label>
                    <p className='text-sm'>
                      {new Date(instance.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 标签页内容 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value='visualization'>可视化</TabsTrigger>
              <TabsTrigger value='logs'>执行日志</TabsTrigger>
              <TabsTrigger value='variables'>变量</TabsTrigger>
              <TabsTrigger value='context'>上下文</TabsTrigger>
            </TabsList>

            <TabsContent value='visualization' className='space-y-6'>
              {definition && (
                <EnhancedWorkflowVisualizer
                  definition={definition}
                  instance={instance}
                  onNodeClick={(_nodeId: string) => {
                    // 这里可以添加节点点击处理逻辑，比如显示节点详情
                    // 暂时不做任何操作
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value='logs' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>执行日志</CardTitle>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <RefreshCw className='h-6 w-6 animate-spin' />
                      <span className='ml-2'>加载日志...</span>
                    </div>
                  ) : (
                    <div className='max-h-96 space-y-2 overflow-auto'>
                      {logs?.items?.map((log, index) => (
                        <div
                          key={index}
                          className='rounded bg-gray-50 p-3 font-mono text-sm dark:bg-gray-800'
                        >
                          <div className='mb-1 flex items-center gap-2'>
                            <Badge variant='outline' className='text-xs'>
                              {log.level}
                            </Badge>
                            <span className='text-muted-foreground text-xs'>
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p>{log.message}</p>
                        </div>
                      )) || (
                        <p className='text-muted-foreground py-8 text-center'>
                          暂无执行日志
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='variables' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>实例变量</CardTitle>
                </CardHeader>
                <CardContent>
                  {instance?.inputData ? (
                    <pre className='overflow-auto rounded bg-gray-50 p-4 text-sm dark:bg-gray-800'>
                      {JSON.stringify(instance.inputData, null, 2)}
                    </pre>
                  ) : (
                    <p className='text-muted-foreground py-8 text-center'>
                      暂无变量数据
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='context' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>执行上下文</CardTitle>
                </CardHeader>
                <CardContent>
                  {instance?.contextData ? (
                    <pre className='overflow-auto rounded bg-gray-50 p-4 text-sm dark:bg-gray-800'>
                      {JSON.stringify(instance.contextData, null, 2)}
                    </pre>
                  ) : (
                    <p className='text-muted-foreground py-8 text-center'>
                      暂无上下文数据
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </>
  )
}
