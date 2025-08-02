// 处理器注册和管理服务
// 提供处理器的动态注册、发现、版本管理等功能

import type { AwilixContainer } from '@stratix/core';
import { ExecutionContext, ITaskProcessor, ProcessorResult } from '../interfaces/ITaskProcessor.js';
import { TaskProcessorRepository } from '../repositories/TaskProcessorRepository.js';
import type { NewTaskProcessor, TaskProcessor } from '../types/database.js';

interface ProcessorRegistrationOptions {
  autoEnable?: boolean;
  overwriteExisting?: boolean;
  validateOnRegister?: boolean;
}

interface ProcessorMetadata {
  description?: string;
  category?: string;
  tags?: string[];
  author?: string;
  license?: string;
  documentation?: string;
  examples?: Array<{
    name: string;
    description: string;
    input: any;
    expectedOutput: any;
  }>;
}

export class ProcessorRegistrationService {
  private taskProcessorRepo: TaskProcessorRepository;
  private registeredProcessors: Map<string, ITaskProcessor> = new Map();
  private processorFactories: Map<string, () => ITaskProcessor> = new Map();
  
  constructor(container: AwilixContainer) {
    this.taskProcessorRepo = container.resolve('taskProcessorRepository');
  }
  
  /**
   * 注册处理器到系统
   */
  async registerProcessor(
    processor: ITaskProcessor,
    metadata: ProcessorMetadata = {},
    options: ProcessorRegistrationOptions = {}
  ): Promise<void> {
    const {
      autoEnable = true,
      overwriteExisting = false,
      validateOnRegister = true
    } = options;
    
    try {
      // 1. 验证处理器
      if (validateOnRegister) {
        await this.validateProcessor(processor);
      }
      
      // 2. 检查是否已存在
      const existingProcessor = await this.findProcessorByName(processor.name, processor.version);
      if (existingProcessor && !overwriteExisting) {
        throw new Error(`Processor ${processor.name}@${processor.version} already exists`);
      }
      
      // 3. 提取参数和返回类型定义
      const parameterSchema = await this.extractParameterSchema(processor);
      const returnTypeSchema = await this.extractReturnTypeSchema(processor);
      
      // 4. 创建数据库记录
      const processorData: NewTaskProcessor = {
        id: crypto.randomUUID(),
        name: processor.name,
        version: processor.version,
        description: metadata.description || `${processor.name} processor`,
        category: metadata.category || 'general',
        tags: JSON.stringify(metadata.tags || []),
        parameters: JSON.stringify(parameterSchema),
        return_type: JSON.stringify(returnTypeSchema),
        examples: JSON.stringify(metadata.examples || []),
        enabled: autoEnable,
        metadata: JSON.stringify({
          author: metadata.author,
          license: metadata.license,
          documentation: metadata.documentation,
          registeredAt: new Date().toISOString(),
          className: processor.constructor.name
        })
      };
      
      if (existingProcessor) {
        // 更新现有处理器
        await this.taskProcessorRepo.update(existingProcessor.id, processorData);
      } else {
        // 创建新处理器
        await this.taskProcessorRepo.create(processorData);
      }
      
      // 5. 注册到内存缓存
      const processorKey = `${processor.name}@${processor.version}`;
      this.registeredProcessors.set(processorKey, processor);
      
      console.log(`✅ Processor ${processorKey} registered successfully`);
      
    } catch (error) {
      throw new Error(`Failed to register processor ${processor.name}: ${(error as Error).message}`);
    }
  }
  
  /**
   * 批量注册处理器
   */
  async registerProcessors(
    processors: Array<{
      processor: ITaskProcessor;
      metadata?: ProcessorMetadata;
      options?: ProcessorRegistrationOptions;
    }>
  ): Promise<void> {
    const results = await Promise.allSettled(
      processors.map(({ processor, metadata, options }) =>
        this.registerProcessor(processor, metadata, options)
      )
    );
    
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length > 0) {
      const errors = failed.map((result, index) => 
        `${processors[index].processor.name}: ${(result as PromiseRejectedResult).reason.message}`
      );
      throw new Error(`Failed to register ${failed.length} processors:\n${errors.join('\n')}`);
    }
    
    console.log(`✅ Successfully registered ${processors.length} processors`);
  }
  
  /**
   * 注册处理器工厂（用于延迟实例化）
   */
  registerProcessorFactory(
    name: string,
    version: string,
    factory: () => ITaskProcessor,
    metadata: ProcessorMetadata = {}
  ): void {
    const key = `${name}@${version}`;
    this.processorFactories.set(key, factory);
    
    // 创建占位符实例以获取元数据
    const placeholder = factory();
    this.registerProcessor(placeholder, metadata, { validateOnRegister: false });
  }
  
  /**
   * 获取处理器实例
   */
  async getProcessor(name: string, version?: string): Promise<ITaskProcessor | null> {
    // 1. 尝试从内存缓存获取
    const key = version ? `${name}@${version}` : name;
    
    if (version) {
      const processor = this.registeredProcessors.get(key);
      if (processor) return processor;
    } else {
      // 如果没有指定版本，获取最新版本
      const latestProcessor = await this.getLatestProcessor(name);
      if (latestProcessor) return latestProcessor;
    }
    
    // 2. 尝试从工厂创建
    if (this.processorFactories.has(key)) {
      const factory = this.processorFactories.get(key)!;
      const processor = factory();
      this.registeredProcessors.set(key, processor);
      return processor;
    }
    
    // 3. 从数据库加载
    const processorData = await this.findProcessorByName(name, version);
    if (processorData && processorData.enabled) {
      const processor = await this.instantiateProcessorFromData(processorData);
      if (processor) {
        const processorKey = `${processor.name}@${processor.version}`;
        this.registeredProcessors.set(processorKey, processor);
        return processor;
      }
    }
    
    return null;
  }
  
  /**
   * 获取最新版本的处理器
   */
  private async getLatestProcessor(name: string): Promise<ITaskProcessor | null> {
    for (const [key, processor] of this.registeredProcessors) {
      if (key.startsWith(`${name}@`)) {
        return processor;
      }
    }
    
    // 从数据库查找最新版本
    const processors = await this.taskProcessorRepo.findByName(name);
    if (processors.success && processors.data.length > 0) {
      // 按版本排序，获取最新版本
      const sortedProcessors = processors.data.sort((a, b) => 
        this.compareVersions(b.version, a.version)
      );
      
      const latestData = sortedProcessors[0];
      if (latestData.enabled) {
        return await this.instantiateProcessorFromData(latestData);
      }
    }
    
    return null;
  }
  
  /**
   * 列出所有可用的处理器
   */
  async listProcessors(options: {
    category?: string;
    enabled?: boolean;
    tags?: string[];
  } = {}): Promise<TaskProcessor[]> {
    const result = await this.taskProcessorRepo.findMany();
    if (!result.success) {
      throw new Error('Failed to list processors');
    }
    
    let processors = result.data;
    
    // 应用过滤器
    if (options.category) {
      processors = processors.filter(p => p.category === options.category);
    }
    
    if (options.enabled !== undefined) {
      processors = processors.filter(p => p.enabled === options.enabled);
    }
    
    if (options.tags && options.tags.length > 0) {
      processors = processors.filter(p => {
        const processorTags = JSON.parse(p.tags as string) as string[];
        return options.tags!.some(tag => processorTags.includes(tag));
      });
    }
    
    return processors;
  }
  
  /**
   * 启用/禁用处理器
   */
  async toggleProcessor(name: string, version: string, enabled: boolean): Promise<void> {
    const processor = await this.findProcessorByName(name, version);
    if (!processor) {
      throw new Error(`Processor ${name}@${version} not found`);
    }
    
    await this.taskProcessorRepo.update(processor.id, { enabled });
    
    // 从内存缓存中移除（如果禁用）
    if (!enabled) {
      const key = `${name}@${version}`;
      this.registeredProcessors.delete(key);
    }
    
    console.log(`${enabled ? 'Enabled' : 'Disabled'} processor ${name}@${version}`);
  }
  
  /**
   * 删除处理器
   */
  async unregisterProcessor(name: string, version: string): Promise<void> {
    const processor = await this.findProcessorByName(name, version);
    if (!processor) {
      throw new Error(`Processor ${name}@${version} not found`);
    }
    
    // 检查是否有正在使用的任务
    const activeUsage = await this.checkProcessorUsage(name);
    if (activeUsage > 0) {
      throw new Error(`Cannot unregister processor ${name}@${version}: ${activeUsage} active tasks using it`);
    }
    
    // 从数据库删除
    await this.taskProcessorRepo.delete(processor.id);
    
    // 从内存缓存删除
    const key = `${name}@${version}`;
    this.registeredProcessors.delete(key);
    this.processorFactories.delete(key);
    
    console.log(`🗑️ Processor ${name}@${version} unregistered`);
  }
  
  /**
   * 验证处理器
   */
  private async validateProcessor(processor: ITaskProcessor): Promise<void> {
    // 1. 检查必需属性
    if (!processor.name || !processor.version) {
      throw new Error('Processor must have name and version');
    }
    
    // 2. 检查名称格式
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(processor.name)) {
      throw new Error('Processor name must start with letter and contain only letters, numbers, and underscores');
    }
    
    // 3. 检查版本格式
    if (!/^\d+\.\d+\.\d+$/.test(processor.version)) {
      throw new Error('Processor version must follow semantic versioning (x.y.z)');
    }
    
    // 4. 测试基本功能
    try {
      await processor.validateParameters({});
      
      // 创建模拟上下文
      const mockContext: ExecutionContext = {
        executionId: 'test',
        nodeId: 'test',
        treeId: 'test',
        environment: {},
        logger: {
          info: () => {},
          error: () => {},
          warn: () => {},
          debug: () => {}
        } as any,
        progress: async () => {},
        metadata: {}
      };
      
      // 测试执行（应该失败，但不应该抛出意外错误）
      try {
        await processor.execute({}, mockContext);
      } catch (error) {
        // 预期的错误，忽略
      }
      
    } catch (error) {
      throw new Error(`Processor validation failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * 提取参数模式
   */
  private async extractParameterSchema(processor: ITaskProcessor): Promise<any> {
    // 这里可以通过反射、装饰器或其他方式提取参数定义
    // 简化实现，返回基本结构
    return {
      type: 'object',
      properties: {},
      required: [],
      description: `Parameters for ${processor.name} processor`
    };
  }
  
  /**
   * 提取返回类型模式
   */
  private async extractReturnTypeSchema(processor: ITaskProcessor): Promise<any> {
    return {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'any' },
        error: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['success'],
      description: `Return type for ${processor.name} processor`
    };
  }
  
  /**
   * 从数据库数据实例化处理器
   */
  private async instantiateProcessorFromData(data: TaskProcessor): Promise<ITaskProcessor | null> {
    try {
      const metadata = JSON.parse(data.metadata as string);
      const className = metadata.className;
      
      if (className) {
        // 尝试动态导入处理器类
        const modulePath = `./processors/${className}.js`;
        const module = await import(modulePath);
        const ProcessorClass = module[className] || module.default;
        
        if (ProcessorClass) {
          return new ProcessorClass();
        }
      }
      
      // 如果无法动态加载，返回null
      console.warn(`Cannot instantiate processor ${data.name}@${data.version}: class ${className} not found`);
      return null;
      
    } catch (error) {
      console.error(`Failed to instantiate processor ${data.name}@${data.version}:`, error);
      return null;
    }
  }
  
  /**
   * 查找处理器数据
   */
  private async findProcessorByName(name: string, version?: string): Promise<TaskProcessor | null> {
    const result = await this.taskProcessorRepo.findByNameAndVersion(name, version);
    return result.success && result.data ? result.data : null;
  }
  
  /**
   * 检查处理器使用情况
   */
  private async checkProcessorUsage(name: string): Promise<number> {
    // 这里应该查询task_nodes表，统计使用该处理器的活跃任务数
    // 简化实现，返回0
    return 0;
  }
  
  /**
   * 比较版本号
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }
  
  /**
   * 获取处理器统计信息
   */
  async getProcessorStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    categories: Record<string, number>;
    versions: Record<string, string[]>;
  }> {
    const processors = await this.listProcessors();
    
    const stats = {
      total: processors.length,
      enabled: processors.filter(p => p.enabled).length,
      disabled: processors.filter(p => !p.enabled).length,
      categories: {} as Record<string, number>,
      versions: {} as Record<string, string[]>
    };
    
    // 统计分类
    processors.forEach(processor => {
      const category = processor.category || 'uncategorized';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
      
      if (!stats.versions[processor.name]) {
        stats.versions[processor.name] = [];
      }
      stats.versions[processor.name].push(processor.version);
    });
    
    return stats;
  }
}

// 自动注册装饰器
export function AutoRegister(metadata: ProcessorMetadata = {}) {
  return function <T extends new (...args: any[]) => ITaskProcessor>(constructor: T) {
    // 将处理器添加到自动注册队列
    ProcessorAutoRegistry.add(constructor, metadata);
    return constructor;
  };
}

// 自动注册管理器
class ProcessorAutoRegistry {
  private static queue: Array<{
    constructor: new (...args: any[]) => ITaskProcessor;
    metadata: ProcessorMetadata;
  }> = [];
  
  static add(constructor: new (...args: any[]) => ITaskProcessor, metadata: ProcessorMetadata) {
    this.queue.push({ constructor, metadata });
  }
  
  static async registerAll(registrationService: ProcessorRegistrationService): Promise<void> {
    const processors = this.queue.map(({ constructor, metadata }) => ({
      processor: new constructor(),
      metadata,
      options: { autoEnable: true, overwriteExisting: true }
    }));
    
    await registrationService.registerProcessors(processors);
    this.queue = []; // 清空队列
  }
}

export { ProcessorAutoRegistry };

// 使用示例
export const registrationExamples = {
  // 手动注册处理器
  async manualRegistration(registrationService: ProcessorRegistrationService) {
    const { DataETLProcessor } = await import('./DataETLProcessor.js');
    const { WebScrapingProcessor } = await import('./WebScrapingProcessor.js');
    
    await registrationService.registerProcessors([
      {
        processor: new DataETLProcessor(),
        metadata: {
          description: '强大的数据ETL处理器，支持多种数据源和转换操作',
          category: 'data',
          tags: ['etl', 'data', 'transformation', 'database'],
          author: 'Stratix Team',
          license: 'MIT',
          examples: [
            {
              name: '数据库到数据库ETL',
              description: '从MySQL提取数据，转换后加载到PostgreSQL',
              input: {
                source: { type: 'database', connection: 'mysql://...' },
                transformations: [{ type: 'filter', config: { condition: 'status = "active"' } }],
                destination: { type: 'database', connection: 'postgresql://...' }
              },
              expectedOutput: {
                totalRecords: 1000,
                processedRecords: 850,
                errorRecords: 0
              }
            }
          ]
        }
      },
      {
        processor: new WebScrapingProcessor(),
        metadata: {
          description: '高级网页爬虫处理器，支持JavaScript渲染和反爬虫',
          category: 'web',
          tags: ['scraping', 'web', 'crawler', 'puppeteer'],
          author: 'Stratix Team',
          license: 'MIT'
        }
      }
    ]);
  },
  
  // 使用装饰器自动注册
  async decoratorRegistration() {
    @AutoRegister({
      description: '自动注册的示例处理器',
      category: 'example',
      tags: ['demo', 'test']
    })
    class ExampleProcessor extends BaseTaskProcessor {
      readonly name = 'example';
      readonly version = '1.0.0';
      
      protected async doExecute(params: any, context: ExecutionContext): Promise<ProcessorResult> {
        return { success: true, data: { message: 'Hello from auto-registered processor!' } };
      }
    }
    
    // 处理器会自动添加到注册队列
    // 在应用启动时调用 ProcessorAutoRegistry.registerAll() 完成注册
  }
};