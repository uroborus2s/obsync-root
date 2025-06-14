import { IStratixApp, Logger } from '@stratix/core';
import { TaskStatus, TaskStatusSyncEvent } from '../entity/types.js';
import { RunningTaskRepository } from '../repositories/RunningTaskRepository.js';

/**
 * 状态更新暂存项
 */
interface PendingStatusUpdate {
  taskId: string;
  status: string;
  progress: number;
  timestamp: Date;
  event: TaskStatusSyncEvent;
}

/**
 * 状态同步统计信息
 */
interface StatusSyncStats {
  pendingUpdates: number;
  processingTasks: number;
}

// 全局状态管理
/** 暂存的状态更新 */
const pendingUpdates = new Map<string, PendingStatusUpdate>();

/** 正在处理的任务ID集合 */
const processingTasks = new Set<string>();

/** Logger 实例 */
let locallog: Logger | null = null;

/** Repository 实例 */
let localRunningTaskRepo: RunningTaskRepository | null = null;

/** App 实例 */
let localApp: IStratixApp | null = null;

/**
 * 初始化状态同步管理器
 */
const initializeStatusSync = (
  log: Logger,
  repo: RunningTaskRepository,
  app: IStratixApp
): void => {
  if (!locallog) {
    locallog = log;
    localRunningTaskRepo = repo;
    localApp = app;
    locallog.info('状态同步管理器已初始化');
  }
};

/**
 * 添加状态更新到暂存或直接处理
 */
const addStatusUpdate = async (event: TaskStatusSyncEvent): Promise<void> => {
  const { taskId } = event;

  if (!locallog) return;

  // 创建暂存项
  const pendingUpdate: PendingStatusUpdate = {
    taskId,
    status: event.toStatus,
    progress: event.progress,
    timestamp: new Date(),
    event
  };

  // 检查是否有数据库写操作正在进行
  if (processingTasks.has(taskId)) {
    // 有写操作正在进行，保存到暂存中（覆盖之前的暂存）
    pendingUpdates.set(taskId, pendingUpdate);

    locallog.debug(
      {
        taskId,
        status: event.toStatus,
        progress: event.progress,
        pendingCount: pendingUpdates.size
      },
      '任务正在处理中，状态更新已保存到暂存'
    );
  } else {
    // 没有写操作正在进行，直接处理
    locallog.debug(
      {
        taskId,
        status: event.toStatus,
        progress: event.progress
      },
      '开始直接处理状态更新'
    );

    await processStatusUpdate(pendingUpdate);
  }
};

/**
 * 处理状态更新
 */
const processStatusUpdate = async (
  update: PendingStatusUpdate
): Promise<void> => {
  const { taskId } = update;

  if (!locallog) return;

  // 标记任务为处理中
  processingTasks.add(taskId);

  try {
    locallog.debug(
      {
        taskId,
        status: update.status,
        progress: update.progress,
        timestamp: update.timestamp
      },
      '开始处理状态更新'
    );

    // 执行数据库更新
    await updateTaskStatus(update);

    locallog.debug({ taskId, status: update.status }, '状态更新处理完成');
  } catch (error) {
    locallog.error(
      {
        taskId,
        error: error instanceof Error ? error.message : String(error)
      },
      '处理状态更新失败'
    );
  } finally {
    // 移除处理中标记
    processingTasks.delete(taskId);

    // 检查是否有暂存的更新需要处理
    await checkAndProcessPendingUpdates(taskId);
  }
};

/**
 * 检查并处理暂存的更新
 */
const checkAndProcessPendingUpdates = async (taskId: string): Promise<void> => {
  if (!locallog) return;

  // 检查是否有该任务的暂存更新
  const pendingUpdate = pendingUpdates.get(taskId);
  if (pendingUpdate) {
    locallog.debug({ taskId }, '检测到暂存的状态更新，开始处理');

    // 从暂存中移除（清空暂存）
    pendingUpdates.delete(taskId);

    // 递归处理暂存的更新
    await processStatusUpdate(pendingUpdate);
  } else {
    locallog.debug({ taskId }, '没有暂存的状态更新，处理完成');
  }
};

/**
 * 更新任务状态到数据库
 */
const updateTaskStatus = async (update: PendingStatusUpdate): Promise<void> => {
  const { taskId, status, progress } = update;

  if (!locallog || !localRunningTaskRepo) return;

  try {
    // 检查任务是否已存在于运行中任务表
    const existingTask = await localRunningTaskRepo.findById(taskId);

    if (existingTask) {
      // 更新现有任务的状态和进度
      await localRunningTaskRepo.updateStatus(taskId, status as any, progress);
      locallog.debug({ taskId, status, progress }, '运行中任务状态已更新');

      if (localApp && status === TaskStatus.RUNNING) {
        const taskTreeService = localApp.tryResolve('taskTreeService');
        if (taskTreeService) {
          // 延迟100ms执行，避免任务状态变更过于频繁
          setTimeout(() => {
            taskTreeService
              .run(taskId, '状态变为running后自动执行onRun')
              .catch((error: any) => {
                locallog!.error(
                  {
                    taskId,
                    error:
                      error instanceof Error ? error.message : String(error)
                  },
                  '运行任务失败'
                );
              });
          }, 100);
        }
      } else {
        // 如果任务不存在，记录日志但不做处理
        locallog.debug(
          { taskId, status },
          '任务不存在于运行中任务表，跳过更新'
        );
      }
    }
  } catch (error) {
    locallog.error(
      {
        taskId,
        status,
        error: error instanceof Error ? error.message : String(error)
      },
      '更新运行中任务状态失败'
    );
    throw error;
  }
};

/**
 * 获取暂存统计信息
 */
const getStats = (): StatusSyncStats => {
  return {
    pendingUpdates: pendingUpdates.size,
    processingTasks: processingTasks.size
  };
};

/**
 * 状态同步处理器
 * 解决短时间内多次状态更新导致的数据库时序问题
 *
 * 处理流程：
 * 1. 当触发消息时，检查是否有写数据库的操作正在进行
 * 2. 如果有写操作，将状态保存到暂存中
 * 3. 如果没有写操作，直接处理状态更新
 * 4. 每次写数据库完成后检查暂存
 * 5. 如果有暂存，取最后一个开始写数据库，同时清空暂存
 * 6. 如果在写数据库过程中有新消息，会写入暂存，等待当前写操作完成
 */
export const handleStatusSync = (
  log: Logger,
  runningTaskRepo: RunningTaskRepository,
  app: IStratixApp
) => {
  // 初始化状态同步管理器
  initializeStatusSync(log, runningTaskRepo, app);

  return async (event: TaskStatusSyncEvent): Promise<void> => {
    try {
      log.debug(
        {
          taskId: event.taskId,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          executorName: event.executorName,
          stats: getStats()
        },
        '接收到状态同步事件'
      );

      // 添加到处理队列（可能直接处理或暂存）
      await addStatusUpdate(event);
    } catch (error) {
      if (log) {
        log.error(
          {
            taskId: event.taskId,
            event,
            error: error instanceof Error ? error.message : String(error)
          },
          '处理状态同步事件失败'
        );
      }
      // 不重新抛出错误，避免影响任务状态变更
    }
  };
};

/**
 * 获取状态同步管理器统计信息（用于监控和调试）
 */
export const getStatusSyncStats = (): StatusSyncStats | null => {
  return locallog ? getStats() : null;
};

/**
 * 清理资源
 */
export const cleanup = (): void => {
  // 清理暂存数据
  pendingUpdates.clear();
  processingTasks.clear();

  // 重置状态
  locallog = null;
  localRunningTaskRepo = null;
  localApp = null;

  console.log('状态同步管理器资源已清理');
};
