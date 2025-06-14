/**
 * SharedContext 变更事件订阅处理器
 * 当任务的 SharedContext 发生变更时，同步更新数据库中的数据
 * 使用与 handleMetadataChange 相同的状态检查机制避免并发写入问题
 */

import { Logger } from '@stratix/core';
import { ContextChangeEvent, SharedContext } from '../entity/SharedContext.js';
import { ISharedContextRepository } from '../repositories/SharedContextRepository.js';
import { TreeCompletionEvent } from './treeCleanupSubscribe.js';

/**
 * Context 更新暂存项
 */
interface PendingContextUpdate {
  rootTaskId: string;
  data: Record<string, any>;
  timestamp: Date;
  event: ContextChangeEvent;
}

/**
 * Context 同步统计信息
 */
interface ContextSyncStats {
  pendingUpdates: number;
  processingTasks: number;
}

// 全局状态管理
/** 暂存的 context 更新 */
const pendingUpdates = new Map<string, PendingContextUpdate>();

/** 正在处理的根任务ID集合 */
const processingTasks = new Set<string>();

/** Logger 实例 */
let localLog: Logger | null = null;

/** Repository 实例 */
let localSharedContextRepo: ISharedContextRepository | null = null;

/**
 * 初始化 context 同步管理器
 */
const initializeContextSync = (
  logger: Logger,
  repo: ISharedContextRepository
): void => {
  if (!localLog) {
    localLog = logger;
    localSharedContextRepo = repo;
    localLog.info('SharedContext 同步管理器已初始化');
  }
};

/**
 * 添加 context 更新到暂存或直接处理
 */
const addContextUpdate = async (event: ContextChangeEvent): Promise<void> => {
  const { rootTaskId } = event;

  if (!localLog) return;

  // 创建暂存项
  const pendingUpdate: PendingContextUpdate = {
    rootTaskId,
    data: event.newValue || {},
    timestamp: new Date(),
    event
  };

  // 检查是否有数据库写操作正在进行
  if (processingTasks.has(rootTaskId)) {
    // 有写操作正在进行，保存到暂存中（覆盖之前的暂存）
    pendingUpdates.set(rootTaskId, pendingUpdate);

    localLog.debug(
      {
        rootTaskId,
        operation: event.operation,
        key: event.key,
        pendingCount: pendingUpdates.size
      },
      '根任务正在处理中，SharedContext 更新已保存到暂存'
    );
  } else {
    // 没有写操作正在进行，直接处理
    localLog.debug(
      {
        rootTaskId,
        operation: event.operation,
        key: event.key
      },
      '开始直接处理 SharedContext 更新'
    );

    await processContextUpdate(pendingUpdate);
  }
};

/**
 * 处理 context 更新
 */
const processContextUpdate = async (
  update: PendingContextUpdate
): Promise<void> => {
  const { rootTaskId } = update;

  if (!localLog) return;

  // 标记根任务为处理中
  processingTasks.add(rootTaskId);

  try {
    localLog.debug(
      {
        rootTaskId,
        operation: update.event.operation,
        key: update.event.key,
        timestamp: update.timestamp
      },
      '开始处理 SharedContext 更新'
    );

    // 执行数据库更新
    await updateContextData(update);

    localLog.debug(
      { rootTaskId, operation: update.event.operation },
      'SharedContext 更新处理完成'
    );
  } catch (error) {
    localLog.error(
      {
        rootTaskId,
        error: error instanceof Error ? error.message : String(error)
      },
      '处理 SharedContext 更新失败'
    );
  } finally {
    // 移除处理中标记
    processingTasks.delete(rootTaskId);

    // 检查是否有暂存的更新需要处理
    await checkAndProcessPendingUpdates(rootTaskId);
  }
};

/**
 * 检查并处理暂存的更新
 */
const checkAndProcessPendingUpdates = async (
  rootTaskId: string
): Promise<void> => {
  if (!localLog) return;

  // 检查是否有该根任务的暂存更新
  const pendingUpdate = pendingUpdates.get(rootTaskId);
  if (pendingUpdate) {
    localLog.debug({ rootTaskId }, '检测到暂存的 SharedContext 更新，开始处理');

    // 从暂存中移除（清空暂存）
    pendingUpdates.delete(rootTaskId);

    // 递归处理暂存的更新
    await processContextUpdate(pendingUpdate);
  } else {
    localLog.debug({ rootTaskId }, '没有暂存的 SharedContext 更新，处理完成');
  }
};

/**
 * 更新 SharedContext 数据到数据库
 */
const updateContextData = async (
  update: PendingContextUpdate
): Promise<void> => {
  const { rootTaskId, data, event } = update;

  if (!localLog || !localSharedContextRepo) return;

  try {
    // 更新数据库中的 SharedContext 数据
    await localSharedContextRepo.saveContext(rootTaskId, data);

    localLog.debug(
      {
        rootTaskId,
        operation: event.operation,
        key: event.key,
        dataKeys: Object.keys(data).length
      },
      'SharedContext 已同步到数据库'
    );
  } catch (error) {
    localLog.error(
      {
        rootTaskId,
        operation: event.operation,
        key: event.key,
        error: error instanceof Error ? error.message : String(error)
      },
      '更新 SharedContext 数据失败'
    );
    throw error;
  }
};

/**
 * 获取暂存统计信息
 */
const getStats = (): ContextSyncStats => {
  return {
    pendingUpdates: pendingUpdates.size,
    processingTasks: processingTasks.size
  };
};

/**
 * SharedContext 变更事件处理器
 * 解决短时间内多次 SharedContext 更新导致的数据库时序问题
 *
 * 处理流程：
 * 1. 当触发消息时，检查是否有写数据库的操作正在进行
 * 2. 如果有写操作，将 SharedContext 保存到暂存中
 * 3. 如果没有写操作，直接处理 SharedContext 更新
 * 4. 每次写数据库完成后检查暂存
 * 5. 如果有暂存，取最后一个开始写数据库，同时清空暂存
 * 6. 如果在写数据库过程中有新消息，会写入暂存，等待当前写操作完成
 */
export const handleContextChange = (
  log: Logger,
  sharedContextRepo: ISharedContextRepository
) => {
  initializeContextSync(log, sharedContextRepo);

  /**
   * 处理 Context 删除事件
   */
  const handleContextDeleted = async (
    event: TreeCompletionEvent
  ): Promise<void> => {
    const { rootTaskId } = event;

    try {
      log.debug(
        { rootTaskId, finalStatus: event.finalStatus },
        '开始处理 SharedContext 删除事件'
      );

      // 1. 从数据库删除 SharedContext 记录
      try {
        await sharedContextRepo.deleteContext(rootTaskId);
        log.debug({ rootTaskId }, 'SharedContext 数据库记录已删除');
      } catch (error) {
        log.error({ rootTaskId, error }, 'SharedContext 数据库记录删除失败');
        // 继续执行，不要因为数据库删除失败而中断
      }

      // 2. 从全局存储中删除 SharedContext 记录
      try {
        const deleted = SharedContext.deleteContext(rootTaskId);

        if (deleted) {
          log.debug({ rootTaskId }, 'SharedContext 全局存储记录已删除');
        } else {
          log.warn({ rootTaskId }, 'SharedContext 全局存储中未找到记录');
        }
      } catch (error) {
        log.error({ rootTaskId, error }, 'SharedContext 全局存储记录删除失败');
      }

      log.info({ rootTaskId }, 'SharedContext 删除事件处理完成');
    } catch (error) {
      log.error({ rootTaskId, error }, 'SharedContext 删除事件处理失败');
      // 不抛出错误，避免影响其他处理流程
    }
  };

  const handleContextChange = async (
    event: ContextChangeEvent
  ): Promise<void> => {
    try {
      log!.debug(
        {
          rootTaskId: event.rootTaskId,
          operation: event.operation,
          key: event.key,
          stats: getStats()
        },
        '接收到 SharedContext 变更事件'
      );

      // 添加到处理队列（可能直接处理或暂存）
      await addContextUpdate(event);
    } catch (error) {
      if (log) {
        log.error(
          {
            rootTaskId: event.rootTaskId,
            operation: event.operation,
            key: event.key,
            event,
            error: error instanceof Error ? error.message : String(error)
          },
          '处理 SharedContext 变更事件失败'
        );
      }
      // 不重新抛出错误，避免影响任务状态变更
    }
  };

  return {
    handleContextChange,
    handleContextDeleted
  };
};

/**
 * 获取 SharedContext 同步管理器统计信息（用于监控和调试）
 */
export const getContextSyncStats = (): ContextSyncStats | null => {
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
  localSharedContextRepo = null;

  console.log('Metadata 同步管理器资源已清理');
};
