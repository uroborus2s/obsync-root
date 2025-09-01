import React, { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
} from 'lucide-react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeTypes,
  Panel,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
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

// 自定义节点组件
const WorkflowNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getStatusIcon = (status: string) => {
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
      default:
        return <Clock className='h-4 w-4 text-gray-400' />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50 shadow-blue-200'
      case 'success':
        return 'border-green-500 bg-green-50 shadow-green-200'
      case 'failed':
        return 'border-red-500 bg-red-50 shadow-red-200'
      case 'pending':
        return 'border-gray-300 bg-gray-50 shadow-gray-200'
      case 'skipped':
        return 'border-yellow-500 bg-yellow-50 shadow-yellow-200'
      default:
        return 'border-gray-300 bg-gray-50 shadow-gray-200'
    }
  }

  const getNodeTypeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'start':
        return <Play className='h-4 w-4 text-green-600' />
      case 'end':
        return <CheckCircle className='h-4 w-4 text-gray-600' />
      case 'loop':
        return <RotateCcw className='h-4 w-4 text-blue-600' />
      case 'decision':
        return <div className='h-4 w-4 rotate-45 transform bg-yellow-500' />
      case 'parallel':
        return <div className='h-4 w-4 rounded bg-purple-500' />
      default:
        return <div className='h-4 w-4 rounded bg-gray-500' />
    }
  }

  return (
    <div
      className={cn(
        'min-w-[150px] rounded-lg border-2 bg-white px-4 py-3 shadow-lg transition-all duration-200',
        getStatusColor(data.status),
        selected && 'ring-2 ring-blue-400 ring-offset-2',
        data.status === 'running' && 'animate-pulse'
      )}
    >
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {getNodeTypeIcon(data.nodeType)}
          <span className='text-xs font-medium text-gray-600 uppercase'>
            {data.nodeType}
          </span>
        </div>
        {getStatusIcon(data.status)}
      </div>

      <div className='mb-1 text-sm font-semibold text-gray-900'>
        {data.label}
      </div>

      {data.executor && (
        <div className='mb-1 text-xs text-gray-500'>{data.executor}</div>
      )}

      {data.duration && (
        <div className='text-xs text-gray-500'>{data.duration}ms</div>
      )}

      {data.retryCount > 0 && (
        <Badge variant='outline' className='mt-1 text-xs'>
          重试 {data.retryCount}
        </Badge>
      )}

      {data.nodeType === 'loop' && data.loopInfo && (
        <div className='mt-1 text-xs text-blue-600'>
          {data.loopInfo.current}/{data.loopInfo.total} 次
        </div>
      )}
    </div>
  )
}

// 自定义节点类型
const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
}

interface ReactFlowWorkflowVisualizerProps {
  instanceId: number
  className?: string
  showControls?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ReactFlowWorkflowVisualizer({
  instanceId,
  className,
  showControls = true,
  autoRefresh = true,
  refreshInterval = 5000,
}: ReactFlowWorkflowVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  // const [isFullscreen, setIsFullscreen] = useState(false) // 暂时注释掉未使用的变量

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

  // 转换数据为React Flow格式
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!definition?.definition?.nodes || !executions) {
      return { flowNodes: [], flowEdges: [] }
    }

    const definitionNodes = definition.definition.nodes || []
    const definitionEdges = definition.definition.edges || []

    // 创建节点
    const flowNodes: Node[] = definitionNodes.map((node, index) => {
      const execution = executions.find((e) => e.nodeId === node.id)
      const loopInfo = loopExecutions?.find((l) => l.nodeId === node.id)

      // 自动布局：简单的网格布局
      const x = (index % 4) * 200 + 100
      const y = Math.floor(index / 4) * 150 + 100

      return {
        id: node.id,
        type: 'workflowNode',
        position: node.position || { x, y },
        data: {
          label: node.name,
          nodeType: node.type,
          executor: node.config?.executor || 'unknown',
          status: execution?.status || 'pending',
          duration: execution?.duration,
          retryCount: execution?.retryCount || 0,
          loopInfo: loopInfo
            ? {
                current: loopInfo.currentIteration,
                total: loopInfo.totalIterations,
              }
            : null,
          originalNode: node,
          execution: execution,
        },
        draggable: true,
      }
    })

    // 创建连接线
    const flowEdges: Edge[] = definitionEdges.map((edge, index) => ({
      id: edge.id || `edge-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      label: edge.label,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6b7280',
      },
      style: {
        strokeWidth: 2,
        stroke: '#6b7280',
      },
    }))

    return { flowNodes, flowEdges }
  }, [definition, executions, loopExecutions])

  // 更新节点和边
  React.useEffect(() => {
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

  // 处理节点点击
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  // 手动刷新
  const handleRefresh = () => {
    refetchInstance()
    refetchExecutions()
    refetchLoops()
  }

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
          <div className='h-[600px] rounded-lg border bg-gray-50 dark:bg-gray-900'>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition='bottom-left'
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.data?.status) {
                    case 'running':
                      return '#3b82f6'
                    case 'success':
                      return '#10b981'
                    case 'failed':
                      return '#ef4444'
                    case 'pending':
                      return '#6b7280'
                    default:
                      return '#6b7280'
                  }
                }}
                className='!border !bg-white'
              />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

              <Panel
                position='top-right'
                className='rounded bg-white p-2 shadow'
              >
                <div className='flex items-center gap-4 text-sm'>
                  <div className='flex items-center gap-1'>
                    <div className='h-3 w-3 rounded bg-blue-500' />
                    <span>运行中</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='h-3 w-3 rounded bg-green-500' />
                    <span>成功</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='h-3 w-3 rounded bg-red-500' />
                    <span>失败</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='h-3 w-3 rounded bg-gray-400' />
                    <span>等待</span>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
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
              node={nodes.find((n) => n.id === selectedNode)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// 节点执行详情组件
function NodeExecutionDetail({
  nodeId,
  node,
}: {
  nodeId: string
  node?: Node
}) {
  if (!node) {
    return (
      <div className='py-8 text-center'>
        <Clock className='mx-auto mb-4 h-12 w-12 text-gray-400' />
        <p className='text-muted-foreground'>节点信息不存在</p>
      </div>
    )
  }

  const { data } = node
  const execution = data.execution

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <label className='text-sm font-medium'>节点ID</label>
          <p className='text-muted-foreground text-sm'>{nodeId}</p>
        </div>
        <div>
          <label className='text-sm font-medium'>节点名称</label>
          <p className='text-muted-foreground text-sm'>{data.label}</p>
        </div>
        <div>
          <label className='text-sm font-medium'>节点类型</label>
          <p className='text-muted-foreground text-sm'>{data.nodeType}</p>
        </div>
        <div>
          <label className='text-sm font-medium'>执行器</label>
          <p className='text-muted-foreground text-sm'>
            {data.executor || '-'}
          </p>
        </div>
        <div>
          <label className='text-sm font-medium'>状态</label>
          <Badge
            variant={data.status === 'success' ? 'default' : 'destructive'}
          >
            {data.status}
          </Badge>
        </div>
        <div>
          <label className='text-sm font-medium'>执行时间</label>
          <p className='text-muted-foreground text-sm'>
            {data.duration ? `${data.duration}ms` : '-'}
          </p>
        </div>
      </div>

      {execution?.inputData && (
        <div>
          <label className='text-sm font-medium'>输入数据</label>
          <pre className='mt-1 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs'>
            {JSON.stringify(execution.inputData, null, 2)}
          </pre>
        </div>
      )}

      {execution?.outputData && (
        <div>
          <label className='text-sm font-medium'>输出数据</label>
          <pre className='mt-1 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs'>
            {JSON.stringify(execution.outputData, null, 2)}
          </pre>
        </div>
      )}

      {execution?.errorMessage && (
        <div>
          <label className='text-sm font-medium'>错误信息</label>
          <p className='mt-1 rounded bg-red-50 p-2 text-sm text-red-600'>
            {execution.errorMessage}
          </p>
        </div>
      )}
    </div>
  )
}
