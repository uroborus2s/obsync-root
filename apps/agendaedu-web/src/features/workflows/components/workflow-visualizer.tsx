import { useMemo } from 'react'
import {
  WorkflowStatus,
  workflowStatusColors,
  workflowStatusLabels,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowInstance,
  type WorkflowNode,
  type WorkflowNodeType,
} from '@/types/workflow.types'
import {
  CheckCircle,
  Clock,
  Code,
  Diamond,
  GitBranch,
  GitMerge,
  Loader2,
  Play,
  Square,
  Webhook,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WorkflowVisualizerProps {
  definition: WorkflowDefinition
  instance?: WorkflowInstance
  className?: string
}

export function WorkflowVisualizer({
  definition,
  instance,
  className,
}: WorkflowVisualizerProps) {
  const nodes = definition.definition?.nodes || []
  const edges = definition.definition?.edges || []

  // 获取节点图标
  const getNodeIcon = (type: WorkflowNodeType) => {
    switch (type) {
      case 'start':
        return Play
      case 'end':
        return Square
      case 'task':
        return Square
      case 'condition':
        return Diamond
      case 'parallel':
        return GitBranch
      case 'merge':
        return GitMerge
      case 'delay':
        return Clock
      case 'webhook':
        return Webhook
      case 'script':
        return Code
      default:
        return Square
    }
  }

  // 获取节点状态
  const getNodeStatus = (nodeId: string): WorkflowStatus | undefined => {
    if (!instance) return undefined

    if (
      instance.currentNode === nodeId &&
      instance.status === WorkflowStatus.RUNNING
    ) {
      return WorkflowStatus.RUNNING
    }

    if (instance.executionPath?.includes(nodeId)) {
      return WorkflowStatus.COMPLETED
    }

    return undefined
  }

  // 获取节点状态样式
  const getNodeStatusStyle = (nodeId: string) => {
    const status = getNodeStatus(nodeId)

    if (!status) {
      return 'border-gray-200 bg-white text-gray-700'
    }

    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
      case 'completed':
        return 'border-green-500 bg-green-50 text-green-700'
      case 'failed':
        return 'border-red-500 bg-red-50 text-red-700'
      default:
        return 'border-gray-200 bg-white text-gray-700'
    }
  }

  // 获取节点状态图标
  const getNodeStatusIcon = (nodeId: string) => {
    const status = getNodeStatus(nodeId)

    switch (status) {
      case 'running':
        return <Loader2 className='h-3 w-3 animate-spin' />
      case 'completed':
        return <CheckCircle className='h-3 w-3 text-green-600' />
      case 'failed':
        return <XCircle className='h-3 w-3 text-red-600' />
      default:
        return null
    }
  }

  // 简单的布局算法 - 垂直流式布局
  const layoutNodes = useMemo(() => {
    const startNodes = nodes.filter(
      (node: WorkflowNode) => node.type === 'start'
    )
    const endNodes = nodes.filter((node: WorkflowNode) => node.type === 'end')
    const otherNodes = nodes.filter(
      (node: WorkflowNode) => node.type !== 'start' && node.type !== 'end'
    )

    const layouted: Array<
      WorkflowNode & { position: { x: number; y: number } }
    > = []
    let yOffset = 0

    // 开始节点
    startNodes.forEach((node, _index) => {
      layouted.push({
        ...node,
        position: { x: 50, y: yOffset },
      })
      yOffset += 120
    })

    // 其他节点
    otherNodes.forEach((node: WorkflowNode, index: number) => {
      const x = 50 + (index % 3) * 200
      const y = yOffset + Math.floor(index / 3) * 120
      layouted.push({
        ...node,
        position: { x, y },
      })
    })

    // 结束节点
    const maxY = Math.max(...layouted.map((n) => n.position.y))
    endNodes.forEach((node: WorkflowNode, index: number) => {
      layouted.push({
        ...node,
        position: { x: 50 + index * 200, y: maxY + 120 },
      })
    })

    return layouted
  }, [nodes])

  // 计算容器尺寸
  const containerSize = useMemo(() => {
    if (layoutNodes.length === 0) return { width: 400, height: 200 }

    const maxX = Math.max(...layoutNodes.map((n) => n.position.x)) + 150
    const maxY = Math.max(...layoutNodes.map((n) => n.position.y)) + 100

    return { width: Math.max(maxX, 400), height: Math.max(maxY, 200) }
  }, [layoutNodes])

  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg'>工作流程图</CardTitle>
          {instance && (
            <Badge className={workflowStatusColors[instance.status]}>
              {workflowStatusLabels[instance.status]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='relative overflow-auto rounded-lg border bg-gray-50 dark:bg-gray-900'>
          <svg
            width={containerSize.width}
            height={containerSize.height}
            className='min-h-[300px] min-w-full'
          >
            {/* 渲染连接线 */}
            {edges.map((edge: WorkflowEdge) => {
              const sourceNode = layoutNodes.find((n) => n.id === edge.source)
              const targetNode = layoutNodes.find((n) => n.id === edge.target)

              if (!sourceNode || !targetNode) return null

              const sourceX = sourceNode.position.x + 75
              const sourceY = sourceNode.position.y + 40
              const targetX = targetNode.position.x + 75
              const targetY = targetNode.position.y + 40

              // 检查连接线是否在执行路径中
              const isActive =
                instance?.executionPath?.includes(edge.source) &&
                instance?.executionPath?.includes(edge.target)

              return (
                <g key={edge.id}>
                  <line
                    x1={sourceX}
                    y1={sourceY}
                    x2={targetX}
                    y2={targetY}
                    stroke={isActive ? '#3b82f6' : '#d1d5db'}
                    strokeWidth={isActive ? 3 : 2}
                    markerEnd='url(#arrowhead)'
                    className='transition-all duration-300'
                  />
                  {edge.label && (
                    <text
                      x={(sourceX + targetX) / 2}
                      y={(sourceY + targetY) / 2 - 5}
                      textAnchor='middle'
                      className='fill-gray-600 text-xs dark:fill-gray-400'
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* 箭头标记定义 */}
            <defs>
              <marker
                id='arrowhead'
                markerWidth='10'
                markerHeight='7'
                refX='9'
                refY='3.5'
                orient='auto'
              >
                <polygon points='0 0, 10 3.5, 0 7' fill='#d1d5db' />
              </marker>
            </defs>
          </svg>

          {/* 渲染节点 */}
          {layoutNodes.map((node) => {
            const Icon = getNodeIcon(node.type)
            const statusIcon = getNodeStatusIcon(node.id)

            return (
              <div
                key={node.id}
                className={`absolute h-20 w-32 rounded-lg border-2 p-2 transition-all duration-300 ${getNodeStatusStyle(node.id)}`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                }}
              >
                <div className='mb-1 flex items-center justify-between'>
                  <Icon className='h-4 w-4' />
                  {statusIcon}
                </div>
                <div className='truncate text-xs font-medium' title={node.name}>
                  {node.name}
                </div>
                <div className='text-muted-foreground text-xs capitalize'>
                  {node.type}
                </div>
              </div>
            )
          })}
        </div>

        {/* 图例 */}
        <div className='mt-4 flex flex-wrap gap-4 text-sm'>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded border-2 border-gray-200 bg-white'></div>
            <span>待执行</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded border-2 border-blue-500 bg-blue-50'></div>
            <span>执行中</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded border-2 border-green-500 bg-green-50'></div>
            <span>已完成</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded border-2 border-red-500 bg-red-50'></div>
            <span>失败</span>
          </div>
        </div>

        {/* 执行信息 */}
        {instance && (
          <div className='mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-muted-foreground'>当前节点:</span>
                <span className='ml-2 font-medium'>
                  {instance.currentNode || '无'}
                </span>
              </div>
              <div>
                <span className='text-muted-foreground'>执行进度:</span>
                <span className='ml-2 font-medium'>
                  {instance.executionPath?.length || 0} / {nodes.length} 节点
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
