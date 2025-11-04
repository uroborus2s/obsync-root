// @stratix/icasync 全量同步适配器
// 基于 @stratix/tasks 预定义工作流的适配器实现

import type { AwilixContainer, Logger } from '@stratix/core';
import type {
  ITasksWorkflowAdapter,
  WorkflowInstance,
  WorkflowOptions
} from '@stratix/tasks';
import { SyncStatus, type SyncResult } from '../types/sync.js';

/**
 * 分页结果接口
 */
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 全量同步配置
 */
export interface FullSyncConfig {
  readonly xnxq: string;
  readonly batchSize?: number;
  readonly timeout?: number;
}

/**
 * 课表恢复配置
 */
export interface CourseRestoreConfig {
  readonly xgh: string;
  readonly userType: 'student' | 'teacher';
  readonly xnxq?: string;
  readonly dryRun?: boolean;
}

/**
 * 课表恢复结果
 */
export interface CourseRestoreResult {
  instanceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  userType: string;
  xgh: string;
  xnxq?: string;
  startTime: Date;
  endTime?: Date;
  totalCourses?: number;
  successCount?: number;
  failureCount?: number;
  executionTime?: number;
  results?: Array<{
    kkh: string;
    calendarId?: string;
    success: boolean;
    error?: string;
  }>;
  executionSummary?: {
    totalProcessed: number;
    successfulRestores: number;
    failedRestores: number;
    executionTime: number;
  };
  errors?: string[];
}

/**
 * 全量同步适配器
 * 注册名称：fullSync
 * 基于 @stratix/tasks 预定义工作流的适配器实现
 */
export default class FullSyncAdapter {
  static adapterName = 'fullSync';

  private workflowAdapter: ITasksWorkflowAdapter;
  private logger: Logger;

  constructor(container: AwilixContainer) {
    // 使用 WorkflowAdapter 作为代理，而不是直接访问底层服务
    this.workflowAdapter = container.resolve('tasksWorkflow');
    // 使用新的ICAsync互斥管理器
    this.logger = container.resolve('logger');
  }

  /**
   * 手动启动全量同步
   *
   * 使用增强的getWorkflowInstance功能，通过workflowName和version方式调用工作流
   *
   * @param options 同步选项
   * @param options.xnxq 学年学期标识，格式：YYYY-YYYY-S（如：2024-2025-1）
   * @param options.forceSync 是否强制同步，默认false
   * @param options.batchSize 批处理大小，默认1000
   * @param options.businessKey 业务键，用于实例锁检查
   * @returns 同步结果，包含工作流实例ID和状态
   */
  async startManualSync(options: {
    xnxq: string;
    forceSync?: boolean;
    batchSize?: number;
    businessKey?: string;
  }): Promise<SyncResult> {
    try {
      this.logger.info('开始手动启动全量同步', { options });

      // 验证学年学期格式
      if (!this.validateXnxq(options.xnxq)) {
        return {
          status: SyncStatus.FAILED,
          startTime: new Date(),
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          errors: ['学年学期格式错误，应为：YYYY-YYYY-S（如：2024-2025-1）']
        };
      }

      // 准备工作流选项
      const workflowOptions: WorkflowOptions = {
        // 使用增强的getWorkflowInstance功能，通过name+version方式调用
        workflowName: 'full-sync-multi-loop-workflow',
        workflowVersion: '3.0.0',

        // 业务参数
        businessKey: options.businessKey || `full-sync-${options.xnxq}}`,

        // 输入数据
        inputData: {
          xnxq: options.xnxq,
          forceSync: options.forceSync || false,
          batchSize: options.batchSize || 1000,
          syncType: 'full',
          triggeredBy: 'manual',
          triggeredAt: new Date().toISOString()
        },

        // 上下文数据
        contextData: {
          instanceType: 'sync-class-schedule',
          createdBy: 'manual-trigger',
          syncMode: 'manual',
          priority: 'high'
        }
      };

      this.logger.debug('准备启动工作流', { workflowOptions });

      // 使用增强的工作流启动方法
      const workflowResult = await this.workflowAdapter.startWorkflowByName(
        'full-sync-multi-loop-workflow',
        workflowOptions
      );

      if (isLeft(workflowResult)) {
        this.logger.left('启动工作流失败', {
          error: workflowResult.left,
          errorDetails: workflowResult.leftDetails
        });

        return {
          status: SyncStatus.FAILED,
          startTime: new Date(),
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          errors: ['启动同步工作流失败'],
          details: { error: workflowResult.left }
        };
      }

      const workflowInstance = workflowResult.right;

      if (workflowInstance) {
        this.logger.info('工作流启动成功', {
          instanceId: workflowInstance.id,
          workflowName: workflowInstance.name,
          status: workflowInstance.status
        });

        return {
          status: SyncStatus.IN_PROGRESS,
          startTime: workflowInstance.startedAt || new Date(),
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          details: {
            instanceId: workflowInstance.id.toString(),
            workflowName: 'full-sync-multi-loop-workflow',
            workflowVersion: '3.0.0',
            inputData: workflowOptions.inputData
          }
        };
      } else {
        return {
          status: SyncStatus.FAILED,
          startTime: new Date(),
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          errors: ['工作流实例创建失败']
        };
      }
    } catch (error) {
      this.logger.left('手动启动同步异常', { error, options });

      return {
        status: SyncStatus.FAILED,
        startTime: new Date(),
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 验证学年学期格式
   * @param xnxq 学年学期字符串
   * @returns 是否有效
   */
  private validateXnxq(xnxq: string): boolean {
    // 格式：YYYY-YYYY-S，如：2024-2025-1
    const pattern = /^\d{4}-\d{4}-[12]$/;
    return pattern.test(xnxq);
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<SyncResult> {
    try {
      this.logger.info('获取同步状态');

      // 查询正在运行的工作流实例
      const runningInstancesResult =
        await this.workflowAdapter.getWorkflowInstances({
          status: 'running',
          instanceType: 'full-sync-multi-loop-workflow'
        });

      if (isLeft(runningInstancesResult)) {
        this.logger.left(
          '查询运行中的工作流实例失败',
          runningInstancesResult.left
        );
        return {
          status: SyncStatus.FAILED,
          startTime: new Date(),
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          errors: ['查询同步状态失败'],
          details: { error: runningInstancesResult.left }
        };
      }

      const runningInstances = runningInstancesResult.right || [];

      if (runningInstances.length > 0) {
        return {
          status: SyncStatus.IN_PROGRESS,
          startTime: runningInstances[0].startedAt || new Date(),
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          details: {
            instanceId: runningInstances[0].id,
            message: '同步正在进行中'
          }
        };
      }

      // 查询最近完成的实例
      const recentInstancesResult =
        await this.workflowAdapter.getWorkflowInstances(
          {
            instanceType: 'full-sync-multi-loop-workflow'
          },
          {
            pageSize: 1,
            sortBy: 'completedAt',
            sortOrder: 'desc'
          }
        );

      if (
        isRight(recentInstancesResult) &&
        recentInstancesResult.right &&
        recentInstancesResult.right.length > 0
      ) {
        const lastInstance = recentInstancesResult.right[0];
        return {
          status:
            lastInstance.status === 'completed'
              ? SyncStatus.COMPLETED
              : SyncStatus.FAILED,
          startTime: lastInstance.startedAt || new Date(),
          endTime: lastInstance.completedAt,
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          details: {
            instanceId: lastInstance.id,
            message:
              lastInstance.status === 'completed'
                ? '上次同步已完成'
                : '上次同步失败',
            error: lastInstance.leftMessage
          }
        };
      }

      return {
        status: SyncStatus.PENDING,
        startTime: new Date(),
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        details: { message: '暂无同步记录' }
      };
    } catch (error) {
      this.logger.left('获取同步状态异常', error);
      return {
        status: SyncStatus.FAILED,
        startTime: new Date(),
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        details: { message: '获取同步状态异常' }
      };
    }
  }

  /**
   * 诊断工作流适配器连接和查询功能
   */
  async diagnoseworkflowAdapter(): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    const diagnosis: Record<string, any> = {};

    try {
      this.logger.info(`[FullSyncAdapter] Starting workflow adapter diagnosis`);

      // 1. 检查适配器是否存在
      diagnosis.adapterExists =
        this.workflowAdapter !== null && this.workflowAdapter !== undefined;
      this.logger.debug(
        `[FullSyncAdapter] Adapter exists: ${diagnosis.adapterExists}`
      );

      if (!diagnosis.adapterExists) {
        return {
          success: false,
          details: diagnosis,
          error: 'WorkflowAdapter is null or undefined'
        };
      }

      // 2. 测试简单的状态查询（不带名称过滤）
      this.logger.debug(`[FullSyncAdapter] Testing simple status query`);
      const simpleQuery = await this.workflowAdapter.getWorkflowInstances(
        {
          status: 'running'
        },
        {
          pageSize: 5
        }
      );

      diagnosis.simpleQuery = {
        success: isRight(simpleQuery),
        error: simpleQuery.left,
        dataLength: simpleQuery.right?.length || 0,
        hasData: !!(simpleQuery.right && simpleQuery.right.length > 0)
      };

      if (isLeft(simpleQuery)) {
        this.logger.left(`[FullSyncAdapter] Simple query failed`, {
          error: simpleQuery.left
        });
        return {
          success: false,
          details: diagnosis,
          error: `Simple query failed: ${simpleQuery.left}`
        };
      }

      // 3. 测试带名称过滤的查询
      this.logger.debug(`[FullSyncAdapter] Testing query with name filter`);
      const nameFilterQuery = await this.workflowAdapter.getWorkflowInstances(
        {
          status: 'running',
          instanceType: 'icasync-full-sync'
        },
        {
          pageSize: 5
        }
      );

      diagnosis.nameFilterQuery = {
        success: isRight(nameFilterQuery),
        error: nameFilterQuery.left,
        dataLength: nameFilterQuery.right?.length || 0,
        hasData: !!(nameFilterQuery.right && nameFilterQuery.right.length > 0)
      };

      // 4. 测试获取所有实例（不按状态过滤）
      this.logger.debug(
        `[FullSyncAdapter] Testing query without status filter`
      );
      const allInstancesQuery = await this.workflowAdapter.getWorkflowInstances(
        {},
        {
          pageSize: 10
        }
      );

      diagnosis.allInstancesQuery = {
        success: isRight(allInstancesQuery),
        error: allInstancesQuery.left,
        dataLength: allInstancesQuery.right?.length || 0,
        hasData: !!(allInstancesQuery.right && allInstancesQuery.right.length > 0)
      };

      this.logger.info(
        `[FullSyncAdapter] Workflow adapter diagnosis completed`,
        { diagnosis }
      );

      return {
        success: true,
        details: diagnosis
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left(`[FullSyncAdapter] Diagnosis failed`, {
        error: errorMessage,
        diagnosis
      });

      return {
        success: false,
        details: diagnosis,
        error: errorMessage
      };
    }
  }

  /**
   * 恢复中断的全量同步任务
   * @param xnxq 可选的学年学期过滤条件
   */
  async recoverInterruptedSyncs(xnxq?: string): Promise<{
    recovered: number;
    failed: number;
    details: Array<{
      instanceId: string;
      xnxq: string;
      status: 'recovered' | 'failed';
      error?: string;
    }>;
  }> {
    this.logger.info(
      `[FullSyncAdapter] Starting recovery for interrupted syncs`,
      { xnxq }
    );

    try {
      // 先测试基本的工作流适配器连接
      this.logger.debug(`[FullSyncAdapter] Testing workflowAdapter connection`);

      // 查找所有运行中的 icasync-full-sync 工作流实例
      this.logger.debug(
        `[FullSyncAdapter] Calling listWorkflowInstances with filters`,
        {
          status: 'running',
          name: 'icasync-full-sync',
          limit: 50
        }
      );

      const runningInstances = await this.workflowAdapter.getWorkflowInstances(
        {
          status: 'running',
          instanceType: 'icasync-full-sync'
        },
        {
          pageSize: 50
        }
      );

      this.logger.debug(`[FullSyncAdapter] getWorkflowInstances result`, {
        success: isRight(runningInstances),
        error: runningInstances.left,
        dataLength: runningInstances.right?.length || 0
      });

      if (isLeft(runningInstances)) {
        const errorMessage = `查询运行中实例失败: ${runningInstances.left}`;
        this.logger.left(`[FullSyncAdapter] ${errorMessage}`, {
          originalError: runningInstances.left,
          filters: { status: 'running', name: 'icasync-full-sync', limit: 50 }
        });
        throw new Error(errorMessage);
      }

      const paginatedData =
        runningInstances.right as unknown as PaginatedResult<WorkflowInstance>;
      const instances = paginatedData?.items || [];
      let filteredInstances = instances;

      // 如果指定了 xnxq，过滤实例
      if (xnxq) {
        filteredInstances = instances.filter((instance: WorkflowInstance) => {
          const inputXnxq = instance.inputData?.xnxq;
          return inputXnxq === xnxq;
        });
      }

      if (filteredInstances.length === 0) {
        this.logger.info(
          `[FullSyncAdapter] No interrupted sync instances found`,
          { xnxq }
        );
        return { recovered: 0, failed: 0, details: [] };
      }

      this.logger.info(
        `[FullSyncAdapter] Found ${filteredInstances.length} potentially interrupted instances`
      );

      const recoveryResults = await Promise.allSettled(
        filteredInstances.map((instance) =>
          this.recoverSingleSyncInstance(instance)
        )
      );

      // 统计结果
      const details: Array<{
        instanceId: string;
        xnxq: string;
        status: 'recovered' | 'failed';
        error?: string;
      }> = [];

      let recovered = 0;
      let failed = 0;

      recoveryResults.forEach((result, index) => {
        const instance = filteredInstances[index];
        const instanceXnxq = instance.inputData?.xnxq || 'unknown';

        if (result.status === 'fulfilled') {
          details.push({
            instanceId: instance.id.toString(),
            xnxq: instanceXnxq,
            status: 'recovered'
          });
          recovered++;
        } else {
          details.push({
            instanceId: instance.id.toString(),
            xnxq: instanceXnxq,
            status: 'failed',
            error: result.reason?.message || String(result.reason)
          });
          failed++;
        }
      });

      this.logger.info(`[FullSyncAdapter] Recovery completed`, {
        total: filteredInstances.length,
        recovered,
        failed
      });

      return { recovered, failed, details };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left(`[FullSyncAdapter] Recovery failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 恢复单个同步实例
   */
  private async recoverSingleSyncInstance(
    instance: WorkflowInstance
  ): Promise<void> {
    const instanceId =
      typeof instance.id === 'number'
        ? instance.id
        : parseInt(String(instance.id));
    const xnxq = instance.inputData?.xnxq || 'unknown';

    this.logger.info(`[FullSyncAdapter] Attempting to recover sync instance`, {
      instanceId,
      xnxq,
      currentStatus: instance.status
    });

    try {
      // 检查实例是否真的需要恢复
      const currentInstance =
        await this.workflowAdapter.getWorkflowInstance(instanceId);

      if (isLeft(currentInstance)) {
        throw new Error(`无法获取实例状态: ${currentInstance.left}`);
      }

      const currentStatus = currentInstance.right?.status;

      if (currentStatus === 'completed') {
        this.logger.info(`[FullSyncAdapter] Instance already completed`, {
          instanceId,
          xnxq
        });
        return;
      }

      if (currentStatus === 'failed') {
        this.logger.info(`[FullSyncAdapter] Instance failed, cannot recover`, {
          instanceId,
          xnxq
        });
        throw new Error('实例已失败，无法恢复');
      }

      // 尝试恢复执行
      const resumeResult =
        await this.workflowAdapter.resumeWorkflow(instanceId);

      if (isLeft(resumeResult)) {
        throw new Error(`恢复工作流失败: ${resumeResult.left}`);
      }

      this.logger.info(
        `[FullSyncAdapter] Successfully recovered sync instance`,
        {
          instanceId,
          xnxq
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left(`[FullSyncAdapter] Failed to recover sync instance`, {
        instanceId,
        xnxq,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * 检查指定学年学期是否有正在运行的同步任务
   */
  async checkRunningSyncForXnxq(xnxq: string): Promise<{
    isRunning: boolean;
    instance?: WorkflowInstance;
  }> {
    try {
      const runningInstances = await this.workflowAdapter.getWorkflowInstances(
        {
          status: 'running',
          instanceType: 'icasync-full-sync'
        },
        {
          pageSize: 20
        }
      );

      if (isLeft(runningInstances)) {
        throw new Error(`查询运行中实例失败: ${runningInstances.left}`);
      }

      const instances = runningInstances.right || [];
      const matchingInstance = instances.find((instance: WorkflowInstance) => {
        const inputXnxq = instance.inputData?.xnxq;
        return inputXnxq === xnxq;
      });

      return {
        isRunning: !!matchingInstance,
        instance: matchingInstance
      };
    } catch (error) {
      this.logger.left(`[FullSyncAdapter] Failed to check running sync`, {
        xnxq,
        error
      });
      return { isRunning: false };
    }
  }

  /**
   * 启动服务时自动恢复中断的同步任务
   * 通过 WorkflowAdapter 代理访问恢复功能
   */
  async startupRecovery(): Promise<void> {
    this.logger.info(`[FullSyncAdapter] Starting startup recovery`);

    try {
      // 通过 WorkflowAdapter 进行恢复检查
      await this.recoverInterruptedSyncs();

      this.logger.info(`[FullSyncAdapter] Startup recovery completed`);
    } catch (error) {
      this.logger.left(`[FullSyncAdapter] Startup recovery failed`, { error });
      // 不抛出异常，避免影响服务启动
    }
  }

  /**
   * 启动课表恢复工作流
   *
   * @param config 课表恢复配置
   * @param config.xgh 学号或工号
   * @param config.userType 用户类型（student/teacher）
   * @param config.xnxq 学年学期（可选）
   * @param config.dryRun 是否为测试运行模式（可选，默认false）
   * @returns 工作流实例ID和启动状态
   */
  async startCourseRestoreWorkflow(config: CourseRestoreConfig): Promise<{
    success: boolean;
    instanceId?: string;
    status?: string;
    error?: string;
    details?: any;
  }> {
    try {
      this.logger.info('开始启动课表恢复工作流', { config });

      // 验证输入参数
      const validationResult = this.validateCourseRestoreConfig(config);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `参数验证失败: ${validationResult.lefts?.join(', ')}`
        };
      }

      // 验证学年学期格式（如果提供）
      if (config.xnxq && !this.validateXnxq(config.xnxq)) {
        return left('学年学期格式错误，应为：YYYY-YYYY-S（如：2024-2025-1）'
        );
      }

      // 准备工作流选项
      const workflowOptions: WorkflowOptions = {
        workflowName: 'course-restore-workflow',
        workflowVersion: '1.0.0',

        // 业务键，用于防止重复执行
        businessKey: `course-restore-${config.xgh}-${Date.now()}}`,

        // 输入数据
        inputData: {
          userType: config.userType,
          xgh: config.xgh,
          xnxq: config.xnxq,
          dryRun: config.dryRun || false
        },

        // 上下文数据
        contextData: {
          instanceType: 'course-restore',
          createdBy: 'api-request',
          userType: config.userType,
          priority: 'normal'
        }
      };

      this.logger.debug('准备启动课表恢复工作流', { workflowOptions });

      // 启动工作流
      const workflowResult = await this.workflowAdapter.startWorkflowByName(
        'course-restore-workflow',
        workflowOptions
      );

      if (isLeft(workflowResult)) {
        this.logger.left('启动课表恢复工作流失败', {
          error: workflowResult.left,
          errorDetails: workflowResult.leftDetails,
          config
        });

        return {
          success: false,
          error: '启动课表恢复工作流失败',
          details: {
            originalError: workflowResult.left,
            errorDetails: workflowResult.leftDetails
          }
        };
      }

      const workflowInstance = workflowResult.right;

      if (workflowInstance) {
        this.logger.info('课表恢复工作流启动成功', {
          instanceId: workflowInstance.id,
          workflowName: workflowInstance.name,
          status: workflowInstance.status,
          config
        });

        return {
          success: true,
          instanceId: workflowInstance.id.toString(),
          status: workflowInstance.status,
          details: {
            workflowName: 'course-restore-workflow',
            workflowVersion: '1.0.0',
            inputData: workflowOptions.inputData,
            startedAt: workflowInstance.startedAt
          }
        };
      } else {
        return left('工作流实例创建失败'
        );
      }
    } catch (error) {
      this.logger.left('启动课表恢复工作流异常', { error, config });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: { exception: true }
      };
    }
  }

  /**
   * 验证课表恢复配置参数
   */
  private validateCourseRestoreConfig(config: CourseRestoreConfig): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // 验证学号/工号
    if (
      !config.xgh ||
      typeof config.xgh !== 'string' ||
      config.xgh.trim().length === 0
    ) {
      errors.push('学号或工号不能为空');
    } else if (config.xgh.length > 20) {
      errors.push('学号或工号长度不能超过20个字符');
    }

    // 验证用户类型
    if (!config.userType) {
      errors.push('用户类型不能为空');
    } else if (!['student', 'teacher'].includes(config.userType)) {
      errors.push('用户类型必须是 student 或 teacher');
    }

    // 验证学年学期格式（如果提供）
    if (config.xnxq && !this.validateXnxq(config.xnxq)) {
      errors.push('学年学期格式错误，应为：YYYY-YYYY-S（如：2024-2025-1）');
    }

    // 验证dryRun参数
    if (config.dryRun !== undefined && typeof config.dryRun !== 'boolean') {
      errors.push('dryRun参数必须是布尔值');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
