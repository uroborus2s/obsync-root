# @stratix/tasks 自定义执行器开发指南

## 🎯 概述

本指南详细说明如何在@stratix/tasks系统中创建自定义执行器来处理复杂业务操作。

## 🏗️ 执行器架构

### 1. 执行器接口定义

首先定义标准的执行器接口：

```typescript
// src/processors/interfaces/ITaskProcessor.ts
export interface ExecutionContext {
  executionId: string;
  nodeId: string;
  treeId: string;
  environment: Record<string, any>;
  logger: ILogger;
  progress: (percent: number, message?: string) => Promise<void>;
  metadata: Record<string, any>;
}

export interface ProcessorResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ITaskProcessor {
  /**
   * 处理器名称
   */
  readonly name: string;
  
  /**
   * 处理器版本
   */
  readonly version: string;
  
  /**
   * 参数验证
   */
  validateParameters(params: any): Promise<boolean>;
  
  /**
   * 执行任务
   */
  execute(params: any, context: ExecutionContext): Promise<ProcessorResult>;
  
  /**
   * 清理资源
   */
  cleanup?(): Promise<void>;
}
```

### 2. 基础处理器抽象类

```typescript
// src/processors/base/BaseTaskProcessor.ts
import { ITaskProcessor, ExecutionContext, ProcessorResult } from '../interfaces/ITaskProcessor.js';

export abstract class BaseTaskProcessor implements ITaskProcessor {
  abstract readonly name: string;
  abstract readonly version: string;
  
  /**
   * 参数验证（子类可重写）
   */
  async validateParameters(params: any): Promise<boolean> {
    return params !== null && params !== undefined;
  }
  
  /**
   * 执行前钩子
   */
  protected async beforeExecute(params: any, context: ExecutionContext): Promise<void> {
    context.logger.info(`Starting execution of ${this.name}`, { params });
  }
  
  /**
   * 执行后钩子
   */
  protected async afterExecute(result: ProcessorResult, context: ExecutionContext): Promise<void> {
    context.logger.info(`Completed execution of ${this.name}`, { 
      success: result.success,
      hasData: !!result.data 
    });
  }
  
  /**
   * 错误处理钩子
   */
  protected async onError(error: Error, context: ExecutionContext): Promise<void> {
    context.logger.error(`Error in ${this.name}`, { 
      error: error.message,
      stack: error.stack 
    });
  }
  
  /**
   * 模板方法 - 定义执行流程
   */
  async execute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    try {
      // 参数验证
      const isValid = await this.validateParameters(params);
      if (!isValid) {
        throw new Error('Invalid parameters provided');
      }
      
      // 执行前钩子
      await this.beforeExecute(params, context);
      
      // 执行具体逻辑
      const result = await this.doExecute(params, context);
      
      // 执行后钩子
      await this.afterExecute(result, context);
      
      return result;
      
    } catch (error) {
      await this.onError(error as Error, context);
      return {
        success: false,
        error: (error as Error).message,
        metadata: { stack: (error as Error).stack }
      };
    }
  }
  
  /**
   * 子类需要实现的具体执行逻辑
   */
  protected abstract doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult>;
  
  /**
   * 默认清理实现
   */
  async cleanup(): Promise<void> {
    // 子类可重写
  }
}
```

## 🔧 复杂执行器实现示例

### 示例1: 数据ETL处理器

```typescript
// src/processors/DataETLProcessor.ts
import { BaseTaskProcessor } from './base/BaseTaskProcessor.js';
import { ExecutionContext, ProcessorResult } from './interfaces/ITaskProcessor.js';

interface ETLParams {
  source: {
    type: 'database' | 'api' | 'file';
    connection: string;
    query?: string;
    endpoint?: string;
    filePath?: string;
  };
  transformations: Array<{
    type: 'filter' | 'map' | 'aggregate' | 'join';
    config: Record<string, any>;
  }>;
  destination: {
    type: 'database' | 'file' | 'api';
    connection: string;
    table?: string;
    filePath?: string;
    endpoint?: string;
  };
  options: {
    batchSize?: number;
    parallelism?: number;
    errorHandling?: 'stop' | 'skip' | 'retry';
  };
}

export class DataETLProcessor extends BaseTaskProcessor {
  readonly name = 'dataETL';
  readonly version = '1.0.0';
  
  private connections: Map<string, any> = new Map();
  
  async validateParameters(params: ETLParams): Promise<boolean> {
    if (!params.source || !params.destination) {
      return false;
    }
    
    if (!params.transformations || !Array.isArray(params.transformations)) {
      return false;
    }
    
    return true;
  }
  
  protected async doExecute(params: ETLParams, context: ExecutionContext): Promise<ProcessorResult> {
    const { source, transformations, destination, options = {} } = params;
    const { batchSize = 1000, parallelism = 1 } = options;
    
    let totalRecords = 0;
    let processedRecords = 0;
    let errorRecords = 0;
    
    try {
      // 1. 提取数据 (Extract)
      await context.progress(10, 'Starting data extraction...');
      const sourceData = await this.extractData(source, context);
      totalRecords = sourceData.length;
      
      await context.progress(30, `Extracted ${totalRecords} records`);
      
      // 2. 转换数据 (Transform)
      await context.progress(40, 'Starting data transformation...');
      const transformedData = await this.transformData(
        sourceData, 
        transformations, 
        context,
        (processed) => {
          processedRecords = processed;
          const progress = 40 + (processed / totalRecords) * 40;
          context.progress(progress, `Transformed ${processed}/${totalRecords} records`);
        }
      );
      
      await context.progress(80, 'Data transformation completed');
      
      // 3. 加载数据 (Load)
      await context.progress(85, 'Starting data loading...');
      const loadResult = await this.loadData(transformedData, destination, context);
      
      await context.progress(100, 'ETL process completed');
      
      return {
        success: true,
        data: {
          totalRecords,
          processedRecords: transformedData.length,
          errorRecords,
          loadResult,
          executionTime: Date.now() - context.metadata.startTime
        },
        metadata: {
          source: source.type,
          destination: destination.type,
          transformationCount: transformations.length
        }
      };
      
    } catch (error) {
      throw new Error(`ETL process failed: ${(error as Error).message}`);
    }
  }
  
  private async extractData(source: ETLParams['source'], context: ExecutionContext): Promise<any[]> {
    switch (source.type) {
      case 'database':
        return await this.extractFromDatabase(source, context);
      case 'api':
        return await this.extractFromAPI(source, context);
      case 'file':
        return await this.extractFromFile(source, context);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }
  
  private async extractFromDatabase(source: ETLParams['source'], context: ExecutionContext): Promise<any[]> {
    // 获取数据库连接
    const connection = await this.getConnection(source.connection);
    
    // 执行查询
    const result = await connection.query(source.query);
    
    context.logger.info(`Extracted ${result.length} records from database`);
    return result;
  }
  
  private async extractFromAPI(source: ETLParams['source'], context: ExecutionContext): Promise<any[]> {
    const response = await fetch(source.endpoint!);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const records = Array.isArray(data) ? data : data.data || [data];
    
    context.logger.info(`Extracted ${records.length} records from API`);
    return records;
  }
  
  private async extractFromFile(source: ETLParams['source'], context: ExecutionContext): Promise<any[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const content = await fs.readFile(source.filePath!, 'utf8');
    const ext = path.extname(source.filePath!).toLowerCase();
    
    let records: any[];
    switch (ext) {
      case '.json':
        records = JSON.parse(content);
        break;
      case '.csv':
        records = await this.parseCSV(content);
        break;
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
    
    context.logger.info(`Extracted ${records.length} records from file`);
    return Array.isArray(records) ? records : [records];
  }
  
  private async transformData(
    data: any[], 
    transformations: ETLParams['transformations'],
    context: ExecutionContext,
    progressCallback: (processed: number) => void
  ): Promise<any[]> {
    let result = [...data];
    
    for (const [index, transformation] of transformations.entries()) {
      context.logger.info(`Applying transformation ${index + 1}/${transformations.length}: ${transformation.type}`);
      
      switch (transformation.type) {
        case 'filter':
          result = await this.applyFilter(result, transformation.config);
          break;
        case 'map':
          result = await this.applyMap(result, transformation.config, progressCallback);
          break;
        case 'aggregate':
          result = await this.applyAggregate(result, transformation.config);
          break;
        case 'join':
          result = await this.applyJoin(result, transformation.config, context);
          break;
        default:
          throw new Error(`Unsupported transformation type: ${transformation.type}`);
      }
      
      context.logger.info(`Transformation ${transformation.type} completed. Records: ${result.length}`);
    }
    
    return result;
  }
  
  private async applyFilter(data: any[], config: any): Promise<any[]> {
    const { condition } = config;
    
    // 支持简单的条件过滤
    return data.filter(record => {
      try {
        // 这里可以实现更复杂的条件解析
        return this.evaluateCondition(record, condition);
      } catch (error) {
        return false;
      }
    });
  }
  
  private async applyMap(data: any[], config: any, progressCallback: (processed: number) => void): Promise<any[]> {
    const { mapping } = config;
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const mappedRecord = this.applyMapping(record, mapping);
      result.push(mappedRecord);
      
      if (i % 100 === 0) {
        progressCallback(i);
      }
    }
    
    progressCallback(data.length);
    return result;
  }
  
  private async loadData(data: any[], destination: ETLParams['destination'], context: ExecutionContext): Promise<any> {
    switch (destination.type) {
      case 'database':
        return await this.loadToDatabase(data, destination, context);
      case 'file':
        return await this.loadToFile(data, destination, context);
      case 'api':
        return await this.loadToAPI(data, destination, context);
      default:
        throw new Error(`Unsupported destination type: ${destination.type}`);
    }
  }
  
  private async loadToDatabase(data: any[], destination: ETLParams['destination'], context: ExecutionContext): Promise<any> {
    const connection = await this.getConnection(destination.connection);
    
    // 批量插入
    const batchSize = 1000;
    let insertedCount = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await connection.insertBatch(destination.table!, batch);
      insertedCount += batch.length;
      
      context.logger.info(`Inserted ${insertedCount}/${data.length} records`);
    }
    
    return { insertedCount };
  }
  
  // 辅助方法
  private async getConnection(connectionString: string): Promise<any> {
    if (!this.connections.has(connectionString)) {
      // 这里实现数据库连接逻辑
      const connection = await this.createConnection(connectionString);
      this.connections.set(connectionString, connection);
    }
    return this.connections.get(connectionString);
  }
  
  private async createConnection(connectionString: string): Promise<any> {
    // 实现具体的数据库连接创建逻辑
    // 支持 MySQL, PostgreSQL, MongoDB 等
    throw new Error('Connection creation not implemented');
  }
  
  private evaluateCondition(record: any, condition: string): boolean {
    // 实现条件表达式解析和执行
    // 例如: "age > 18 AND status = 'active'"
    return true; // 简化实现
  }
  
  private applyMapping(record: any, mapping: Record<string, string>): any {
    const result: any = {};
    
    for (const [targetField, sourceExpression] of Object.entries(mapping)) {
      result[targetField] = this.evaluateExpression(record, sourceExpression);
    }
    
    return result;
  }
  
  private evaluateExpression(record: any, expression: string): any {
    // 实现表达式解析和执行
    // 例如: "${firstName} ${lastName}" -> "John Doe"
    return expression.replace(/\$\{([^}]+)\}/g, (match, field) => {
      return record[field] || '';
    });
  }
  
  private async parseCSV(content: string): Promise<any[]> {
    // 实现CSV解析逻辑
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const record: any = {};
        headers.forEach((header, index) => {
          record[header.trim()] = values[index]?.trim();
        });
        records.push(record);
      }
    }
    
    return records;
  }
  
  async cleanup(): Promise<void> {
    // 关闭所有数据库连接
    for (const connection of this.connections.values()) {
      await connection.close();
    }
    this.connections.clear();
  }
}
```

### 示例2: 机器学习模型执行器

```typescript
// src/processors/MLModelProcessor.ts
import { BaseTaskProcessor } from './base/BaseTaskProcessor.js';
import { ExecutionContext, ProcessorResult } from './interfaces/ITaskProcessor.js';

interface MLParams {
  model: {
    type: 'tensorflow' | 'pytorch' | 'sklearn' | 'custom';
    path: string;
    version?: string;
  };
  input: {
    data: any[] | string; // 数据或数据路径
    preprocessing?: {
      normalize?: boolean;
      scale?: boolean;
      features?: string[];
    };
  };
  output: {
    format: 'json' | 'csv' | 'binary';
    path?: string;
    threshold?: number;
  };
  options: {
    batchSize?: number;
    useGPU?: boolean;
    timeout?: number;
  };
}

export class MLModelProcessor extends BaseTaskProcessor {
  readonly name = 'mlModel';
  readonly version = '1.0.0';
  
  private modelCache: Map<string, any> = new Map();
  
  protected async doExecute(params: MLParams, context: ExecutionContext): Promise<ProcessorResult> {
    const { model, input, output, options = {} } = params;
    
    try {
      // 1. 加载模型
      await context.progress(10, 'Loading ML model...');
      const modelInstance = await this.loadModel(model, context);
      
      // 2. 准备数据
      await context.progress(30, 'Preparing input data...');
      const inputData = await this.prepareInputData(input, context);
      
      // 3. 执行预测
      await context.progress(50, 'Running model inference...');
      const predictions = await this.runInference(
        modelInstance, 
        inputData, 
        options, 
        context,
        (progress) => context.progress(50 + progress * 0.4, 'Processing batch...')
      );
      
      // 4. 后处理结果
      await context.progress(90, 'Post-processing results...');
      const processedResults = await this.postProcessResults(predictions, output, context);
      
      await context.progress(100, 'ML inference completed');
      
      return {
        success: true,
        data: {
          predictions: processedResults,
          modelInfo: {
            type: model.type,
            version: model.version,
            inputShape: inputData.shape,
            outputShape: predictions.shape
          },
          performance: {
            inferenceTime: Date.now() - context.metadata.startTime,
            samplesProcessed: inputData.length,
            throughput: inputData.length / ((Date.now() - context.metadata.startTime) / 1000)
          }
        }
      };
      
    } catch (error) {
      throw new Error(`ML model execution failed: ${(error as Error).message}`);
    }
  }
  
  private async loadModel(model: MLParams['model'], context: ExecutionContext): Promise<any> {
    const cacheKey = `${model.type}:${model.path}:${model.version || 'latest'}`;
    
    if (this.modelCache.has(cacheKey)) {
      context.logger.info('Using cached model');
      return this.modelCache.get(cacheKey);
    }
    
    let modelInstance;
    
    switch (model.type) {
      case 'tensorflow':
        modelInstance = await this.loadTensorFlowModel(model.path);
        break;
      case 'pytorch':
        modelInstance = await this.loadPyTorchModel(model.path);
        break;
      case 'sklearn':
        modelInstance = await this.loadSklearnModel(model.path);
        break;
      case 'custom':
        modelInstance = await this.loadCustomModel(model.path);
        break;
      default:
        throw new Error(`Unsupported model type: ${model.type}`);
    }
    
    this.modelCache.set(cacheKey, modelInstance);
    context.logger.info(`Loaded ${model.type} model from ${model.path}`);
    
    return modelInstance;
  }
  
  private async runInference(
    model: any, 
    inputData: any, 
    options: MLParams['options'],
    context: ExecutionContext,
    progressCallback: (progress: number) => void
  ): Promise<any> {
    const { batchSize = 32, useGPU = false } = options;
    
    if (useGPU) {
      context.logger.info('Using GPU acceleration');
    }
    
    const results = [];
    const totalBatches = Math.ceil(inputData.length / batchSize);
    
    for (let i = 0; i < inputData.length; i += batchSize) {
      const batch = inputData.slice(i, i + batchSize);
      const batchResult = await model.predict(batch);
      results.push(...batchResult);
      
      const progress = (i / batchSize + 1) / totalBatches;
      progressCallback(progress);
      
      context.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${totalBatches}`);
    }
    
    return results;
  }
  
  // 模型加载方法的具体实现
  private async loadTensorFlowModel(path: string): Promise<any> {
    // 实现 TensorFlow 模型加载
    const tf = await import('@tensorflow/tfjs-node');
    return await tf.loadLayersModel(`file://${path}`);
  }
  
  private async loadPyTorchModel(path: string): Promise<any> {
    // 实现 PyTorch 模型加载（通过 Python 桥接）
    throw new Error('PyTorch model loading not implemented');
  }
  
  private async loadSklearnModel(path: string): Promise<any> {
    // 实现 Scikit-learn 模型加载（通过 Python 桥接）
    throw new Error('Sklearn model loading not implemented');
  }
  
  private async loadCustomModel(path: string): Promise<any> {
    // 加载自定义模型格式
    const modelModule = await import(path);
    return new modelModule.default();
  }
}
```

## 📝 处理器注册

### 1. 数据库注册

```typescript
// src/processors/registry/ProcessorRegistry.ts
export class ProcessorRegistry {
  private processors: Map<string, ITaskProcessor> = new Map();
  
  /**
   * 注册处理器到数据库
   */
  async registerProcessor(processor: ITaskProcessor): Promise<void> {
    const processorData = {
      id: crypto.randomUUID(),
      name: processor.name,
      version: processor.version,
      description: this.getProcessorDescription(processor),
      category: this.getProcessorCategory(processor),
      tags: this.getProcessorTags(processor),
      parameters: this.getParameterSchema(processor),
      return_type: this.getReturnTypeSchema(processor),
      examples: this.getExamples(processor),
      enabled: true,
      metadata: {
        registeredAt: new Date().toISOString(),
        registeredBy: 'system'
      }
    };
    
    await this.taskProcessorRepo.create(processorData);
    this.processors.set(processor.name, processor);
  }
  
  /**
   * 从数据库加载处理器
   */
  async loadProcessors(): Promise<void> {
    const processors = await this.taskProcessorRepo.findMany();
    
    for (const processorData of processors.data) {
      if (processorData.enabled) {
        const processor = await this.instantiateProcessor(processorData);
        this.processors.set(processorData.name, processor);
      }
    }
  }
  
  /**
   * 获取处理器实例
   */
  getProcessor(name: string): ITaskProcessor | undefined {
    return this.processors.get(name);
  }
}
```

### 2. 自动注册装饰器

```typescript
// src/processors/decorators/ProcessorDecorator.ts
export interface ProcessorMetadata {
  description?: string;
  category?: string;
  tags?: string[];
  parameters?: Record<string, any>;
  returnType?: Record<string, any>;
  examples?: any[];
}

export function Processor(metadata: ProcessorMetadata) {
  return function <T extends new (...args: any[]) => ITaskProcessor>(constructor: T) {
    // 将元数据附加到构造函数
    (constructor as any).__processorMetadata = metadata;
    
    // 自动注册到全局注册表
    ProcessorRegistry.autoRegister(constructor);
    
    return constructor;
  };
}

// 使用示例
@Processor({
  description: '复杂数据ETL处理器',
  category: 'data',
  tags: ['etl', 'data', 'transformation'],
  parameters: {
    source: { type: 'object', required: true },
    transformations: { type: 'array', required: true },
    destination: { type: 'object', required: true }
  },
  returnType: {
    type: 'object',
    properties: {
      totalRecords: { type: 'number' },
      processedRecords: { type: 'number' },
      errorRecords: { type: 'number' }
    }
  }
})
export class DataETLProcessor extends BaseTaskProcessor {
  // 实现...
}
```

## 🚀 使用自定义处理器

### 1. 创建任务节点

```typescript
// 使用自定义ETL处理器
const etlTaskNode = await taskNodeService.createTaskNode({
  tree_id: treeId,
  name: '客户数据ETL处理',
  task_type: 'dataETL', // 对应处理器名称
  task_config: {
    source: {
      type: 'database',
      connection: 'mysql://user:pass@localhost/source_db',
      query: 'SELECT * FROM customers WHERE updated_at > ?',
      params: ['2024-01-01']
    },
    transformations: [
      {
        type: 'filter',
        config: {
          condition: 'status = "active" AND email IS NOT NULL'
        }
      },
      {
        type: 'map',
        config: {
          mapping: {
            'customer_id': '${id}',
            'full_name': '${first_name} ${last_name}',
            'email_domain': '${email}.split("@")[1]',
            'registration_year': 'new Date(${created_at}).getFullYear()'
          }
        }
      }
    ],
    destination: {
      type: 'database',
      connection: 'postgresql://user:pass@localhost/target_db',
      table: 'processed_customers'
    },
    options: {
      batchSize: 1000,
      parallelism: 4,
      errorHandling: 'skip'
    }
  },
  timeout: 3600000, // 1小时
  retry_policy: {
    max_retries: 2,
    retry_delay: 30000
  }
});
```

### 2. 监控执行过程

```typescript
// 监控复杂处理器的执行
await workflowAdapter.monitorWorkflow(workflowId, (status) => {
  console.log(`ETL进度: ${status.progress}%`);
  
  if (status.status === 'running') {
    // 可以获取详细的执行信息
    taskNodeService.getTaskNodeDetail(etlTaskNode.id).then(detail => {
      console.log('当前执行阶段:', detail.metadata?.currentStage);
      console.log('处理记录数:', detail.metadata?.processedRecords);
    });
  }
});
```

## 🔧 高级特性

### 1. 处理器间通信

```typescript
// 处理器可以通过上下文进行通信
export class DataValidationProcessor extends BaseTaskProcessor {
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    // 获取上一个处理器的结果
    const previousResult = context.metadata.previousResults?.dataETL;
    
    if (previousResult) {
      // 基于前一个处理器的结果进行验证
      const validationResult = await this.validateData(previousResult.data);
      return { success: true, data: validationResult };
    }
    
    throw new Error('No data to validate');
  }
}
```

### 2. 动态参数解析

```typescript
// 支持动态参数和模板
export class DynamicProcessor extends BaseTaskProcessor {
  protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
    // 解析模板参数
    const resolvedParams = await this.resolveTemplateParams(params, context);
    
    // 执行具体逻辑
    return await this.processWithResolvedParams(resolvedParams, context);
  }
  
  private async resolveTemplateParams(params: any, context: ExecutionContext): Promise<any> {
    const resolved = { ...params };
    
    // 解析 ${variable} 格式的模板
    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === 'string' && value.includes('${')) {
        resolved[key] = this.interpolateTemplate(value, context);
      }
    }
    
    return resolved;
  }
}
```

这个完整的指南展示了如何在@stratix/tasks系统中创建功能强大的自定义执行器，支持复杂的业务逻辑、错误处理、进度监控和资源管理。