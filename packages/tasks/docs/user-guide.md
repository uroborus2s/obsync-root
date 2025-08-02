# @stratix/tasks 使用指南

## 📋 快速开始

### 1. 安装

```bash
# 使用 npm
npm install @stratix/tasks

# 使用 pnpm
pnpm add @stratix/tasks

# 使用 yarn
yarn add @stratix/tasks
```

### 2. 基础配置

```typescript
// stratix.config.ts
import { createStratixConfig } from '@stratix/core';
import tasksPlugin from '@stratix/tasks';
import databasePlugin from '@stratix/database';

export default createStratixConfig({
  plugins: [
    // 数据库插件（必需）
    [databasePlugin, {
      connections: {
        default: {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'workflows',
          username: 'root',
          password: 'password'
        }
      }
    }],
    
    // 工作流插件
    [tasksPlugin, {
      // 插件配置选项
      autoStart: true,
      maxConcurrentWorkflows: 100,
      taskTimeout: 300000, // 5分钟
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential'
      }
    }]
  ]
});
```

### 3. 启动应用

```typescript
// app.ts
import { createStratixApp } from '@stratix/core';
import config from './stratix.config.js';

const app = createStratixApp(config);

await app.start();
console.log('🚀 Stratix 应用启动成功');
```

## 🔧 工作流定义

### 1. 创建工作流定义

在 `workflows/definitions/` 目录下创建工作流定义文件：

```typescript
// workflows/definitions/data-processing.ts
import { WorkflowDefinition, TaskType } from '@stratix/tasks';

export const dataProcessingWorkflow: WorkflowDefinition = {
  id: 'data-processing-v1',
  name: 'Data Processing Pipeline',
  version: '1.0.0',
  description: '数据处理管道工作流',
  
  // 工作流变量
  variables: {
    batchSize: 1000,
    timeout: 300000
  },
  
  // 任务定义
  tasks: [
    {
      id: 'validate',
      name: '数据验证',
      type: TaskType.EXECUTOR,
      executor: 'data-validator',
      parameters: {
        schema: 'user-data-schema',
        strictMode: true
      },
      timeout: 60000,
      retryPolicy: {
        maxAttempts: 2,
        backoffStrategy: 'fixed',
        delay: 5000
      }
    },
    {
      id: 'transform',
      name: '数据转换',
      type: TaskType.EXECUTOR,
      executor: 'data-transformer',
      dependencies: ['validate'],
      parameters: {
        outputFormat: 'json',
        compression: true
      }
    },
    {
      id: 'parallel-processing',
      name: '并行处理',
      type: TaskType.PARALLEL,
      dependencies: ['transform'],
      tasks: [
        {
          id: 'save-database',
          name: '保存到数据库',
          type: TaskType.EXECUTOR,
          executor: 'database-saver'
        },
        {
          id: 'save-file',
          name: '保存到文件',
          type: TaskType.EXECUTOR,
          executor: 'file-saver'
        }
      ]
    },
    {
      id: 'notify',
      name: '发送通知',
      type: TaskType.EXECUTOR,
      executor: 'notification-sender',
      dependencies: ['parallel-processing'],
      condition: '${workflow.status} === "completed"'
    }
  ],
  
  // 触发器配置
  triggers: [
    {
      type: 'cron',
      config: {
        cron: '0 2 * * *', // 每天凌晨2点
        timezone: 'Asia/Shanghai'
      }
    },
    {
      type: 'event',
      config: {
        eventType: 'file.uploaded',
        filter: {
          fileType: 'csv',
          size: { $lt: 100000000 } // 小于100MB
        }
      }
    }
  ],
  
  // 错误处理
  onError: {
    strategy: 'retry',
    maxAttempts: 3,
    notifyOnFailure: true
  }
};

// 导出工作流定义（自动发现机制会扫描此导出）
export default dataProcessingWorkflow;
```

### 2. 条件和分支

```typescript
// workflows/definitions/conditional-workflow.ts
export const conditionalWorkflow: WorkflowDefinition = {
  id: 'conditional-processing',
  name: 'Conditional Processing',
  version: '1.0.0',
  
  tasks: [
    {
      id: 'check-file-size',
      name: '检查文件大小',
      type: TaskType.CONDITION,
      condition: '${input.fileSize} > 1000000', // 大于1MB
      onTrue: ['large-file-processing'],
      onFalse: ['small-file-processing']
    },
    {
      id: 'large-file-processing',
      name: '大文件处理',
      type: TaskType.EXECUTOR,
      executor: 'large-file-processor'
    },
    {
      id: 'small-file-processing',
      name: '小文件处理',
      type: TaskType.EXECUTOR,
      executor: 'small-file-processor'
    },
    {
      id: 'finalize',
      name: '完成处理',
      type: TaskType.EXECUTOR,
      executor: 'finalizer',
      dependencies: ['large-file-processing', 'small-file-processing'],
      dependencyType: 'any' // 任意一个依赖完成即可执行
    }
  ]
};
```

### 3. 子工作流

```typescript
// workflows/definitions/main-workflow.ts
export const mainWorkflow: WorkflowDefinition = {
  id: 'main-workflow',
  name: 'Main Workflow',
  version: '1.0.0',
  
  tasks: [
    {
      id: 'prepare',
      name: '准备阶段',
      type: TaskType.EXECUTOR,
      executor: 'data-preparer'
    },
    {
      id: 'sub-workflow',
      name: '子工作流处理',
      type: TaskType.SUB_WORKFLOW,
      workflowId: 'data-processing-v1',
      dependencies: ['prepare'],
      input: {
        sourceData: '${tasks.prepare.output.data}',
        batchSize: '${workflow.variables.batchSize}'
      }
    },
    {
      id: 'cleanup',
      name: '清理阶段',
      type: TaskType.EXECUTOR,
      executor: 'data-cleaner',
      dependencies: ['sub-workflow']
    }
  ]
};
```

## ⚙️ 任务执行器

### 1. 创建执行器

在 `workflows/executors/` 目录下创建执行器：

```typescript
// workflows/executors/data-validator.ts
import { TaskExecutor, ExecutionContext, TaskResult } from '@stratix/tasks';

interface ValidatorInput {
  data: any[];
  schema: string;
  strictMode?: boolean;
}

interface ValidatorOutput {
  validRecords: any[];
  invalidRecords: any[];
  validationReport: {
    totalRecords: number;
    validCount: number;
    invalidCount: number;
    errors: string[];
  };
}

export class DataValidatorExecutor implements TaskExecutor<ValidatorInput, ValidatorOutput> {
  name = 'data-validator';
  
  async execute(
    input: ValidatorInput, 
    context: ExecutionContext
  ): Promise<TaskResult<ValidatorOutput>> {
    const { data, schema, strictMode = false } = input;
    const { logger } = context;
    
    logger.info(`开始验证 ${data.length} 条记录`);
    
    try {
      const validRecords: any[] = [];
      const invalidRecords: any[] = [];
      const errors: string[] = [];
      
      // 获取验证模式
      const validationSchema = await this.getValidationSchema(schema);
      
      // 验证每条记录
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        const validation = await this.validateRecord(record, validationSchema, strictMode);
        
        if (validation.isValid) {
          validRecords.push(record);
        } else {
          invalidRecords.push({
            record,
            errors: validation.errors,
            index: i
          });
          errors.push(...validation.errors);
        }
        
        // 报告进度
        if (i % 1000 === 0) {
          context.reportProgress((i / data.length) * 100);
        }
      }
      
      const result = {
        validRecords,
        invalidRecords,
        validationReport: {
          totalRecords: data.length,
          validCount: validRecords.length,
          invalidCount: invalidRecords.length,
          errors: [...new Set(errors)] // 去重
        }
      };
      
      logger.info(`验证完成: ${validRecords.length} 有效, ${invalidRecords.length} 无效`);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - context.startTime,
          memoryUsage: process.memoryUsage().heapUsed
        }
      };
      
    } catch (error) {
      logger.error('数据验证失败:', error);
      
      return {
        success: false,
        error: {
          message: '数据验证执行失败',
          code: 'VALIDATION_EXECUTION_ERROR',
          details: error
        }
      };
    }
  }
  
  private async getValidationSchema(schemaName: string): Promise<any> {
    // 从配置或数据库获取验证模式
    // 这里是示例实现
    return {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        email: { type: 'string', format: 'email' }
      }
    };
  }
  
  private async validateRecord(record: any, schema: any, strictMode: boolean): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    // 实现具体的验证逻辑
    const errors: string[] = [];
    
    // 示例验证逻辑
    if (!record.id) {
      errors.push('缺少必需字段: id');
    }
    
    if (!record.name) {
      errors.push('缺少必需字段: name');
    }
    
    if (record.email && !this.isValidEmail(record.email)) {
      errors.push('邮箱格式无效');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// 导出执行器（自动发现机制会扫描此导出）
export default DataValidatorExecutor;
```

### 2. 异步执行器

```typescript
// workflows/executors/file-processor.ts
import { TaskExecutor, ExecutionContext, TaskResult } from '@stratix/tasks';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

export class FileProcessorExecutor implements TaskExecutor {
  name = 'file-processor';
  
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    const { filePath, outputPath } = input;
    const { logger, signal } = context;
    
    try {
      // 支持取消操作
      if (signal.aborted) {
        throw new Error('任务已被取消');
      }
      
      logger.info(`开始处理文件: ${filePath}`);
      
      // 创建文件流处理管道
      await pipeline(
        createReadStream(filePath),
        // 自定义转换流
        this.createTransformStream(context),
        // 输出流
        this.createOutputStream(outputPath),
        { signal } // 支持取消
      );
      
      logger.info(`文件处理完成: ${outputPath}`);
      
      return {
        success: true,
        data: {
          outputPath,
          processedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn('文件处理被取消');
        return {
          success: false,
          error: {
            message: '任务被取消',
            code: 'TASK_CANCELLED'
          }
        };
      }
      
      throw error;
    }
  }
  
  private createTransformStream(context: ExecutionContext) {
    // 实现自定义转换流
    // 支持进度报告和取消操作
  }
  
  private createOutputStream(outputPath: string) {
    // 实现输出流
  }
}
```

### 3. 有状态执行器

```typescript
// workflows/executors/batch-processor.ts
export class BatchProcessorExecutor implements TaskExecutor {
  name = 'batch-processor';
  
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    const { items, batchSize = 100 } = input;
    const { logger } = context;
    
    const results = [];
    const batches = this.createBatches(items, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      logger.info(`处理批次 ${i + 1}/${batches.length}`);
      
      // 处理批次
      const batchResult = await this.processBatch(batch, context);
      results.push(batchResult);
      
      // 报告进度
      context.reportProgress(((i + 1) / batches.length) * 100);
      
      // 保存中间状态（支持断点续传）
      await context.saveCheckpoint({
        completedBatches: i + 1,
        results: results
      });
      
      // 检查是否需要暂停
      if (context.isPaused()) {
        logger.info('任务暂停，保存当前状态');
        return {
          success: true,
          data: { 
            status: 'paused',
            checkpoint: {
              completedBatches: i + 1,
              totalBatches: batches.length
            }
          }
        };
      }
    }
    
    return {
      success: true,
      data: {
        status: 'completed',
        results,
        totalProcessed: items.length
      }
    };
  }
  
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  private async processBatch(batch: any[], context: ExecutionContext): Promise<any> {
    // 实现批次处理逻辑
    return batch.map(item => ({ ...item, processed: true }));
  }
}
```

## 🚀 启动和管理工作流

### 1. 编程方式启动

```typescript
// services/workflow-service.ts
import { WorkflowManager } from '@stratix/tasks';

export class MyWorkflowService {
  constructor(private workflowManager: WorkflowManager) {}
  
  async processUserData(userData: any[]): Promise<string> {
    // 启动数据处理工作流
    const instanceId = await this.workflowManager.startWorkflow(
      'data-processing-v1',
      {
        data: userData,
        batchSize: 1000,
        outputFormat: 'json'
      },
      {
        priority: 5,
        correlationId: `user-data-${Date.now()}`,
        timeout: 3600000 // 1小时超时
      }
    );
    
    return instanceId;
  }
  
  async monitorWorkflow(instanceId: string): Promise<void> {
    // 监听工作流状态变化
    this.workflowManager.onStatusChange(instanceId, (status, instance) => {
      console.log(`工作流 ${instanceId} 状态变化: ${status}`);
      
      if (status === 'completed') {
        console.log('工作流完成，结果:', instance.output);
      } else if (status === 'failed') {
        console.error('工作流失败:', instance.error);
      }
    });
  }
}
```

### 2. REST API 启动

```bash
# 启动工作流
curl -X POST http://localhost:3000/api/workflows/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "definitionId": "data-processing-v1",
    "input": {
      "sourceFile": "/data/users.csv",
      "targetTable": "processed_users"
    },
    "priority": 5
  }'
```

### 3. 调度启动

```typescript
// 创建定时调度
await workflowManager.createSchedule({
  definitionId: 'data-processing-v1',
  name: '每日用户数据处理',
  triggerType: 'cron',
  triggerConfig: {
    cron: '0 2 * * *', // 每天凌晨2点
    timezone: 'Asia/Shanghai'
  },
  input: {
    sourceFile: '/data/daily/users-${date}.csv',
    targetTable: 'daily_users'
  }
});
```

## 📊 监控和调试

### 1. 工作流状态监控

```typescript
// 获取工作流实例状态
const instance = await workflowManager.getInstance('wf-inst-001');
console.log('工作流状态:', instance.status);
console.log('进度:', instance.progress);

// 获取任务列表
const tasks = await workflowManager.getTasks('wf-inst-001');
tasks.forEach(task => {
  console.log(`任务 ${task.name}: ${task.status}`);
});

// 获取执行历史
const history = await workflowManager.getExecutionHistory('wf-inst-001');
history.forEach(event => {
  console.log(`${event.createdAt}: ${event.eventType} - ${event.message}`);
});
```

### 2. 实时监控

```typescript
// WebSocket 实时监控
import { WorkflowMonitor } from '@stratix/tasks/client';

const monitor = new WorkflowMonitor({
  baseUrl: 'ws://localhost:3000/api/workflows/monitor'
});

// 监听特定工作流
monitor.watch('wf-inst-001', {
  onStatusChange: (status) => {
    console.log('状态变化:', status);
  },
  onTaskCompleted: (task) => {
    console.log('任务完成:', task.name);
  },
  onProgress: (progress) => {
    console.log('进度更新:', progress.percentage + '%');
  }
});
```

### 3. 性能监控

```typescript
// 获取性能指标
const metrics = await workflowManager.getPerformanceMetrics({
  definitionId: 'data-processing-v1',
  period: '7d'
});

console.log('平均执行时间:', metrics.averageDuration);
console.log('成功率:', metrics.successRate);
console.log('吞吐量:', metrics.throughput);
```

## 🔧 高级功能

### 1. 自定义中间件

```typescript
// workflows/middleware/auth-middleware.ts
import { WorkflowMiddleware, ExecutionContext } from '@stratix/tasks';

export class AuthMiddleware implements WorkflowMiddleware {
  async beforeWorkflow(context: ExecutionContext): Promise<void> {
    // 工作流执行前的认证检查
    const { input, variables } = context;

    if (!input.userId) {
      throw new Error('缺少用户ID');
    }

    const user = await this.getUserById(input.userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 将用户信息添加到上下文
    context.setVariable('currentUser', user);
  }

  async beforeTask(taskId: string, context: ExecutionContext): Promise<void> {
    // 任务执行前的权限检查
    const user = context.getVariable('currentUser');
    const hasPermission = await this.checkTaskPermission(user, taskId);

    if (!hasPermission) {
      throw new Error(`用户 ${user.id} 没有执行任务 ${taskId} 的权限`);
    }
  }

  async afterTask(taskId: string, result: any, context: ExecutionContext): Promise<void> {
    // 任务执行后的审计日志
    const user = context.getVariable('currentUser');
    await this.logTaskExecution(user.id, taskId, result);
  }

  private async getUserById(userId: string): Promise<any> {
    // 实现用户查询逻辑
  }

  private async checkTaskPermission(user: any, taskId: string): Promise<boolean> {
    // 实现权限检查逻辑
  }

  private async logTaskExecution(userId: string, taskId: string, result: any): Promise<void> {
    // 实现审计日志记录
  }
}
```

### 2. 自定义条件表达式

```typescript
// workflows/conditions/custom-conditions.ts
import { ConditionEvaluator } from '@stratix/tasks';

export class CustomConditionEvaluator implements ConditionEvaluator {
  evaluate(expression: string, context: any): boolean {
    // 支持自定义条件语法
    switch (expression) {
      case 'is_business_hours':
        return this.isBusinessHours();

      case 'is_weekend':
        return this.isWeekend();

      case 'file_size_large':
        return context.input.fileSize > 10 * 1024 * 1024; // 10MB

      default:
        // 使用默认的表达式求值器
        return this.evaluateDefaultExpression(expression, context);
    }
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // 工作日的9-18点
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }

  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  private evaluateDefaultExpression(expression: string, context: any): boolean {
    // 实现默认表达式求值逻辑
    // 支持 JavaScript 表达式、JSONPath 等
    return true;
  }
}
```
