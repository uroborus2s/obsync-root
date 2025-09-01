import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { WorkflowNodeType } from '@/types/workflow.types'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Maximize2,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { workflowApi } from '@/lib/workflow-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// 临时类型定义，直到正式类型可用
interface NodeExecution {
  nodeId: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled'
  startTime?: string
  endTime?: string
  duration?: number
  inputData?: any
  outputData?: any
  errorMessage?: string
}

interface LoopExecution {
  nodeId: string
  iterations: Array<{
    index: number
    status: 'pending' | 'running' | 'success' | 'failed'
    startTime?: string
    endTime?: string
    duration?: number
    inputData?: any
    outputData?: any
    errorMessage?: string
  }>
  currentIteration: number
  totalIterations: number
  status: 'running' | 'completed' | 'failed'
}

// interface WorkflowNodeLocal {
//   nodeId: string
//   nodeName: string
//   nodeType:
//     | 'start'
//     | 'task'
//     | 'decision'
//     | 'loop'
//     | 'parallel'
//     | 'subprocess'
//     | 'end'
//   executor?: string
//   maxRetries?: number
//   dependsOn?: string[]
// }

interface WorkflowInstanceVisualizerProps {
  instanceId: number
  className?: string
  showControls?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

// interface WorkflowNode {
//   nodeId: string
//   nodeName: string
//   nodeType:
//     | 'start'
//     | 'task'
//     | 'decision'
//     | 'loop'
//     | 'parallel'
//     | 'subprocess'
//     | 'end'
//   executor?: string
//   dependsOn?: string[]
//   position?: { x: number; y: number }
//   maxRetries?: number
//   timeoutSeconds?: number
//   condition?: string
// }

interface NodeExecution {
  nodeId: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled'
  startTime?: string
  endTime?: string
  duration?: number
  retryCount?: number
  errorMessage?: string
  inputData?: any
  outputData?: any
  logs?: string[]
}

interface LoopExecution {
  nodeId: string
  iterations: Array<{
    index: number
    status: 'pending' | 'running' | 'success' | 'failed'
    startTime?: string
    endTime?: string
    duration?: number
    inputData?: any
    outputData?: any
    errorMessage?: string
  }>
  totalIterations: number
  currentIteration: number
}

export function WorkflowInstanceVisualizer({
  instanceId,
  className,
  showControls = true,
  autoRefresh = true,
  refreshInterval = 5000,
}: WorkflowInstanceVisualizerProps) {
  const [zoom, setZoom] = useState(1)
  // const [isFullscreen, setIsFullscreen] = useState(false) // 暂时注释掉未使用的变量
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedLoop, setSelectedLoop] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // 获取工作流实例信息
  const {
    data: instance,
    isLoading: instanceLoading,
    refetch: refetchInstance,
  } = useQuery({
    queryKey: ['workflow-instance', instanceId],
    queryFn: () => workflowApi.getWorkflowInstanceById(instanceId),
    enabled: !!instanceId,
    refetchInterval: autoRefresh ? refreshInterval : false,
  })

  // 获取工作流定义
  const { data: definition, isLoading: definitionLoading } = useQuery({
    queryKey: ['workflow-definition', instance?.workflowDefinitionId],
    queryFn: () =>
      workflowApi.getWorkflowDefinitionById(instance!.workflowDefinitionId),
    enabled: !!instance?.workflowDefinitionId,
  })

  // 获取节点执行状态
  const {
    data: executions,
    isLoading: executionsLoading,
    refetch: refetchExecutions,
  } = useQuery({
    queryKey: ['workflow-executions', instanceId],
    queryFn: () => workflowApi.getWorkflowExecutions(instanceId),
    enabled: !!instanceId,
    refetchInterval: autoRefresh ? refreshInterval : false,
  })

  // 获取循环节点详情
  const { data: loopExecutions, refetch: refetchLoops } = useQuery({
    queryKey: ['workflow-loop-executions', instanceId],
    queryFn: () => workflowApi.getLoopExecutions(instanceId),
    enabled: !!instanceId,
    refetchInterval: autoRefresh ? refreshInterval : false,
  })

  const nodes = definition?.definition?.nodes || []
  const edges = definition?.definition?.edges || []
  const nodeExecutions = executions || []

  // 获取节点状态
  const getNodeStatus = (nodeId: string): NodeExecution['status'] => {
    const execution = nodeExecutions.find((e) => e.nodeId === nodeId)
    return execution?.status || 'pending'
  }

  // 获取节点执行信息
  const getNodeExecution = (nodeId: string): NodeExecution | undefined => {
    return nodeExecutions.find((e) => e.nodeId === nodeId)
  }

  // 获取状态图标和颜色
  const getStatusIcon = (status: NodeExecution['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
      case 'success':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />
      case 'pending':
        return <Clock className='h-4 w-4 text-gray-400' />
      case 'skipped':
        return <AlertTriangle className='h-4 w-4 text-yellow-500' />
      case 'cancelled':
        return <XCircle className='h-4 w-4 text-gray-500' />
      default:
        return <Clock className='h-4 w-4 text-gray-400' />
    }
  }

  const getStatusColor = (status: NodeExecution['status']) => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50'
      case 'success':
        return 'border-green-500 bg-green-50'
      case 'failed':
        return 'border-red-500 bg-red-50'
      case 'pending':
        return 'border-gray-300 bg-gray-50'
      case 'skipped':
        return 'border-yellow-500 bg-yellow-50'
      case 'cancelled':
        return 'border-gray-500 bg-gray-100'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  // 获取节点类型图标
  const getNodeTypeIcon = (nodeType: WorkflowNodeType) => {
    switch (nodeType) {
      case 'start':
        return <Play className='h-4 w-4' />
      case 'end':
        return <CheckCircle className='h-4 w-4' />
      case 'task':
        return <CheckCircle className='h-4 w-4' />
      case 'script':
        return <RotateCcw className='h-4 w-4' />
      case 'condition':
        return <AlertTriangle className='h-4 w-4' />
      default:
        return <div className='h-4 w-4 rounded bg-current' />
    }
  }

  // 处理节点点击
  const handleNodeClick = (nodeId: string, _nodeType: WorkflowNodeType) => {
    // 暂时所有节点都显示为普通节点详情
    setSelectedNode(nodeId)
  }

  // 手动刷新
  const handleRefresh = () => {
    refetchInstance()
    refetchExecutions()
    refetchLoops()
  }

  // 缩放控制
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5))
  const handleResetZoom = () => setZoom(1)

  if (instanceLoading || definitionLoading) {
    return (
      <Card className={className}>
        <CardContent className='flex h-96 items-center justify-center'>
          <div className='flex items-center gap-2'>
            <Loader2 className='h-6 w-6 animate-spin' />
            <span>加载工作流可视化...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!instance || !definition) {
    return (
      <Card className={className}>
        <CardContent className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <AlertTriangle className='mx-auto mb-4 h-12 w-12 text-yellow-500' />
            <h3 className='mb-2 text-lg font-semibold'>无法加载工作流</h3>
            <p className='text-muted-foreground'>工作流实例或定义不存在</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn('relative', className)}>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              工作流实例可视化
              <Badge variant='outline'>{instance.status}</Badge>
            </CardTitle>
            <p className='text-muted-foreground mt-1 text-sm'>
              {definition.name} - 实例 #{instanceId}
            </p>
          </div>

          {showControls && (
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={executionsLoading}
              >
                <RefreshCw
                  className={cn('h-4 w-4', executionsLoading && 'animate-spin')}
                />
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className='h-4 w-4' />
              </Button>
              <Button variant='outline' size='sm' onClick={handleResetZoom}>
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  /* TODO: 实现全屏功能 */
                }}
              >
                <Maximize2 className='h-4 w-4' />
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div
            className='relative overflow-auto rounded-lg border bg-gray-50 dark:bg-gray-900'
            style={{ height: '600px' }}
          >
            <svg
              ref={svgRef}
              width='100%'
              height='100%'
              viewBox='0 0 800 600'
              className='cursor-move'
              style={{ transform: `scale(${zoom})` }}
            >
              {/* 渲染连接线 */}
              {edges.map((edge, index) => {
                const sourceNode = nodes.find((n) => n.id === edge.source)
                const targetNode = nodes.find((n) => n.id === edge.target)

                if (!sourceNode || !targetNode) return null

                const sourcePos = sourceNode.position || {
                  x: 100 + index * 150,
                  y: 100,
                }
                const targetPos = targetNode.position || {
                  x: 100 + (index + 1) * 150,
                  y: 100,
                }

                return (
                  <line
                    key={`edge-${edge.id || index}`}
                    x1={sourcePos.x + 60}
                    y1={sourcePos.y + 30}
                    x2={targetPos.x}
                    y2={targetPos.y + 30}
                    stroke='#6b7280'
                    strokeWidth='2'
                    markerEnd='url(#arrowhead)'
                  />
                )
              })}

              {/* 箭头标记 */}
              <defs>
                <marker
                  id='arrowhead'
                  markerWidth='10'
                  markerHeight='7'
                  refX='9'
                  refY='3.5'
                  orient='auto'
                >
                  <polygon points='0 0, 10 3.5, 0 7' fill='#6b7280' />
                </marker>
              </defs>

              {/* 渲染节点 */}
              {nodes.map((node, index) => {
                const position = node.position || {
                  x: 100 + index * 150,
                  y: 100,
                }
                const status = getNodeStatus(node.id)
                const execution = getNodeExecution(node.id)

                return (
                  <g key={node.id}>
                    {/* 节点背景 */}
                    <rect
                      x={position.x}
                      y={position.y}
                      width='120'
                      height='60'
                      rx='8'
                      className={cn(
                        'cursor-pointer border-2 transition-all hover:shadow-lg',
                        getStatusColor(status)
                      )}
                      onClick={() => handleNodeClick(node.id, node.type)}
                    />

                    {/* 节点图标 */}
                    <foreignObject
                      x={position.x + 8}
                      y={position.y + 8}
                      width='20'
                      height='20'
                    >
                      {getNodeTypeIcon(node.type)}
                    </foreignObject>

                    {/* 状态图标 */}
                    <foreignObject
                      x={position.x + 92}
                      y={position.y + 8}
                      width='20'
                      height='20'
                    >
                      {getStatusIcon(status)}
                    </foreignObject>

                    {/* 节点名称 */}
                    <text
                      x={position.x + 60}
                      y={position.y + 35}
                      textAnchor='middle'
                      className='fill-current text-sm font-medium'
                    >
                      {node.name}
                    </text>

                    {/* 执行时间 */}
                    {execution?.duration && (
                      <text
                        x={position.x + 60}
                        y={position.y + 50}
                        textAnchor='middle'
                        className='fill-gray-500 text-xs'
                      >
                        {execution.duration}ms
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* 节点详情对话框 */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>节点执行详情</DialogTitle>
            <DialogDescription>查看节点的详细执行信息和日志</DialogDescription>
          </DialogHeader>
          {selectedNode && (
            <NodeExecutionDetail
              nodeId={selectedNode}
              execution={getNodeExecution(selectedNode)}
              node={nodes.find((n) => n.id === selectedNode)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 循环节点详情对话框 */}
      <Dialog open={!!selectedLoop} onOpenChange={() => setSelectedLoop(null)}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>循环节点执行详情</DialogTitle>
            <DialogDescription>
              查看循环节点的所有迭代执行情况
            </DialogDescription>
          </DialogHeader>
          {selectedLoop && (
            <LoopExecutionDetail
              nodeId={selectedLoop}
              loopExecution={loopExecutions?.find(
                (l) => l.nodeId === selectedLoop
              )}
              node={nodes.find((n) => n.id === selectedLoop)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// 节点执行详情组件
function NodeExecutionDetail({
  execution,
}: {
  nodeId: string
  execution?: NodeExecution
  node?: any
}) {
  if (!execution) {
    return (
      <div className='py-8 text-center'>
        <Clock className='mx-auto mb-4 h-12 w-12 text-gray-400' />
        <p className='text-muted-foreground'>该节点尚未开始执行</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <label className='text-sm font-medium'>节点ID</label>
          <p className='text-muted-foreground text-sm'>节点详情</p>
        </div>
        <div>
          <label className='text-sm font-medium'>状态</label>
          <div className='flex items-center gap-2'>{/* 状态图标和文本 */}</div>
        </div>
      </div>

      {/* 更多执行详情... */}
    </div>
  )
}

// 循环执行详情组件
function LoopExecutionDetail({
  loopExecution,
}: {
  nodeId: string
  loopExecution?: LoopExecution
  node?: any
}) {
  if (!loopExecution) {
    return (
      <div className='py-8 text-center'>
        <RotateCcw className='mx-auto mb-4 h-12 w-12 text-gray-400' />
        <p className='text-muted-foreground'>循环节点尚未开始执行</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-3 gap-4'>
        <div>
          <label className='text-sm font-medium'>当前迭代</label>
          <p className='text-muted-foreground text-sm'>
            {loopExecution.currentIteration} / {loopExecution.totalIterations}
          </p>
        </div>
      </div>

      {/* 迭代列表 */}
      <div className='space-y-2'>
        <label className='text-sm font-medium'>迭代历史</label>
        <div className='max-h-96 space-y-2 overflow-auto'>
          {loopExecution.iterations.map((iteration, index) => (
            <Card key={index} className='p-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>
                  第 {iteration.index + 1} 次迭代
                </span>
                <Badge
                  variant={
                    iteration.status === 'success' ? 'default' : 'destructive'
                  }
                >
                  {iteration.status}
                </Badge>
              </div>
              {iteration.duration && (
                <p className='text-muted-foreground mt-1 text-xs'>
                  执行时间: {iteration.duration}ms
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
