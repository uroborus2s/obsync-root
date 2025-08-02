# @stratix/icasync 任务树结构设计文档

## 概述

利用 @stratix/tasks 库创建分层任务管理，设计全量同步、增量同步和用户同步的任务流程。采用任务树结构确保同步过程的可控性、可监控性和可恢复性。

## 设计原则

### 1. 分层任务管理
- 根任务：整体同步任务
- 子任务：具体的同步步骤
- 叶子任务：原子操作单元

### 2. 互斥执行
- 全局只能有一个活跃的同步任务树
- 避免并发同步导致的数据冲突
- 支持任务队列和优先级管理

### 3. 容错恢复
- 支持任务失败重试
- 断点续传功能
- 数据一致性保证

### 4. 进度监控
- 实时任务进度跟踪
- 详细的执行日志
- 性能指标收集

## 任务树结构设计

### 1. 全量同步任务树

```
全量同步任务 (Root)
├── 数据准备阶段
│   ├── 验证学期参数
│   ├── 检查数据库连接
│   └── 清理临时数据
├── 课程数据聚合阶段
│   ├── 提取原始课程数据
│   ├── 聚合课程数据
│   └── 验证聚合结果
├── 用户数据同步阶段
│   ├── 同步学生信息
│   ├── 同步教师信息
│   └── 构建用户视图
├── 日历创建阶段
│   ├── 创建课程日历
│   ├── 设置日历权限
│   └── 添加日历参与者
├── 日程同步阶段
│   ├── 创建课程日程
│   ├── 设置日程参与者
│   └── 验证同步结果
└── 完成清理阶段
    ├── 更新同步状态
    ├── 生成同步报告
    └── 清理临时资源
```

### 2. 增量同步任务树

```
增量同步任务 (Root)
├── 变更检测阶段
│   ├── 检测课程变更
│   ├── 检测用户变更
│   └── 分析变更影响
├── 删除处理阶段
│   ├── 删除已取消的日程
│   ├── 移除日历参与者
│   └── 软删除聚合数据
├── 更新处理阶段
│   ├── 重新聚合变更课程
│   ├── 更新日历信息
│   └── 更新日程信息
├── 新增处理阶段
│   ├── 创建新增日历
│   ├── 添加新增日程
│   └── 设置参与者权限
└── 状态更新阶段
    ├── 更新同步状态
    ├── 记录变更日志
    └── 发送通知
```

### 3. 用户同步任务树

```
用户同步任务 (Root)
├── 用户数据提取阶段
│   ├── 提取学生变更
│   ├── 提取教师变更
│   └── 验证用户数据
├── 用户视图更新阶段
│   ├── 更新学生视图
│   ├── 更新教师视图
│   └── 验证视图数据
├── 参与者权限更新阶段
│   ├── 处理新增用户
│   ├── 处理删除用户
│   └── 更新权限设置
└── 同步完成阶段
    ├── 更新用户状态
    ├── 生成用户报告
    └── 清理临时数据
```

## 任务定义

### 1. 任务处理器注册

```typescript
// 注册任务处理器
export const registerTaskProcessors = async (taskAdapter: IcasyncTaskAdapter) => {
  // 数据处理器
  await taskAdapter.registerTaskProcessor('data-validator', dataValidatorProcessor);
  await taskAdapter.registerTaskProcessor('data-aggregator', dataAggregatorProcessor);
  await taskAdapter.registerTaskProcessor('data-transformer', dataTransformerProcessor);
  
  // WPS API 处理器
  await taskAdapter.registerTaskProcessor('calendar-creator', calendarCreatorProcessor);
  await taskAdapter.registerTaskProcessor('schedule-creator', scheduleCreatorProcessor);
  await taskAdapter.registerTaskProcessor('participant-manager', participantManagerProcessor);
  
  // 状态管理处理器
  await taskAdapter.registerTaskProcessor('status-updater', statusUpdaterProcessor);
  await taskAdapter.registerTaskProcessor('report-generator', reportGeneratorProcessor);
  await taskAdapter.registerTaskProcessor('cleanup-manager', cleanupManagerProcessor);
};
```

### 2. 核心任务处理器实现

#### 数据验证处理器

```typescript
export const dataValidatorProcessor: TaskProcessor = {
  name: 'data-validator',
  
  async execute(params: TaskExecutionParams): Promise<TaskResult> {
    const { data } = params;
    
    try {
      // 验证学期参数
      if (data.xnxq) {
        const isValidXnxq = validateXnxqFormat(data.xnxq);
        if (!isValidXnxq) {
          throw new ValidationError('Invalid xnxq format');
        }
      }
      
      // 验证数据库连接
      await validateDatabaseConnection();
      
      // 验证 WPS API 连接
      await validateWpsApiConnection();
      
      return {
        success: true,
        data: { validated: true },
        message: 'Data validation completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        retryable: error instanceof NetworkError
      };
    }
  }
};
```

#### 数据聚合处理器

```typescript
export const dataAggregatorProcessor: TaskProcessor = {
  name: 'data-aggregator',
  
  async execute(params: TaskExecutionParams): Promise<TaskResult> {
    const { data } = params;
    
    try {
      // 提取原始课程数据
      const rawCourses = await extractRawCourseData(data.xnxq);
      
      // 聚合课程数据
      const aggregatedCourses = await aggregateCourseData(rawCourses);
      
      // 验证聚合结果
      const validationResult = await validateAggregatedData(aggregatedCourses);
      
      return {
        success: true,
        data: {
          rawCount: rawCourses.length,
          aggregatedCount: aggregatedCourses.length,
          validationPassed: validationResult.passed
        },
        message: `Aggregated ${aggregatedCourses.length} courses from ${rawCourses.length} raw records`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        retryable: true
      };
    }
  }
};
```

#### 日历创建处理器

```typescript
export const calendarCreatorProcessor: TaskProcessor = {
  name: 'calendar-creator',
  
  async execute(params: TaskExecutionParams): Promise<TaskResult> {
    const { data } = params;
    
    try {
      const results = [];
      
      // 批量创建日历
      for (const course of data.courses) {
        const calendarResult = await createCourseCalendar(course);
        results.push(calendarResult);
        
        // 控制创建频率，避免 API 限流
        await delay(100);
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      return {
        success: failureCount === 0,
        data: {
          total: results.length,
          success: successCount,
          failed: failureCount,
          results
        },
        message: `Created ${successCount} calendars, ${failureCount} failed`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        retryable: true
      };
    }
  }
};
```

## 任务树创建

### 1. 全量同步任务树创建

```typescript
export const createFullSyncTaskTree = async (
  taskAdapter: IcasyncTaskAdapter,
  xnxq: string
): Promise<AdapterResult<TaskTreeInfo>> => {
  try {
    // 创建根任务树
    const taskTree = await taskAdapter.createSyncTaskTree({
      name: `全量同步任务 - ${xnxq}`,
      description: `学年学期 ${xnxq} 的课程数据全量同步`,
      concurrencyMode: 'sequential',
      metadata: { xnxq, syncType: 'full' }
    });
    
    if (!taskTree.success) {
      throw new Error('Failed to create task tree');
    }
    
    const treeId = taskTree.data.id;
    
    // 添加数据准备阶段任务
    await addDataPreparationTasks(taskAdapter, treeId, xnxq);
    
    // 添加课程数据聚合阶段任务
    await addDataAggregationTasks(taskAdapter, treeId, xnxq);
    
    // 添加用户数据同步阶段任务
    await addUserSyncTasks(taskAdapter, treeId);
    
    // 添加日历创建阶段任务
    await addCalendarCreationTasks(taskAdapter, treeId);
    
    // 添加日程同步阶段任务
    await addScheduleSyncTasks(taskAdapter, treeId);
    
    // 添加完成清理阶段任务
    await addCleanupTasks(taskAdapter, treeId);
    
    return taskTree;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'TASK_TREE_CREATION_ERROR',
        message: error.message
      }
    };
  }
};
```

### 2. 任务阶段创建函数

```typescript
const addDataPreparationTasks = async (
  taskAdapter: IcasyncTaskAdapter,
  treeId: string,
  xnxq: string
) => {
  // 创建数据准备阶段父任务
  const preparationPhase = await taskAdapter.addTaskNode(treeId, {
    name: '数据准备阶段',
    method: 'phase-manager',
    executionParams: { phase: 'preparation' }
  });
  
  // 添加子任务
  await taskAdapter.addTaskNode(treeId, {
    name: '验证学期参数',
    parentId: preparationPhase.data.id,
    method: 'data-validator',
    executionParams: { xnxq, validationType: 'xnxq' }
  });
  
  await taskAdapter.addTaskNode(treeId, {
    name: '检查数据库连接',
    parentId: preparationPhase.data.id,
    method: 'data-validator',
    executionParams: { validationType: 'database' }
  });
  
  await taskAdapter.addTaskNode(treeId, {
    name: '清理临时数据',
    parentId: preparationPhase.data.id,
    method: 'cleanup-manager',
    executionParams: { cleanupType: 'temporary' }
  });
};
```

## 任务执行策略

### 1. 执行模式
- **串行执行**：数据准备 → 聚合 → 同步 → 清理
- **并行执行**：同一阶段内的独立任务可并行
- **混合执行**：根据任务依赖关系动态调整

### 2. 错误处理
- **重试策略**：网络错误自动重试，业务错误人工干预
- **回滚机制**：支持部分回滚和完全回滚
- **断点续传**：任务失败后可从断点继续执行

### 3. 监控告警
- **进度监控**：实时显示任务执行进度
- **性能监控**：记录任务执行时间和资源消耗
- **异常告警**：任务失败时发送告警通知

## 任务状态管理

### 1. 状态定义
```typescript
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}
```

### 2. 状态转换
```typescript
export const taskStatusTransitions = {
  [TaskStatus.PENDING]: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
  [TaskStatus.RUNNING]: [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED],
  [TaskStatus.FAILED]: [TaskStatus.RETRYING, TaskStatus.CANCELLED],
  [TaskStatus.RETRYING]: [TaskStatus.RUNNING, TaskStatus.FAILED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: []
};
```

### 3. 状态持久化
- 任务状态实时保存到数据库
- 支持任务状态查询和历史追踪
- 提供状态变更事件通知
