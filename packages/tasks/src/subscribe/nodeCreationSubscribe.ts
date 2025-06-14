import { Logger } from '@stratix/core';
import { SharedContext } from '../entity/SharedContext.js';
import { NodeCreationEvent } from '../entity/executor.types.js';
import { TaskData } from '../entity/types.js';
import { RunningTaskRepository } from '../repositories/RunningTaskRepository.js';
import { ISharedContextRepository } from '../repositories/SharedContextRepository.js';
import { TaskStatus } from '../types/task.types.js';

/**
 * 处理节点创建事件的函数式订阅
 * 负责将新创建的TaskNode持久化到数据库
 */
export const handleNodeCreation =
  (
    log: Logger,
    runningTaskRepo: RunningTaskRepository,
    sharedContextRepo: ISharedContextRepository
  ) =>
  async (event: NodeCreationEvent): Promise<void> => {
    /**
     * 根据事件信息持久化TaskNode到数据库
     */
    const persistTaskToDatabase = async (
      event: NodeCreationEvent
    ): Promise<void> => {
      try {
        // 构建数据库记录
        const taskRecord = {
          id: event.taskId,
          parent_id: event.parentId || null,
          name: event.taskName,
          description: event.taskDescription || null,
          task_type: event.type || 'default', // 从事件中无法获取具体类型，使用默认值
          status: event.status || TaskStatus.PENDING, // 新创建的任务默认为pending状态
          progress: event.progress || 0,
          priority: event.priority || 0,
          executor_name: event.executorName || null, // 创建时还没有执行器
          metadata: event.metadata || null
        };

        // 保存到数据库
        await runningTaskRepo.create(taskRecord);

        log.debug(
          {
            taskId: event.taskId,
            parentId: event.parentId,
            taskName: event.taskName,
            isRecovery: event.isRecovery
          },
          'TaskNode已持久化到数据库'
        );
      } catch (error) {
        log.error(
          {
            taskId: event.taskId,
            taskName: event.taskName,
            error: error instanceof Error ? error.message : String(error)
          },
          'TaskNode持久化到数据库失败'
        );
        throw error;
      }
    };

    /**
     * 保存SharedContext到数据库（仅对根任务）
     */
    const saveSharedContextToDatabase = async (
      event: NodeCreationEvent
    ): Promise<void> => {
      try {
        // 只有根任务（没有父任务）才需要保存SharedContext
        if (event.parentId) {
          return;
        }

        // 获取当前任务的SharedContext
        const sharedContext = SharedContext.getContext(event.taskId);
        if (!sharedContext) {
          log.debug(
            { taskId: event.taskId },
            '根任务没有SharedContext，跳过数据库保存'
          );
          return;
        }

        // 获取SharedContext的数据
        const contextData = sharedContext.toJSON().data;

        // 保存到数据库
        await sharedContextRepo.saveContext(event.taskId, contextData);

        log.debug(
          {
            taskId: event.taskId,
            taskName: event.taskName,
            contextDataKeys: Object.keys(contextData).length
          },
          'SharedContext已保存到数据库'
        );
      } catch (error) {
        log.error(
          {
            taskId: event.taskId,
            taskName: event.taskName,
            error: error instanceof Error ? error.message : String(error)
          },
          'SharedContext保存到数据库失败'
        );
        // 不重新抛出错误，避免影响任务创建流程
      }
    };

    try {
      log.debug(
        {
          taskId: event.taskId,
          taskName: event.taskName,
          parentId: event.parentId,
          isRecovery: event.isRecovery
        },
        '开始处理节点创建事件'
      );

      // 只有非恢复创建的任务才需要持久化到数据库
      // 恢复创建的任务已经在数据库中存在
      if (!event.isRecovery) {
        await persistTaskToDatabase(event);

        // 任务成功保存到数据库后，保存SharedContext
        await saveSharedContextToDatabase(event);
      }

      log.debug(
        {
          taskId: event.taskId,
          taskName: event.taskName,
          isRecovery: event.isRecovery
        },
        '节点创建事件处理完成'
      );
    } catch (error) {
      log.error(
        {
          taskId: event.taskId,
          taskName: event.taskName,
          event,
          error: error instanceof Error ? error.message : String(error)
        },
        '节点创建事件处理失败'
      );
      // 不重新抛出错误，避免影响节点创建流程
    }
  };

/**
 * 处理节点创建上下文设置
 * 用于在创建TaskNode前设置必要的上下文信息
 */
export const setupNodeCreationContext = (
  parentId?: string | null,
  taskType?: string,
  executorName?: string
) => {
  return {
    parentId,
    taskType,
    executorName,
    createdAt: new Date()
  };
};

/**
 * 验证节点创建参数
 */
export const validateNodeCreationParams = (
  taskData: TaskData,
  log: Logger
): boolean => {
  try {
    // 基本验证
    if (!taskData.name || taskData.name.trim() === '') {
      log.warn({ taskData }, '任务名称不能为空');
      return false;
    }

    // 优先级验证
    if (
      taskData.priority !== undefined &&
      (taskData.priority < 0 || taskData.priority > 10)
    ) {
      log.warn({ priority: taskData.priority }, '任务优先级应在0-10之间');
      return false;
    }

    return true;
  } catch (error) {
    log.error(
      {
        taskData,
        error: error instanceof Error ? error.message : String(error)
      },
      '节点创建参数验证失败'
    );
    return false;
  }
};
