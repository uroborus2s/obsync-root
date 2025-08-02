# @stratix/tasks 最佳实践指南

## 📋 概述

本文档提供了使用 @stratix/tasks 工作流引擎的最佳实践建议，帮助开发者构建高效、可靠、可维护的工作流系统。

## 🏗️ 工作流设计原则

### 1. 单一职责原则

**每个任务应该只负责一个明确的功能：**

```typescript
// ❌ 不好的设计 - 任务职责过多
const badTask: TaskDefinition = {
  id: 'process-everything',
  name: '处理所有数据',
  type: TaskType.EXECUTOR,
  executor: 'everything-processor' // 验证、转换、保存都在一个执行器中
};

// ✅ 好的设计 - 职责分离
const goodTasks: TaskDefinition[] = [
  {
    id: 'validate',
    name: '数据验证',
    type: TaskType.EXECUTOR,
    executor: 'data-validator'
  },
  {
    id: 'transform',
    name: '数据转换',
    type: TaskType.EXECUTOR,
    executor: 'data-transformer',
    dependencies: ['validate']
  },
  {
    id: 'save',
    name: '数据保存',
    type: TaskType.EXECUTOR,
    executor: 'data-saver',
    dependencies: ['transform']
  }
];
```

### 2. 幂等性设计

**确保任务可以安全地重复执行：**

```typescript
// ✅ 幂等的执行器设计
export class IdempotentExecutor implements TaskExecutor {
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    const { recordId, data } = input;
    
    // 检查是否已经处理过
    const existing = await this.checkExistingRecord(recordId);
    if (existing) {
      context.logger.info(`记录 ${recordId} 已存在，跳过处理`);
      return {
        success: true,
        data: existing,
        metadata: { skipped: true }
      };
    }
    
    // 执行实际处理
    const result = await this.processRecord(data);
    
    // 保存结果（使用唯一约束防止重复）
    await this.saveRecord(recordId, result);
    
    return { success: true, data: result };
  }
  
  private async checkExistingRecord(recordId: string): Promise<any> {
    // 检查记录是否已存在
  }
  
  private async saveRecord(recordId: string, data: any): Promise<void> {
    // 使用 INSERT IGNORE 或 UPSERT 操作
  }
}
```

### 3. 错误边界设计

**合理设计错误处理和恢复策略：**

```typescript
const robustWorkflow: WorkflowDefinition = {
  id: 'robust-workflow',
  name: '健壮的工作流',
  version: '1.0.0',
  
  // 全局错误处理
  onError: {
    strategy: 'continue', // 继续执行其他任务
    maxFailures: 3,       // 最多允许3个任务失败
    notifyOnFailure: true
  },
  
  tasks: [
    {
      id: 'critical-task',
      name: '关键任务',
      type: TaskType.EXECUTOR,
      executor: 'critical-processor',
      // 关键任务的重试策略
      retryPolicy: {
        maxAttempts: 5,
        backoffStrategy: 'exponential',
        retryableErrors: ['NetworkError', 'TimeoutError']
      },
      // 失败时的补偿操作
      onError: {
        strategy: 'compensate',
        compensationTask: 'rollback-critical'
      }
    },
    {
      id: 'optional-task',
      name: '可选任务',
      type: TaskType.EXECUTOR,
      executor: 'optional-processor',
      // 可选任务失败时跳过
      onError: {
        strategy: 'skip',
        continueOnFailure: true
      }
    }
  ]
};
```

## ⚡ 性能优化

### 1. 并行执行优化

**合理使用并行执行提高性能：**

```typescript
const optimizedWorkflow: WorkflowDefinition = {
  id: 'optimized-workflow',
  name: '性能优化的工作流',
  version: '1.0.0',
  
  tasks: [
    {
      id: 'prepare',
      name: '准备数据',
      type: TaskType.EXECUTOR,
      executor: 'data-preparer'
    },
    // 并行处理多个独立的任务
    {
      id: 'parallel-processing',
      name: '并行处理',
      type: TaskType.PARALLEL,
      dependencies: ['prepare'],
      concurrency: 4, // 限制并发数
      tasks: [
        {
          id: 'process-batch-1',
          name: '处理批次1',
          type: TaskType.EXECUTOR,
          executor: 'batch-processor',
          parameters: { batchId: 1 }
        },
        {
          id: 'process-batch-2',
          name: '处理批次2',
          type: TaskType.EXECUTOR,
          executor: 'batch-processor',
          parameters: { batchId: 2 }
        },
        {
          id: 'process-batch-3',
          name: '处理批次3',
          type: TaskType.EXECUTOR,
          executor: 'batch-processor',
          parameters: { batchId: 3 }
        },
        {
          id: 'process-batch-4',
          name: '处理批次4',
          type: TaskType.EXECUTOR,
          executor: 'batch-processor',
          parameters: { batchId: 4 }
        }
      ]
    },
    {
      id: 'aggregate',
      name: '聚合结果',
      type: TaskType.EXECUTOR,
      executor: 'result-aggregator',
      dependencies: ['parallel-processing']
    }
  ]
};
```

### 2. 资源管理

**合理管理内存和连接资源：**

```typescript
export class ResourceAwareExecutor implements TaskExecutor {
  private connectionPool: ConnectionPool;
  private memoryThreshold = 1024 * 1024 * 1024; // 1GB
  
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    // 检查内存使用
    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > this.memoryThreshold) {
      // 触发垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      // 如果内存仍然过高，延迟执行
      if (process.memoryUsage().heapUsed > this.memoryThreshold) {
        await this.waitForMemoryRelease();
      }
    }
    
    // 使用连接池
    const connection = await this.connectionPool.acquire();
    
    try {
      const result = await this.processWithConnection(input, connection);
      return { success: true, data: result };
      
    } finally {
      // 确保释放连接
      await this.connectionPool.release(connection);
    }
  }
  
  private async waitForMemoryRelease(): Promise<void> {
    // 等待内存释放的逻辑
  }
  
  private async processWithConnection(input: any, connection: any): Promise<any> {
    // 使用连接处理数据
  }
}
```

### 3. 缓存策略

**实现智能缓存提高执行效率：**

```typescript
export class CachedExecutor implements TaskExecutor {
  private cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 1000 * 60 * 10 // 10分钟过期
  });
  
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(input);
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached) {
      context.logger.info('使用缓存结果');
      return {
        success: true,
        data: cached,
        metadata: { 
          fromCache: true,
          cacheKey 
        }
      };
    }
    
    // 执行计算
    const result = await this.computeResult(input, context);
    
    // 缓存结果（仅缓存成功的结果）
    if (result.success) {
      this.cache.set(cacheKey, result.data);
    }
    
    return result;
  }
  
  private generateCacheKey(input: any): string {
    // 生成稳定的缓存键
    const normalized = this.normalizeInput(input);
    return crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex');
  }
  
  private normalizeInput(input: any): any {
    // 标准化输入，确保缓存键的一致性
    if (typeof input !== 'object') return input;
    
    const normalized: any = {};
    Object.keys(input).sort().forEach(key => {
      normalized[key] = this.normalizeInput(input[key]);
    });
    
    return normalized;
  }
}
```

## 🔒 安全性最佳实践

### 1. 输入验证

**严格验证所有输入数据：**

```typescript
import { z } from 'zod';

// 定义输入模式
const InputSchema = z.object({
  userId: z.string().uuid(),
  data: z.array(z.object({
    id: z.string(),
    value: z.number().min(0).max(1000000)
  })),
  options: z.object({
    batchSize: z.number().min(1).max(10000).default(1000),
    timeout: z.number().min(1000).max(3600000).default(300000)
  }).optional()
});

export class SecureExecutor implements TaskExecutor {
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    try {
      // 验证输入
      const validatedInput = InputSchema.parse(input);
      
      // 权限检查
      await this.checkPermissions(validatedInput.userId, context);
      
      // 执行业务逻辑
      const result = await this.processData(validatedInput);
      
      // 输出过滤（移除敏感信息）
      const sanitizedResult = this.sanitizeOutput(result);
      
      return { success: true, data: sanitizedResult };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            message: '输入数据验证失败',
            code: 'VALIDATION_ERROR',
            details: error.errors
          }
        };
      }
      
      throw error;
    }
  }
  
  private async checkPermissions(userId: string, context: ExecutionContext): Promise<void> {
    // 实现权限检查逻辑
    const user = await this.getUserById(userId);
    if (!user || !user.hasPermission('data.process')) {
      throw new Error('权限不足');
    }
  }
  
  private sanitizeOutput(result: any): any {
    // 移除敏感字段
    const { password, token, ...sanitized } = result;
    return sanitized;
  }
}
```

### 2. 敏感数据处理

**安全处理敏感数据：**

```typescript
export class SecureDataExecutor implements TaskExecutor {
  private encryption: EncryptionService;
  
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    // 加密敏感输入数据
    const encryptedInput = await this.encryptSensitiveFields(input);
    
    // 处理数据
    const result = await this.processSecureData(encryptedInput, context);
    
    // 解密输出数据
    const decryptedResult = await this.decryptSensitiveFields(result);
    
    return { success: true, data: decryptedResult };
  }
  
  private async encryptSensitiveFields(data: any): Promise<any> {
    const sensitiveFields = ['ssn', 'creditCard', 'password'];
    
    for (const field of sensitiveFields) {
      if (data[field]) {
        data[field] = await this.encryption.encrypt(data[field]);
      }
    }
    
    return data;
  }
  
  private async decryptSensitiveFields(data: any): Promise<any> {
    // 实现解密逻辑
    return data;
  }
}
```

## 📊 监控和可观测性

### 1. 结构化日志

**使用结构化日志便于分析：**

```typescript
export class ObservableExecutor implements TaskExecutor {
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    const { logger } = context;
    const startTime = Date.now();
    
    // 记录开始执行
    logger.info('任务开始执行', {
      taskId: context.taskId,
      workflowInstanceId: context.workflowInstanceId,
      inputSize: JSON.stringify(input).length,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.processData(input, context);
      const duration = Date.now() - startTime;
      
      // 记录成功完成
      logger.info('任务执行成功', {
        taskId: context.taskId,
        duration,
        outputSize: JSON.stringify(result).length,
        memoryUsage: process.memoryUsage().heapUsed,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, data: result };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 记录执行失败
      logger.error('任务执行失败', {
        taskId: context.taskId,
        duration,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
}
```

### 2. 指标收集

**收集关键性能指标：**

```typescript
export class MetricsCollectingExecutor implements TaskExecutor {
  private metrics: MetricsCollector;
  
  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    const timer = this.metrics.startTimer('task.execution.duration');
    const memoryBefore = process.memoryUsage().heapUsed;
    
    try {
      // 记录任务开始
      this.metrics.increment('task.started', {
        taskType: context.taskDefinition.type,
        executor: context.taskDefinition.executor
      });
      
      const result = await this.processData(input, context);
      
      // 记录成功指标
      this.metrics.increment('task.completed', {
        taskType: context.taskDefinition.type,
        status: 'success'
      });
      
      // 记录内存使用
      const memoryAfter = process.memoryUsage().heapUsed;
      this.metrics.gauge('task.memory.usage', memoryAfter - memoryBefore);
      
      return { success: true, data: result };
      
    } catch (error) {
      // 记录失败指标
      this.metrics.increment('task.completed', {
        taskType: context.taskDefinition.type,
        status: 'failed',
        errorType: error.constructor.name
      });
      
      throw error;
      
    } finally {
      timer.end();
    }
  }
}
```

## 🧪 测试策略

### 1. 单元测试

**为执行器编写全面的单元测试：**

```typescript
// tests/executors/data-validator.test.ts
import { DataValidatorExecutor } from '../src/executors/data-validator';
import { createMockExecutionContext } from '@stratix/tasks/testing';

describe('DataValidatorExecutor', () => {
  let executor: DataValidatorExecutor;
  let mockContext: ExecutionContext;
  
  beforeEach(() => {
    executor = new DataValidatorExecutor();
    mockContext = createMockExecutionContext();
  });
  
  it('应该验证有效数据', async () => {
    const input = {
      data: [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' }
      ],
      schema: 'user-schema'
    };
    
    const result = await executor.execute(input, mockContext);
    
    expect(result.success).toBe(true);
    expect(result.data.validRecords).toHaveLength(2);
    expect(result.data.invalidRecords).toHaveLength(0);
  });
  
  it('应该识别无效数据', async () => {
    const input = {
      data: [
        { id: '1', name: 'John', email: 'invalid-email' },
        { id: '2', name: '', email: 'jane@example.com' }
      ],
      schema: 'user-schema'
    };
    
    const result = await executor.execute(input, mockContext);
    
    expect(result.success).toBe(true);
    expect(result.data.validRecords).toHaveLength(0);
    expect(result.data.invalidRecords).toHaveLength(2);
  });
  
  it('应该处理空输入', async () => {
    const input = { data: [], schema: 'user-schema' };
    
    const result = await executor.execute(input, mockContext);
    
    expect(result.success).toBe(true);
    expect(result.data.validRecords).toHaveLength(0);
    expect(result.data.invalidRecords).toHaveLength(0);
  });
});
```

### 2. 集成测试

**测试完整的工作流执行：**

```typescript
// tests/workflows/data-processing.integration.test.ts
import { createTestWorkflowEngine } from '@stratix/tasks/testing';
import { dataProcessingWorkflow } from '../src/workflows/definitions/data-processing';

describe('Data Processing Workflow Integration', () => {
  let workflowEngine: WorkflowEngine;
  
  beforeEach(async () => {
    workflowEngine = await createTestWorkflowEngine({
      database: ':memory:', // 使用内存数据库
      executors: [
        'data-validator',
        'data-transformer',
        'data-saver'
      ]
    });
  });
  
  afterEach(async () => {
    await workflowEngine.cleanup();
  });
  
  it('应该成功处理有效数据', async () => {
    const input = {
      data: [
        { id: '1', name: 'John', email: 'john@example.com' }
      ]
    };
    
    const instance = await workflowEngine.startWorkflow(
      dataProcessingWorkflow.id,
      input
    );
    
    // 等待工作流完成
    await workflowEngine.waitForCompletion(instance.id, 30000);
    
    const finalInstance = await workflowEngine.getInstance(instance.id);
    expect(finalInstance.status).toBe('completed');
    expect(finalInstance.output).toBeDefined();
  });
  
  it('应该处理验证失败的情况', async () => {
    const input = {
      data: [
        { id: '1', name: '', email: 'invalid-email' }
      ]
    };
    
    const instance = await workflowEngine.startWorkflow(
      dataProcessingWorkflow.id,
      input
    );
    
    await workflowEngine.waitForCompletion(instance.id, 30000);
    
    const finalInstance = await workflowEngine.getInstance(instance.id);
    expect(finalInstance.status).toBe('failed');
    expect(finalInstance.error).toContain('validation');
  });
});
```
