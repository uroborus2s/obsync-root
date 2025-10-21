/**
 * 增强的工作流可视化组件
 * 基于真实工作流定义数据，支持节点实例查询和交互
 */
import { useCallback, useMemo, useState } from 'react'
import type {
  WorkflowDefinition,
  WorkflowInstance,
} from '@/types/workflow.types'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  List,
  Play,
  Settings,
  XCircle,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { workflowVisualizer } from '../utils/workflow-visualizer'

interface EnhancedWorkflowVisualizerProps {
  definition: WorkflowDefinition
  instance?: WorkflowInstance
  onNodeClick?: (nodeId: string) => void
  selectedNodeId?: string | null
  nodeInstances?: any[]
  nodeInstancesLoading?: boolean
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

interface LoopNodeExecution {
  iterationId: string
  iterationIndex: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: string
  endTime?: string
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  errorMessage?: string
  duration?: number
}

interface NodeData extends Record<string, unknown> {
  label: string
  nodeType: string
  executor?: string
  errorHandling?: any
  distributed?: any
  originalNode?: {
    nodeName?: string
    inputData?: Record<string, any>
    errorHandling?: any
  }
}

export function EnhancedWorkflowVisualizer({
  definition,
  instance,
  onNodeClick,
  selectedNodeId,
  nodeInstances,
  nodeInstancesLoading,
}: EnhancedWorkflowVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null)
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

  const [nodes, , onNodesChange] = useNodesState(nodesWithExecutionState)
  const [edges, , onEdgesChange] = useEdgesState(visualizationData.edges)

  // 处理节点点击事件
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      try {
        setSelectedNode(node as Node<NodeData>)
        setShowNodeDetails(true)
        onNodeClick?.(node.id)
      } catch (error) {
        console.error('节点点击处理错误:', error)
        // 不抛出错误，避免500错误
      }
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
      outputData: isCurrent
        ? undefined
        : { result: 'success', processedItems: 42 },
      errorMessage: undefined,
    }
  }

  // 模拟获取循环节点执行列表（实际应该从API获取）
  const getLoopNodeExecutions = (nodeId: string): LoopNodeExecution[] => {
    if (!instance) return []

    // 根据nodeId从nodes数据中查找节点类型，而不是依赖selectedNode状态
    const targetNode = nodes.find((node) => node.id === nodeId)
    if (!targetNode || targetNode.data.nodeType !== 'loop') return []

    // 这里应该调用API获取循环节点的所有迭代执行情况
    // 目前返回模拟数据
    const isExecuted = instance.executionPath?.includes(nodeId)
    if (!isExecuted) return []

    // 模拟5次循环迭代
    return Array.from({ length: 5 }, (_, index) => ({
      iterationId: `${nodeId}-iter-${index + 1}`,
      iterationIndex: index + 1,
      status: index < 3 ? 'completed' : index === 3 ? 'running' : 'pending',
      startTime: new Date(Date.now() - (5 - index) * 60000).toISOString(),
      endTime:
        index < 3
          ? new Date(Date.now() - (4 - index) * 60000).toISOString()
          : undefined,
      inputData: { item: `item_${index + 1}`, batch: index + 1 },
      outputData:
        index < 3
          ? { processed: true, result: `result_${index + 1}` }
          : undefined,
      errorMessage: undefined,
      duration: index < 3 ? Math.floor(Math.random() * 5000) + 1000 : undefined,
    }))
  }

  return (
    <div className='flex h-full min-h-[600px]'>
      {/* 主要的流程图区域 */}
      <div
        className={`relative h-[600px] ${showNodeDetails ? 'w-[30%]' : 'w-full'} flex-1`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition='bottom-left'
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeColor='#374151'
            nodeColor='#6b7280'
            nodeBorderRadius={8}
            maskColor='rgba(0, 0, 0, 0.1)'
          />
        </ReactFlow>
      </div>

      {/* 节点详情侧边栏 - 占宽度的70% */}
      {showNodeDetails && selectedNode && (
        <div className='bg-background w-[70%] border-l'>
          <Card className='h-full rounded-none border-0'>
            <CardHeader className='border-b'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>节点详情</CardTitle>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowNodeDetails(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-0'>
              <ScrollArea className='h-[calc(100vh-200px)]'>
                <div className='space-y-6 p-6'>
                  {/* 基本信息 */}
                  <div className='space-y-3'>
                    <h3 className='flex items-center gap-2 font-semibold'>
                      <Settings className='h-4 w-4' />
                      基本信息
                    </h3>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>节点ID:</span>
                        <code className='bg-muted rounded px-1 text-xs'>
                          {selectedNode.id}
                        </code>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>节点名称:</span>
                        <span>
                          {selectedNode.data.originalNode?.nodeName ||
                            selectedNode.id}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>节点类型:</span>
                        <Badge
                          variant={getNodeTypeBadgeVariant(
                            selectedNode.data.nodeType
                          )}
                        >
                          {selectedNode.data.nodeType}
                        </Badge>
                      </div>
                      {selectedNode.data.executor && (
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>执行器:</span>
                          <code className='bg-muted rounded px-1 text-xs'>
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
                      <div className='space-y-3'>
                        <h3 className='flex items-center gap-2 font-semibold'>
                          <Zap className='h-4 w-4' />
                          执行状态
                        </h3>
                        {(() => {
                          const nodeInstanceInfo = getNodeInstanceInfo(
                            selectedNode.id
                          )
                          if (!nodeInstanceInfo) {
                            return (
                              <p className='text-muted-foreground text-sm'>
                                该节点尚未执行
                              </p>
                            )
                          }

                          return (
                            <div className='space-y-2 text-sm'>
                              <div className='flex items-center justify-between'>
                                <span className='text-muted-foreground'>
                                  状态:
                                </span>
                                <div className='flex items-center gap-2'>
                                  {getNodeStatusIcon(nodeInstanceInfo.status)}
                                  <span>{nodeInstanceInfo.status}</span>
                                </div>
                              </div>
                              {nodeInstanceInfo.startTime && (
                                <div className='flex justify-between'>
                                  <span className='text-muted-foreground'>
                                    开始时间:
                                  </span>
                                  <span className='text-xs'>
                                    {new Date(
                                      nodeInstanceInfo.startTime
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {nodeInstanceInfo.endTime && (
                                <div className='flex justify-between'>
                                  <span className='text-muted-foreground'>
                                    结束时间:
                                  </span>
                                  <span className='text-xs'>
                                    {new Date(
                                      nodeInstanceInfo.endTime
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </>
                  )}

                  {/* 循环节点执行列表 */}
                  {selectedNode?.data?.nodeType === 'loop' && instance && (
                    <>
                      <Separator />
                      <div className='space-y-3'>
                        <h3 className='flex items-center gap-2 font-semibold'>
                          <List className='h-4 w-4' />
                          循环执行列表
                        </h3>
                        {(() => {
                          try {
                            const loopExecutions = getLoopNodeExecutions(
                              selectedNode.id
                            )
                            if (loopExecutions.length === 0) {
                              return (
                                <p className='text-muted-foreground text-sm'>
                                  该循环节点尚未开始执行
                                </p>
                              )
                            }

                            return (
                              <div className='space-y-2'>
                                <div className='text-muted-foreground mb-2 text-xs'>
                                  共 {loopExecutions.length} 次迭代
                                </div>
                                <div className='max-h-64 space-y-2 overflow-auto'>
                                  {loopExecutions.map((execution) => (
                                    <div
                                      key={execution.iterationId}
                                      className='space-y-2 rounded-lg border p-3'
                                    >
                                      <div className='flex items-center justify-between'>
                                        <span className='text-sm font-medium'>
                                          迭代 #{execution.iterationIndex}
                                        </span>
                                        <div className='flex items-center gap-2'>
                                          {getNodeStatusIcon(execution.status)}
                                          <span className='text-xs'>
                                            {execution.status}
                                          </span>
                                        </div>
                                      </div>

                                      {execution.startTime && (
                                        <div className='text-muted-foreground text-xs'>
                                          开始:{' '}
                                          {new Date(
                                            execution.startTime
                                          ).toLocaleString()}
                                        </div>
                                      )}

                                      {execution.endTime && (
                                        <div className='text-muted-foreground text-xs'>
                                          结束:{' '}
                                          {new Date(
                                            execution.endTime
                                          ).toLocaleString()}
                                        </div>
                                      )}

                                      {execution.duration && (
                                        <div className='text-muted-foreground text-xs'>
                                          耗时: {execution.duration}ms
                                        </div>
                                      )}

                                      {execution.inputData && (
                                        <div>
                                          <p className='mb-1 text-xs font-medium'>
                                            输入:
                                          </p>
                                          <pre className='bg-muted max-h-16 overflow-auto rounded p-1 text-xs'>
                                            {JSON.stringify(
                                              execution.inputData,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                      )}

                                      {execution.outputData && (
                                        <div>
                                          <p className='mb-1 text-xs font-medium'>
                                            输出:
                                          </p>
                                          <pre className='bg-muted max-h-16 overflow-auto rounded p-1 text-xs'>
                                            {JSON.stringify(
                                              execution.outputData,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                      )}

                                      {execution.errorMessage && (
                                        <div className='text-xs text-red-600'>
                                          错误: {execution.errorMessage}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          } catch (error) {
                            return (
                              <p className='text-muted-foreground text-sm'>
                                加载循环执行列表时出错
                              </p>
                            )
                          }
                        })()}
                      </div>
                    </>
                  )}

                  {/* 配置信息 */}
                  <Separator />
                  <div className='space-y-3'>
                    <h3 className='flex items-center gap-2 font-semibold'>
                      <Database className='h-4 w-4' />
                      配置信息
                    </h3>
                    {selectedNode.data.originalNode?.inputData && (
                      <div>
                        <p className='mb-2 text-sm font-medium'>输入数据:</p>
                        <pre className='bg-muted max-h-32 overflow-auto rounded p-2 text-xs'>
                          {JSON.stringify(
                            selectedNode.data.originalNode.inputData,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                    {selectedNode.data.originalNode?.errorHandling && (
                      <div>
                        <p className='mb-2 text-sm font-medium'>错误处理:</p>
                        <pre className='bg-muted max-h-32 overflow-auto rounded p-2 text-xs'>
                          {JSON.stringify(
                            selectedNode.data.originalNode.errorHandling,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* 节点执行数据 */}
                  {selectedNodeId && selectedNode && selectedNode.id === selectedNodeId && (
                    <>
                      <Separator />
                      <div className='space-y-3'>
                        <h3 className='flex items-center gap-2 font-semibold'>
                          <Database className='h-4 w-4' />
                          节点执行数据
                        </h3>
                        
                        {nodeInstancesLoading ? (
                          <div className='flex items-center justify-center py-4'>
                            <div className='text-center'>
                              <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent'></div>
                              <p className='mt-2 text-xs text-muted-foreground'>
                                加载节点数据...
                              </p>
                            </div>
                          </div>
                        ) : nodeInstances && nodeInstances.length > 0 ? (
                          <div className='space-y-4'>
                            {nodeInstances.map((nodeInstance, index) => (
                              <div key={index} className='rounded-lg border p-3 text-xs'>
                                <div className='mb-3 flex items-center justify-between'>
                                  <span className='font-medium'>
                                    {nodeInstance.nodeName || nodeInstance.nodeId}
                                  </span>
                                  <Badge
                                    variant={
                                      nodeInstance.status === 'completed'
                                        ? 'default'
                                        : nodeInstance.status === 'failed'
                                          ? 'destructive'
                                          : nodeInstance.status === 'running'
                                            ? 'secondary'
                                            : 'outline'
                                    }
                                    className='text-xs'
                                  >
                                    {nodeInstance.status === 'completed' && '已完成'}
                                    {nodeInstance.status === 'failed' && '失败'}
                                    {nodeInstance.status === 'running' && '运行中'}
                                    {nodeInstance.status === 'pending' && '等待中'}
                                    {!['completed', 'failed', 'running', 'pending'].includes(
                                      nodeInstance.status
                                    ) && nodeInstance.status}
                                  </Badge>
                                </div>

                                <div className='mb-3 grid grid-cols-2 gap-2 text-xs'>
                                  {nodeInstance.executor && (
                                    <div>
                                      <span className='text-muted-foreground'>执行器:</span>
                                      <p className='font-mono'>{nodeInstance.executor}</p>
                                    </div>
                                  )}
                                  
                                  {nodeInstance.startTime && (
                                    <div>
                                      <span className='text-muted-foreground'>开始时间:</span>
                                      <p>{new Date(nodeInstance.startTime).toLocaleString()}</p>
                                    </div>
                                  )}
                                  
                                  {nodeInstance.endTime && (
                                    <div>
                                      <span className='text-muted-foreground'>结束时间:</span>
                                      <p>{new Date(nodeInstance.endTime).toLocaleString()}</p>
                                    </div>
                                  )}
                                </div>

                                {nodeInstance.inputData && (
                                  <div className='mb-3'>
                                    <p className='mb-1 text-xs font-medium text-muted-foreground'>
                                      输入数据:
                                    </p>
                                    <pre className='max-h-24 overflow-auto rounded bg-muted p-2 text-xs'>
                                      {JSON.stringify(nodeInstance.inputData, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {nodeInstance.outputData && (
                                  <div className='mb-3'>
                                    <p className='mb-1 text-xs font-medium text-muted-foreground'>
                                      输出数据:
                                    </p>
                                    <pre className='max-h-24 overflow-auto rounded bg-muted p-2 text-xs'>
                                      {JSON.stringify(nodeInstance.outputData, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {nodeInstance.errorMessage && (
                                  <div className='mb-3'>
                                    <p className='mb-1 text-xs font-medium text-red-600'>
                                      错误信息:
                                    </p>
                                    <div className='rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400'>
                                      {nodeInstance.errorMessage}
                                    </div>
                                  </div>
                                )}

                                {nodeInstance.children && nodeInstance.children.length > 0 && (
                                  <div>
                                    <p className='mb-2 text-xs font-medium text-muted-foreground'>
                                      子节点 ({nodeInstance.children.length}):
                                    </p>
                                    <div className='space-y-2'>
                                      {nodeInstance.children.map((child: any, childIndex: number) => (
                                        <div
                                          key={childIndex}
                                          className='rounded border p-2 bg-gray-50 dark:bg-gray-800'
                                        >
                                          <div className='mb-2 flex items-center justify-between'>
                                            <div className='flex items-center gap-2'>
                                              <span className='font-mono text-xs font-medium'>
                                                {child.nodeId}
                                              </span>
                                              <Badge variant='outline' className='text-xs'>
                                                {child.status === 'completed' && '已完成'}
                                                {child.status === 'failed' && '失败'}
                                                {child.status === 'running' && '运行中'}
                                                {child.status === 'pending' && '等待中'}
                                                {!['completed', 'failed', 'running', 'pending'].includes(
                                                  child.status
                                                ) && child.status}
                                              </Badge>
                                            </div>
                                          </div>
                                          
                                          <div className='grid grid-cols-2 gap-2 text-xs'>
                                            {child.nodeName && (
                                              <div>
                                                <span className='text-muted-foreground'>名称:</span>
                                                <p className='truncate'>{child.nodeName}</p>
                                              </div>
                                            )}
                                            
                                            {child.nodeType && (
                                              <div>
                                                <span className='text-muted-foreground'>类型:</span>
                                                <p>{child.nodeType}</p>
                                              </div>
                                            )}
                                            
                                            {child.startedAt && (
                                              <div>
                                                <span className='text-muted-foreground'>开始时间:</span>
                                                <p>{new Date(child.startedAt).toLocaleString()}</p>
                                              </div>
                                            )}
                                            
                                            {child.durationMs && (
                                              <div>
                                                <span className='text-muted-foreground'>持续时间:</span>
                                                <p>{child.durationMs}ms</p>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {child.inputData && (
                                            <div className='mt-2'>
                                              <p className='mb-1 text-xs font-medium text-muted-foreground'>
                                                输入数据:
                                              </p>
                                              <pre className='max-h-16 overflow-auto rounded bg-muted p-1 text-xs'>
                                                {JSON.stringify(child.inputData, null, 2)}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className='py-4 text-center text-xs text-muted-foreground'>
                            未找到节点执行数据
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
