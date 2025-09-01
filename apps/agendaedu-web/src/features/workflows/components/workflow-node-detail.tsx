import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Code,
  Loader2,
  Settings,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface WorkflowNodeDetailProps {
  node: {
    nodeId: string
    nodeName: string
    nodeType: 'simple' | 'task' | 'loop' | 'parallel' | 'subprocess'
    executor?: string
    maxRetries: number
    timeoutSeconds?: number
    inputData?: Record<string, any>
    condition?: string
    dependsOn?: string[]
  }
  instance?: {
    status: string
    currentNodeId?: string
    completedNodes?: string[]
    failedNodes?: string[]
    executionPath?: string[]
  }
  executionDetails?: {
    startedAt?: string
    completedAt?: string
    duration?: number
    retryCount?: number
    errorMessage?: string
    outputData?: Record<string, any>
  }
}

export function WorkflowNodeDetail({
  node,
  instance,
  executionDetails,
}: WorkflowNodeDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // 获取节点状态
  const getNodeStatus = () => {
    if (!instance) return 'pending'

    if (
      instance.currentNodeId === node.nodeId &&
      instance.status === 'running'
    ) {
      return 'running'
    }

    if (instance.completedNodes?.includes(node.nodeId)) {
      return 'completed'
    }

    if (instance.failedNodes?.includes(node.nodeId)) {
      return 'failed'
    }

    return 'pending'
  }

  // 获取节点状态图标
  const getStatusIcon = () => {
    const status = getNodeStatus()

    switch (status) {
      case 'running':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />
      default:
        return <Clock className='h-4 w-4 text-gray-400' />
    }
  }

  // 获取节点类型图标
  const getNodeTypeIcon = () => {
    switch (node.nodeType) {
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

  // 获取节点类型描述
  const getNodeTypeDescription = () => {
    switch (node.nodeType) {
      case 'simple':
        return '简单任务节点 - 执行单一业务逻辑'
      case 'task':
        return '任务节点 - 执行具体业务任务'
      case 'loop':
        return '循环节点 - 重复执行子节点'
      case 'parallel':
        return '并行节点 - 同时执行多个子节点'
      case 'subprocess':
        return '子流程节点 - 调用其他工作流'
      default:
        return '未知节点类型'
    }
  }

  const status = getNodeStatus()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          查看详情
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[80vh] max-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span className='text-2xl'>{getNodeTypeIcon()}</span>
            {node.nodeName}
            {getStatusIcon()}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='overview'>概览</TabsTrigger>
            <TabsTrigger value='config'>配置</TabsTrigger>
            <TabsTrigger value='execution'>执行</TabsTrigger>
            <TabsTrigger value='data'>数据</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>节点信息</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      节点ID
                    </label>
                    <p className='font-mono text-sm'>{node.nodeId}</p>
                  </div>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      节点类型
                    </label>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline'>{node.nodeType}</Badge>
                      <span className='text-muted-foreground text-sm'>
                        {getNodeTypeDescription()}
                      </span>
                    </div>
                  </div>
                  {node.executor && (
                    <div>
                      <label className='text-muted-foreground text-sm font-medium'>
                        执行器
                      </label>
                      <p className='font-mono text-sm'>{node.executor}</p>
                    </div>
                  )}
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      当前状态
                    </label>
                    <div className='flex items-center gap-2'>
                      {getStatusIcon()}
                      <Badge
                        variant={
                          status === 'completed'
                            ? 'default'
                            : status === 'running'
                              ? 'secondary'
                              : status === 'failed'
                                ? 'destructive'
                                : 'outline'
                        }
                      >
                        {status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {node.dependsOn && node.dependsOn.length > 0 && (
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      依赖节点
                    </label>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      {node.dependsOn.map((depId) => (
                        <Badge
                          key={depId}
                          variant='outline'
                          className='font-mono'
                        >
                          {depId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='config' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <Settings className='h-5 w-5' />
                  节点配置
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      最大重试次数
                    </label>
                    <p className='text-lg font-semibold'>{node.maxRetries}</p>
                  </div>
                  {node.timeoutSeconds && (
                    <div>
                      <label className='text-muted-foreground text-sm font-medium'>
                        超时时间
                      </label>
                      <p className='text-lg font-semibold'>
                        {node.timeoutSeconds}秒
                      </p>
                    </div>
                  )}
                </div>

                {node.condition && (
                  <div>
                    <label className='text-muted-foreground text-sm font-medium'>
                      执行条件
                    </label>
                    <pre className='overflow-x-auto rounded-lg bg-gray-50 p-3 font-mono text-sm'>
                      {node.condition}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='execution' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <Code className='h-5 w-5' />
                  执行详情
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {executionDetails ? (
                  <div className='grid grid-cols-2 gap-4'>
                    {executionDetails.startedAt && (
                      <div>
                        <label className='text-muted-foreground text-sm font-medium'>
                          开始时间
                        </label>
                        <p className='text-sm'>
                          {new Date(
                            executionDetails.startedAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {executionDetails.completedAt && (
                      <div>
                        <label className='text-muted-foreground text-sm font-medium'>
                          完成时间
                        </label>
                        <p className='text-sm'>
                          {new Date(
                            executionDetails.completedAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {executionDetails.duration && (
                      <div>
                        <label className='text-muted-foreground text-sm font-medium'>
                          执行时长
                        </label>
                        <p className='text-sm'>{executionDetails.duration}ms</p>
                      </div>
                    )}
                    <div>
                      <label className='text-muted-foreground text-sm font-medium'>
                        重试次数
                      </label>
                      <p className='text-sm'>
                        {executionDetails.retryCount || 0}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className='text-muted-foreground'>暂无执行详情</p>
                )}

                {executionDetails?.errorMessage && (
                  <div>
                    <label className='flex items-center gap-1 text-sm font-medium text-red-600'>
                      <AlertTriangle className='h-4 w-4' />
                      错误信息
                    </label>
                    <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
                      <p className='text-sm text-red-800'>
                        {executionDetails.errorMessage}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='data' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>输入数据</CardTitle>
              </CardHeader>
              <CardContent>
                {node.inputData ? (
                  <pre className='overflow-x-auto rounded-lg bg-gray-50 p-3 text-sm'>
                    {JSON.stringify(node.inputData, null, 2)}
                  </pre>
                ) : (
                  <p className='text-muted-foreground'>无输入数据</p>
                )}
              </CardContent>
            </Card>

            {executionDetails?.outputData && (
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg'>输出数据</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className='overflow-x-auto rounded-lg bg-gray-50 p-3 text-sm'>
                    {JSON.stringify(executionDetails.outputData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
