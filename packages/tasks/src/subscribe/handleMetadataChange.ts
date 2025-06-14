/**
 * Metadata 变更事件处理器
 * 当任务的 metadata 发生变更时，同步更新数据库中的数据
 */

import { Logger } from 'packages/core/dist/types/index.js';
import type { MetadataChangeEvent } from '../entity/executor.types.js';
import type { RunningTaskRepository } from '../repositories/RunningTaskRepository.js';

/**
 * Metadata 更新暂存项
 */
interface PendingMetadataUpdate {
  taskId: string;
  metadata: Record<string, any>;
  timestamp: Date;
  event: MetadataChangeEvent;
}

/**
 * Metadata 同步统计信息
 */
interface MetadataSyncStats {
  pendingUpdates: number;
  processingTasks: number;
}

// 全局状态管理
/** 暂存的 metadata 更新 */
const pendingUpdates = new Map<string, PendingMetadataUpdate>();

/** 正在处理的任务ID集合 */
const processingTasks = new Set<string>();

/** Logger 实例 */
let localLog: Logger | null = null;

/** Repository 实例 */
let localRunningTaskRepo: RunningTaskRepository | null = null;

/**
 * 初始化 metadata 同步管理器
 */
const initializeMetadataSync = (
  logger: Logger,
  repo: RunningTaskRepository
): void => {
  if (!localLog) {
    localLog = logger;
    localRunningTaskRepo = repo;
    localLog.info('Metadata 同步管理器已初始化');
  }
};

/**
 * 添加 metadata 更新到暂存或直接处理
 */
const addMetadataUpdate = async (event: MetadataChangeEvent): Promise<void> => {
  const { taskId } = event;

  if (!localLog) return;

  // 创建暂存项
  const pendingUpdate: PendingMetadataUpdate = {
    taskId,
    metadata: event.newMetadata,
    timestamp: new Date(),
    event
  };

  // 检查是否有数据库写操作正在进行
  if (processingTasks.has(taskId)) {
    // 有写操作正在进行，保存到暂存中（覆盖之前的暂存）
    pendingUpdates.set(taskId, pendingUpdate);

    localLog.debug(
      {
        taskId,
        reason: event.reason,
        changedFields: event.changedFields,
        pendingCount: pendingUpdates.size
      },
      '任务正在处理中，metadata 更新已保存到暂存'
    );
  } else {
    // 没有写操作正在进行，直接处理
    localLog.debug(
      {
        taskId,
        reason: event.reason,
        changedFields: event.changedFields
      },
      '开始直接处理 metadata 更新'
    );

    await processMetadataUpdate(pendingUpdate);
  }
};

/**
 * 处理 metadata 更新
 */
const processMetadataUpdate = async (
  update: PendingMetadataUpdate
): Promise<void> => {
  const { taskId } = update;

  if (!localLog) return;

  // 标记任务为处理中
  processingTasks.add(taskId);

  try {
    localLog.debug(
      {
        taskId,
        reason: update.event.reason,
        changedFields: update.event.changedFields,
        timestamp: update.timestamp
      },
      '开始处理 metadata 更新'
    );

    // 执行数据库更新
    await updateTaskMetadata(update);

    localLog.debug(
      { taskId, reason: update.event.reason },
      'Metadata 更新处理完成'
    );
  } catch (error) {
    localLog.error(
      {
        taskId,
        error: error instanceof Error ? error.message : String(error)
      },
      '处理 metadata 更新失败'
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
  if (!localLog) return;

  // 检查是否有该任务的暂存更新
  const pendingUpdate = pendingUpdates.get(taskId);
  if (pendingUpdate) {
    localLog.debug({ taskId }, '检测到暂存的 metadata 更新，开始处理');

    // 从暂存中移除（清空暂存）
    pendingUpdates.delete(taskId);

    // 递归处理暂存的更新
    await processMetadataUpdate(pendingUpdate);
  } else {
    localLog.debug({ taskId }, '没有暂存的 metadata 更新，处理完成');
  }
};

/**
 * 更新任务 metadata 到数据库
 */
const updateTaskMetadata = async (
  update: PendingMetadataUpdate
): Promise<void> => {
  const { taskId, metadata, event } = update;

  if (!localLog || !localRunningTaskRepo) return;

  try {
    // 更新数据库中的 metadata
    await localRunningTaskRepo.updateTaskMetadata(taskId, metadata);

    localLog.debug(
      {
        taskId,
        taskName: event.taskName,
        reason: event.reason,
        changedFields: event.changedFields
      },
      'Metadata 已同步到数据库'
    );
  } catch (error) {
    localLog.error(
      {
        taskId,
        taskName: event.taskName,
        reason: event.reason,
        error: error instanceof Error ? error.message : String(error)
      },
      '更新任务 metadata 失败'
    );
    throw error;
  }
};

/**
 * 获取暂存统计信息
 */
const getStats = (): MetadataSyncStats => {
  return {
    pendingUpdates: pendingUpdates.size,
    processingTasks: processingTasks.size
  };
};

/**
 * Metadata 变更事件处理器
 * 解决短时间内多次 metadata 更新导致的数据库时序问题
 *
 * 处理流程：
 * 1. 当触发消息时，检查是否有写数据库的操作正在进行
 * 2. 如果有写操作，将 metadata 保存到暂存中
 * 3. 如果没有写操作，直接处理 metadata 更新
 * 4. 每次写数据库完成后检查暂存
 * 5. 如果有暂存，取最后一个开始写数据库，同时清空暂存
 * 6. 如果在写数据库过程中有新消息，会写入暂存，等待当前写操作完成
 */
export const handleMetadataChange = (
  log: Logger,
  runningTaskRepo: RunningTaskRepository
) => {
  initializeMetadataSync(log, runningTaskRepo);

  return async (event: MetadataChangeEvent): Promise<void> => {
    try {
      localLog!.debug(
        {
          taskId: event.taskId,
          taskName: event.taskName,
          reason: event.reason,
          changedFields: event.changedFields,
          stats: getStats()
        },
        '接收到 metadata 变更事件'
      );

      // 添加到处理队列（可能直接处理或暂存）
      await addMetadataUpdate(event);
    } catch (error) {
      localLog!.error(
        {
          taskId: event.taskId,
          taskName: event.taskName,
          event,
          error: error instanceof Error ? error.message : String(error)
        },
        '处理 metadata 变更事件失败'
      );
      // 不重新抛出错误，避免影响任务状态变更
    }
  };
};

/**
 * 获取 metadata 同步管理器统计信息（用于监控和调试）
 */
export const getMetadataSyncStats = (): MetadataSyncStats | null => {
  return localLog ? getStats() : null;
};

/**
 * 清理资源
 */
export const cleanup = (): void => {
  // 清理暂存数据
  pendingUpdates.clear();
  processingTasks.clear();

  // 重置状态
  localLog = null;
  localRunningTaskRepo = null;

  console.log('Metadata 同步管理器资源已清理');
};
