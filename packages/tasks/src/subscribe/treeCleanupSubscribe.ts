import { Logger } from '@stratix/core';
import { TaskNode } from '../entity/taskNode.js';
import { TaskMigrationRepository } from '../repositories/TaskMigrationRepository.js';
import { TaskStatus } from '../types/task.types.js';

/**
 * 任务树完成事件数据
 */
export interface TreeCompletionEvent {
  rootTaskId: string;
  finalStatus: TaskStatus;
  completedAt: Date;
  totalTasks: number;
  treeData: any;
}

/**
 * 处理任务树完成事件的函数式订阅
 * 负责将完成的任务树迁移到completed_tasks表并清理相关资源
 */
export const handleTreeCompletion =
  (log: Logger, taskMigrationRepo: TaskMigrationRepository) =>
  async (event: TreeCompletionEvent): Promise<void> => {
    /**
     * 迁移任务树到完成表
     */
    const migrateTaskTreeToCompletedTable = async (
      event: TreeCompletionEvent
    ): Promise<{
      success: boolean;
      migrated_count: number;
      message: string;
    }> => {
      try {
        // 将TaskStatus映射为迁移用的状态字符串
        const mapStatusForMigration = (
          status: TaskStatus
        ): 'success' | 'failed' | 'cancelled' | 'completed' => {
          switch (status) {
            case TaskStatus.SUCCESS:
              return 'success';
            case TaskStatus.FAILED:
              return 'failed';
            case TaskStatus.CANCELLED:
              return 'cancelled';
            case TaskStatus.COMPLETED:
              return 'completed';
            default:
              // 如果是其他状态，默认为completed
              return 'completed';
          }
        };

        const migrationResult = await taskMigrationRepo.migrateTaskTree(
          event.rootTaskId,
          mapStatusForMigration(event.finalStatus)
        );

        if (!migrationResult.success) {
          throw new Error(`数据库迁移失败: ${migrationResult.message}`);
        }

        log.info(
          {
            rootTaskId: event.rootTaskId,
            migratedCount: migrationResult.migrated_count,
            message: migrationResult.message
          },
          '任务树数据库迁移完成'
        );

        return {
          success: migrationResult.success,
          migrated_count: migrationResult.migrated_count || 0,
          message: migrationResult.message
        };
      } catch (error) {
        log.error(
          {
            rootTaskId: event.rootTaskId,
            finalStatus: event.finalStatus,
            error: error instanceof Error ? error.message : String(error)
          },
          '任务树数据库迁移失败'
        );
        throw error;
      }
    };

    const { rootTaskId, finalStatus, totalTasks } = event;

    log.info({ rootTaskId, finalStatus, totalTasks }, '开始处理任务树完成事件');

    try {
      // 步骤1：迁移数据库数据
      const migrationResult = await migrateTaskTreeToCompletedTable(event);

      log.info(
        {
          rootTaskId,
          finalStatus,
          totalTasks,
          migratedCount: migrationResult.migrated_count
        },
        '任务树完成处理成功：数据已迁移到completed_tasks表，内存已清理'
      );
    } catch (error) {
      log.error(
        {
          rootTaskId,
          finalStatus,
          totalTasks,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务树完成处理失败'
      );

      throw error;
    }
  };

/**
 * 获取任务树清理统计信息
 */
export const getTreeCleanupStats = (
  taskTreeRegistry: Map<string, TaskNode>
): {
  activeRootTasks: number;
  rootTaskIds: string[];
} => {
  const rootTasks = Array.from(taskTreeRegistry.values()).filter((task) =>
    task.isRoot()
  );

  return {
    activeRootTasks: rootTasks.length,
    rootTaskIds: rootTasks.map((task) => task.id)
  };
};

/**
 * 验证任务树完成事件参数
 */
export const validateTreeCompletionEvent = (
  event: TreeCompletionEvent,
  log: Logger
): boolean => {
  try {
    // 基本验证
    if (!event.rootTaskId || event.rootTaskId.trim() === '') {
      log.warn({ event }, '根任务ID不能为空');
      return false;
    }

    if (!event.finalStatus) {
      log.warn({ event }, '最终状态不能为空');
      return false;
    }

    if (event.totalTasks <= 0) {
      log.warn({ event }, '任务总数必须大于0');
      return false;
    }

    // 状态验证
    const validCompletionStatuses = [
      TaskStatus.SUCCESS,
      TaskStatus.FAILED,
      TaskStatus.CANCELLED,
      TaskStatus.COMPLETED
    ];

    if (!validCompletionStatuses.includes(event.finalStatus)) {
      log.warn(
        {
          event,
          validStatuses: validCompletionStatuses
        },
        '最终状态必须是完成状态之一'
      );
      return false;
    }

    return true;
  } catch (error) {
    log.error(
      {
        event,
        error: error instanceof Error ? error.message : String(error)
      },
      '任务树完成事件参数验证失败'
    );
    return false;
  }
};
