# @stratix/tasks 自定义执行器完整使用指南

## 🎯 概述

本指南提供了在@stratix/tasks系统中创建、注册和使用自定义执行器的完整流程。通过这个指南，你可以创建功能强大的自定义处理器来处理各种复杂的业务场景。

## 🏗️ 快速开始

### 1. 创建简单的自定义处理器

```typescript
// src/processors/MyCustomProcessor.ts
import { BaseTaskProcessor } from './base/BaseTaskProcessor.js';
import { ExecutionContext, ProcessorResult } from './interfaces/ITaskProcessor.js';

interface MyProcessorParams {
  message: string;
  count: number;
  options?: {
    uppercase?: boolean;
    prefix?: string;
  };
}

export class MyCustomProcessor extends BaseTaskProcessor {
  readonly name = 'myCustomProcessor';
  readonly version = '1.0.0';
  
  async validateParameters(params: MyProcessorParams): Promise<boolean> {
    return !!(params.message && typeof params.count === 'number' && params.count > 0);
  }
  
  protected async doExecute(params: MyProcessorParams, context: ExecutionContext): Promise<ProcessorResult> {
    const { message, count, options = {} } = params;
    
    try {
      await context.progress(10, 'Starting message processing...');
      
      let processedMessage = message;
      if (options.uppercase) {
        processedMessage = processedMessage.toUpperCase();
      }
      
      if (options.prefix) {
        processedMessage = `${options.prefix}: ${processedMessage}`;
      }
      
      await context.progress(50, 'Generating repeated messages...');
      
      const results = [];
      for (let i = 0; i < count; i++) {
        results.push(`${i + 1}. ${processedMessage}`);
        
        // 更新进度
        const progress = 50 + (i / count) * 40;
        await context.progress(progress, `Generated ${i + 1}/${count} messages`);
        
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await context.progress(100, 'Message processing completed');
      
      return {
        success: true,
        data: {
          originalMessage: message,
          processedMessage,
          results,
          totalCount: count
        },
        metadata: {
          processingTime: Date.now() - context.metadata.startTime,
          optionsUsed: options
        }
      };
      
    } catch (error) {
      throw new Error(`Message processing failed: ${(error as Error).message}`);
    }
  }
}
```

### 2. 注册处理器

```typescript
// src/processors/registry/registerProcessors.ts
import { ProcessorRegistrationService } from './ProcessorRegistrationService.js';
import { MyCustomProcessor } from '../MyCustomProcessor.js';

export async function registerCustomProcessors(
  registrationService: ProcessorRegistrationService
): Promise<void> {
  await registrationService.registerProcessor(
    new MyCustomProcessor(),
    {
      description: '自定义消息处理器，支持消息重复和格式化',
      category: 'text',
      tags: ['message', 'text', 'formatting'],
      author: 'Your Name',
      license: 'MIT',
      examples: [
        {
          name: '基本消息处理',
          description: '重复消息3次并转换为大写',
          input: {
            message: 'Hello World',
            count: 3,
            options: { uppercase: true, prefix: 'MSG' }
          },
          expectedOutput: {
            results: [
              '1. MSG: HELLO WORLD',
              '2. MSG: HELLO WORLD',
              '3. MSG: HELLO WORLD'
            ]
          }
        }
      ]
    },
    {
      autoEnable: true,
      overwriteExisting: true
    }
  );
}
```

### 3. 在任务中使用

```typescript
// 创建使用自定义处理器的任务节点
const customTaskNode = await taskNodeService.createTaskNode({
  tree_id: treeId,
  name: '自定义消息处理任务',
  task_type: 'myCustomProcessor', // 对应处理器名称
  task_config: {
    message: 'Hello from custom processor!',
    count: 5,
    options: {
      uppercase: true,
      prefix: 'CUSTOM'
    }
  },
  timeout: 60000,
  retry_policy: {
    max_retries: 2,
    retry_delay: 5000
  }
});
```

## 🔧 高级处理器开发

### 1. 处理复杂异步操作

```typescript
export class AsyncDataProcessor extends BaseTaskProcessor {
  readonly name = 'asyncDataProcessor';
  readonly version = '1.0.0';
  
  private activeConnections: Set<any> = new Set();
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    const { dataSources, operations } = params;
    
    try {
      // 并行处理多个数据源
      const dataPromises = dataSources.map(async (source: any, index: number) => {
        const connection = await this.createConnection(source);
        this.activeConnections.add(connection);
        
        try {
          const data = await this.fetchData(connection, source.query);
          
          // 更新进度
          const progress = ((index + 1) / dataSources.length) * 50;
          await context.progress(progress, `Fetched data from source ${index + 1}`);
          
          return { sourceId: source.id, data };
        } finally {
          this.activeConnections.delete(connection);
          await connection.close();
        }
      });
      
      const results = await Promise.all(dataPromises);
      
      // 处理数据
      await context.progress(60, 'Processing fetched data...');
      const processedData = await this.processData(results, operations, context);
      
      return {
        success: true,
        data: processedData,
        metadata: {
          sourcesProcessed: dataSources.length,
          operationsApplied: operations.length
        }
      };
      
    } catch (error) {
      throw new Error(`Async data processing failed: ${(error as Error).message}`);
    }
  }
  
  async cleanup(): Promise<void> {
    // 清理所有活跃连接
    const cleanupPromises = Array.from(this.activeConnections).map(conn => 
      conn.close().catch(() => {}) // 忽略清理错误
    );
    
    await Promise.all(cleanupPromises);
    this.activeConnections.clear();
  }
}
```

### 2. 支持流式处理

```typescript
export class StreamProcessor extends BaseTaskProcessor {
  readonly name = 'streamProcessor';
  readonly version = '1.0.0';
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    const { inputStream, outputPath, transformations } = params;
    
    return new Promise((resolve, reject) => {
      const readStream = this.createInputStream(inputStream);
      const writeStream = this.createOutputStream(outputPath);
      const transformStream = this.createTransformStream(transformations, context);
      
      let processedBytes = 0;
      const totalBytes = inputStream.size || 0;
      
      // 监听进度
      transformStream.on('data', (chunk) => {
        processedBytes += chunk.length;
        if (totalBytes > 0) {
          const progress = (processedBytes / totalBytes) * 100;
          context.progress(progress, `Processed ${processedBytes} bytes`);
        }
      });
      
      // 处理完成
      writeStream.on('finish', () => {
        resolve({
          success: true,
          data: {
            inputSize: totalBytes,
            outputSize: processedBytes,
            outputPath
          }
        });
      });
      
      // 处理错误
      const handleError = (error: Error) => {
        reject(new Error(`Stream processing failed: ${error.message}`));
      };
      
      readStream.on('error', handleError);
      transformStream.on('error', handleError);
      writeStream.on('error', handleError);
      
      // 连接流
      readStream
        .pipe(transformStream)
        .pipe(writeStream);
    });
  }
}
```

### 3. 支持子任务和回调

```typescript
export class WorkflowProcessor extends BaseTaskProcessor {
  readonly name = 'workflowProcessor';
  readonly version = '1.0.0';
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    const { subTasks, onProgress, onSubTaskComplete } = params;
    
    const results = [];
    
    for (let i = 0; i < subTasks.length; i++) {
      const subTask = subTasks[i];
      
      try {
        await context.progress(
          (i / subTasks.length) * 90,
          `Executing subtask: ${subTask.name}`
        );
        
        // 执行子任务
        const subResult = await this.executeSubTask(subTask, context);
        results.push(subResult);
        
        // 调用回调
        if (onSubTaskComplete) {
          await this.executeCallback(onSubTaskComplete, subResult, context);
        }
        
        context.logger.info(`Completed subtask: ${subTask.name}`, subResult);
        
      } catch (error) {
        const errorResult = {
          taskName: subTask.name,
          success: false,
          error: (error as Error).message
        };
        
        results.push(errorResult);
        
        // 根据错误处理策略决定是否继续
        if (params.errorHandling === 'stop') {
          throw error;
        }
      }
    }
    
    await context.progress(100, 'All subtasks completed');
    
    return {
      success: true,
      data: {
        totalSubTasks: subTasks.length,
        successfulTasks: results.filter(r => r.success).length,
        failedTasks: results.filter(r => !r.success).length,
        results
      }
    };
  }
  
  private async executeSubTask(subTask: any, context: ExecutionContext): Promise<any> {
    // 这里可以调用其他处理器或执行具体逻辑
    switch (subTask.type) {
      case 'http_request':
        return await this.makeHttpRequest(subTask.config);
      case 'database_query':
        return await this.executeQuery(subTask.config);
      case 'file_operation':
        return await this.performFileOperation(subTask.config);
      default:
        throw new Error(`Unknown subtask type: ${subTask.type}`);
    }
  }
  
  private async executeCallback(callback: any, result: any, context: ExecutionContext): Promise<void> {
    if (callback.type === 'webhook') {
      await fetch(callback.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, context: { executionId: context.executionId } })
      });
    } else if (callback.type === 'function') {
      // 执行自定义函数
      const fn = new Function('result', 'context', callback.code);
      await fn(result, context);
    }
  }
}
```

## 📊 监控和调试

### 1. 添加详细日志

```typescript
export class LoggingProcessor extends BaseTaskProcessor {
  readonly name = 'loggingProcessor';
  readonly version = '1.0.0';
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    const startTime = Date.now();
    
    // 记录开始执行
    context.logger.info('Starting processor execution', {
      processorName: this.name,
      processorVersion: this.version,
      params: this.sanitizeParams(params),
      executionId: context.executionId
    });
    
    try {
      // 执行具体逻辑
      const result = await this.performWork(params, context);
      
      // 记录成功完成
      context.logger.info('Processor execution completed successfully', {
        executionTime: Date.now() - startTime,
        resultSize: JSON.stringify(result).length,
        executionId: context.executionId
      });
      
      return result;
      
    } catch (error) {
      // 记录错误
      context.logger.error('Processor execution failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        executionTime: Date.now() - startTime,
        executionId: context.executionId
      });
      
      throw error;
    }
  }
  
  private sanitizeParams(params: any): any {
    // 移除敏感信息
    const sanitized = { ...params };
    const sensitiveKeys = ['password', 'token', 'secret', 'key'];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}
```

### 2. 性能监控

```typescript
export class PerformanceMonitoringProcessor extends BaseTaskProcessor {
  readonly name = 'performanceMonitoring';
  readonly version = '1.0.0';
  
  private metrics: Map<string, number> = new Map();
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    const performanceMarks: Array<{ name: string; timestamp: number }> = [];
    
    const mark = (name: string) => {
      const timestamp = Date.now();
      performanceMarks.push({ name, timestamp });
      this.metrics.set(name, timestamp);
    };
    
    mark('start');
    
    try {
      mark('validation_start');
      await this.validateInput(params);
      mark('validation_end');
      
      mark('processing_start');
      const result = await this.processData(params, context);
      mark('processing_end');
      
      mark('output_start');
      const finalResult = await this.formatOutput(result);
      mark('output_end');
      
      mark('end');
      
      // 计算各阶段耗时
      const timings = {
        validation: this.metrics.get('validation_end')! - this.metrics.get('validation_start')!,
        processing: this.metrics.get('processing_end')! - this.metrics.get('processing_start')!,
        output: this.metrics.get('output_end')! - this.metrics.get('output_start')!,
        total: this.metrics.get('end')! - this.metrics.get('start')!
      };
      
      // 记录性能指标
      context.logger.info('Performance metrics', {
        timings,
        marks: performanceMarks,
        memoryUsage: process.memoryUsage()
      });
      
      return {
        success: true,
        data: finalResult,
        metadata: {
          performance: timings,
          marks: performanceMarks
        }
      };
      
    } catch (error) {
      mark('error');
      throw error;
    }
  }
}
```

## 🔄 错误处理和重试

### 1. 智能重试机制

```typescript
export class RetryableProcessor extends BaseTaskProcessor {
  readonly name = 'retryableProcessor';
  readonly version = '1.0.0';
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2 } = params.retryConfig || {};
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        context.logger.info(`Attempt ${attempt}/${maxRetries + 1}`);
        
        const result = await this.performOperation(params, context);
        
        if (attempt > 1) {
          context.logger.info(`Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= maxRetries) {
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1);
          
          context.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: lastError.message,
            nextAttempt: attempt + 1
          });
          
          await this.delay(delay);
        }
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
  }
  
  private async performOperation(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    // 模拟可能失败的操作
    if (Math.random() < 0.7) { // 70% 失败率用于演示
      throw new Error('Simulated operation failure');
    }
    
    return {
      success: true,
      data: { message: 'Operation completed successfully' }
    };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. 分类错误处理

```typescript
export class ErrorHandlingProcessor extends BaseTaskProcessor {
  readonly name = 'errorHandling';
  readonly version = '1.0.0';
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    try {
      return await this.performWork(params, context);
      
    } catch (error) {
      const errorType = this.classifyError(error as Error);
      
      switch (errorType) {
        case 'NETWORK_ERROR':
          return await this.handleNetworkError(error as Error, params, context);
        case 'VALIDATION_ERROR':
          return await this.handleValidationError(error as Error, params, context);
        case 'RESOURCE_ERROR':
          return await this.handleResourceError(error as Error, params, context);
        case 'BUSINESS_LOGIC_ERROR':
          return await this.handleBusinessLogicError(error as Error, params, context);
        default:
          return await this.handleUnknownError(error as Error, params, context);
      }
    }
  }
  
  private classifyError(error: Error): string {
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (error.message.includes('resource') || error.message.includes('memory')) {
      return 'RESOURCE_ERROR';
    }
    if (error.message.includes('business') || error.message.includes('rule')) {
      return 'BUSINESS_LOGIC_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }
  
  private async handleNetworkError(error: Error, params: any, context: ExecutionContext): Promise<ProcessorResult> {
    context.logger.warn('Network error detected, attempting recovery', { error: error.message });
    
    // 网络错误可以重试
    await this.delay(5000);
    return await this.performWork(params, context);
  }
  
  private async handleValidationError(error: Error, params: any, context: ExecutionContext): Promise<ProcessorResult> {
    context.logger.error('Validation error - cannot recover', { error: error.message });
    
    return {
      success: false,
      error: `Validation failed: ${error.message}`,
      metadata: { errorType: 'VALIDATION_ERROR', recoverable: false }
    };
  }
}
```

## 🚀 部署和管理

### 1. 处理器版本管理

```typescript
// 支持多版本处理器
export class VersionedProcessor extends BaseTaskProcessor {
  readonly name = 'versionedProcessor';
  readonly version = '2.0.0'; // 新版本
  
  // 向后兼容性检查
  async validateParameters(params: any): Promise<boolean> {
    // 检查是否是旧版本参数格式
    if (this.isLegacyFormat(params)) {
      // 转换为新格式
      params = this.convertFromLegacy(params);
    }
    
    return await super.validateParameters(params);
  }
  
  private isLegacyFormat(params: any): boolean {
    // 检查是否包含旧版本的字段
    return params.hasOwnProperty('oldField') && !params.hasOwnProperty('newField');
  }
  
  private convertFromLegacy(params: any): any {
    // 转换逻辑
    return {
      ...params,
      newField: params.oldField,
      version: '2.0.0'
    };
  }
}
```

### 2. 处理器热更新

```typescript
export class HotReloadableProcessor extends BaseTaskProcessor {
  readonly name = 'hotReloadable';
  readonly version = '1.0.0';
  
  private configPath: string;
  private config: any;
  private configWatcher: any;
  
  constructor(configPath: string = './processor-config.json') {
    super();
    this.configPath = configPath;
    this.loadConfig();
    this.watchConfig();
  }
  
  private loadConfig(): void {
    try {
      const fs = require('fs');
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configContent);
      console.log('Configuration loaded:', this.config);
    } catch (error) {
      console.warn('Failed to load config, using defaults');
      this.config = this.getDefaultConfig();
    }
  }
  
  private watchConfig(): void {
    const fs = require('fs');
    
    this.configWatcher = fs.watch(this.configPath, (eventType: string) => {
      if (eventType === 'change') {
        console.log('Configuration file changed, reloading...');
        this.loadConfig();
      }
    });
  }
  
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    // 使用最新的配置
    const mergedParams = { ...this.config, ...params };
    
    return await this.performWork(mergedParams, context);
  }
  
  async cleanup(): Promise<void> {
    if (this.configWatcher) {
      this.configWatcher.close();
    }
  }
}
```

## 📝 最佳实践

### 1. 处理器设计原则

- **单一职责**：每个处理器只负责一个特定的功能
- **幂等性**：相同输入应该产生相同输出
- **可测试性**：提供清晰的输入输出接口
- **错误透明**：提供详细的错误信息和上下文
- **资源管理**：正确清理资源，避免内存泄漏

### 2. 性能优化

- **异步处理**：使用 Promise 和 async/await
- **流式处理**：对大数据使用流式处理
- **连接池**：复用数据库连接和HTTP连接
- **缓存机制**：缓存频繁访问的数据
- **批量操作**：合并小操作为批量操作

### 3. 安全考虑

- **输入验证**：严格验证所有输入参数
- **权限检查**：验证操作权限
- **敏感数据**：正确处理敏感信息
- **资源限制**：设置合理的资源使用限制
- **审计日志**：记录重要操作的审计信息

通过这个完整的指南，你可以创建功能强大、可靠且易于维护的自定义执行器，满足各种复杂的业务需求。