# icasync 任务系统重构设计

## 1. 重构目标

将当前 icasync 的同步流程重构为基于 @stratix/tasks 的现代化任务系统，实现：

- **任务树管理**：清晰的任务依赖关系和执行顺序
- **错误处理**：统一的错误处理和重试机制
- **性能优化**：并行执行和队列管理
- **监控能力**：实时任务状态监控和日志记录
- **可扩展性**：易于添加新的同步任务类型

## 2. 任务架构设计

### 2.1 任务分类体系

```typescript
// 任务类型定义
export enum IcasyncTaskType {
  // === 数据处理任务 ===
  DATA_VALIDATION = 'data_validation',           // 数据验证
  DATA_AGGREGATION = 'data_aggregation',         // 数据聚合
  DATA_CLEANUP = 'data_cleanup',                 // 数据清理
  
  // === 日历管理任务 ===
  CALENDAR_CREATION = 'calendar_creation',       // 日历创建
  CALENDAR_DELETION = 'calendar_deletion',       // 日历删除
  CALENDAR_UPDATE = 'calendar_update',           // 日历更新
  
  // === 参与者管理任务 ===
  PARTICIPANT_ADDITION = 'participant_addition', // 添加参与者
  PARTICIPANT_REMOVAL = 'participant_removal',   // 移除参与者
  PARTICIPANT_SYNC = 'participant_sync',         // 同步参与者
  
  // === 日程管理任务 ===
  SCHEDULE_CREATION = 'schedule_creation',       // 日程创建
  SCHEDULE_DELETION = 'schedule_deletion',       // 日程删除
  SCHEDULE_UPDATE = 'schedule_update',           // 日程更新
  
  // === 状态管理任务 ===
  STATUS_UPDATE = 'status_update',               // 状态更新
  SYNC_COMPLETION = 'sync_completion',           // 同步完成
  REPORT_GENERATION = 'report_generation'       // 报告生成
}
```

### 2.2 全量同步任务树

```typescript
// 全量同步工作流定义
export const FULL_SYNC_WORKFLOW: WorkflowDefinition = {
  name: '全量同步工作流',
  description: '完整的课表数据同步到WPS日历',
  tasks: [
    // === 阶段1：数据准备 ===
    {
      name: 'data-validation',
      type: IcasyncTaskType.DATA_VALIDATION,
      config: { validateConnections: true, validateData: true }
    },
    {
      name: 'data-cleanup',
      type: IcasyncTaskType.DATA_CLEANUP,
      config: { clearExistingData: true },
      dependsOn: ['data-validation']
    },
    {
      name: 'data-aggregation',
      type: IcasyncTaskType.DATA_AGGREGATION,
      config: { useNativeSQL: true, batchSize: 1000 },
      dependsOn: ['data-cleanup']
    },
    
    // === 阶段2：日历管理 ===
    {
      name: 'calendar-cleanup',
      type: IcasyncTaskType.CALENDAR_DELETION,
      config: { deleteAllForSemester: true },
      dependsOn: ['data-aggregation']
    },
    {
      name: 'calendar-creation',
      type: IcasyncTaskType.CALENDAR_CREATION,
      config: { batchSize: 50, parallel: true },
      dependsOn: ['calendar-cleanup']
    },
    
    // === 阶段3：参与者管理 ===
    {
      name: 'participant-management',
      type: IcasyncTaskType.PARTICIPANT_ADDITION,
      config: { batchSize: 100, parallel: true },
      dependsOn: ['calendar-creation']
    },
    
    // === 阶段4：日程创建 ===
    {
      name: 'schedule-creation',
      type: IcasyncTaskType.SCHEDULE_CREATION,
      config: { batchSize: 200, parallel: true },
      dependsOn: ['participant-management']
    },
    
    // === 阶段5：完成处理 ===
    {
      name: 'status-update',
      type: IcasyncTaskType.STATUS_UPDATE,
      config: { markAsCompleted: true },
      dependsOn: ['schedule-creation']
    },
    {
      name: 'sync-completion',
      type: IcasyncTaskType.SYNC_COMPLETION,
      config: { generateReport: true, sendNotification: true },
      dependsOn: ['status-update']
    }
  ],
  options: {
    parallel: false,  // 阶段间串行执行
    timeout: 1800000, // 30分钟超时
    retries: 3
  }
};
```

### 2.3 增量同步任务树

```typescript
// 增量同步工作流定义
export const INCREMENTAL_SYNC_WORKFLOW: WorkflowDefinition = {
  name: '增量同步工作流',
  description: '检测变更并同步到WPS日历',
  tasks: [
    // === 阶段1：变更检测 ===
    {
      name: 'change-detection',
      type: IcasyncTaskType.DATA_VALIDATION,
      config: { detectChanges: true, compareWithExisting: true }
    },
    
    // === 阶段2：删除处理 ===
    {
      name: 'handle-deletions',
      type: IcasyncTaskType.SCHEDULE_DELETION,
      config: { processDeletedCourses: true },
      dependsOn: ['change-detection']
    },
    {
      name: 'remove-participants',
      type: IcasyncTaskType.PARTICIPANT_REMOVAL,
      config: { processRemovedParticipants: true },
      dependsOn: ['change-detection']
    },
    
    // === 阶段3：更新处理 ===
    {
      name: 'update-aggregation',
      type: IcasyncTaskType.DATA_AGGREGATION,
      config: { incrementalMode: true },
      dependsOn: ['handle-deletions', 'remove-participants']
    },
    {
      name: 'update-calendars',
      type: IcasyncTaskType.CALENDAR_UPDATE,
      config: { updateModifiedOnly: true },
      dependsOn: ['update-aggregation']
    },
    {
      name: 'update-schedules',
      type: IcasyncTaskType.SCHEDULE_UPDATE,
      config: { updateModifiedOnly: true },
      dependsOn: ['update-calendars']
    },
    
    // === 阶段4：新增处理 ===
    {
      name: 'create-new-calendars',
      type: IcasyncTaskType.CALENDAR_CREATION,
      config: { createNewOnly: true },
      dependsOn: ['update-aggregation']
    },
    {
      name: 'add-new-participants',
      type: IcasyncTaskType.PARTICIPANT_ADDITION,
      config: { addNewOnly: true },
      dependsOn: ['create-new-calendars']
    },
    {
      name: 'create-new-schedules',
      type: IcasyncTaskType.SCHEDULE_CREATION,
      config: { createNewOnly: true },
      dependsOn: ['add-new-participants']
    },
    
    // === 阶段5：完成处理 ===
    {
      name: 'incremental-completion',
      type: IcasyncTaskType.SYNC_COMPLETION,
      config: { incrementalMode: true, generateChangeReport: true },
      dependsOn: ['update-schedules', 'create-new-schedules']
    }
  ],
  options: {
    parallel: true,   // 支持并行执行
    timeout: 600000,  // 10分钟超时
    retries: 2
  }
};
```

## 3. 任务处理器实现

### 3.1 任务处理器接口

```typescript
// 统一的任务处理器接口
export interface IcasyncTaskProcessor {
  readonly name: string;
  readonly type: IcasyncTaskType;
  readonly supportsBatch: boolean;
  readonly supportsParallel: boolean;
  
  execute(context: TaskExecutionContext): Promise<TaskExecutionResult>;
  validate(config: TaskConfig): Promise<ValidationResult>;
  estimateProgress(context: TaskExecutionContext): Promise<number>;
}

// 任务执行上下文
export interface TaskExecutionContext {
  taskId: string;
  workflowId: string;
  config: TaskConfig;
  data: Record<string, any>;
  dependencies: TaskExecutionResult[];
  logger: Logger;
  services: IcasyncServices;
}

// 任务执行结果
export interface TaskExecutionResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  progress: number;
  metrics: TaskMetrics;
  nextTasks?: string[];
}
```

### 3.2 核心任务处理器示例

```typescript
// 数据聚合任务处理器
export class DataAggregationProcessor implements IcasyncTaskProcessor {
  readonly name = 'DataAggregationProcessor';
  readonly type = IcasyncTaskType.DATA_AGGREGATION;
  readonly supportsBatch = true;
  readonly supportsParallel = false;

  async execute(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { config, data, logger, services } = context;
    const { xnxq, useNativeSQL, batchSize } = config;

    try {
      logger.info('开始执行数据聚合任务', { xnxq, useNativeSQL });

      let result;
      if (useNativeSQL) {
        // 使用原生 SQL 聚合
        result = await services.courseRawRepository.aggregateCourseDataWithSql(
          xnxq,
          services.juheRenwuRepository
        );
      } else {
        // 使用应用层聚合
        result = await services.courseScheduleSyncService.aggregateCourseDataFallback(xnxq);
      }

      if (result.success) {
        return {
          success: true,
          data: { aggregatedCount: result.data.count },
          progress: 100,
          metrics: {
            duration: Date.now() - context.startTime,
            recordsProcessed: result.data.count,
            memoryUsed: process.memoryUsage().heapUsed
          }
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('数据聚合任务失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        progress: 0,
        metrics: {
          duration: Date.now() - context.startTime,
          recordsProcessed: 0,
          memoryUsed: process.memoryUsage().heapUsed
        }
      };
    }
  }

  async validate(config: TaskConfig): Promise<ValidationResult> {
    const { xnxq } = config;
    
    if (!xnxq || !/^\d{4}-\d{4}-[12]$/.test(xnxq)) {
      return {
        valid: false,
        errors: ['Invalid xnxq format']
      };
    }

    return { valid: true };
  }

  async estimateProgress(context: TaskExecutionContext): Promise<number> {
    // 基于已处理记录数估算进度
    const { data } = context;
    const totalRecords = data.totalRecords || 1;
    const processedRecords = data.processedRecords || 0;
    
    return Math.min(100, (processedRecords / totalRecords) * 100);
  }
}
```

## 4. 服务层重构

### 4.1 任务编排服务

```typescript
// 任务编排服务
export class IcasyncTaskOrchestrator {
  constructor(
    private readonly workflowAdapter: IWorkflowAdapter,
    private readonly taskProcessors: Map<IcasyncTaskType, IcasyncTaskProcessor>,
    private readonly logger: Logger
  ) {}

  /**
   * 执行全量同步
   */
  async executeFullSync(xnxq: string, config?: SyncConfig): Promise<WorkflowExecutionResult> {
    const workflowDef = {
      ...FULL_SYNC_WORKFLOW,
      name: `全量同步-${xnxq}-${Date.now()}`,
      tasks: FULL_SYNC_WORKFLOW.tasks.map(task => ({
        ...task,
        config: { ...task.config, xnxq, ...config }
      }))
    };

    // 创建工作流
    const workflowResult = await this.workflowAdapter.createWorkflow(workflowDef);
    if (!workflowResult.success) {
      throw new Error(`创建全量同步工作流失败: ${workflowResult.error}`);
    }

    // 启动执行
    const executionResult = await this.workflowAdapter.executeWorkflow(
      workflowResult.data.id,
      {
        timeout: config?.timeout || 1800000,
        retries: config?.retries || 3
      }
    );

    if (!executionResult.success) {
      throw new Error(`启动全量同步失败: ${executionResult.error}`);
    }

    return {
      workflowId: workflowResult.data.id,
      success: true,
      startedAt: new Date()
    };
  }

  /**
   * 执行增量同步
   */
  async executeIncrementalSync(xnxq: string, config?: SyncConfig): Promise<WorkflowExecutionResult> {
    const workflowDef = {
      ...INCREMENTAL_SYNC_WORKFLOW,
      name: `增量同步-${xnxq}-${Date.now()}`,
      tasks: INCREMENTAL_SYNC_WORKFLOW.tasks.map(task => ({
        ...task,
        config: { ...task.config, xnxq, ...config }
      }))
    };

    // 创建工作流
    const workflowResult = await this.workflowAdapter.createWorkflow(workflowDef);
    if (!workflowResult.success) {
      throw new Error(`创建增量同步工作流失败: ${workflowResult.error}`);
    }

    // 启动执行
    const executionResult = await this.workflowAdapter.executeWorkflow(
      workflowResult.data.id,
      {
        timeout: config?.timeout || 600000,
        retries: config?.retries || 2,
        parallel: true
      }
    );

    if (!executionResult.success) {
      throw new Error(`启动增量同步失败: ${executionResult.error}`);
    }

    return {
      workflowId: workflowResult.data.id,
      success: true,
      startedAt: new Date()
    };
  }

  /**
   * 监控工作流执行
   */
  async monitorWorkflow(workflowId: string): Promise<() => void> {
    const monitorResult = await this.workflowAdapter.monitorWorkflow(
      workflowId,
      (status: WorkflowStatus) => {
        this.logger.info('工作流状态更新', {
          workflowId,
          status: status.status,
          progress: status.progress,
          completedTasks: status.completedTasks,
          totalTasks: status.totalTasks
        });

        // 可以在这里添加更多的监控逻辑
        // 比如发送通知、更新数据库状态等
      }
    );

    if (!monitorResult.success) {
      throw new Error(`启动工作流监控失败: ${monitorResult.error}`);
    }

    return monitorResult.data; // 返回停止监控的函数
  }
}
```

## 5. 错误处理和重试策略

### 5.1 错误分类

```typescript
// 错误分类
export enum IcasyncErrorType {
  VALIDATION_ERROR = 'validation_error',     // 验证错误
  DATABASE_ERROR = 'database_error',         // 数据库错误
  WPS_API_ERROR = 'wps_api_error',          // WPS API 错误
  NETWORK_ERROR = 'network_error',           // 网络错误
  BUSINESS_LOGIC_ERROR = 'business_logic_error', // 业务逻辑错误
  SYSTEM_ERROR = 'system_error'              // 系统错误
}

// 重试策略配置
export const RETRY_STRATEGIES: Record<IcasyncErrorType, RetryStrategy> = {
  [IcasyncErrorType.VALIDATION_ERROR]: { maxRetries: 0, retryable: false },
  [IcasyncErrorType.DATABASE_ERROR]: { maxRetries: 3, retryable: true, backoff: 'exponential' },
  [IcasyncErrorType.WPS_API_ERROR]: { maxRetries: 5, retryable: true, backoff: 'linear' },
  [IcasyncErrorType.NETWORK_ERROR]: { maxRetries: 3, retryable: true, backoff: 'exponential' },
  [IcasyncErrorType.BUSINESS_LOGIC_ERROR]: { maxRetries: 1, retryable: true },
  [IcasyncErrorType.SYSTEM_ERROR]: { maxRetries: 2, retryable: true }
};
```

## 6. 性能优化策略

### 6.1 并行执行优化

```typescript
// 并行执行配置
export const PARALLEL_EXECUTION_CONFIG = {
  // 日历创建：按课程并行
  calendar_creation: {
    maxConcurrency: 10,
    batchSize: 50,
    strategy: 'course_based'
  },
  
  // 参与者管理：按日历并行
  participant_addition: {
    maxConcurrency: 20,
    batchSize: 100,
    strategy: 'calendar_based'
  },
  
  // 日程创建：按时间段并行
  schedule_creation: {
    maxConcurrency: 15,
    batchSize: 200,
    strategy: 'time_based'
  }
};
```

### 6.2 资源管理

```typescript
// 资源使用监控
export interface ResourceMonitor {
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  apiCallsPerMinute: number;
}

// 自适应批处理大小
export class AdaptiveBatchSizer {
  adjustBatchSize(
    currentBatchSize: number,
    resourceMonitor: ResourceMonitor,
    taskType: IcasyncTaskType
  ): number {
    // 根据资源使用情况动态调整批处理大小
    if (resourceMonitor.memoryUsage > 0.8) {
      return Math.max(10, currentBatchSize * 0.7);
    }
    
    if (resourceMonitor.apiCallsPerMinute > 1000) {
      return Math.max(5, currentBatchSize * 0.5);
    }
    
    if (resourceMonitor.memoryUsage < 0.5 && resourceMonitor.cpuUsage < 0.6) {
      return Math.min(500, currentBatchSize * 1.2);
    }
    
    return currentBatchSize;
  }
}
```

## 7. 使用示例和集成指南

### 7.1 基本使用示例

```typescript
// 在 icasync 应用中集成任务系统
import { TaskSystemBootstrap } from './tasks/TaskSystemBootstrap.js';
import { createWorkflowAdapter } from '@stratix/tasks';

// 1. 创建工作流适配器
const workflowAdapter = createWorkflowAdapter({
  type: 'memory', // 或 'redis', 'database'
  config: {}
});

// 2. 准备服务依赖
const services = {
  courseRawRepository,
  juheRenwuRepository,
  calendarSyncService,
  // ... 其他服务
};

// 3. 初始化任务系统
const taskSystem = new TaskSystemBootstrap(
  workflowAdapter,
  services,
  logger
);

const orchestrator = await taskSystem.initialize();

// 4. 执行全量同步
const fullSyncResult = await orchestrator.executeFullSync('2024-2025-1', {
  timeout: 1800000,
  retries: 3,
  batchSize: 100
});

console.log('全量同步启动:', fullSyncResult);

// 5. 监控工作流状态
const status = await orchestrator.getWorkflowStatus(fullSyncResult.workflowId);
console.log('工作流状态:', status);

// 6. 执行增量同步
const incrementalResult = await orchestrator.executeIncrementalSync('2024-2025-1', {
  parallel: true,
  maxConcurrency: 10
});

console.log('增量同步启动:', incrementalResult);
```

### 7.2 在现有 Service 中集成

```typescript
// 更新 CourseScheduleSyncService
export class CourseScheduleSyncService {
  constructor(
    private readonly taskOrchestrator: TaskOrchestrator,
    // ... 其他依赖
  ) {}

  /**
   * 使用任务系统执行全量同步
   */
  async executeFullSyncWithTasks(xnxq: string): Promise<SyncResult> {
    try {
      // 启动任务工作流
      const workflowResult = await this.taskOrchestrator.executeFullSync(xnxq, {
        timeout: 1800000,
        retries: 3
      });

      if (!workflowResult.success) {
        throw new Error(workflowResult.error);
      }

      // 等待工作流完成
      return await this.waitForWorkflowCompletion(workflowResult.workflowId);
    } catch (error) {
      this.logger.error('任务系统全量同步失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 等待工作流完成
   */
  private async waitForWorkflowCompletion(workflowId: string): Promise<SyncResult> {
    const maxWaitTime = 3600000; // 1小时
    const checkInterval = 5000;  // 5秒
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.taskOrchestrator.getWorkflowStatus(workflowId);

      if (!status) {
        throw new Error('无法获取工作流状态');
      }

      if (status.status === 'completed') {
        return {
          success: true,
          message: '同步完成',
          data: status.result
        };
      }

      if (status.status === 'failed') {
        throw new Error(`工作流执行失败: ${status.error}`);
      }

      // 等待下次检查
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('工作流执行超时');
  }
}
```

### 7.3 Controller 层集成

```typescript
// 更新 SyncController
export class SyncController {
  constructor(
    private readonly taskOrchestrator: TaskOrchestrator,
    // ... 其他依赖
  ) {}

  /**
   * 启动全量同步任务
   */
  @Post('/sync/full/:xnxq')
  async startFullSync(
    @Param('xnxq') xnxq: string,
    @Body() config?: SyncConfig
  ): Promise<ApiResponse<WorkflowExecutionResult>> {
    try {
      const result = await this.taskOrchestrator.executeFullSync(xnxq, config);

      return {
        success: true,
        data: result,
        message: '全量同步任务已启动'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '启动全量同步任务失败'
      };
    }
  }

  /**
   * 启动增量同步任务
   */
  @Post('/sync/incremental/:xnxq')
  async startIncrementalSync(
    @Param('xnxq') xnxq: string,
    @Body() config?: SyncConfig
  ): Promise<ApiResponse<WorkflowExecutionResult>> {
    try {
      const result = await this.taskOrchestrator.executeIncrementalSync(xnxq, config);

      return {
        success: true,
        data: result,
        message: '增量同步任务已启动'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '启动增量同步任务失败'
      };
    }
  }

  /**
   * 获取工作流状态
   */
  @Get('/sync/status/:workflowId')
  async getWorkflowStatus(
    @Param('workflowId') workflowId: string
  ): Promise<ApiResponse<WorkflowStatus>> {
    try {
      const status = await this.taskOrchestrator.getWorkflowStatus(workflowId);

      if (!status) {
        return {
          success: false,
          error: '工作流不存在',
          message: '未找到指定的工作流'
        };
      }

      return {
        success: true,
        data: status,
        message: '获取工作流状态成功'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '获取工作流状态失败'
      };
    }
  }

  /**
   * 停止工作流
   */
  @Post('/sync/stop/:workflowId')
  async stopWorkflow(
    @Param('workflowId') workflowId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const result = await this.taskOrchestrator.stopWorkflow(workflowId);

      return {
        success: result,
        data: result,
        message: result ? '工作流已停止' : '停止工作流失败'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '停止工作流失败'
      };
    }
  }

  /**
   * 获取活跃工作流列表
   */
  @Get('/sync/active')
  async getActiveWorkflows(): Promise<ApiResponse<string[]>> {
    try {
      const activeWorkflows = this.taskOrchestrator.getActiveWorkflows();

      return {
        success: true,
        data: activeWorkflows,
        message: '获取活跃工作流列表成功'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '获取活跃工作流列表失败'
      };
    }
  }
}
```

## 8. 迁移策略

### 8.1 渐进式迁移

```typescript
// 阶段1：保持现有接口，内部使用任务系统
export class CourseScheduleSyncService {
  constructor(
    private readonly taskOrchestrator?: TaskOrchestrator, // 可选依赖
    // ... 现有依赖
  ) {}

  async aggregateCourseData(xnxq: string): Promise<SyncResult> {
    // 如果任务系统可用，使用新方式
    if (this.taskOrchestrator) {
      return await this.aggregateWithTaskSystem(xnxq);
    }

    // 否则使用原有方式
    return await this.aggregateWithLegacyMethod(xnxq);
  }

  private async aggregateWithTaskSystem(xnxq: string): Promise<SyncResult> {
    // 使用任务系统的实现
  }

  private async aggregateWithLegacyMethod(xnxq: string): Promise<SyncResult> {
    // 原有的实现逻辑
  }
}
```

### 8.2 配置驱动的切换

```typescript
// 通过配置控制是否启用任务系统
const config = {
  taskSystem: {
    enabled: process.env.TASK_SYSTEM_ENABLED === 'true',
    fallbackToLegacy: true
  }
};

// 在服务中根据配置选择执行方式
if (config.taskSystem.enabled) {
  await this.executeWithTaskSystem(xnxq);
} else {
  await this.executeWithLegacyMethod(xnxq);
}
```

## 9. 总结

这个任务系统重构设计提供了：

1. **清晰的任务分类**：按功能领域划分任务类型
2. **完整的工作流定义**：全量和增量同步的详细任务树
3. **统一的任务处理器接口**：标准化的任务执行模式
4. **强大的错误处理**：分类错误处理和重试策略
5. **性能优化**：并行执行和自适应批处理
6. **监控能力**：实时状态监控和资源管理
7. **渐进式迁移**：支持与现有系统的平滑过渡

通过这个重构，icasync 项目将获得：
- **更好的可维护性**：清晰的任务分离和标准化接口
- **更强的可扩展性**：易于添加新的同步任务类型
- **更高的可靠性**：统一的错误处理和重试机制
- **更优的性能**：并行执行和资源优化
- **更强的监控能力**：实时状态跟踪和性能指标
