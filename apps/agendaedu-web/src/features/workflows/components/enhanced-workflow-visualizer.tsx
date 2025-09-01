/**
 * 增强的工作流可视化组件
 * 基于真实工作流定义数据，支持节点实例查询和交互
 */
import { useMemo, useState } from 'react'
import type {
  WorkflowDefinition,
  WorkflowInstance,
} from '@/types/workflow.types'
import { useEdgesState, useNodesState, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { workflowVisualizer } from '../utils/workflow-visualizer'

interface EnhancedWorkflowVisualizerProps {
  definition: WorkflowDefinition
  instance?: WorkflowInstance
  onNodeClick?: (nodeId: string) => void
}

interface NodeInstanceInfo {
  nodeId: string
  nodeName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: string
  endTime?: string
  executor?: string
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  errorMessage?: string
}

export function EnhancedWorkflowVisualizer({
  definition,
  instance,
  onNodeClick,
}: EnhancedWorkflowVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showNodeDetails, setShowNodeDetails] = useState(false)

  // 转换工作流定义为可视化数据
  const visualizationData = useMemo(() => {
    return workflowVisualizer.convertToVisualization(definition)
  }, [definition])

  // 应用实例执行状态到节点样式
  const nodesWithExecutionState = useMemo(() => {
    return visualizationData.nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        ...workflowVisualizer.getNodeExecutionStyle(
          node.id,
          instance?.executionPath,
          instance?.currentNodeId
        ),
      },
    }))
  }, [visualizationData.nodes, instance])

  const [nodes, setNodes, onNodesChange] = useNodesState(
    nodesWithExecutionState
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    visualizationData.edges
  )

  // 处理节点点击事件
  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      setSelectedNode(node)
      setShowNodeDetails(true)
      onNodeClick?.(node.id)
    },
    [onNodeClick]
  )

  // 获取节点状态图标
  const getNodeStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className='h-4 w-4 text-blue-500' />
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />
      case 'pending':
        return <Clock className='h-4 w-4 text-yellow-500' />
      default:
        return <AlertCircle className='h-4 w-4 text-gray-500' />
    }
  }

  // 获取节点类型徽章颜色
  const getNodeTypeBadgeVariant = (nodeType: string) => {
    switch (nodeType) {
      case 'simple':
        return 'default'
      case 'loop':
        return 'secondary'
      case 'parallel':
        return 'outline'
      case 'subprocess':
        return 'destructive'
      default:
        return 'default'
    }
  }

  // 模拟获取节点实例信息（实际应该从API获取）
  const getNodeInstanceInfo = (nodeId: string): NodeInstanceInfo | null => {
    if (!instance) return null

    // 这里应该调用API获取具体的节点实例信息
    // 目前返回模拟数据
    const isExecuted = instance.executionPath?.includes(nodeId)
    const isCurrent = instance.currentNodeId === nodeId

    if (!isExecuted && !isCurrent) return null

    return {
      nodeId,
      nodeName: selectedNode?.data.originalNode?.nodeName || nodeId,
      status: isCurrent ? 'running' : 'completed',
      startTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      endTime: isCurrent ? undefined : new Date().toISOString(),
      executor: selectedNode?.data.executor,
      inputData: selectedNode?.data.originalNode?.inputData,
      outputData: isCurrent ? null : { result: 'success', processedItems: 42 },
      errorMessage: null,
    }
  }

  return (
    <div className="flex h-full">
      {/* 主要的流程图区域 */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeColor="#374151"
            nodeColor="#6b7280"
            nodeBorderRadius={8}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>

        {/* 工作流信息覆盖层 */}
        <Card className="absolute top-4 left-4 w-80 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{definition.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {definition.description}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">版本:</span>
              <Badge variant="outline">{definition.version}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">状态:</span>
              <Badge variant={definition.status === 'active' ? 'default' : 'secondary'}>
                {definition.status}
              </Badge>
            </div>
            {instance && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">实例状态:</span>
                  <div className="flex items-center gap-2">
                    {getNodeStatusIcon(instance.status)}
                    <span className="text-sm">{instance.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">当前节点:</span>
                  <Badge variant="outline">{instance.currentNodeId || '-'}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      {/* 节点详情侧边栏 */}
      {showNodeDetails && selectedNode && (
        <div className="w-96 border-l bg-background">
          <Card className="h-full rounded-none border-0">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">节点详情</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNodeDetails(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="p-6 space-y-6">
                  {/* 基本信息 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      基本信息
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">节点ID:</span>
                        <code className="text-xs bg-muted px-1 rounded">
                          {selectedNode.id}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">节点名称:</span>
                        <span>{selectedNode.data.originalNode?.nodeName || selectedNode.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">节点类型:</span>
                        <Badge variant={getNodeTypeBadgeVariant(selectedNode.data.nodeType)}>
                          {selectedNode.data.nodeType}
                        </Badge>
                      </div>
                      {selectedNode.data.executor && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">执行器:</span>
                          <code className="text-xs bg-muted px-1 rounded">
                            {selectedNode.data.executor}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 执行状态 */}
                  {instance && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          执行状态
                        </h3>
                        {(() => {
                          const nodeInstanceInfo = getNodeInstanceInfo(selectedNode.id)
                          if (!nodeInstanceInfo) {
                            return (
                              <p className="text-sm text-muted-foreground">
                                该节点尚未执行
                              </p>
                            )
                          }

                          return (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">状态:</span>
                                <div className="flex items-center gap-2">
                                  {getNodeStatusIcon(nodeInstanceInfo.status)}
                                  <span>{nodeInstanceInfo.status}</span>
                                </div>
                              </div>
                              {nodeInstanceInfo.startTime && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">开始时间:</span>
                                  <span className="text-xs">
                                    {new Date(nodeInstanceInfo.startTime).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {nodeInstanceInfo.endTime && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">结束时间:</span>
                                  <span className="text-xs">
                                    {new Date(nodeInstanceInfo.endTime).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </>
                  )}

                  {/* 配置信息 */}
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      配置信息
                    </h3>
                    {selectedNode.data.originalNode?.inputData && (
                      <div>
                        <p className="text-sm font-medium mb-2">输入数据:</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(selectedNode.data.originalNode.inputData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedNode.data.originalNode?.errorHandling && (
                      <div>
                        <p className="text-sm font-medium mb-2">错误处理:</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(selectedNode.data.originalNode.errorHandling, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )

