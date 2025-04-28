/**
 * 本地处理器实现
 * 在当前进程中执行任务
 */

import { JobState, ProcessorOptions } from '../types/index.js';
import {
  AbstractProcessor,
  ProcessorEventType,
  ProcessorFunction,
  ProcessorMap
} from './abstract-processor.js';

/**
 * 本地处理器
 * 在当前进程中执行任务处理函数
 */
export class LocalProcessor<T = any, R = any> extends AbstractProcessor<T, R> {
  /**
   * 处理器函数映射
   * 键为任务名称，值为处理器函数
   */
  private processors: ProcessorMap<T, R> = {};

  /**
   * 正在执行的任务数量
   */
  private activeJobs: number = 0;

  /**
   * 最大并发数
   */
  private concurrency: number;

  /**
   * 构造函数
   * @param name 处理器名称
   * @param options 处理器配置选项
   */
  constructor(name: string, options: ProcessorOptions = {}) {
    super(name, options);
    this.concurrency = options.concurrency || 1;
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
   * 执行任务
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
    // 等待直到有可用的并发槽
    await this.waitForAvailableConcurrencySlot();

    try {
      // 增加活跃任务计数
      this.activeJobs++;

      // 获取处理器函数
      const processor = processorFn || this.getProcessorFunction(name);
      if (!processor) {
        throw new Error(`没有找到名为 "${name}" 的处理器函数`);
      }

      // 创建模拟任务对象
      const job = this.createJobObject(jobId, name, data, state);

      // 触发开始事件
      this.emitEvent({
        jobId,
        type: ProcessorEventType.START,
        data: { name, data }
      });

      // 执行处理器函数
      try {
        const result = await processor(job);

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
    } finally {
      // 减少活跃任务计数
      this.activeJobs--;
    }
  }

  /**
   * 等待直到有可用的并发槽
   */
  private async waitForAvailableConcurrencySlot(): Promise<void> {
    if (this.activeJobs < this.concurrency) {
      return;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.activeJobs < this.concurrency) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 获取处理器函数
   * @param name 任务名称
   * @returns 处理器函数
   */
  private getProcessorFunction(
    name: string
  ): ProcessorFunction<T, R> | undefined {
    return this.processors[name] || this.processors[this.name];
  }

  /**
   * 创建任务对象
   * @param jobId 任务ID
   * @param name 任务名称
   * @param data 任务数据
   * @param state 任务状态
   * @returns 任务对象
   */
  private createJobObject(
    jobId: string,
    name: string,
    data: T,
    state: JobState
  ): any {
    // 创建带有进度更新功能的任务对象
    return {
      id: jobId,
      name,
      data,
      attemptsMade: state.attemptsMade || 0,
      progress: state.progress || 0,
      returnvalue: state.returnvalue,

      // 进度更新方法
      async updateProgress(progress: number | object): Promise<void> {
        this.progress = progress;
        // 触发进度事件
        (this as any)._processor.emitEvent({
          jobId,
          type: ProcessorEventType.PROGRESS,
          data: { progress }
        });
      }
    };
  }
}
