/**
 * 工作流可视化工具
 * 将数据库中的工作流定义转换为React Flow可视化格式
 */
import type { WorkflowDefinition } from '@/types/workflow.types'
import type { Edge, Node } from '@xyflow/react'

export interface WorkflowNode {
  nodeId: string
  nodeName: string
  nodeType: 'simple' | 'loop' | 'parallel' | 'subprocess' | 'task'
  executor?: string
  dependsOn?: string[]
  inputData?: Record<string, any>
  errorHandling?: {
    strategy: string
    maxRetries?: number
    retryDelay?: number
    onFailure?: string
  }
  distributed?: {
    enabled?: boolean
    assignmentStrategy?: string
    requiredCapabilities?: string[]
  }
  node?: WorkflowNode // 嵌套节点（用于循环节点）
}

export interface WorkflowVisualizationData {
  nodes: Node[]
  edges: Edge[]
}

/**
 * 节点类型到颜色的映射
 */
const NODE_TYPE_COLORS = {
  simple: '#3b82f6', // 蓝色
  loop: '#f59e0b', // 橙色
  parallel: '#10b981', // 绿色
  subprocess: '#8b5cf6', // 紫色
  task: '#06b6d4', // 青色
  start: '#22c55e', // 绿色
  end: '#ef4444', // 红色
} as const

/**
 * 节点类型到图标的映射
 */
const NODE_TYPE_ICONS = {
  simple: '⚡',
  loop: '🔄',
  parallel: '⚡',
  subprocess: '📋',
  task: '⚙️',
  start: '▶️',
  end: '⏹️',
} as const

/**
 * 计算节点位置的布局算法
 */
class WorkflowLayoutEngine {
  private horizontalSpacing = 200
  private verticalSpacing = 150

  /**
   * 使用层次布局算法计算节点位置（垂直布局）
   */
  calculateLayout(
    workflowNodes: WorkflowNode[]
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()
    const levels = this.calculateNodeLevels(workflowNodes)
    const levelGroups = this.groupNodesByLevel(levels)

    // 为每个层级的节点分配位置（垂直布局）
    Object.entries(levelGroups).forEach(([level, nodeIds]) => {
      const levelNum = parseInt(level)
      const y = levelNum * this.verticalSpacing

      // 水平居中分布节点
      const totalWidth = (nodeIds.length - 1) * this.horizontalSpacing
      const startX = -totalWidth / 2

      nodeIds.forEach((nodeId, index) => {
        const x = startX + index * this.horizontalSpacing
        positions.set(nodeId, { x, y })
      })
    })

    return positions
  }

  /**
   * 计算每个节点的层级（基于依赖关系）
   */
  private calculateNodeLevels(
    workflowNodes: WorkflowNode[]
  ): Map<string, number> {
    const levels = new Map<string, number>()
    const visited = new Set<string>()

    const calculateLevel = (nodeId: string): number => {
      if (visited.has(nodeId)) {
        return levels.get(nodeId) || 0
      }

      visited.add(nodeId)
      const node = workflowNodes.find((n) => n.nodeId === nodeId)

      if (!node || !node.dependsOn || node.dependsOn.length === 0) {
        levels.set(nodeId, 0)
        return 0
      }

      const maxDependencyLevel = Math.max(
        ...node.dependsOn.map((depId) => calculateLevel(depId))
      )

      const level = maxDependencyLevel + 1
      levels.set(nodeId, level)
      return level
    }

    workflowNodes.forEach((node) => calculateLevel(node.nodeId))
    return levels
  }

  /**
   * 按层级分组节点
   */
  private groupNodesByLevel(
    levels: Map<string, number>
  ): Record<number, string[]> {
    const groups: Record<number, string[]> = {}

    levels.forEach((level, nodeId) => {
      if (!groups[level]) {
        groups[level] = []
      }
      groups[level].push(nodeId)
    })

    return groups
  }
}

/**
 * 工作流可视化转换器
 */
export class WorkflowVisualizer {
  private layoutEngine = new WorkflowLayoutEngine()

  /**
   * 将工作流定义转换为可视化数据
   */
  convertToVisualization(
    definition: WorkflowDefinition
  ): WorkflowVisualizationData {
    try {
      // 尝试从多个可能的位置获取节点数据
      let workflowNodes: WorkflowNode[] = []

      // 首先尝试从 definition.definition.nodes 获取
      if (
        definition.definition?.nodes &&
        Array.isArray(definition.definition.nodes)
      ) {
        workflowNodes = definition.definition.nodes as unknown as WorkflowNode[]
      }
      // 如果没有，尝试从顶级 nodes 获取
      else if (definition.nodes && Array.isArray(definition.nodes)) {
        workflowNodes = definition.nodes as unknown as WorkflowNode[]
      }
      // 如果 definition.definition 是字符串，尝试解析
      else if (typeof definition.definition === 'string') {
        try {
          const parsed = JSON.parse(definition.definition)
          if (parsed.nodes && Array.isArray(parsed.nodes)) {
            workflowNodes = parsed.nodes as WorkflowNode[]
          }
        } catch (parseError) {
          console.error('Failed to parse definition string:', parseError)
        }
      }

      if (!workflowNodes.length) {
        console.warn('No workflow nodes found in definition:', definition)
        return { nodes: [], edges: [] }
      }

      const positions = this.layoutEngine.calculateLayout(workflowNodes)
      const nodes = this.createReactFlowNodes(workflowNodes, positions)
      const edges = this.createReactFlowEdges(workflowNodes)

      return { nodes, edges }
    } catch (error) {
      console.error('Failed to convert workflow definition:', error)
      return { nodes: [], edges: [] }
    }
  }

  /**
   * 创建React Flow节点
   */
  private createReactFlowNodes(
    workflowNodes: WorkflowNode[],
    positions: Map<string, { x: number; y: number }>
  ): Node[] {
    return workflowNodes.map((node) => {
      const position = positions.get(node.nodeId) || { x: 0, y: 0 }
      const nodeType = node.nodeType || 'simple'

      return {
        id: node.nodeId,
        type: 'default',
        position,
        data: {
          label: this.createNodeLabel(node),
          nodeType,
          executor: node.executor,
          errorHandling: node.errorHandling,
          distributed: node.distributed,
          originalNode: node,
        },
        style: {
          background: NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.simple,
          color: 'white',
          border: '2px solid #1a202c',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          width: 200,
          height: 80,
        },
      }
    })
  }

  /**
   * 创建节点标签
   */
  private createNodeLabel(node: WorkflowNode): string {
    const icon = NODE_TYPE_ICONS[node.nodeType] || '⚡'
    const name = node.nodeName || node.nodeId
    const executor = node.executor ? `\n${node.executor}` : ''

    return `${icon} ${name}${executor}`
  }

  /**
   * 创建React Flow边
   */
  private createReactFlowEdges(workflowNodes: WorkflowNode[]): Edge[] {
    const edges: Edge[] = []

    workflowNodes.forEach((node) => {
      // 支持两种连接方式：dependsOn (反向) 和 nextNodes (正向)

      // 处理 dependsOn 属性 (当前节点依赖的前置节点)
      if (node.dependsOn && node.dependsOn.length > 0) {
        node.dependsOn.forEach((sourceNodeId) => {
          edges.push({
            id: `${sourceNodeId}-${node.nodeId}`,
            source: sourceNodeId,
            target: node.nodeId,
            type: 'smoothstep',
            style: {
              stroke: '#64748b',
              strokeWidth: 2,
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#64748b',
            },
          })
        })
      }

      // 处理 nextNodes 属性 (当前节点的后续节点)
      if ((node as any).nextNodes && Array.isArray((node as any).nextNodes)) {
        ;(node as any).nextNodes.forEach((targetNodeId: string) => {
          const edgeId = `${node.nodeId}-${targetNodeId}`
          // 避免重复添加相同的边
          if (!edges.find((edge) => edge.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: node.nodeId,
              target: targetNodeId,
              type: 'smoothstep',
              style: {
                stroke: '#64748b',
                strokeWidth: 2,
              },
              markerEnd: {
                type: 'arrowclosed',
                color: '#64748b',
              },
            })
          }
        })
      }
    })

    return edges
  }

  /**
   * 获取节点执行状态样式
   */
  getNodeExecutionStyle(
    nodeId: string,
    executionPath?: string[],
    currentNodeId?: string
  ) {
    const isExecuted = executionPath?.includes(nodeId)
    const isCurrent = currentNodeId === nodeId

    if (isCurrent) {
      return {
        border: '3px solid #fbbf24',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
      }
    }

    if (isExecuted) {
      return {
        border: '3px solid #10b981',
        opacity: 0.8,
      }
    }

    return {
      opacity: 0.6,
    }
  }
}

// 导出单例实例
export const workflowVisualizer = new WorkflowVisualizer()
