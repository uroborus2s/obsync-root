# 任务树数据调用指南

## 概述

本文档介绍了如何使用新的任务树接口来获取和显示任务数据。新的接口支持懒加载、树形结构展示和高效的数据管理。

## 接口架构

### 后端接口

1. **获取根任务列表** - `/apiv2/tasks/tree/roots`
2. **获取子任务列表** - `/apiv2/tasks/:id/tree/children`
3. **获取完整任务树** - `/apiv2/tasks/:id/tree/complete`

### 前端服务

1. **TaskApiService** - 基础 API 调用服务
2. **TaskTreeService** - 任务树数据管理服务
3. **TaskDataHelper** - 数据获取策略工具

## 数据调用策略

### 1. 懒加载策略（推荐）

**适用场景**：大量任务，需要按需加载子任务

```typescript
import { TaskDataHelper, taskTreeService } from '@/features/tasks/data/task-tree-service'
import { TaskStatus } from '@/types/task.types'

// 1. 获取根任务列表
const loadRootTasks = async () => {
  const runningStatuses = [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED]
  
  const response = await TaskDataHelper.loadWithLazyStrategy(
    runningStatuses,  // 状态过滤
    1,               // 页码
    20               // 每页数量
  )
  
  return response
}

// 2. 展开节点时懒加载子任务
const handleNodeExpansion = async (taskId: string) => {
  try {
    const isExpanded = await taskTreeService.toggleNodeExpansion(taskId)
    
    // 触发 UI 重新渲染
    refetchData()
  } catch (error) {
    console.error('展开节点失败:', error)
  }
}

// 3. 获取扁平化数据用于表格显示
const flattenedTasks = taskTreeService.getFlattenedTasks()
```

### 2. 完整加载策略

**适用场景**：任务数量较少，需要完整树结构

```typescript
// 获取完整的任务树
const loadFullTaskTree = async () => {
  const runningStatuses = [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED]
  
  const fullTree = await TaskDataHelper.loadWithFullStrategy(
    runningStatuses,  // 状态过滤
    5                // 最大深度
  )
  
  return fullTree
}
```

### 3. 分页加载策略

**适用场景**：根任务数量很多

```typescript
// 分页获取根任务
const loadPaginatedTasks = async (page: number) => {
  const runningStatuses = [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED]
  
  const response = await TaskDataHelper.loadWithPaginatedStrategy(
    runningStatuses,  // 状态过滤
    page,            // 页码
    50               // 每页数量
  )
  
  return response
}
```

## React 组件使用

### 基础用法

```tsx
import React, { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TaskTreeTableNew, TaskTreeTableData } from '@/features/tasks/components/task-tree-table-new'
import { taskTreeService, TaskDataHelper } from '@/features/tasks/data/task-tree-service'
import { TaskStatus } from '@/types/task.types'

export function TaskManagementPage() {
  const [currentTab, setCurrentTab] = useState<'running' | 'completed'>('running')
  
  // 获取任务数据
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', currentTab],
    queryFn: async () => {
      const statuses = currentTab === 'running' 
        ? [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED]
        : [TaskStatus.SUCCESS, TaskStatus.FAILED]
      
      return TaskDataHelper.loadWithLazyStrategy(statuses, 1, 20)
    },
    staleTime: 30000,
    refetchInterval: 60000,
  })

  // 处理节点展开/收缩
  const handleToggleExpansion = useCallback(async (taskId: string) => {
    try {
      await taskTreeService.toggleNodeExpansion(taskId)
      refetch() // 触发重新渲染
    } catch (error) {
      console.error('切换节点展开状态失败:', error)
    }
  }, [refetch])

  // 获取扁平化数据
  const flattenedTasks = useMemo(() => {
    return taskTreeService.getFlattenedTasks()
  }, [data])

  // 展开/收缩所有节点
  const handleExpandAll = useCallback(() => {
    taskTreeService.expandAll()
    refetch()
  }, [refetch])

  const handleCollapseAll = useCallback(() => {
    taskTreeService.collapseAll()
    refetch()
  }, [refetch])

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败: {String(error)}</div>

  return (
    <div>
      <div className="mb-4">
        <button onClick={handleExpandAll}>展开所有</button>
        <button onClick={handleCollapseAll}>收缩所有</button>
      </div>
      
      <TaskTreeTableNew
        data={flattenedTasks as TaskTreeTableData[]}
        onToggleExpansion={handleToggleExpansion}
      />
    </div>
  )
}
```

### 高级用法：带过滤和搜索

```tsx
import React, { useState, useMemo } from 'react'

export function AdvancedTaskManagement() {
  const [filters, setFilters] = useState({
    searchTerm: '',
    statuses: [] as TaskStatus[],
    taskTypes: [] as string[]
  })

  // 应用过滤器
  const filteredTasks = useMemo(() => {
    const allTasks = taskTreeService.getFlattenedTasks()
    
    if (!filters.searchTerm && !filters.statuses.length && !filters.taskTypes.length) {
      return allTasks
    }

    return allTasks.filter(task => {
      const matchesSearch = !filters.searchTerm || 
        task.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      
      const matchesStatus = !filters.statuses.length || 
        filters.statuses.includes(task.status)
      
      const matchesTaskType = !filters.taskTypes.length || 
        filters.taskTypes.includes(task.task_type)

      return matchesSearch && matchesStatus && matchesTaskType
    })
  }, [filters])

  return (
    <div>
      {/* 过滤器 UI */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索任务..."
          value={filters.searchTerm}
          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
        />
        {/* 其他过滤器... */}
      </div>

      <TaskTreeTableNew
        data={filteredTasks as TaskTreeTableData[]}
        onToggleExpansion={handleToggleExpansion}
      />
    </div>
  )
}
```

## 缓存和性能优化

### 缓存管理

```typescript
// 清除缓存
taskTreeService.clearCache()

// 刷新特定任务
await taskTreeService.refreshTask(taskId)

// 获取节点状态
const nodeState = taskTreeService.getNodeState(taskId)
```

### 性能优化建议

1. **使用懒加载策略**：避免一次性加载所有数据
2. **合理设置刷新间隔**：根据业务需求设置数据刷新频率
3. **使用 React.memo**：优化组件渲染性能
4. **虚拟化长列表**：对于大量数据使用虚拟滚动

## 错误处理

```typescript
const handleError = (error: Error, context: string) => {
  console.error(`${context}失败:`, error)
  
  // 显示用户友好的错误信息
  if (error.message.includes('网络')) {
    showNotification('网络连接失败，请检查网络设置')
  } else if (error.message.includes('权限')) {
    showNotification('权限不足，请重新登录')
  } else {
    showNotification('操作失败，请稍后重试')
  }
}

// 在组件中使用
try {
  await taskTreeService.toggleNodeExpansion(taskId)
} catch (error) {
  handleError(error as Error, '展开任务节点')
}
```

## 类型定义

```typescript
// 树形任务响应数据
interface TreeTaskResponse {
  id: string
  parent_id?: string | null
  name: string
  description?: string | null
  task_type: string
  status: TaskStatus
  priority: number
  progress: number
  executor_name?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  started_at?: string | null
  completed_at?: string | null
  childrenCount: number  // 子任务数量
  depth: number          // 树形深度
  children?: TreeTaskResponse[]  // 子任务（可选）
}

// 表格显示数据
type TaskTreeTableData = TreeTaskResponse & {
  level: number      // 显示层级
  isExpanded: boolean // 是否展开
  hasChildren: boolean // 是否有子任务
  isLoading?: boolean  // 是否正在加载
}
```

## 最佳实践

1. **优先使用懒加载策略**：适合大多数场景
2. **合理设置分页大小**：根据网络状况和用户体验调整
3. **及时清理缓存**：在切换视图或刷新数据时清理缓存
4. **处理加载状态**：为用户提供清晰的加载反馈
5. **错误恢复机制**：提供重试和错误处理功能

## 迁移指南

从旧的任务接口迁移到新的树形接口：

### 旧代码
```typescript
// 旧的平铺式接口
const { data } = useQuery(['tasks'], () => taskApi.getTasks({
  include_children: true,
  page: 1,
  page_size: 50
}))
```

### 新代码
```typescript
// 新的树形接口
const { data } = useQuery(['tasks', 'tree'], () => 
  TaskDataHelper.loadWithLazyStrategy([TaskStatus.RUNNING], 1, 20)
)
```

这样的迁移可以获得更好的性能和用户体验。 