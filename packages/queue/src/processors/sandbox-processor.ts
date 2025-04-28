/**
 * 沙箱处理器
 * 在独立进程中执行任务处理函数，提供进程隔离
 */

import * as path from 'path';
import { JobState, ProcessorOptions } from '../types/index.js';
import {
  AbstractProcessor,
  ProcessorEventType,
  ProcessorFunction,
  ProcessorMap
} from './abstract-processor.js';
import { SandboxExecuteParams, SandboxPool } from './sandbox/sandbox-pool.js';

/**
 * 沙箱处理器配置选项
 */
export interface SandboxProcessorOptions extends ProcessorOptions {
  /**
   * 最大沙箱数量
   */
  maxSandboxes?: number;

  /**
   * 每个沙箱最大任务数
   */
  maxJobsPerSandbox?: number;

  /**
   * 沙箱超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 最大内存使用量（MB）
   */
  maxMemoryUsage?: number;

  /**
   * 沙箱工作进程脚本路径
   */
  workerPath?: string;
}

/**
 * 沙箱处理器
 * 在独立进程中执行任务处理函数，提供更好的隔离性和容错性
 */
export class SandboxProcessor<T = any, R = any> extends AbstractProcessor<
  T,
  R
> {
  /**
   * 沙箱进程池
   */
  private readonly sandboxPool: SandboxPool;

  /**
   * 处理器映射
   */
  private processors: ProcessorMap<T, R> = {};

  /**
   * 处理器文件路径映射
   */
  private processorFiles: Record<string, string> = {};

  /**
   * 构造函数
   * @param name 处理器名称
   * @param options 沙箱处理器选项
   */
  constructor(name: string, options: SandboxProcessorOptions = {}) {
    super(name, options);

    // 创建沙箱进程池
    this.sandboxPool = new SandboxPool({
      maxSandboxes: options.maxSandboxes,
      maxJobsPerSandbox: options.maxJobsPerSandbox,
      timeout: options.timeout,
      maxMemoryUsage: options.maxMemoryUsage,
      workerPath: options.workerPath
    });

    // 监听沙箱池事件
    this.sandboxPool.on('progress', (data: any) => {
      this.emitEvent({
        jobId: data.jobId,
        type: ProcessorEventType.PROGRESS,
        data: { progress: data.progress }
      });
    });

    this.sandboxPool.on('timeout', (data: any) => {
      this.emitEvent({
        jobId: data.jobId,
        type: ProcessorEventType.STALLED,
        data: { message: `任务执行超时（${options.timeout || 30000}ms）` }
      });
    });

    this.sandboxPool.on('error', (data: any) => {
      this.emitEvent({
        jobId: data.jobId || 'unknown',
        type: ProcessorEventType.ERROR,
        error: data.error,
        data: { message: `沙箱进程错误: ${data.error.message}` }
      });
    });
  }

  /**
   * 初始化处理器
   */
  public async initialize(): Promise<void> {
    // 沙箱处理器初始化时不需要特殊操作
  }

  /**
   * 关闭处理器并释放资源
   */
  public async shutdown(): Promise<void> {
    // 关闭沙箱进程池
    await this.sandboxPool.shutdown();
  }

  /**
   * 在沙箱中处理任务
   * @param jobId 任务ID
   * @param name 任务名称
   * @param data 任务数据
   * @param state 任务状态
   * @param processorFn 处理器函数（如果提供）
   * @returns 处理结果
   */
  public async process(
    jobId: string,
    name: string,
    data: T,
    state: JobState,
    processorFn?: ProcessorFunction<T, R>
  ): Promise<R> {
    // 触发开始事件
    this.emitEvent({
      jobId,
      type: ProcessorEventType.START,
      data: { name, data }
    });

    try {
      // 准备任务执行参数
      const executeParams: SandboxExecuteParams = {
        jobId,
        name,
        data,
        state
      };

      // 如果提供了处理器文件路径，使用文件路径
      if (this.processorFiles[name]) {
        executeParams.processorFile = this.processorFiles[name];
      } else if (processorFn) {
        // 否则使用处理器函数代码字符串（仅用于示例，实际应该有更安全的实现）
        executeParams.processorCode = processorFn.toString();
      } else if (this.processors[name]) {
        // 使用注册的处理器
        executeParams.processorCode = this.processors[name].toString();
      } else {
        throw new Error(`没有找到名为 "${name}" 的处理器函数`);
      }

      // 在沙箱中执行任务
      const result = await this.sandboxPool.execute(executeParams);

      // 触发完成事件
      this.emitEvent({
        jobId,
        type: ProcessorEventType.COMPLETE,
        data: { result }
      });

      return result;
    } catch (error) {
      // 触发失败事件
      this.emitEvent({
        jobId,
        type: ProcessorEventType.FAIL,
        error: error instanceof Error ? error : new Error(String(error)),
        data: { name, data }
      });

      throw error;
    }
  }

  /**
   * 注册处理器函数
   * @param processors 处理器函数或处理器映射
   */
  public registerProcessor(
    processors: ProcessorFunction<T, R> | ProcessorMap<T, R>
  ): void {
    if (typeof processors === 'function') {
      // 如果是单个处理器函数，使用处理器名称作为键
      this.processors[this.name] = processors;
    } else if (typeof processors === 'object') {
      // 如果是处理器映射，合并到现有映射
      this.processors = { ...this.processors, ...processors };
    } else {
      throw new Error('处理器必须是函数或对象映射');
    }
  }

  /**
   * 注册处理器文件
   * @param jobName 任务名称
   * @param filePath 处理器文件路径
   */
  public registerProcessorFile(jobName: string, filePath: string): void {
    // 确保文件路径是绝对路径
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    this.processorFiles[jobName] = absolutePath;
  }

  /**
   * 获取沙箱池状态
   */
  public getSandboxStatus(): any {
    return this.sandboxPool.getStatus();
  }
}
