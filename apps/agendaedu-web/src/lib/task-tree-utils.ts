import { CompletedTask, RunningTask, TaskStatus } from '@/types/task.types'

export type TaskNode<T = RunningTask | CompletedTask> = T & {
  children: TaskNode<T>[]
  level: number
  isExpanded?: boolean
  hasChildren: boolean
}

/**
 * 将扁平的任务列表转换为树形结构
 */
export function buildTaskTree<T extends RunningTask | CompletedTask>(
  tasks: T[]
): TaskNode<T>[] {
  const taskMap = new Map<string, TaskNode<T>>()
  const rootNodes: TaskNode<T>[] = []

  // 首先创建所有节点
  tasks.forEach((task) => {
    const node: TaskNode<T> = {
      ...task,
      children: [],
      level: 0,
      isExpanded: false,
      hasChildren: false,
    }
    taskMap.set(task.id, node)
  })

  // 然后建立父子关系
  tasks.forEach((task) => {
    const node = taskMap.get(task.id)!

    if (task.parent_id && taskMap.has(task.parent_id)) {
      // 有父节点的任务
      const parentNode = taskMap.get(task.parent_id)!
      parentNode.children.push(node)
      parentNode.hasChildren = true
      node.level = parentNode.level + 1
    } else {
      // 根节点
      rootNodes.push(node)
    }
  })

  return rootNodes
}

/**
 * 将树形结构扁平化为可渲染的列表
 */
export function flattenTaskTree<T extends RunningTask | CompletedTask>(
  nodes: TaskNode<T>[]
): TaskNode<T>[] {
  const result: TaskNode<T>[] = []

  function traverse(node: TaskNode<T>) {
    result.push(node)

    // 只有当节点展开时才显示子节点
    if (node.isExpanded && node.children.length > 0) {
      node.children.forEach((child) => traverse(child))
    }
  }

  nodes.forEach((node) => traverse(node))
  return result
}

/**
 * 切换节点的展开/收缩状态
 */
export function toggleNodeExpansion<T extends RunningTask | CompletedTask>(
  nodes: TaskNode<T>[],
  nodeId: string
): TaskNode<T>[] {
  function updateNode(node: TaskNode<T>): TaskNode<T> {
    if (node.id === nodeId) {
      return {
        ...node,
        isExpanded: !node.isExpanded,
      }
    }

    return {
      ...node,
      children: node.children.map(updateNode),
    }
  }

  return nodes.map(updateNode)
}

/**
 * 展开所有节点
 */
export function expandAllNodes<T extends RunningTask | CompletedTask>(
  nodes: TaskNode<T>[]
): TaskNode<T>[] {
  function expandNode(node: TaskNode<T>): TaskNode<T> {
    return {
      ...node,
      isExpanded: true,
      children: node.children.map(expandNode),
    }
  }

  return nodes.map(expandNode)
}

/**
 * 收缩所有节点
 */
export function collapseAllNodes<T extends RunningTask | CompletedTask>(
  nodes: TaskNode<T>[]
): TaskNode<T>[] {
  function collapseNode(node: TaskNode<T>): TaskNode<T> {
    return {
      ...node,
      isExpanded: false,
      children: node.children.map(collapseNode),
    }
  }

  return nodes.map(collapseNode)
}

/**
 * 过滤任务树的选项
 */
export interface TaskTreeFilterOptions {
  searchTerm?: string
  statuses?: TaskStatus[]
  taskTypes?: string[]
}

/**
 * 根据过滤条件过滤任务树
 */
export function filterTaskTree<T extends RunningTask | CompletedTask>(
  nodes: TaskNode<T>[],
  options: TaskTreeFilterOptions = {}
): TaskNode<T>[] {
  const { searchTerm = '', statuses = [], taskTypes = [] } = options

  // 如果没有任何过滤条件，直接返回原始数据
  if (!searchTerm.trim() && statuses.length === 0 && taskTypes.length === 0) {
    return nodes
  }

  const term = searchTerm.toLowerCase()

  function filterNode(node: TaskNode<T>): TaskNode<T> | null {
    // 检查搜索条件
    const matchesSearch =
      !searchTerm.trim() ||
      node.name.toLowerCase().includes(term) ||
      node.description?.toLowerCase().includes(term) ||
      node.task_type.toLowerCase().includes(term)

    // 检查状态过滤
    const matchesStatus =
      statuses.length === 0 || statuses.includes(node.status)

    // 检查任务类型过滤
    const matchesTaskType =
      taskTypes.length === 0 || taskTypes.includes(node.task_type)

    // 递归过滤子节点
    const filteredChildren = node.children
      .map(filterNode)
      .filter(Boolean) as TaskNode<T>[]

    // 当前节点是否应该显示
    const nodeMatches = matchesSearch && matchesStatus && matchesTaskType

    // 如果当前节点匹配或有匹配的子节点，则保留
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        isExpanded: filteredChildren.length > 0 ? true : node.isExpanded,
        hasChildren: filteredChildren.length > 0,
      }
    }

    return null
  }

  return nodes.map(filterNode).filter(Boolean) as TaskNode<T>[]
}

/**
 * 获取任务树中所有的任务类型
 */
export function getTaskTypesFromTree<T extends RunningTask | CompletedTask>(
  nodes: TaskNode<T>[]
): string[] {
  const types = new Set<string>()

  function traverse(node: TaskNode<T>) {
    types.add(node.task_type)
    node.children.forEach(traverse)
  }

  nodes.forEach(traverse)
  return Array.from(types).sort()
}

/**
 * 计算过滤后的任务数量
 */
export function countFilteredTasks<T extends RunningTask | CompletedTask>(
  nodes: TaskNode<T>[]
): number {
  let count = 0

  function traverse(node: TaskNode<T>) {
    count++
    node.children.forEach(traverse)
  }

  nodes.forEach(traverse)
  return count
}
