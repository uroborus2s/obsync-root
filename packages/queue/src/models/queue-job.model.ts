/**
 * @stratix/queue QueueJob 模型实现
 */

import type {
  QueueJob as IQueueJob,
  JobExecutionResult,
  JobSummary,
  QueueJobSelect
} from '../types/index.js';

/**
 * 队列任务模型类
 * 实现 QueueJob 接口，提供任务对象的具体实现
 */
export class QueueJobModel implements IQueueJob {
  // 继承数据库字段
  readonly id: string;
  readonly queue_name: string;
  readonly group_id: string | null;
  readonly job_name: string;
  readonly executor_name: string;
  readonly payload: any;
  readonly result: any | null;
  readonly status: 'waiting' | 'executing' | 'delayed' | 'paused' | 'failed';
  readonly priority: number;
  readonly attempts: number;
  readonly max_attempts: number;
  readonly delay_until: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly started_at: Date | null;
  readonly metadata: any | null;
  readonly locked_at: Date | null;
  readonly locked_by: string | null;
  readonly locked_until: Date | null;
  // 错误相关字段
  readonly error_message: string | null;
  readonly error_stack: string | null;
  readonly error_code: string | null;
  readonly failed_at: Date | null;

  constructor(data: QueueJobSelect) {
    // 复制所有字段
    this.id = data.id;
    this.queue_name = data.queue_name;
    this.group_id = data.group_id;
    this.job_name = data.job_name;
    this.executor_name = data.executor_name;
    this.payload = data.payload;
    this.result = data.result;
    this.status = data.status;
    this.priority = data.priority;
    this.attempts = data.attempts;
    this.max_attempts = data.max_attempts;
    this.delay_until = data.delay_until;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.started_at = data.started_at;
    this.metadata = data.metadata;
    this.locked_at = data.locked_at;
    this.locked_by = data.locked_by;
    this.locked_until = data.locked_until;
    // 错误相关字段
    this.error_message = data.error_message;
    this.error_stack = data.error_stack;
    this.error_code = data.error_code;
    this.failed_at = data.failed_at;
  }

  /**
   * 执行任务（需要外部执行器支持）
   */
  async execute(): Promise<JobExecutionResult> {
    throw new Error('任务执行需要通过执行器进行，不应直接调用 job.execute()');
  }

  /**
   * 获取任务信息摘要
   */
  getSummary(): JobSummary {
    return {
      id: this.id,
      queueName: this.queue_name,
      groupId: this.group_id || undefined,
      jobName: this.job_name,
      executorName: this.executor_name,
      status: this.status,
      priority: this.priority,
      attempts: this.attempts,
      maxAttempts: this.max_attempts,
      createdAt: this.created_at,
      delayUntil: this.delay_until || undefined
    };
  }

  /**
   * 检查是否可以执行
   */
  canExecute(): boolean {
    // 任务状态必须是 waiting 才能执行
    if (this.status !== 'waiting') {
      return false;
    }

    // 如果有延迟时间，检查是否已到执行时间
    if (this.delay_until && this.delay_until > new Date()) {
      return false;
    }

    return true;
  }

  /**
   * 检查是否已延迟
   */
  isDelayed(): boolean {
    return (
      this.status === 'delayed' ||
      (this.delay_until !== null && this.delay_until > new Date())
    );
  }

  /**
   * 检查是否已暂停
   */
  isPaused(): boolean {
    return this.status === 'paused';
  }

  /**
   * 检查是否已失败
   */
  isFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * 获取错误信息
   */
  getErrorInfo(): { message: string; stack?: string; code?: string } | null {
    if (!this.isFailed() || !this.error_message) {
      return null;
    }

    return {
      message: this.error_message,
      stack: this.error_stack || undefined,
      code: this.error_code || undefined
    };
  }

  /**
   * 静态方法：从数据库记录创建 QueueJob 实例
   */
  static fromDatabaseRecord(record: QueueJobSelect): QueueJobModel {
    return new QueueJobModel(record);
  }

  /**
   * 静态方法：批量从数据库记录创建 QueueJob 实例
   */
  static fromDatabaseRecords(records: QueueJobSelect[]): QueueJobModel[] {
    return records.map((record) => new QueueJobModel(record));
  }

  /**
   * 获取调试信息
   */
  toDebugString(): string {
    return `QueueJob(${this.id}) - ${this.job_name} [${this.status}] priority=${this.priority} attempts=${this.attempts}/${this.max_attempts}`;
  }
}
