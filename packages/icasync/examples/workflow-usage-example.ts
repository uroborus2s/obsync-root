/**
 * ICAsync 动态并行同步工作流使用示例
 * 
 * 展示如何注册和使用优化后的ICAsync同步工作流
 */

import type { Logger } from '@stratix/core';
import type { IWorkflowAdapter } from '@stratix/tasks';
import { 
  OPTIMIZED_FULL_SYNC_WORKFLOW,
  OPTIMIZED_INCREMENTAL_SYNC_WORKFLOW,
  USER_PARALLEL_SYNC_WORKFLOW 
} from '../workflows/optimized-dynamic-workflows.js';
import { ICAsyncSyncManager } from '../workflows/sync-manager-example.js';
import WorkflowDefinitionService from '@stratix/tasks/services/WorkflowDefinitionService.js';

/**
 * ICAsync 工作流注册和使用示例
 */
export class ICAsyncWorkflowExample {
  constructor(
    private readonly workflowAdapter: IWorkflowAdapter,
    private readonly workflowDefinitionService: WorkflowDefinitionService,
    private readonly logger: Logger
  ) {}

  /**
   * 注册所有ICAsync工作流定义到数据库
   */
  async registerWorkflows(): Promise<void> {
    this.logger.info('开始注册ICAsync动态并行工作流定义');

    try {
      // 1. 注册全量同步工作流
      await this.registerWorkflow(OPTIMIZED_FULL_SYNC_WORKFLOW, '全量同步工作流');

      // 2. 注册增量同步工作流
      await this.registerWorkflow(OPTIMIZED_INCREMENTAL_SYNC_WORKFLOW, '增量同步工作流');

      // 3. 注册用户并行同步工作流
      await this.registerWorkflow(USER_PARALLEL_SYNC_WORKFLOW, '用户并行同步工作流');

      this.logger.info('所有ICAsync工作流定义注册完成');
    } catch (error) {
      this.logger.error('工作流定义注册失败', error);
      throw error;
    }
  }

  /**
   * 注册单个工作流定义
   */
  private async registerWorkflow(workflow: any, description: string): Promise<void> {
    try {
      const existingWorkflow = await this.workflowDefinitionService.getDefinition(
        workflow.name,
        workflow.version
      ).catch(() => null);

      if (existingWorkflow) {
        this.logger.info(`工作流定义已存在，跳过注册: ${workflow.name} v${workflow.version}`);
        return;
      }

      await this.workflowDefinitionService.createDefinition(workflow);
      this.logger.info(`${description}注册成功: ${workflow.name} v${workflow.version}`);
    } catch (error) {
      this.logger.error(`${description}注册失败: ${workflow.name}`, error);
      throw error;
    }
  }

  /**
   * 执行学期初全量同步示例
   */
  async executeFullSyncExample(): Promise<void> {
    this.logger.info('开始执行学期初全量同步示例');

    const syncManager = new ICAsyncSyncManager(this.workflowAdapter, this.logger);

    try {
      // 执行全量同步
      const result = await syncManager.executeFullSync('2024-2025-1', {
        batchSize: 50,           // 每批处理50门课程
        maxConcurrency: 6,       // 最大6个并发任务
        groupingStrategy: 'college', // 按学院分组
        errorHandling: 'continue',   // 遇到错误继续执行
        enableUserParallelSync: true, // 启用用户并行同步
        clearExisting: true,     // 清理现有数据
        waitForCompletion: false, // 不等待完成，后台执行
        requestedBy: 'example-system'
      });

      if (result.success) {
        this.logger.info('全量同步启动成功', {
          instanceId: result.instanceId,
          externalId: result.externalId,
          status: result.status
        });

        // 监控执行状态（可选）
        if (result.monitoringPromise) {
          result.monitoringPromise.catch(error => {
            this.logger.error('监控过程出现异常', error);
          });
        }

        // 演示状态查询
        setTimeout(async () => {
          const statusResult = await syncManager.getSyncStatus(result.instanceId!);
          if (statusResult.success) {
            this.logger.info('同步状态查询结果', {
              status: statusResult.status,
              progress: statusResult.progress,
              statistics: statusResult.statistics
            });
          }
        }, 30000); // 30秒后查询状态
      } else {
        this.logger.error('全量同步启动失败', result.error);
      }
    } catch (error) {
      this.logger.error('全量同步示例执行失败', error);
      throw error;
    }
  }

  /**
   * 执行增量同步示例
   */
  async executeIncrementalSyncExample(): Promise<void> {
    this.logger.info('开始执行增量同步示例');

    const syncManager = new ICAsyncSyncManager(this.workflowAdapter, this.logger);

    try {
      // 执行增量同步
      const result = await syncManager.executeIncrementalSync('2024-2025-1', {
        changeDetectionWindow: 12, // 检测12小时内的变更
        maxConcurrency: 4,         // 较低的并发数
        batchSize: 20,             // 小批量处理
        changeTypes: ['course', 'schedule'], // 只同步课程和日程变更
        errorHandling: 'continue',
        waitForCompletion: true,   // 等待完成
        requestedBy: 'daily-sync-cron'
      });

      if (result.success) {
        this.logger.info('增量同步完成', {
          instanceId: result.instanceId,
          status: result.status
        });
      } else {
        this.logger.error('增量同步失败', result.error);
      }
    } catch (error) {
      this.logger.error('增量同步示例执行失败', error);
      throw error;
    }
  }

  /**
   * 执行用户同步示例
   */
  async executeUserSyncExample(): Promise<void> {
    this.logger.info('开始执行用户同步示例');

    const syncManager = new ICAsyncSyncManager(this.workflowAdapter, this.logger);

    try {
      // 执行用户同步
      const result = await syncManager.executeUserSync('2024-2025-1', {
        userTypes: ['student', 'teacher'], // 同步学生和教师
        syncScope: 'college',              // 按学院范围
        maxConcurrency: 8,                 // 用户同步可以有更高并发
        batchSize: 100,                    // 大批量处理用户
        waitForCompletion: false,          // 后台执行
        requestedBy: 'user-sync-service'
      });

      if (result.success) {
        this.logger.info('用户同步启动成功', {
          instanceId: result.instanceId,
          status: result.status
        });
      } else {
        this.logger.error('用户同步启动失败', result.error);
      }
    } catch (error) {
      this.logger.error('用户同步示例执行失败', error);
      throw error;
    }
  }

  /**
   * 获取所有活跃同步任务示例
   */
  async getActiveSyncsExample(): Promise<void> {
    this.logger.info('获取活跃同步任务示例');

    const syncManager = new ICAsyncSyncManager(this.workflowAdapter, this.logger);

    try {
      const activeSyncs = await syncManager.getActiveSyncs();
      
      this.logger.info(`当前有 ${activeSyncs.length} 个活跃的同步任务`);
      
      activeSyncs.forEach((sync, index) => {
        this.logger.info(`活跃同步 ${index + 1}:`, {
          id: sync.id,
          name: sync.name,
          status: sync.status,
          startedAt: sync.startedAt,
          externalId: sync.externalId
        });
      });
    } catch (error) {
      this.logger.error('获取活跃同步任务失败', error);
    }
  }

  /**
   * 取消同步任务示例
   */
  async cancelSyncExample(instanceId: string): Promise<void> {
    this.logger.info(`取消同步任务示例: ${instanceId}`);

    const syncManager = new ICAsyncSyncManager(this.workflowAdapter, this.logger);

    try {
      const result = await syncManager.cancelSync(instanceId);
      
      if (result.success) {
        this.logger.info(`同步任务取消成功: ${instanceId}`);
      } else {
        this.logger.error(`同步任务取消失败: ${instanceId}`, result.error);
      }
    } catch (error) {
      this.logger.error('取消同步任务异常', error);
    }
  }

  /**
   * 综合示例：完整的学期初同步流程
   */
  async executeSemesterInitializationExample(): Promise<void> {
    this.logger.info('开始执行学期初完整同步流程示例');

    const syncManager = new ICAsyncSyncManager(this.workflowAdapter, this.logger);

    try {
      // 1. 首先执行全量同步
      this.logger.info('第1步：执行全量课程同步');
      const fullSyncResult = await syncManager.executeFullSync('2024-2025-1', {
        batchSize: 100,
        maxConcurrency: 10,
        groupingStrategy: 'auto',
        errorHandling: 'continue',
        enableUserParallelSync: false, // 暂时不启用用户同步
        clearExisting: true,
        waitForCompletion: true,       // 等待全量同步完成
        requestedBy: 'semester-initialization'
      });

      if (!fullSyncResult.success) {
        throw new Error(`全量同步失败: ${fullSyncResult.error}`);
      }

      this.logger.info('全量课程同步完成', {
        instanceId: fullSyncResult.instanceId
      });

      // 2. 执行用户同步
      this.logger.info('第2步：执行用户同步');
      const userSyncResult = await syncManager.executeUserSync('2024-2025-1', {
        userTypes: ['student', 'teacher'],
        syncScope: 'all',
        maxConcurrency: 12,
        batchSize: 150,
        waitForCompletion: true,
        requestedBy: 'semester-initialization'
      });

      if (!userSyncResult.success) {
        throw new Error(`用户同步失败: ${userSyncResult.error}`);
      }

      this.logger.info('用户同步完成', {
        instanceId: userSyncResult.instanceId
      });

      // 3. 验证同步结果
      this.logger.info('第3步：验证同步结果');
      const fullSyncStatus = await syncManager.getSyncStatus(fullSyncResult.instanceId!);
      const userSyncStatus = await syncManager.getSyncStatus(userSyncResult.instanceId!);

      if (fullSyncStatus.success && userSyncStatus.success) {
        this.logger.info('学期初同步流程完成', {
          fullSyncStatistics: fullSyncStatus.statistics,
          userSyncStatistics: userSyncStatus.statistics
        });
      } else {
        this.logger.warn('同步状态查询失败，但流程已完成');
      }
    } catch (error) {
      this.logger.error('学期初同步流程失败', error);
      throw error;
    }
  }

  /**
   * 性能测试示例：高并发同步
   */
  async executePerformanceTestExample(): Promise<void> {
    this.logger.info('开始执行性能测试示例');

    const syncManager = new ICAsyncSyncManager(this.workflowAdapter, this.logger);

    try {
      // 高性能配置的全量同步
      const result = await syncManager.executeFullSync('2024-2025-1', {
        batchSize: 200,          // 大批量处理
        maxConcurrency: 16,      // 高并发
        groupingStrategy: 'auto', // 智能分组
        errorHandling: 'continue',
        enableUserParallelSync: true,
        clearExisting: false,    // 不清理现有数据以减少I/O
        waitForCompletion: false,
        requestedBy: 'performance-test'
      });

      if (result.success) {
        this.logger.info('高性能同步启动成功', {
          instanceId: result.instanceId,
          配置: '200批量大小，16并发'
        });

        // 定期监控性能
        const monitoringInterval = setInterval(async () => {
          const status = await syncManager.getSyncStatus(result.instanceId!);
          if (status.success) {
            this.logger.info('性能监控', {
              status: status.status,
              progress: status.progress?.percentage,
              elapsedTime: status.progress?.elapsedTime
            });

            if (['completed', 'failed', 'cancelled'].includes(status.status!)) {
              clearInterval(monitoringInterval);
              this.logger.info('性能测试完成', {
                finalStatus: status.status,
                totalTime: status.progress?.elapsedTime,
                statistics: status.statistics
              });
            }
          }
        }, 15000); // 每15秒监控一次
      } else {
        this.logger.error('高性能同步启动失败', result.error);
      }
    } catch (error) {
      this.logger.error('性能测试示例执行失败', error);
      throw error;
    }
  }
}

/**
 * 使用示例的主函数
 */
export async function runICAsyncWorkflowExamples(
  workflowAdapter: IWorkflowAdapter,
  workflowDefinitionService: WorkflowDefinitionService,
  logger: Logger
): Promise<void> {
  const example = new ICAsyncWorkflowExample(
    workflowAdapter,
    workflowDefinitionService,
    logger
  );

  try {
    // 1. 注册工作流定义
    await example.registerWorkflows();

    // 2. 执行各种同步示例
    await example.executeFullSyncExample();
    
    // 等待一段时间后执行增量同步
    setTimeout(() => {
      example.executeIncrementalSyncExample().catch(error => {
        logger.error('增量同步示例失败', error);
      });
    }, 60000); // 1分钟后

    // 执行用户同步示例
    setTimeout(() => {
      example.executeUserSyncExample().catch(error => {
        logger.error('用户同步示例失败', error);
      });
    }, 30000); // 30秒后

    // 定期查询活跃任务
    setInterval(() => {
      example.getActiveSyncsExample().catch(error => {
        logger.error('获取活跃任务失败', error);
      });
    }, 120000); // 每2分钟查询一次

    logger.info('ICAsync工作流示例已启动，将在后台执行');
  } catch (error) {
    logger.error('ICAsync工作流示例执行失败', error);
    throw error;
  }
}