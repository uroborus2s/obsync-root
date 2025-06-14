/**
 * 任务树共享上下文
 * 纯内存方式的整个任务树共享数据管理，通过消息机制同步到数据库
 */

import { Logger } from '@stratix/core';
import { EventEmitter } from 'events';
import { ISharedContextRepository } from '../repositories/SharedContextRepository.js';
import { TASK_NODE_EVENTS } from './executor.types.js';

/**
 * 共享上下文数据接口
 */
export interface SharedContextData {
  [key: string]: any;
}

/**
 * 共享上下文变更事件
 */
export interface ContextChangeEvent {
  rootTaskId: string;
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  operation: 'set' | 'delete' | 'clear';
}

/**
 * 共享上下文创建事件
 */
export interface ContextCreatedEvent {
  rootTaskId: string;
  initialData: SharedContextData;
  timestamp: Date;
}

// 全局共享上下文存储
const globalContextStore = new Map<string, SharedContext>();

/**
 * 任务树共享上下文类
 * 提供整个任务树的共享数据管理，纯内存方式
 */
export class SharedContext extends EventEmitter {
  private data: SharedContextData = {};

  private constructor(
    private rootTaskId: string,
    private log: Logger,
    initialData: SharedContextData = {}
  ) {
    super();
    this.data = { ...initialData };
    this.log.debug({ rootTaskId }, 'SharedContext 已创建');
  }

  /**
   * 创建共享上下文工厂函数
   * 支持恢复模式和数据库操作
   */
  static createSharedFactory = (
    log: Logger,
    sharedContextRepo: ISharedContextRepository
  ) => {
    return async (
      rootTaskId: string,
      initialData: SharedContextData = {},
      isRecovery: boolean = false
    ): Promise<SharedContext> => {
      // 检查是否已存在
      if (globalContextStore.has(rootTaskId)) {
        log.debug({ rootTaskId }, 'SharedContext 已存在，返回现有实例');
        return globalContextStore.get(rootTaskId)!;
      }

      let contextData: SharedContextData = initialData;

      // 如果是恢复模式，从数据库加载数据
      if (isRecovery && sharedContextRepo) {
        try {
          const savedData = await sharedContextRepo.loadContext(rootTaskId);
          if (savedData) {
            contextData = { ...initialData, ...savedData };
            log.info(
              {
                rootTaskId,
                dataKeys: Object.keys(contextData).length,
                savedKeys: Object.keys(savedData).length
              },
              '从数据库恢复 SharedContext 数据'
            );
          } else {
            log.debug(
              { rootTaskId },
              '数据库中未找到 SharedContext 数据，使用初始数据'
            );
          }
        } catch (error) {
          log.error(
            { rootTaskId, error },
            '从数据库加载 SharedContext 失败，使用初始数据'
          );
        }
      }

      // 创建新的共享上下文
      const context = new SharedContext(rootTaskId, log, contextData);

      // 存储到全局存储
      globalContextStore.set(rootTaskId, context);

      // 注意：数据库保存操作已移除，避免外键约束失败
      // 数据库保存将在任务真正创建到 running_tasks 表后进行
      // 这个操作会在 nodeCreationSubscribe.ts 中的任务创建完成后触发

      log.info(
        {
          rootTaskId,
          dataKeys: Object.keys(contextData).length,
          isRecovery,
          hasRepo: !!sharedContextRepo,
          databaseSaveDeferred: !isRecovery
        },
        'SharedContext 已创建（数据库保存已延迟）'
      );

      return context;
    };
  };

  /**
   * 获取共享上下文实例
   */
  static getContext(rootTaskId: string): SharedContext | undefined {
    return globalContextStore.get(rootTaskId);
  }

  /**
   * 删除共享上下文
   */
  static deleteContext(rootTaskId: string): boolean {
    const context = globalContextStore.get(rootTaskId);
    if (context) {
      // 从全局存储中移除
      globalContextStore.delete(rootTaskId);

      // 清理事件监听器
      context.clear();

      return true;
    }
    return false;
  }

  /**
   * 获取所有共享上下文的根任务ID
   */
  static getAllRootTaskIds(): string[] {
    return Array.from(globalContextStore.keys());
  }

  /**
   * 获取共享上下文统计信息
   */
  static getGlobalStats(): {
    totalContexts: number;
    totalDataSize: number;
    contexts: Array<{
      rootTaskId: string;
      dataSize: number;
      keys: string[];
    }>;
  } {
    const contexts: Array<{
      rootTaskId: string;
      dataSize: number;
      keys: string[];
    }> = [];

    let totalDataSize = 0;

    for (const [rootTaskId, context] of globalContextStore) {
      const dataSize = context.size();
      totalDataSize += dataSize;

      contexts.push({
        rootTaskId,
        dataSize,
        keys: context.keys()
      });
    }

    return {
      totalContexts: globalContextStore.size,
      totalDataSize,
      contexts
    };
  }

  /**
   * 获取根任务ID
   */
  getRootTaskId(): string {
    return this.rootTaskId;
  }

  /**
   * 获取共享数据
   */
  get<T = any>(key: string): T | undefined {
    return this.data[key] as T;
  }

  /**
   * 批量更新共享数据
   */
  update(
    data:
      | SharedContextData
      | ((preData: SharedContextData) => SharedContextData)
  ): void {
    const oldData = { ...this.data };

    // 根据参数类型处理数据更新
    let newData: SharedContextData;
    if (typeof data === 'function') {
      newData = data(oldData);
    } else {
      newData = { ...oldData, ...data };
    }

    this.data = newData;

    // 发出变更事件（用于数据库同步）
    const changeEvent: ContextChangeEvent = {
      rootTaskId: this.rootTaskId,
      key: '*', // 批量更新使用 * 表示多个字段
      oldValue: oldData,
      newValue: newData,
      timestamp: new Date(),
      operation: 'set'
    };

    this.emit(TASK_NODE_EVENTS.CONTEXT_CHANGED, changeEvent);

    this.log.debug(
      {
        rootTaskId: this.rootTaskId,
        oldDataKeys: Object.keys(oldData).length,
        newDataKeys: Object.keys(newData).length
      },
      'SharedContext 数据已批量更新'
    );
  }

  /**
   * 获取共享数据，如果不存在则返回默认值
   */
  getOrDefault<T = any>(key: string, defaultValue: T): T {
    const value = this.data[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * 检查是否存在指定键
   */
  has(key: string): boolean {
    return key in this.data;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Object.keys(this.data);
  }

  /**
   * 获取所有值
   */
  values(): any[] {
    return Object.values(this.data);
  }

  /**
   * 获取数据大小
   */
  size(): number {
    return Object.keys(this.data).length;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    rootTaskId: string;
    dataSize: number;
    memorySize: number;
    keys: string[];
  } {
    const keys = this.keys();
    const memorySize = JSON.stringify(this.data).length;

    return {
      rootTaskId: this.rootTaskId,
      dataSize: keys.length,
      memorySize,
      keys
    };
  }

  clear(): void {
    this.data = {};
    this.removeAllListeners();
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): {
    rootTaskId: string;
    data: SharedContextData;
    size: number;
  } {
    return {
      rootTaskId: this.rootTaskId,
      data: { ...this.data },
      size: this.size()
    };
  }
}
