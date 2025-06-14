# @stratix/tasks

Stratix框架任务管理系统 - 支持多级任务创建、状态控制和进度管理的TaskNode任务树插件。

## 📋 目录

- [功能特性](#功能特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [API 文档](#api-文档)
- [使用示例](#使用示例)
- [任务状态管理](#任务状态管理)
- [高级功能](#高级功能)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 🚀 功能特性

- **层次化任务树**: 支持创建多级父子任务关系
- **状态管理**: 完整的任务状态生命周期管理
- **进度跟踪**: 自动计算任务和子任务进度
- **内存优化**: 完成任务自动转换为占位符节点
- **数据持久化**: 任务状态自动同步到数据库
- **事件驱动**: 丰富的事件系统支持任务状态监听
- **任务恢复**: 应用重启后自动恢复运行中的任务
- **共享上下文**: 任务树内数据共享机制
- **执行器支持**: 可扩展的任务执行器系统

## 📦 安装

```bash
# 使用 pnpm
pnpm add @stratix/tasks

# 使用 npm
npm install @stratix/tasks

# 使用 yarn
yarn add @stratix/tasks
```

## 🏃 快速开始

### 1. 注册插件

```typescript
import { createApp } from '@stratix/core';
import tasksPlugin from '@stratix/tasks';

const app = createApp();

// 注册任务插件
await app.register(tasksPlugin, {
  autoRecovery: true,  // 自动恢复运行中的任务
  cleanupInterval: 60000  // 清理间隔（毫秒）
});

await app.ready();
```

### 2. 创建第一个任务

```typescript
import { TaskTreeService, TaskStatus } from '@stratix/tasks';

// 获取任务树服务
const taskTreeService = app.di.resolve<TaskTreeService>('taskTreeService');

// 创建根任务
const rootTask = await taskTreeService.createTask({
  data: {
    name: '数据处理任务',
    description: '处理用户上传的数据文件',
    type: 'directory',
    executorName: 'dataProcessor',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  autoStart: true
});

console.log(`根任务创建成功: ${rootTask.id}`);
```

### 3. 创建子任务

```typescript
// 创建子任务
const childTask = await taskTreeService.createTask({
  data: {
    name: '文件验证',
    description: '验证上传文件格式',
    type: 'leaf',
    executorName: 'fileValidator',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  parentId: rootTask.id,
  autoStart: false
});

// 启动子任务
await taskTreeService.startTask(childTask.id, '开始文件验证');
```

## 🧠 核心概念

### TaskNode (任务节点)

TaskNode 是任务系统的核心类，代表任务树中的一个节点：

```typescript
import { TaskNode, TaskData } from '@stratix/tasks';

// TaskNode 包含以下主要属性：
// - id: 唯一标识符
// - data: 任务数据
// - parent: 父任务节点
// - children: 子任务节点数组
// - status: 当前状态
// - progress: 进度百分比
```

### 任务状态

任务支持以下状态：

- `PENDING`: 待执行
- `RUNNING`: 运行中
- `PAUSED`: 已暂停
- `SUCCESS`: 成功完成
- `FAILED`: 执行失败
- `CANCELLED`: 已取消
- `COMPLETED`: 已完成（通用状态）

### 任务类型

- `directory`: 目录任务，只能包含子任务
- `leaf`: 叶子任务，可执行具体操作

## 📚 API 文档

### TaskTreeService

任务树服务是管理任务的主要接口。

#### 创建任务

```typescript
async createTask(params: ExtendedCreateTaskParams): Promise<TaskNode>
```

**参数:**
```typescript
interface ExtendedCreateTaskParams {
  data: TaskData;           // 任务数据
  parentId?: string;        // 父任务ID
  autoStart?: boolean;      // 是否自动启动
  contextData?: Record<string, any>;  // 上下文数据
  isRecovery?: boolean;     // 是否为恢复模式
}
```

#### 任务状态控制

```typescript
// 启动任务
async startTask(id: string, reason?: string): Promise<TaskStateChangeResult>

// 暂停任务
async pauseTask(id: string, reason?: string): Promise<TaskStateChangeResult>

// 恢复任务
async resumeTask(id: string, reason?: string): Promise<TaskStateChangeResult>

// 完成任务
async completeTask(id: string, reason?: string, result?: any): Promise<TaskStateChangeResult>

// 失败任务
async failTask(id: string, reason?: string, error?: Error): Promise<TaskStateChangeResult>

// 取消任务
async cancelTask(id: string, reason?: string): Promise<TaskStateChangeResult>
```

#### 查询任务

```typescript
// 获取任务
getTask(id: string): TaskNode | TaskNodePlaceholder | null

// 获取根任务列表
async getRootTasks(): Promise<TaskNode[]>

// 获取统计信息
async getStatistics(): Promise<TaskTreeStatistics>

// 获取完整任务树视图
async getCompleteTaskTreeView(): Promise<TaskTreeView>
```

### TaskNode 方法

#### 状态控制

```typescript
// 启动任务
async start(reason?: string): Promise<void>

// 暂停任务
async pause(reason?: string): Promise<void>

// 恢复任务
async resume(reason?: string): Promise<void>

// 成功完成
async success(reason?: string, result?: any): Promise<void>

// 失败
async fail(reason?: string, error?: Error): Promise<void>

// 取消
async cancel(reason?: string): Promise<void>
```

#### 树操作

```typescript
// 查找子任务
findById(id: string): TaskNode | null

// 获取所有后代
getDescendants(): TaskNode[]

// 获取祖先节点
getAncestors(): TaskNode[]

// 获取兄弟节点
getSiblings(): TaskNode[]

// 检查是否为根节点
isRoot(): boolean

// 检查是否为叶子节点
isLeaf(): boolean
```

## 💡 使用示例

### 示例 1: 文件处理工作流

```typescript
async function createFileProcessingWorkflow() {
  const taskTreeService = app.di.resolve<TaskTreeService>('taskTreeService');
  
  // 创建主任务
  const mainTask = await taskTreeService.createTask({
    data: {
      name: '文件处理工作流',
      description: '处理批量文件上传',
      type: 'directory',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        batchId: 'batch_001',
        totalFiles: 100
      }
    },
    autoStart: true
  });

  // 创建验证子任务
  const validateTask = await taskTreeService.createTask({
    data: {
      name: '文件验证',
      description: '验证文件格式和大小',
      type: 'leaf',
      executorName: 'fileValidator',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    parentId: mainTask.id
  });

  // 创建处理子任务
  const processTask = await taskTreeService.createTask({
    data: {
      name: '文件处理',
      description: '转换文件格式',
      type: 'leaf',
      executorName: 'fileProcessor',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    parentId: mainTask.id
  });

  // 启动验证任务
  await taskTreeService.startTask(validateTask.id);
  
  return mainTask;
}
```

### 示例 2: 监听任务状态变化

```typescript
import { TASK_NODE_EVENTS } from '@stratix/tasks';

async function monitorTaskProgress() {
  const task = await taskTreeService.createTask({
    data: {
      name: '数据同步任务',
      description: '同步用户数据',
      type: 'leaf',
      executorName: 'dataSyncer',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // 监听状态变化
  task.on(TASK_NODE_EVENTS.STATUS_SYNC, (event) => {
    console.log(`任务 ${event.taskId} 状态从 ${event.fromStatus} 变更为 ${event.toStatus}`);
    console.log(`进度: ${event.progress}%`);
  });

  // 监听任务完成
  task.on(TASK_NODE_EVENTS.TREE_COMPLETED, (event) => {
    console.log(`任务树 ${event.rootTaskId} 已完成`);
  });

  await taskTreeService.startTask(task.id);
}
```

### 示例 3: 使用共享上下文

```typescript
async function useSharedContext() {
  const rootTask = await taskTreeService.createTask({
    data: {
      name: '数据分析任务',
      description: '分析用户行为数据',
      type: 'directory',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    contextData: {
      analysisConfig: {
        timeRange: '2024-01-01 to 2024-12-31',
        metrics: ['pageViews', 'clickRate', 'conversion']
      },
      dataSource: 'user_analytics_db'
    },
    autoStart: true
  });

  // 子任务可以访问共享上下文
  const childTask = await taskTreeService.createTask({
    data: {
      name: '数据提取',
      description: '从数据库提取原始数据',
      type: 'leaf',
      executorName: 'dataExtractor',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    parentId: rootTask.id
  });

  // 在执行器中访问共享上下文
  console.log('共享配置:', childTask.context?.get('analysisConfig'));
}
```

### 示例 4: 批量任务管理

```typescript
async function createBatchTasks() {
  const batchTask = await taskTreeService.createTask({
    data: {
      name: '批量数据处理',
      description: '处理1000个数据文件',
      type: 'directory',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    autoStart: true
  });

  // 创建多个并行子任务
  const subTasks = [];
  for (let i = 0; i < 10; i++) {
    const subTask = await taskTreeService.createTask({
      data: {
        name: `处理批次 ${i + 1}`,
        description: `处理文件 ${i * 100 + 1} 到 ${(i + 1) * 100}`,
        type: 'leaf',
        executorName: 'batchProcessor',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          batchIndex: i,
          startFile: i * 100 + 1,
          endFile: (i + 1) * 100
        }
      },
      parentId: batchTask.id
    });
    
    subTasks.push(subTask);
  }

  // 启动所有子任务
  for (const subTask of subTasks) {
    await taskTreeService.startTask(subTask.id);
  }

  return batchTask;
}
```

## 🔄 任务状态管理

### 状态转换规则

```typescript
import { TaskStatusUtils } from '@stratix/tasks';

// 检查是否可以启动
if (TaskStatusUtils.canStart(task.status)) {
  await task.start();
}

// 检查是否可以暂停
if (TaskStatusUtils.canPause(task.status)) {
  await task.pause();
}

// 检查是否已完成
if (TaskStatusUtils.isCompleted(task.status)) {
  console.log('任务已完成');
}
```

### 进度计算

任务进度会根据子任务状态自动计算：

```typescript
// 父任务进度 = 所有子任务进度的平均值
console.log(`当前进度: ${task.progress}%`);

// 获取任务树统计信息
const stats = await taskTreeService.getStatistics();
console.log(`总任务数: ${stats.totalTasks}`);
console.log(`运行中: ${stats.runningTasks}`);
console.log(`已完成: ${stats.completedTasks}`);
```

## 🔧 高级功能

### 任务恢复

应用重启后自动恢复运行中的任务：

```typescript
// 插件会在启动时自动调用
const recoveryResult = await taskTreeService.recoverRunningTasks();
console.log(`恢复了 ${recoveryResult.recoveredCount} 个任务`);
```

### 内存优化

完成的任务会自动转换为占位符以节省内存：

```typescript
// 任务完成后会自动转换为 TaskNodePlaceholder
const placeholder = task.toPlaceholder();
console.log(`任务 ${placeholder.id} 已转换为占位符`);
```

### 元数据管理

```typescript
// 更新任务元数据
task.updateMetadata({
  processedFiles: 50,
  errors: 2,
  lastProcessedAt: new Date()
}, '更新处理进度');

// 使用函数更新元数据
task.updateMetadata((oldMetadata) => ({
  ...oldMetadata,
  processedFiles: oldMetadata.processedFiles + 10
}), '增加处理文件数');
```

## 🎯 最佳实践

### 1. 任务设计原则

```typescript
// ✅ 好的做法：合理的任务层次
const mainTask = await taskTreeService.createTask({
  data: {
    name: '用户数据导入',  // 清晰的任务名称
    description: '从CSV文件导入用户数据到数据库',  // 详细描述
    type: 'directory',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      estimatedDuration: 3600,  // 预估时长（秒）
      priority: 'high'
    }
  }
});

// ❌ 避免：过深的任务层次（超过5层）
```

### 2. 错误处理

```typescript
try {
  await taskTreeService.startTask(taskId);
} catch (error) {
  // 记录错误并标记任务失败
  await taskTreeService.failTask(taskId, '启动失败', error);
  console.error('任务启动失败:', error.message);
}
```

### 3. 资源清理

```typescript
// 任务完成后会自动清理资源
// 但对于长时间运行的任务，建议定期检查
const stats = await taskTreeService.getStatistics();
if (stats.completedTasks > 1000) {
  // 考虑清理旧的完成任务
  console.log('建议清理历史任务数据');
}
```

### 4. 性能优化

```typescript
// 对于大量子任务，考虑分批创建
async function createTasksInBatches(taskData: TaskData[], batchSize = 50) {
  const batches = [];
  for (let i = 0; i < taskData.length; i += batchSize) {
    const batch = taskData.slice(i, i + batchSize);
    batches.push(batch);
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(data => taskTreeService.createTask({ data }))
    );
    // 短暂延迟避免过载
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

## 🐛 故障排除

### 常见问题

#### 1. 任务无法启动

```typescript
// 检查任务状态
const task = taskTreeService.getTask(taskId);
if (!task) {
  console.error('任务不存在');
  return;
}

if (!TaskStatusUtils.canStart(task.status)) {
  console.error(`任务状态 ${task.status} 不允许启动`);
  return;
}
```

#### 2. 内存使用过高

```typescript
// 检查任务数量
const stats = await taskTreeService.getStatistics();
console.log(`当前任务数: ${stats.totalTasks}`);

// 如果任务数过多，考虑清理完成的任务
if (stats.totalTasks > 10000) {
  console.warn('任务数量过多，建议清理');
}
```

#### 3. 数据库同步问题

```typescript
// 检查数据库连接
try {
  await taskTreeService.getStatistics();
  console.log('数据库连接正常');
} catch (error) {
  console.error('数据库连接异常:', error.message);
}
```

### 调试技巧

```typescript
// 启用详细日志
const task = await taskTreeService.createTask({
  data: {
    name: '调试任务',
    description: '用于调试的测试任务',
    type: 'leaf',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      debug: true  // 启用调试模式
    }
  }
});

// 监听所有事件
Object.values(TASK_NODE_EVENTS).forEach(eventName => {
  task.on(eventName, (data) => {
    console.log(`[DEBUG] 事件: ${eventName}`, data);
  });
});
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

更多信息请参考 [Stratix 框架文档](https://github.com/stratix/framework)。 