/**
 * @stratix/queue 驱动类型定义
 */

/**
 * 队列驱动接口
 * 定义所有队列驱动必须实现的通用接口
 */
export interface QueueDriver {
  /**
   * 初始化驱动
   */
  init(options: any): Promise<void>;

  /**
   * 创建队列实例
   */
  createQueue(name: string, options?: any): QueueInstance;

  /**
   * 关闭驱动连接
   */
  close(): Promise<void>;

  /**
   * 获取驱动名称
   */
  getName(): string;

  /**
   * 检查驱动健康状态
   */
  checkHealth(): Promise<boolean>;
}

/**
 * 队列实例接口
 * 定义队列实例的通用操作
 */
export interface QueueInstance {
  /**
   * 队列名称
   */
  readonly name: string;

  /**
   * 添加任务
   */
  add(name: string, data: any, options?: any): Promise<JobInstance>;

  /**
   * 批量添加任务
   */
  addBulk(
    jobs: Array<{ name: string; data: any; opts?: any }>
  ): Promise<JobInstance[]>;

  /**
   * 注册处理器函数
   */
  process(processor: Function | Record<string, Function>): void;

  /**
   * 获取任务实例
   */
  getJob(jobId: string): Promise<JobInstance | null>;

  /**
   * 获取任务列表
   */
  getJobs(
    status: string | string[],
    start?: number,
    end?: number,
    asc?: boolean
  ): Promise<JobInstance[]>;

  /**
   * 获取任务计数
   */
  getJobCounts(): Promise<Record<string, number>>;

  /**
   * 移除任务
   */
  removeJob(jobId: string): Promise<boolean>;

  /**
   * 批量移除任务
   */
  removeJobs(pattern: string): Promise<number>;

  /**
   * 暂停队列处理
   */
  pause(): Promise<void>;

  /**
   * 恢复队列处理
   */
  resume(): Promise<void>;

  /**
   * 检查队列是否暂停
   */
  isPaused(): Promise<boolean>;

  /**
   * 清空队列
   */
  empty(): Promise<void>;

  /**
   * 关闭队列连接
   */
  close(): Promise<void>;

  /**
   * 获取队列状态
   */
  getStatus(): Promise<any>;

  /**
   * 获取队列指标
   */
  getMetrics(): Promise<any>;

  /**
   * 注册事件监听器
   */
  on(event: string, handler: Function): void;

  /**
   * 移除事件监听器
   */
  off(event: string, handler: Function): void;
}

/**
 * 任务实例接口
 * 定义任务实例的通用操作
 */
export interface JobInstance {
  /**
   * 任务ID
   */
  readonly id: string;

  /**
   * 任务名称
   */
  readonly name: string;

  /**
   * 任务数据
   */
  readonly data: any;

  /**
   * 任务状态
   */
  readonly status: string;

  /**
   * 任务结果
   */
  readonly returnvalue: any;

  /**
   * 已尝试次数
   */
  readonly attemptsMade: number;

  /**
   * 更新任务进度
   */
  updateProgress(progress: any): Promise<void>;

  /**
   * 获取任务进度
   */
  getProgress(): Promise<any>;

  /**
   * 重试任务
   */
  retry(): Promise<void>;

  /**
   * 移除任务
   */
  remove(): Promise<void>;

  /**
   * 将任务标记为失败
   */
  moveToFailed(error: Error): Promise<void>;

  /**
   * 提升延迟任务优先级
   */
  promote(): Promise<void>;

  /**
   * 废弃任务
   */
  discard(): Promise<void>;

  /**
   * 添加任务日志
   */
  log(message: string): Promise<void>;

  /**
   * 获取任务日志
   */
  getLogs(): Promise<Array<{ message: string; timestamp: string | Date }>>;

  /**
   * 添加依赖任务
   */
  addDependency(jobId: string): Promise<void>;

  /**
   * 移除依赖任务
   */
  removeDependency(jobId: string): Promise<void>;

  /**
   * 获取任务详细状态
   */
  getState(): Promise<any>;
}

/**
 * 驱动工厂类型
 * 用于创建不同类型的队列驱动
 */
export interface DriverFactory {
  /**
   * 创建驱动实例
   */
  createDriver(type: string, options?: any): Promise<QueueDriver>;

  /**
   * 注册自定义驱动
   */
  registerDriver(type: string, driverClass: any): void;
}
