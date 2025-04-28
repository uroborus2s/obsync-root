/**
 * 抽象处理器接口
 * 定义所有任务处理器必须实现的接口
 */

import { Job, JobState, ProcessorOptions } from '../types/index.js';

/**
 * 处理器结果类型
 */
export type ProcessorResult<R = any> = R | Promise<R>;

/**
 * 处理器函数类型
 * @param job 任务实例
 * @returns 处理结果
 */
export type ProcessorFunction<T = any, R = any> = (
  job: Job<T, R>
) => ProcessorResult<R>;

/**
 * 处理器映射类型
 * 键为任务名称，值为处理器函数
 */
export type ProcessorMap<T = any, R = any> = Record<
  string,
  ProcessorFunction<T, R>
>;

/**
 * 进度更新回调函数类型
 * @param jobId 任务ID
 * @param progress 进度信息
 */
export type ProgressCallback = (
  jobId: string,
  progress: number | object
) => Promise<void>;

/**
 * 处理器事件类型
 */
export enum ProcessorEventType {
  START = 'start',
  COMPLETE = 'complete',
  FAIL = 'fail',
  PROGRESS = 'progress',
  STALLED = 'stalled',
  ERROR = 'error'
}

/**
 * 处理器事件参数
 */
export interface ProcessorEventData {
  jobId: string;
  type: ProcessorEventType;
  data?: any;
  error?: Error;
}

/**
 * 处理器事件回调函数类型
 */
export type ProcessorEventCallback = (eventData: ProcessorEventData) => void;

/**
 * 抽象处理器接口
 * 所有具体处理器实现必须继承此类
 */
export abstract class AbstractProcessor<T = any, R = any> {
  /**
   * 处理器名称
   */
  protected readonly name: string;

  /**
   * 处理器配置选项
   */
  protected readonly options: ProcessorOptions;

  /**
   * 事件监听器
   */
  protected eventListeners: Map<ProcessorEventType, ProcessorEventCallback[]> =
    new Map();

  /**
   * 构造函数
   * @param name 处理器名称
   * @param options 处理器配置选项
   */
  constructor(name: string, options: ProcessorOptions = {}) {
    this.name = name;
    this.options = options;
  }

  /**
   * 初始化处理器
   * 子类可以重写此方法进行初始化
   */
  public async initialize(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 关闭处理器并释放资源
   * 子类可以重写此方法进行资源清理
   */
  public async shutdown(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 处理任务
   * 子类必须实现此方法
   * @param jobId 任务ID
   * @param name 任务名称
   * @param data 任务数据
   * @param state 任务状态
   * @param processorFn 处理器函数
   * @returns 处理结果
   */
  public abstract process(
    jobId: string,
    name: string,
    data: T,
    state: JobState,
    processorFn: ProcessorFunction<T, R>
  ): Promise<R>;

  /**
   * 注册处理器函数
   * 子类必须实现此方法
   * @param processors 处理器函数或处理器映射
   */
  public abstract registerProcessor(
    processors: ProcessorFunction<T, R> | ProcessorMap<T, R>
  ): void;

  /**
   * 监听处理器事件
   * @param event 事件类型
   * @param callback 回调函数
   */
  public on(event: ProcessorEventType, callback: ProcessorEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * 移除事件监听器
   * @param event 事件类型
   * @param callback 要移除的回调函数
   */
  public off(
    event: ProcessorEventType,
    callback: ProcessorEventCallback
  ): void {
    if (!this.eventListeners.has(event)) {
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param eventData 事件数据
   */
  protected emitEvent(eventData: ProcessorEventData): void {
    const listeners = this.eventListeners.get(eventData.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(eventData);
        } catch (error) {
          console.error(`处理器事件处理出错: ${error}`);
        }
      }
    }
  }
}
