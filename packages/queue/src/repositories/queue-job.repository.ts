/**
 * @stratix/queue 队列任务仓储
 */

import type { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { sql } from '@stratix/database';
import { randomUUID } from 'node:crypto';
import { QueueJobModel } from '../models/queue-job.model.js';
import type {
  CreateJobInput,
  CreateJobsBatchInput,
  QueueDatabase,
  QueueJobInsert,
  QueueJobSelect,
  QueueJobUpdate,
  UpdateJobStatusInput
} from '../types/index.js';
import type { QueueJob } from '../types/job.types.js';

/**
 * 队列任务仓储类
 */
export class QueueJobRepository {
  constructor(
    private db: Kysely<QueueDatabase>,
    private log: Logger
  ) {}

  /**
   * 初始化仓储
   */
  async init(): Promise<void> {
    // 验证数据库连接和表结构
    try {
      await this.db.selectFrom('queue_jobs').select('id').limit(1).execute();
    } catch (error) {
      throw new Error(
        `队列任务仓储初始化失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 解析任务对象，将JSON字符串转换为对象，并返回 QueueJobModel 实例
   */
  private parseJob(job: QueueJobSelect): QueueJob {
    const parsedData = {
      ...job,
      payload:
        typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload,
      result:
        typeof job.result === 'string' ? JSON.parse(job.result) : job.result,
      metadata:
        typeof job.metadata === 'string'
          ? JSON.parse(job.metadata)
          : job.metadata
    };

    return QueueJobModel.fromDatabaseRecord(parsedData);
  }

  /**
   * 解析任务数组，返回 QueueJobModel 实例数组
   */
  private parseJobs(jobs: QueueJobSelect[]): QueueJob[] {
    return jobs.map((job) => this.parseJob(job));
  }

  /**
   * 创建单个任务
   */
  async create(input: CreateJobInput): Promise<QueueJob> {
    const jobId = randomUUID();

    try {
      // 使用sql模板执行原始SQL，确保参数化查询
      await sql`
        INSERT INTO queue_jobs 
        (id, queue_name, group_id, job_name, executor_name, payload, result, status, priority, attempts, max_attempts, delay_until, metadata, created_at, updated_at)
        VALUES (${jobId}, ${input.queueName}, ${input.groupId || null}, ${input.jobName}, ${input.executorName}, ${JSON.stringify(input.payload)}, ${null}, ${'waiting'}, ${input.priority || 0}, ${0}, ${input.maxAttempts || 3}, ${input.delayUntil || null}, ${input.metadata ? JSON.stringify(input.metadata) : null}, NOW(), NOW())
      `.execute(this.db);

      // 查询创建的记录
      const createdJob = await this.db
        .selectFrom('queue_jobs')
        .selectAll()
        .where('id', '=', jobId)
        .executeTakeFirst();

      if (!createdJob) {
        throw new Error('任务创建失败，无法查询到创建的记录');
      }

      return this.parseJob(createdJob);
    } catch (error) {
      this.log.error('创建任务失败', {
        input,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 批量创建任务
   */
  async createBatch(input: CreateJobsBatchInput): Promise<QueueJob[]> {
    const jobsData: QueueJobInsert[] = input.jobs.map((job) => ({
      id: randomUUID(),
      queue_name: input.queueName,
      group_id: input.groupId || null,
      job_name: job.jobName,
      executor_name: job.executorName,
      payload: JSON.stringify(job.payload),
      result: null,
      status: 'waiting',
      priority: job.priority || 0,
      attempts: 0,
      max_attempts: job.maxAttempts || 3,
      delay_until: job.delayUntil || null,
      metadata: job.metadata ? JSON.stringify(job.metadata) : null
    }));

    const createdJobs = await this.db
      .insertInto('queue_jobs')
      .values(jobsData)
      .returningAll()
      .execute();

    return this.parseJobs(createdJobs);
  }

  /**
   * 根据ID查找任务
   */
  async findById(id: string): Promise<QueueJob | null> {
    const job = await this.db
      .selectFrom('queue_jobs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return job ? this.parseJob(job) : null;
  }

  /**
   * 获取待处理的任务（用于数据流加载）
   * 支持基于游标的分页，确保数据加载的连续性
   */
  async findPendingJobs(
    queueName: string,
    limit: number = 100,
    excludeGroupIds?: string[],
    cursor?: { priority: number; created_at: Date; id: string }
  ): Promise<QueueJob[]> {
    let query = this.db
      .selectFrom('queue_jobs')
      .selectAll()
      .where('queue_name', '=', queueName)
      .where('status', '=', 'waiting')
      .where((eb) =>
        eb.or([
          eb('delay_until', 'is', null),
          eb('delay_until', '<=', new Date())
        ])
      );

    // 排除暂停的分组
    if (excludeGroupIds && excludeGroupIds.length > 0) {
      query = query.where((eb) =>
        eb.or([
          eb('group_id', 'is', null),
          eb('group_id', 'not in', excludeGroupIds)
        ])
      );
    }

    // 基于游标的分页查询，确保连续性
    if (cursor) {
      query = query.where((eb) =>
        eb.or([
          // 优先级更低的任务
          eb('priority', '<', cursor.priority),
          // 同优先级但创建时间更晚的任务
          eb.and([
            eb('priority', '=', cursor.priority),
            eb('created_at', '>', cursor.created_at)
          ]),
          // 同优先级、同创建时间但ID更大的任务（确保绝对唯一性）
          eb.and([
            eb('priority', '=', cursor.priority),
            eb('created_at', '=', cursor.created_at),
            eb('id', '>', cursor.id)
          ])
        ])
      );
    }

    const jobs = await query
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .limit(limit)
      .execute();

    return this.parseJobs(jobs);
  }

  /**
   * 获取队列中的最后一个任务信息（用作游标）
   */
  async getLastJobCursor(
    queueName: string
  ): Promise<{ priority: number; created_at: Date; id: string } | null> {
    const job = await this.db
      .selectFrom('queue_jobs')
      .select(['priority', 'created_at', 'id'])
      .where('queue_name', '=', queueName)
      .where('status', '=', 'waiting')
      .where((eb) =>
        eb.or([
          eb('delay_until', 'is', null),
          eb('delay_until', '<=', new Date())
        ])
      )
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .limit(1)
      .executeTakeFirst();

    return job || null;
  }

  /**
   * 更新任务状态
   */
  async updateStatus(input: UpdateJobStatusInput): Promise<QueueJob | null> {
    const updateData: QueueJobUpdate = {
      status: input.status,
      updated_at: new Date()
    };

    if (input.result !== undefined) {
      updateData.result = JSON.stringify(input.result);
    }

    if (input.startedAt) {
      updateData.started_at = input.startedAt;
    }

    // 执行更新操作（MySQL不支持RETURNING子句）
    const updateResult = await this.db
      .updateTable('queue_jobs')
      .set(updateData)
      .where('id', '=', input.jobId)
      .execute();

    // 检查是否有记录被更新
    if (Number(updateResult[0]?.numUpdatedRows || 0) === 0) {
      this.log.warn({ jobId: input.jobId }, '任务状态更新失败：任务不存在');
      return null;
    }

    // 查询更新后的记录
    const updatedJob = await this.db
      .selectFrom('queue_jobs')
      .selectAll()
      .where('id', '=', input.jobId)
      .executeTakeFirst();

    this.log.info(
      {
        jobId: input.jobId,
        status: input.status,
        updatedRows: updateResult[0]?.numUpdatedRows
      },
      '任务状态更新成功'
    );

    return updatedJob ? this.parseJob(updatedJob) : null;
  }

  /**
   * 将任务移动到成功表
   */
  async moveToSuccess(
    job: QueueJobSelect,
    executionTime?: number
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      // 插入到成功表（不包含metadata）
      await trx
        .insertInto('queue_success')
        .values({
          id: job.id,
          queue_name: job.queue_name,
          group_id: job.group_id,
          job_name: job.job_name,
          executor_name: job.executor_name,
          payload:
            typeof job.payload === 'string'
              ? job.payload
              : JSON.stringify(job.payload),
          result: job.result
            ? typeof job.result === 'string'
              ? job.result
              : JSON.stringify(job.result)
            : null,
          attempts: job.attempts,
          execution_time: executionTime || null,
          created_at: job.created_at,
          started_at: job.started_at || new Date()
        })
        .execute();

      // 从运行时表删除
      await trx.deleteFrom('queue_jobs').where('id', '=', job.id).execute();
    });
  }

  /**
   * 标记任务为失败状态（不移动到失败表，保留在queue_jobs中便于重试）
   */
  async markAsFailed(
    job: QueueJobSelect,
    error: { message: string; stack?: string; code?: string }
  ): Promise<void> {
    await this.db
      .updateTable('queue_jobs')
      .set({
        status: 'failed',
        error_message: error.message,
        error_stack: error.stack || null,
        error_code: error.code || null,
        failed_at: new Date(),
        updated_at: new Date()
      })
      .where('id', '=', job.id)
      .execute();
  }

  /**
   * 重置失败任务为等待状态（用于重试）
   */
  async retryFailedJob(jobId: string): Promise<QueueJob | null> {
    const result = await this.db
      .updateTable('queue_jobs')
      .set({
        status: 'waiting',
        error_message: null,
        error_stack: null,
        error_code: null,
        failed_at: null,
        updated_at: new Date()
      })
      .where('id', '=', jobId)
      .where('status', '=', 'failed')
      .returningAll()
      .executeTakeFirst();

    return result ? this.parseJob(result) : null;
  }

  /**
   * 获取失败的任务列表
   */
  async getFailedJobs(
    queueName?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueueJob[]> {
    let query = this.db
      .selectFrom('queue_jobs')
      .selectAll()
      .where('status', '=', 'failed')
      .orderBy('failed_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (queueName) {
      query = query.where('queue_name', '=', queueName);
    }

    const jobs = await query.execute();
    return this.parseJobs(jobs);
  }

  /**
   * 将任务移动到失败表（保留原方法用于特殊情况）
   */
  async moveToFailure(
    job: QueueJobSelect,
    error: { message: string; stack?: string; code?: string }
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      // 插入到失败表
      await trx
        .insertInto('queue_failures')
        .values({
          id: job.id,
          queue_name: job.queue_name,
          group_id: job.group_id,
          job_name: job.job_name,
          executor_name: job.executor_name,
          payload:
            typeof job.payload === 'string'
              ? job.payload
              : JSON.stringify(job.payload),
          error_message: error.message,
          error_stack: error.stack || null,
          error_code: error.code || null,
          attempts: job.attempts,
          created_at: job.created_at,
          started_at: job.started_at,
          metadata: job.metadata
            ? typeof job.metadata === 'string'
              ? job.metadata
              : JSON.stringify(job.metadata)
            : null
        })
        .execute();

      // 从运行时表删除
      await trx.deleteFrom('queue_jobs').where('id', '=', job.id).execute();
    });
  }

  /**
   * 计算待处理任务数量
   */
  async countPendingJobs(queueName?: string): Promise<number> {
    try {
      let query = this.db
        .selectFrom('queue_jobs')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('status', '=', 'waiting')
        .where((eb) =>
          eb.or([
            eb('delay_until', 'is', null),
            eb('delay_until', '<=', new Date())
          ])
        );

      if (queueName) {
        query = query.where('queue_name', '=', queueName);
      }

      const result = await query.executeTakeFirst();
      return Number(result?.count || 0);
    } catch (err) {
      this.log.error({ err }, '计算待处理任务数量失败');
      return 0;
    }
  }

  /**
   * 暂停分组中的所有任务
   */
  async pauseGroup(queueName: string, groupId: string): Promise<number> {
    const result = await this.db
      .updateTable('queue_jobs')
      .set({
        status: 'paused',
        updated_at: new Date()
      })
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .where('status', 'in', ['waiting', 'delayed'])
      .execute();

    return Number(result[0]?.numUpdatedRows || 0);
  }

  /**
   * 恢复分组中的所有任务
   */
  async resumeGroup(queueName: string, groupId: string): Promise<number> {
    const result = await this.db
      .updateTable('queue_jobs')
      .set({
        status: 'waiting',
        updated_at: new Date()
      })
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .where('status', '=', 'paused')
      .execute();

    return Number(result[0]?.numUpdatedRows || 0);
  }

  // ============================================================================
  // 任务锁定机制相关方法
  // ============================================================================

  /**
   * 锁定任务用于处理
   */
  async lockJobForProcessing(
    jobId: string,
    instanceId: string,
    lockTimeoutMs: number
  ): Promise<boolean> {
    try {
      const lockUntil = new Date(Date.now() + lockTimeoutMs);

      // 使用原子操作锁定任务
      const result = await sql`
        UPDATE queue_jobs 
        SET 
          locked_at = NOW(),
          locked_by = ${instanceId},
          locked_until = ${lockUntil},
          updated_at = NOW()
        WHERE 
          id = ${jobId} 
          AND status = 'waiting'
          AND (locked_until IS NULL OR locked_until < NOW())
      `.execute(this.db);

      // 检查是否成功锁定（受影响的行数 > 0）
      const affectedRows = (result as any).numAffectedRows || 0;
      const isLocked = affectedRows > 0;

      if (isLocked) {
        this.log.debug({ jobId, instanceId }, '任务已锁定');
      } else {
        this.log.debug({ jobId }, '任务锁定失败，可能已被其他实例锁定');
      }

      return isLocked;
    } catch (error) {
      this.log.error('锁定任务失败', { jobId, error });
      return false;
    }
  }

  /**
   * 解锁任务
   */
  async unlockJob(jobId: string): Promise<void> {
    try {
      await sql`
        UPDATE queue_jobs 
        SET 
          locked_at = NULL,
          locked_by = NULL,
          locked_until = NULL,
          updated_at = NOW()
        WHERE id = ${jobId}
      `.execute(this.db);

      this.log.debug({ jobId }, '任务已解锁');
    } catch (error) {
      this.log.error('解锁任务失败', { jobId, error });
      throw error;
    }
  }

  /**
   * 查找被锁定的任务
   */
  async findLockedJobs(instanceId?: string): Promise<QueueJob[]> {
    try {
      let query = this.db
        .selectFrom('queue_jobs')
        .selectAll()
        .where('locked_until', 'is not', null);

      if (instanceId) {
        query = query.where('locked_by', '=', instanceId);
      }

      const jobs = await query.execute();
      return this.parseJobs(jobs);
    } catch (error) {
      this.log.error('查找被锁定任务失败', { error });
      throw error;
    }
  }

  /**
   * 查找孤儿执行任务
   */
  async findOrphanedExecutingJobs(
    timeoutMinutes: number = 10
  ): Promise<QueueJob[]> {
    try {
      const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const jobs = await this.db
        .selectFrom('queue_jobs')
        .selectAll()
        .where('status', '=', 'executing')
        .where('updated_at', '<', timeoutDate)
        .execute();

      return this.parseJobs(jobs);
    } catch (error) {
      this.log.error('查找孤儿执行任务失败', { error });
      throw error;
    }
  }

  /**
   * 重置任务状态为waiting
   */
  async resetJobToWaiting(jobId: string): Promise<void> {
    try {
      await sql`
        UPDATE queue_jobs 
        SET 
          status = 'waiting',
          locked_at = NULL,
          locked_by = NULL,
          locked_until = NULL,
          started_at = NULL,
          updated_at = NOW()
        WHERE id = ${jobId}
      `.execute(this.db);

      this.log.debug({ jobId }, '任务已重置为waiting状态');
    } catch (error) {
      this.log.error('重置任务状态失败', { jobId, error });
      throw error;
    }
  }

  /**
   * 重置所有任务的锁定状态
   */
  async resetAllJobLocks(): Promise<void> {
    try {
      const result = await sql`
        UPDATE queue_jobs 
        SET 
          locked_at = NULL,
          locked_by = NULL,
          locked_until = NULL,
          updated_at = NOW()
        WHERE 
          locked_until IS NOT NULL
      `.execute(this.db);

      const affectedRows = (result as any).numAffectedRows || 0;
      this.log.info({ affectedRows }, '已重置所有任务锁定状态');
    } catch (error) {
      this.log.error('重置任务锁定状态失败', { error });
      throw error;
    }
  }

  /**
   * 查找超时锁定的任务并自动解锁
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await sql`
        UPDATE queue_jobs 
        SET 
          locked_at = NULL,
          locked_by = NULL,
          locked_until = NULL,
          updated_at = NOW()
        WHERE 
          locked_until IS NOT NULL 
          AND locked_until < NOW()
      `.execute(this.db);

      const affectedRows = (result as any).numAffectedRows || 0;

      if (affectedRows > 0) {
        this.log.info({ cleanedLocks: affectedRows }, '已清理过期的任务锁定');
      }

      return affectedRows;
    } catch (error) {
      this.log.error('清理过期锁定失败', { error });
      throw error;
    }
  }

  /**
   * 检查任务是否被锁定
   */
  async isJobLocked(jobId: string): Promise<boolean> {
    try {
      const result = await this.db
        .selectFrom('queue_jobs')
        .select(['locked_until'])
        .where('id', '=', jobId)
        .executeTakeFirst();

      if (!result) {
        return false;
      }

      const lockedUntil = result.locked_until;
      if (!lockedUntil) {
        return false;
      }

      // 检查锁定是否已过期
      return new Date(lockedUntil) > new Date();
    } catch (error) {
      this.log.error('检查任务锁定状态失败', { jobId, error });
      return false;
    }
  }
}
