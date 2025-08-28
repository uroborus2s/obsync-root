import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Maximize2,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { workflowApi } from '@/lib/workflow-api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SimplifiedWorkflowVisualizerProps {
  workflowDefinitionId: number
  instanceId?: number
  className?: string
  showControls?: boolean
}

interface WorkflowNode {
  nodeId: string
  nodeName: string
  nodeType: 'simple' | 'task' | 'loop' | 'parallel' | 'subprocess'
  executor?: string
  dependsOn?: string[]
  maxRetries: number
  timeoutSeconds?: number
  inputData?: Record<string, any>
  condition?: string
}

export function SimplifiedWorkflowVisualizer({
  workflowDefinitionId,
  instanceId,
  className,
  showControls = true,
}: SimplifiedWorkflowVisualizerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 获取工作流定义
  const {
    data: definition,
    isLoading: definitionLoading,
    error: definitionError,
    refetch: refetchDefinition,
  } = useQuery({
    queryKey: ['workflow-definition', workflowDefinitionId],
    queryFn: () => workflowApi.getWorkflowDefinitionById(workflowDefinitionId),
    enabled: !!workflowDefinitionId,
  })

  // 获取工作流实例（如果提供了instanceId）
  const {
    data: instance,
    isLoading: instanceLoading,
    error: instanceError,
  } = useQuery({
    queryKey: ['workflow-instance', instanceId],
    queryFn: () => workflowApi.getWorkflowInstance(instanceId!),
    enabled: !!instanceId,
    refetchInterval: instanceId ? 5000 : false, // 实例数据每5秒刷新
  })

  // 获取节点图标
  const getNodeIcon = (nodeType: string): string => {
    switch (nodeType) {
      case 'simple':
      case 'task':
        return '📋'
      case 'loop':
        return '🔄'
      case 'parallel':
        return '⚡'
      case 'subprocess':
        return '📦'
      default:
        return '⚪'
    }
  }

  // 获取节点状态
  const getNodeStatus = (nodeId: string) => {
    if (!instance) return 'pending'

    if (instance.currentNodeId === nodeId && instance.status === 'running') {
      return 'running'
    }

    if (instance.completedNodes?.includes(nodeId)) {
      return 'completed'
    }

    if (instance.failedNodes?.includes(nodeId)) {
      return 'failed'
    }

    return 'pending'
  }

  // 获取状态图标
  const getStatusIcon = (nodeId: string) => {
    const status = getNodeStatus(nodeId)

    switch (status) {
      case 'running':
        return <Play className='h-4 w-4 text-blue-500' />
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />
      default:
        return <Clock className='h-4 w-4 text-gray-400' />
    }
  }

  // 获取节点样式
  const getNodeStyle = (nodeId: string) => {
    const status = getNodeStatus(nodeId)

    switch (status) {
      case 'running':
        return 'bg-blue-100 border-blue-500 text-blue-800 shadow-lg'
      case 'completed':
        return 'bg-green-100 border-green-500 text-green-800'
      case 'failed':
        return 'bg-red-100 border-red-500 text-red-800'
      default:
        return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  // 处理全屏
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 导出图表
  const handleExport = () => {
    // 简单的导出功能
    const data = {
      definition: definition?.definition,
      instance: instance,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow-${definition?.name || 'chart'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (definitionLoading || instanceLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-64 w-full' />
        </CardContent>
      </Card>
    )
  }

  if (definitionError || instanceError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className='text-red-600'>加载失败</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              {definitionError?.message || instanceError?.message || '未知错误'}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => refetchDefinition()}
            className='mt-4'
            variant='outline'
          >
            <RefreshCw className='mr-2 h-4 w-4' />
            重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 解析工作流定义
  const workflowData = definition?.definition || {}
  const nodes = workflowData.nodes || []

  // 如果没有节点数据，创建示例节点
  const displayNodes =
    nodes.length > 0
      ? nodes
      : [
          {
            nodeId: 'start',
            nodeName: '开始',
            nodeType: 'simple',
            maxRetries: 0,
            dependsOn: [],
          },
          {
            nodeId: 'validate',
            nodeName: '数据验证',
            nodeType: 'task',
            executor: 'DataValidationExecutor',
            maxRetries: 3,
            dependsOn: ['start'],
          },
          {
            nodeId: 'process',
            nodeName: '数据处理',
            nodeType: 'loop',
            executor: 'DataProcessExecutor',
            maxRetries: 2,
            dependsOn: ['validate'],
          },
          {
            nodeId: 'parallel_tasks',
            nodeName: '并行处理',
            nodeType: 'parallel',
            maxRetries: 1,
            dependsOn: ['process'],
          },
          {
            nodeId: 'subprocess',
            nodeName: '子流程',
            nodeType: 'subprocess',
            executor: 'SubProcessExecutor',
            maxRetries: 2,
            dependsOn: ['parallel_tasks'],
          },
          {
            nodeId: 'end',
            nodeName: '结束',
            nodeType: 'simple',
            maxRetries: 0,
            dependsOn: ['subprocess'],
          },
        ]

  console.log('工作流定义数据:', definition)
  console.log('节点数据:', displayNodes)

  return (
    <Card
      className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-lg'>
              {definition?.name || '工作流程图'}
            </CardTitle>
            {definition?.description && (
              <p className='text-muted-foreground mt-1 text-sm'>
                {definition.description}
              </p>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {instance && (
              <Badge
                variant={
                  instance.status === 'running' ? 'default' : 'secondary'
                }
                className={
                  instance.status === 'running'
                    ? 'bg-blue-500'
                    : instance.status === 'completed'
                      ? 'bg-green-500'
                      : instance.status === 'failed'
                        ? 'bg-red-500'
                        : ''
                }
              >
                {instance.status}
              </Badge>
            )}
            {showControls && (
              <>
                <Button size='sm' variant='outline' onClick={handleExport}>
                  <Download className='h-4 w-4' />
                </Button>
                <Button size='sm' variant='outline' onClick={handleFullscreen}>
                  <Maximize2 className='h-4 w-4' />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div className='mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3'>
            <h4 className='mb-2 text-sm font-medium'>调试信息:</h4>
            <div className='space-y-1 text-xs'>
              <div>工作流ID: {workflowDefinitionId}</div>
              <div>定义加载状态: {definitionLoading ? '加载中' : '已加载'}</div>
              <div>节点数量: {displayNodes.length}</div>
              <div>数据来源: {nodes.length > 0 ? 'API数据' : '示例数据'}</div>
              <div>定义名称: {definition?.name || '未知'}</div>
            </div>
          </div>
        )}

        <div
          className={`min-h-[400px] overflow-auto rounded-lg border bg-white p-6 ${
            isFullscreen
              ? 'h-[calc(100vh-200px)] max-h-none'
              : 'h-[500px] max-h-[500px]'
          }`}
        >
          {/* 简化的流程图展示 */}
          {displayNodes.length > 0 ? (
            <div className='flex flex-col items-center space-y-8'>
              {displayNodes.map((node: WorkflowNode, index: number) => (
                <div key={node.nodeId} className='flex flex-col items-center'>
                  {/* 节点 */}
                  <div
                    className={`min-w-[160px] rounded-lg border-2 px-6 py-4 text-center transition-all ${getNodeStyle(node.nodeId)} `}
                  >
                    <div className='mb-2 flex items-center justify-center gap-2'>
                      <span className='text-xl'>
                        {getNodeIcon(node.nodeType)}
                      </span>
                      {getStatusIcon(node.nodeId)}
                    </div>
                    <div className='mb-1 text-sm font-medium'>
                      {node.nodeName}
                    </div>
                    <div className='mb-1 text-xs opacity-75'>
                      {node.nodeType}
                    </div>
                    {node.executor && (
                      <div className='bg-opacity-50 mt-1 rounded bg-white px-2 py-1 font-mono text-xs'>
                        {node.executor}
                      </div>
                    )}
                    <div className='mt-1 text-xs text-gray-500'>
                      ID: {node.nodeId}
                    </div>
                  </div>

                  {/* 连接线 */}
                  {index < displayNodes.length - 1 && (
                    <div className='my-4 flex flex-col items-center'>
                      <div className='h-8 w-0.5 bg-gray-300'></div>
                      <div className='h-3 w-3 rounded-full border-2 border-white bg-gray-400'></div>
                      <div className='h-8 w-0.5 bg-gray-300'></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className='text-muted-foreground flex h-64 items-center justify-center'>
              <div className='text-center'>
                <AlertCircle className='mx-auto mb-2 h-8 w-8' />
                <p>暂无工作流节点数据</p>
              </div>
            </div>
          )}
        </div>

        {/* 执行信息 */}
        {instance && (
          <div className='mt-4 rounded-lg bg-gray-50 p-4'>
            <h4 className='mb-2 font-medium'>执行信息</h4>
            <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
              <div>
                <span className='text-muted-foreground'>当前节点:</span>
                <p className='font-medium'>{instance.currentNodeId || '无'}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>已完成:</span>
                <p className='font-medium'>
                  {instance.completedNodes?.length || 0}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>失败节点:</span>
                <p className='font-medium'>
                  {instance.failedNodes?.length || 0}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>重试次数:</span>
                <p className='font-medium'>{instance.retryCount || 0}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
