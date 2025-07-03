/**
 * 完善的任务节点类实现
 * 集成状态变更处理器、进度计算和订阅机制
 */

import { IStratixApp, Logger } from '@stratix/core';
import { ids } from '@stratix/utils/common';
import EventEmitter from 'events';
import { ExtendedCreateTaskParams } from '../services/TaskTreeService.js';
import { handleContextChange } from '../subscribe/handleContextChange.js';
import { handleMetadataChange } from '../subscribe/handleMetadataChange.js';
import { handleNodeCreation } from '../subscribe/nodeCreationSubscribe.js';
import { handleStatusSync } from '../subscribe/statusSyncSubscribe.js';
import {
  handleTreeCompletion,
  TreeCompletionEvent
} from '../subscribe/treeCleanupSubscribe.js';
import { SharedContext } from './SharedContext.js';
import type {
  MetadataChangeEvent,
  NodeCreationEvent,
  TaskExecutor
} from './executor.types.js';
import { TASK_NODE_EVENTS } from './executor.types.js';
import {
  TaskData,
  TaskNodePlaceholder,
  TaskStatus,
  TaskStatusChangeEvent,
  TaskStatusSyncEvent,
  TaskStatusUtils,
  TriggerType
} from './types.js';

/**
 * 任务节点类
 */
export class TaskNode extends EventEmitter {
  public readonly id: string;
  public data: Omit<Required<TaskData>, 'parentId'> & {
    executorConfig?: import('../types/task.types.js').TaskExecutorConfig;
  };
  public parent: TaskNode | null = null;
  public children: (TaskNode | TaskNodePlaceholder)[] = [];
  private _sharedContext: SharedContext | null = null; // 任务树共享上下文
  private statusHistory: Array<{
    status: TaskStatus;
    event: TaskStatusChangeEvent;
    timestamp: Date;
    reason?: string;
    data?: any;
  }> = [];

  private childSubscriptions: Map<string, () => void> = new Map(); // 子节点订阅取消函数
  private parentSubscriptions: (() => void)[] = []; // 父节点订阅取消函数

  // 执行器相关属性
  private _executor: TaskExecutor | null = null;

  /**
   * TaskNode 构造函数
   * @param id 任务ID
   * @param data 任务数据
   * @param log 日志服务
   * @param isRecovery 是否为恢复模式（true=从数据库恢复；false=新建任务）
   * @param createSharedContext SharedContext 创建工厂函数（可选，仅根任务需要）
   */
  public constructor(
    id: string,
    data: TaskData,
    private log: Logger,
    isRecovery = false,
    context: SharedContext | null = null
  ) {
    super();

    // 设置更高的 EventEmitter 监听器限制
    // 考虑到一个父任务可能有很多子任务，每个子任务需要监听 3 个父任务事件
    // 设置为 100 以支持最多 33 个子任务的场景
    this.setMaxListeners(100);

    this.id = id;
    this.data = {
      status: TaskStatus.PENDING,
      progress: 0,
      priority: 0,
      type: 'default',
      metadata: {},
      parentId: null,
      executorName: '',
      ...data
    };

    // 记录初始状态
    this.recordStatusChange(
      TaskStatus.PENDING,
      TaskStatusChangeEvent.STARTED,
      isRecovery ? '任务恢复' : '任务创建'
    );
    if (context) {
      this._sharedContext = context;
    }
  }

  /**
   * 发送节点创建事件
   * @param isRecovery 是否为恢复创建
   */
  public emitNodeCreatedEvent(isRecovery: boolean): void {
    const creationEvent: NodeCreationEvent = {
      taskId: this.id,
      taskName: this.data.name,
      taskDescription: this.data.description,
      timestamp: new Date(),
      parentId: this.parent?.id,
      parentName: this.parent?.data.name,
      priority: this.data.priority,
      executorName: this.data.executorName,
      type: this.data.type,
      status: this.data.status,
      progress: this.data.progress,
      isRecovery,
      metadata: this.data.metadata
    };

    this.emit(TASK_NODE_EVENTS.NODE_CREATED, creationEvent);

    this.log.debug(
      {
        taskId: this.id,
        taskName: this.data.name,
        isRecovery,
        parentId: this.parent?.id
      },
      '节点创建事件已发送'
    );
  }

  public setExecutor(executor: TaskExecutor): void {
    this._executor = executor;
  }

  /**
   * 获取当前状态
   */
  get status(): TaskStatus {
    return this.data.status;
  }

  /**
   * 获取当前进度 (0-100)
   */
  get progress(): number {
    return this.data.progress;
  }

  /**
   * 获取任务树共享上下文
   */
  get context(): SharedContext | null {
    return this._sharedContext;
  }

  /**
   * 设置任务树共享上下文（私有方法）
   * 仅在添加子节点时使用，用于继承父节点的 SharedContext
   */
  private setSharedContext(sharedContext: SharedContext | null): void {
    this._sharedContext = sharedContext;

    if (sharedContext) {
      this.log.debug(
        {
          taskId: this.id,
          rootTaskId: sharedContext.getRootTaskId()
        },
        '任务已设置 SharedContext'
      );
    }
  }

  /**
   * 更新任务的 metadata
   * @param newMetadata 新的 metadata 对象或更新函数
   * @param reason 更新原因
   */
  updateMetadata(
    newMetadata:
      | Record<string, any>
      | ((oldMetadata: Record<string, any>) => Record<string, any>),
    reason?: string
  ): void {
    const oldMetadata = { ...this.data.metadata };

    // 根据参数类型处理 metadata 更新
    let updatedMetadata: Record<string, any>;
    if (typeof newMetadata === 'function') {
      // 如果是函数，则调用函数获取新的 metadata
      updatedMetadata = newMetadata(oldMetadata);
    } else {
      // 如果是对象，则直接使用
      updatedMetadata = { ...newMetadata };
    }

    // 更新 metadata
    this.data.metadata = { ...updatedMetadata };

    // 计算变更的字段
    const changedFields = this.getChangedFields(
      oldMetadata,
      this.data.metadata
    );

    // 发送 metadata 变更事件
    const metadataChangeEvent: MetadataChangeEvent = {
      taskId: this.id,
      taskName: this.data.name,
      oldMetadata,
      newMetadata: this.data.metadata,
      timestamp: new Date(),
      reason,
      changedFields
    };

    this.emit(TASK_NODE_EVENTS.METADATA_CHANGED, metadataChangeEvent);

    this.log.debug(
      {
        taskId: this.id,
        taskName: this.data.name,
        reason,
        changedFields,
        oldMetadata,
        newMetadata: this.data.metadata
      },
      'Metadata 已更新，已发送变更事件'
    );
  }

  /**
   * 计算两个 metadata 对象之间的变更字段
   * @param oldMetadata 旧的 metadata
   * @param newMetadata 新的 metadata
   * @returns 变更的字段列表
   */
  private getChangedFields(
    oldMetadata: Record<string, any>,
    newMetadata: Record<string, any>
  ): string[] {
    const changedFields: string[] = [];

    // 检查所有新字段和修改的字段
    for (const key in newMetadata) {
      if (oldMetadata[key] !== newMetadata[key]) {
        changedFields.push(key);
      }
    }

    // 检查删除的字段
    for (const key in oldMetadata) {
      if (!(key in newMetadata)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * 获取当前注册的执行器
   */
  get executor(): TaskExecutor | null {
    return this._executor;
  }

  /**
   * 执行执行器方法
   * @param methodName 方法名称
   */
  private async executeExecutorMethod(methodName: string): Promise<void> {
    if (!this._executor || !this._sharedContext) {
      this.log.debug(
        { taskId: this.id, method: methodName },
        '跳过执行器方法：未注册执行器或无共享上下文'
      );
      return;
    }

    // 类型安全的方法获取
    let method: Function | undefined;
    switch (methodName) {
      case 'onStart':
        method = this._executor.onStart;
        break;
      case 'onPause':
        method = this._executor.onPause;
        break;
      case 'onResume':
        method = this._executor.onResume;
        break;
      case 'onSuccess':
        method = this._executor.onSuccess;
        break;
      case 'onFail':
        method = this._executor.onFail;
        break;
      case 'onCancel':
        method = this._executor.onCancel;
        break;
      case 'onComplete':
        method = this._executor.onComplete;
        break;
      case 'onRun':
        method = this._executor.onRun;
        break;
    }

    if (typeof method !== 'function') {
      this.log.debug(
        {
          taskId: this.id,
          executorName: this._executor.name,
          method: methodName
        },
        '跳过执行器方法：执行器未实现该方法'
      );
      return;
    }

    try {
      this.log.debug(
        {
          taskId: this.id,
          executorName: this._executor.name,
          method: methodName
        },
        '开始执行执行器方法'
      );

      await method.call(this._executor, this, this._sharedContext);

      this.log.debug(
        {
          taskId: this.id,
          executorName: this._executor.name,
          method: methodName
        },
        '执行器方法执行成功'
      );
    } catch (error) {
      this.log.error(
        {
          taskId: this.id,
          executorName: this._executor.name,
          method: methodName,
          error: error instanceof Error ? error.message : String(error)
        },
        '执行器方法执行失败，但不影响任务状态变更'
      );
    }
  }

  /**
   * 检查子节点是否为占位符
   */
  private isPlaceholder(
    child: TaskNode | TaskNodePlaceholder
  ): child is TaskNodePlaceholder {
    return (child as TaskNodePlaceholder).isPlaceholder === true;
  }

  /**
   * 获取所有真实子节点（非占位符）
   */
  private getRealChildren(): TaskNode[] {
    return this.children.filter(
      (child): child is TaskNode => !this.isPlaceholder(child)
    );
  }

  /**
   * 获取所有占位符子节点
   */
  private getPlaceholderChildren(): TaskNodePlaceholder[] {
    return this.children.filter((child): child is TaskNodePlaceholder =>
      this.isPlaceholder(child)
    );
  }

  /**
   * 添加子任务
   */
  public addChild(child: TaskNode): void {
    if (child.parent) {
      throw new Error(`任务 ${child.id} 已有父任务 ${child.parent.id}`);
    }

    // 检查当前任务是否可以添加子任务
    if (!TaskStatusUtils.canAddChild(this.data.status)) {
      throw new Error(
        `任务 ${this.id} 当前状态 ${this.data.status} 无法添加子任务`
      );
    }

    child.parent = this;
    this.children.push(child);

    // 订阅子任务的完成相关事件
    this.subscribeToChild(child);

    // 子任务订阅父任务的状态变更事件
    child.subscribeToParent(this);

    child.setSharedContext(this._sharedContext);

    // 重新计算进度
    this.updateProgress();

    this.log.debug(
      {
        parentId: this.id,
        childId: child.id,
        childrenCount: this.children.length
      },
      '添加子任务成功'
    );
  }

  /**
   * 移除子任务
   */
  removeChild(child: TaskNode): boolean {
    const index = this.children.indexOf(child);
    if (index === -1) {
      return false;
    }

    this.children.splice(index, 1);
    child.parent = null;

    // 取消对子任务的订阅
    this.unsubscribeFromChild(child);

    // 重新计算进度
    this.updateProgress();

    this.log.debug(
      {
        parentId: this.id,
        childId: child.id,
        childrenCount: this.children.length
      },
      '移除子任务成功'
    );

    return true;
  }

  /**
   * 订阅子任务的完成相关事件
   * 父节点订阅子节点的：SUCCESS, FAILED, CANCELLED, COMPLETED 事件
   */
  private subscribeToChild(child: TaskNode): void {
    const unsubscribe = () => {
      child.off(TASK_NODE_EVENTS.SUCCESS, this.onChildSuccess.bind(this));
      child.off(TASK_NODE_EVENTS.FAILED, this.onChildFailed.bind(this));
      child.off(TASK_NODE_EVENTS.CANCELLED, this.onChildCompleted.bind(this));
      child.off(TASK_NODE_EVENTS.COMPLETED, this.onChildCompleted.bind(this));
    };

    child.on(TASK_NODE_EVENTS.SUCCESS, this.onChildSuccess.bind(this));
    child.on(TASK_NODE_EVENTS.FAILED, this.onChildFailed.bind(this));
    child.on(TASK_NODE_EVENTS.CANCELLED, this.onChildCompleted.bind(this));
    child.on(TASK_NODE_EVENTS.COMPLETED, this.onChildCompleted.bind(this));

    this.childSubscriptions.set(child.id, unsubscribe);
  }

  public unsubscribeFromParent(): void {
    this.parentSubscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.parentSubscriptions = [];
  }
  /**
   * 取消对子任务的订阅
   */
  private unsubscribeFromChild(child: TaskNode): void {
    const unsubscribe = this.childSubscriptions.get(child.id);
    if (unsubscribe) {
      unsubscribe();
      this.childSubscriptions.delete(child.id);
    }
    child.unsubscribeFromParent();
    child.parent = null;
  }

  /**
   * 订阅父任务的状态变更事件
   * 子节点订阅父节点的：STARTED, RESUMED, PAUSED 事件
   */
  private subscribeToParent(parent: TaskNode): void {
    const onParentStarted = () => {
      if (
        this.data.status === TaskStatus.PENDING ||
        this.data.status === TaskStatus.PAUSED
      ) {
        this.start('父任务启动触发').catch((err) =>
          this.log.error({ error: err }, '跟随父任务启动失败')
        );
      }
    };

    const onParentResumed = () => {
      if (this.data.status === TaskStatus.PAUSED) {
        this.resume('父任务恢复触发').catch((err) =>
          this.log.error({ error: err }, '跟随父任务恢复失败')
        );
      }
    };

    const onParentPaused = () => {
      if (this.data.status === TaskStatus.RUNNING) {
        this.pause('父任务暂停触发').catch((err) =>
          this.log.error({ error: err }, '跟随父任务暂停失败')
        );
      }
    };

    // 直接订阅父节点的状态变更事件
    parent.on(TASK_NODE_EVENTS.STARTED, onParentStarted);
    parent.on(TASK_NODE_EVENTS.RESUMED, onParentResumed);
    parent.on(TASK_NODE_EVENTS.PAUSED, onParentPaused);

    this.parentSubscriptions.push(() => {
      parent.off(TASK_NODE_EVENTS.STARTED, onParentStarted);
      parent.off(TASK_NODE_EVENTS.RESUMED, onParentResumed);
      parent.off(TASK_NODE_EVENTS.PAUSED, onParentPaused);
    });
  }

  /**
   * 子任务通用完成处理
   */
  private async onChildCompleted(child: TaskNode): Promise<void> {
    this.log.debug({ parentId: this.id, childId: child.id }, '子任务完成');

    // 转为占位符并检查状态
    await this.convertChildToPlaceholder(child);
    await this.checkAllChildrenStatus();
  }

  /**
   * 子任务失败处理
   */
  private async onChildFailed(child: TaskNode): Promise<void> {
    this.log.debug({ parentId: this.id, childId: child.id }, '子任务失败');

    // 转为占位符并检查状态
    // await this.convertChildToPlaceholder(child);
    await this.checkAllChildrenStatus();
  }

  /**
   * 子任务成功处理
   */
  private async onChildSuccess(child: TaskNode): Promise<void> {
    this.log.debug({ parentId: this.id, childId: child.id }, '子任务成功');

    // 转为占位符并检查状态
    await this.convertChildToPlaceholder(child);
    await this.checkAllChildrenStatus();
  }

  /**
   * 将子任务转换为占位符（内存优化）
   */
  private async convertChildToPlaceholder(child: TaskNode): Promise<void> {
    const index = this.children.indexOf(child);
    if (index === -1) {
      return;
    }

    // 创建占位符
    const placeholder: TaskNodePlaceholder = {
      id: child.id,
      name: child.data.name,
      status: child.status,
      progress: 100,
      completedAt: new Date(),
      isPlaceholder: true
    };

    // 替换子任务为占位符
    this.children[index] = placeholder;

    // 取消订阅
    this.unsubscribeFromChild(child);

    // 完整清理子节点内存（防止内存泄漏）
    this.cleanupNodeMemory(child);

    // 通知TaskTreeService从缓存中移除该节点（释放内存）
    this.emit(TASK_NODE_EVENTS.NODE_CONVERTED_TO_PLACEHOLDER, placeholder);

    this.log.debug(
      { parentId: this.id, childId: child.id },
      '子任务已转换为占位符，内存已完全释放'
    );
  }

  /**
   * 完整清理节点内存（防止内存泄漏）
   * 此方法确保节点转换为占位符时完整释放所有相关资源
   */
  public cleanupNodeMemory(node: TaskNode): void {
    try {
      this.log.debug({ nodeId: node.id }, '开始完整清理节点内存');

      // 1. 递归清理所有子节点内存
      this.recursivelyCleanupChildNodes(node);

      // 2. 清理当前节点的执行器和注册器
      this.cleanupSingleChildNode(node);

      // 3. 最终验证清理效果
      this.verifyMemoryCleanup(node);

      this.log.info({ nodeId: node.id }, '节点内存完整清理完成');
    } catch (error) {
      this.log.error({ nodeId: node.id, error }, '节点内存清理失败');
    }
  }

  /**
   * 清理执行器相关资源
   */
  private cleanupExecutorResources(node: TaskNode): void {
    try {
      if (node._executor) {
        // 强制清理执行器引用
        (node as any)._executor = null;
      }

      this.log.debug({ nodeId: node.id }, '执行器资源已清理');
    } catch (error) {
      this.log.error({ nodeId: node.id, error }, '清理执行器资源失败');
    }
  }

  /**
   * 递归清理所有子节点内存
   */
  private recursivelyCleanupChildNodes(node: TaskNode): void {
    try {
      const realChildren = [
        ...node.children.filter(
          (child): child is TaskNode => !this.isPlaceholder(child)
        )
      ];

      for (const child of realChildren) {
        try {
          // 递归清理子节点的子节点
          this.recursivelyCleanupChildNodes(child);

          // 清理当前子节点
          this.cleanupSingleChildNode(child);
        } catch (error) {
          this.log.warn(
            {
              parentId: node.id,
              childId: child.id,
              error
            },
            '清理子节点失败'
          );
        }
      }

      // 清空子节点数组
      node.children.length = 0;

      this.log.debug(
        {
          nodeId: node.id,
          cleanedChildCount: realChildren.length
        },
        '子节点内存已递归清理'
      );
    } catch (error) {
      this.log.error({ nodeId: node.id, error }, '递归清理子节点失败');
    }
  }

  /**
   * 清理单个子节点
   */
  private cleanupSingleChildNode(child: TaskNode): void {
    try {
      // 1. 清理执行器相关资源
      this.cleanupExecutorResources(child);

      // 2. 清理事件监听器
      this.cleanupEventListeners(child);

      // 3. 清理共享上下文
      this.cleanupDataReferences(child);

      // 清理状态历史（保留最后一条用于调试）
      const lastHistory = (child as any).statusHistory.slice(-1);
      (child as any).statusHistory.length = 0;
      (child as any).statusHistory.push(...lastHistory);

      this.log.debug({ childId: child.id }, '单个子节点清理完成');
    } catch (error) {
      this.log.error({ childId: child.id, error }, '清理单个子节点失败');
    }
  }

  /**
   * 清理事件监听器
   */
  private cleanupEventListeners(node: TaskNode): void {
    try {
      // 获取当前监听器数量（用于日志）
      const listenerCount = node.listenerCount
        ? Object.keys(node.eventNames()).reduce((total, eventName) => {
            return total + node.listenerCount(eventName);
          }, 0)
        : 0;

      // 移除所有事件监听器
      node.removeAllListeners();

      this.log.debug(
        {
          nodeId: node.id,
          clearedListeners: listenerCount
        },
        '事件监听器已清理'
      );
    } catch (error) {
      this.log.error({ nodeId: node.id, error }, '清理事件监听器失败');
    }
  }

  /**
   * 清理共享上下文和数据引用
   */
  private cleanupDataReferences(node: TaskNode): void {
    try {
      // 清理共享上下文引用
      node._sharedContext = null;

      // 清理状态历史（保留最后一条记录用于占位符状态）
      const statusHistory = (node as any).statusHistory;
      if (statusHistory && statusHistory.length > 0) {
        const lastHistory = statusHistory.slice(-1);
        statusHistory.length = 0;
        statusHistory.push(...lastHistory);
      }

      // 保留基本数据，清理复杂对象引用
      const originalData = node.data;
      const basicData = {
        name: originalData.name,
        description: originalData.description,
        type: originalData.type,
        priority: originalData.priority,
        createdAt: originalData.createdAt,
        updatedAt: originalData.updatedAt
      };
      node.data = basicData as any;

      this.log.debug({ nodeId: node.id }, '数据引用已清理');
    } catch (error) {
      this.log.error({ nodeId: node.id, error }, '清理数据引用失败');
    }
  }

  /**
   * 验证内存清理效果
   */
  private verifyMemoryCleanup(node: TaskNode): void {
    try {
      const verificationResult = {
        nodeId: node.id,
        hasExecutor: !!(node as any)._executor,
        hasSharedContext: !!(node as any)._sharedContext,
        hasParent: !!node.parent,
        childrenCount: node.children.length,
        childSubscriptionsCount: node.childSubscriptions.size,
        parentSubscriptionsCount: (node as any).parentSubscriptions.length,
        listenerCount: node.eventNames().length
      };

      // 检查是否还有未清理的资源
      const hasLeaks =
        verificationResult.hasExecutor ||
        verificationResult.hasSharedContext ||
        verificationResult.hasParent ||
        verificationResult.childrenCount > 0 ||
        verificationResult.childSubscriptionsCount > 0 ||
        verificationResult.parentSubscriptionsCount > 0 ||
        verificationResult.listenerCount > 0;

      if (hasLeaks) {
        this.log.warn(verificationResult, '检测到潜在的内存泄漏');
      } else {
        this.log.debug(verificationResult, '内存清理验证通过');
      }
    } catch (error) {
      this.log.warn({ nodeId: node.id, error }, '内存清理验证失败');
    }
  }

  /**
   * 检查所有子任务状态并决定父任务状态
   */
  private async checkAllChildrenStatus(): Promise<void> {
    const allChildren = this.children;

    // 统计各状态的子任务数量
    let successCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;
    let completedCount = 0; // COMPLETED状态的数量
    let totalCompletedCount = 0; // 所有完成状态的总数

    for (const child of allChildren) {
      const status = this.isPlaceholder(child) ? child.status : child.status;

      if (TaskStatusUtils.isCompleted(status)) {
        totalCompletedCount++;

        if (status === TaskStatus.SUCCESS) {
          successCount++;
        } else if (status === TaskStatus.FAILED) {
          failedCount++;
        } else if (status === TaskStatus.CANCELLED) {
          cancelledCount++;
        } else if (status === TaskStatus.COMPLETED) {
          completedCount++;
        }
      }
    }

    // 如果还有未完成的子任务，只更新进度
    if (totalCompletedCount < allChildren.length) {
      this.updateProgress();
      return;
    }

    // 所有子任务都已完成，根据完成类型决定父任务状态
    const totalChildren = allChildren.length;

    if (successCount === totalChildren) {
      // 全部成功 → 父任务成功
      if (this.data.status !== TaskStatus.SUCCESS) {
        await this.success(`所有 ${totalChildren} 个子任务成功`);
      }
    } else if (failedCount === totalChildren) {
      // 全部失败 → 父任务失败
      if (this.data.status !== TaskStatus.FAILED) {
        await this.fail(`所有 ${totalChildren} 个子任务失败`);
      }
    } else {
      // 混合状态（有成功、有失败、有完成、有取消） → 父任务完成
      if (this.data.status !== TaskStatus.COMPLETED) {
        await this.complete(`所有 ${totalChildren} 个子任务完成`);
      }
    }
  }

  /**
   * 检查是否有指定子任务
   */
  hasChild(child: TaskNode): boolean {
    return this.children.includes(child);
  }

  /**
   * 获取所有后代任务（只返回真实任务节点）
   */
  getDescendants(): TaskNode[] {
    const descendants: TaskNode[] = [];
    const realChildren = this.getRealChildren();

    for (const child of realChildren) {
      descendants.push(child);
      descendants.push(...child.getDescendants());
    }

    return descendants;
  }

  /**
   * 获取所有祖先任务
   */
  getAncestors(): TaskNode[] {
    const ancestors: TaskNode[] = [];
    let current = this.parent;

    while (current) {
      ancestors.push(current);
      current = current.parent;
    }

    return ancestors;
  }

  /**
   * 获取兄弟任务
   */
  getSiblings(): TaskNode[] {
    if (!this.parent) {
      return [];
    }

    return this.parent.getRealChildren().filter((child) => child !== this);
  }

  /**
   * 根据ID查找节点（只搜索真实节点）
   */
  findById(id: string): TaskNode | null {
    if (this.id === id) {
      return this;
    }

    for (const child of this.getRealChildren()) {
      const found = child.findById(id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * 根据条件查找节点
   */
  findByPredicate(predicate: (node: TaskNode) => boolean): TaskNode[] {
    const results: TaskNode[] = [];

    if (predicate(this)) {
      results.push(this);
    }

    for (const child of this.getRealChildren()) {
      results.push(...child.findByPredicate(predicate));
    }

    return results;
  }

  /**
   * 获取节点深度
   */
  getDepth(): number {
    return this.getAncestors().length;
  }

  /**
   * 获取子树高度
   */
  getHeight(): number {
    const realChildren = this.getRealChildren();
    if (realChildren.length === 0) {
      return 0;
    }

    return 1 + Math.max(...realChildren.map((child) => child.getHeight()));
  }

  /**
   * 是否为根节点
   */
  isRoot(): boolean {
    return this.parent === null;
  }

  /**
   * 是否为叶子节点
   */
  isLeaf(): boolean {
    return this.getRealChildren().length === 0;
  }

  /**
   * 转为数组表示（深度优先）
   */
  toArray(): TaskNode[] {
    const result: TaskNode[] = [this];

    for (const child of this.getRealChildren()) {
      result.push(...child.toArray());
    }

    return result;
  }

  /**
   * 转为JSON表示
   */
  toJSON(): any {
    return {
      id: this.id,
      status: this.data.status,
      progress: this.data.progress,
      data: this.data,
      context: this._sharedContext?.toJSON() || {},
      children: this.children.map((child) =>
        this.isPlaceholder(child) ? child : child.toJSON()
      ),
      isRoot: this.isRoot(),
      isLeaf: this.isLeaf()
    };
  }

  /**
   * 记录状态变更历史
   */
  private recordStatusChange(
    status: TaskStatus,
    event: TaskStatusChangeEvent,
    reason?: string,
    data?: any
  ): void {
    this.statusHistory.push({
      status,
      event,
      timestamp: new Date(),
      reason,
      data
    });
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    if (this.children.length === 0) {
      // 叶子节点，进度保持不变
      return;
    }

    // 计算子任务的总进度
    let totalProgress = 0;
    for (const child of this.children) {
      if (this.isPlaceholder(child)) {
        totalProgress += child.progress;
      } else {
        totalProgress += child.progress;
      }
    }

    this.data.progress = Math.round(totalProgress / this.children.length);

    this.log.debug(
      {
        taskId: this.id,
        progress: this.data.progress,
        childrenCount: this.children.length
      },
      '任务进度已更新'
    );
  }

  /**
   * 设置状态（内部方法）
   */
  private async setStatus(
    newStatus: TaskStatus,
    event: TaskStatusChangeEvent,
    triggerType: TriggerType,
    reason?: string,
    data?: any
  ): Promise<void> {
    const fromStatus = this.data.status;

    // 执行状态变更

    try {
      // 变更状态
      this.data.status = newStatus;

      // 记录状态变更
      this.recordStatusChange(newStatus, event, reason, data);

      // 执行器处理（如果有注册的执行器且有共享上下文）
      if (this._executor && this._sharedContext) {
        try {
          let executorMethod: string;

          // 根据状态变更事件选择执行器方法
          switch (event) {
            case TaskStatusChangeEvent.STARTED:
              executorMethod = 'onStart';
              break;
            case TaskStatusChangeEvent.PAUSED:
              executorMethod = 'onPause';
              break;
            case TaskStatusChangeEvent.RESUMED:
              executorMethod = 'onResume';
              break;
            case TaskStatusChangeEvent.SUCCESS:
              executorMethod = 'onSuccess';
              break;
            case TaskStatusChangeEvent.FAILED:
              executorMethod = 'onFail';
              break;
            case TaskStatusChangeEvent.CANCELLED:
              executorMethod = 'onCancel';
              break;
            case TaskStatusChangeEvent.COMPLETED:
              executorMethod = 'onComplete';
              break;
            case TaskStatusChangeEvent.RETRIED:
              // 重试事件不需要执行特定的执行器方法，因为它会转到 PENDING 状态然后再次启动
              executorMethod = '';
              break;
            default:
              executorMethod = '';
          }

          if (executorMethod) {
            await this.executeExecutorMethod(executorMethod);
          }
        } catch (error) {
          this.log.error(
            {
              taskId: this.id,
              executorName: this._executor.name,
              event,
              error
            },
            '执行器处理失败，但不影响状态变更'
          );
        }
      }

      // 发布数据库同步事件（异步处理，不阻塞状态变更）
      const syncEvent: TaskStatusSyncEvent = {
        taskId: this.id,
        fromStatus,
        toStatus: newStatus,
        progress: TaskStatusUtils.isCompleted(newStatus)
          ? 100
          : this.data.progress,
        timestamp: new Date(),
        reason,
        executorName: this.data.executorName,
        taskData: {
          ...this.data,
          // 确保包含父任务ID信息
          parentId: this.parent?.id || null
        },
        triggerType
      };

      // 使用setImmediate确保异步执行，不阻塞当前状态变更
      this.emit(TASK_NODE_EVENTS.STATUS_SYNC, syncEvent);
      // 发布状态事件
      this.emit(event, this);

      // 检查是否为根节点且状态变为完成状态
      if (this.isRoot() && TaskStatusUtils.isCompleted(newStatus)) {
        // 发送根节点完成事件，触发任务树清理
        const treeCompletionEvent: TreeCompletionEvent = {
          rootTaskId: this.id,
          finalStatus: newStatus,
          completedAt: new Date(),
          totalTasks: this.toArray().length,
          treeData: this.toJSON()
        };

        this.emit(TASK_NODE_EVENTS.TREE_COMPLETED, treeCompletionEvent);

        this.log.info(
          {
            rootTaskId: this.id,
            finalStatus: newStatus,
            totalTasks: treeCompletionEvent.totalTasks
          },
          '根节点已完成，已发送任务树完成事件'
        );
      }

      this.log.info(
        {
          taskId: this.id,
          fromStatus,
          toStatus: newStatus,
          event,
          triggerType,
          reason,
          hasExecutor: !!this._executor
        },
        '任务状态变更成功'
      );
    } catch (error) {
      this.log.error(
        {
          taskId: this.id,
          fromStatus,
          toStatus: newStatus,
          event,
          error
        },
        '任务状态变更失败'
      );
      throw error;
    }
  }

  async run(): Promise<void> {
    await this.executeExecutorMethod('onRun');
  }

  /**
   * 启动任务
   */
  async start(reason?: string): Promise<void> {
    // 检查当前任务状态
    if (!TaskStatusUtils.canStart(this.data.status)) {
      throw new Error(`任务 ${this.id} 当前状态 ${this.data.status} 无法启动`);
    }

    // 检查父任务状态：如果父任务是PENDING状态，子任务无法启动
    if (this.parent && this.parent.status === TaskStatus.PENDING) {
      throw new Error(
        `任务 ${this.id} 无法启动：父任务 ${this.parent.id} 处于PENDING状态，请先启动父任务`
      );
    }

    const event =
      this.data.status === TaskStatus.PENDING
        ? TaskStatusChangeEvent.STARTED
        : TaskStatusChangeEvent.RESUMED;

    await this.setStatus(TaskStatus.RUNNING, event, TriggerType.MANUAL, reason);

    this.log.debug(
      {
        taskId: this.id,
        childrenCount: this.getRealChildren().length,
        event
      },
      '任务启动完成'
    );
  }

  /**
   * 暂停任务
   */
  async pause(reason?: string): Promise<void> {
    if (this.data.status !== TaskStatus.RUNNING) {
      throw new Error(`任务 ${this.id} 当前状态 ${this.data.status} 无法暂停`);
    }

    await this.setStatus(
      TaskStatus.PAUSED,
      TaskStatusChangeEvent.PAUSED,
      TriggerType.MANUAL,
      reason
    );
  }

  /**
   * 恢复任务
   */
  async resume(reason?: string): Promise<void> {
    if (this.data.status !== TaskStatus.PAUSED) {
      throw new Error(`任务 ${this.id} 当前状态 ${this.data.status} 无法恢复`);
    }

    await this.setStatus(
      TaskStatus.RUNNING,
      TaskStatusChangeEvent.RESUMED,
      TriggerType.MANUAL,
      reason
    );
  }

  /**
   * 任务成功完成（仅限叶子节点或级联触发）
   */
  async success(reason?: string, result?: any): Promise<void> {
    // 有子节点的任务不能直接完成
    if (this.getRealChildren().length > 0) {
      throw new Error(`任务 ${this.id} 有子任务，无法直接标记成功`);
    }

    if (
      !TaskStatusUtils.isRunning(this.data.status) &&
      this.data.status !== TaskStatus.PENDING
    ) {
      throw new Error(
        `任务 ${this.id} 当前状态 ${this.data.status} 无法标记成功`
      );
    }

    await this.setStatus(
      TaskStatus.SUCCESS,
      TaskStatusChangeEvent.SUCCESS,
      TriggerType.MANUAL,
      reason,
      result
    );
  }

  /**
   * 完成任务（设置为COMPLETED状态）
   */
  async complete(reason?: string, result?: any): Promise<void> {
    // 有子节点的任务不能直接完成
    if (this.getRealChildren().length > 0) {
      throw new Error(`任务 ${this.id} 有子任务，无法直接标记完成`);
    }

    if (
      !TaskStatusUtils.isRunning(this.data.status) &&
      this.data.status !== TaskStatus.PENDING
    ) {
      throw new Error(
        `任务 ${this.id} 当前状态 ${this.data.status} 无法标记完成`
      );
    }

    await this.setStatus(
      TaskStatus.COMPLETED,
      TaskStatusChangeEvent.COMPLETED,
      TriggerType.MANUAL,
      reason,
      result
    );

    this.data.progress = 100;
  }

  /**
   * 任务失败（仅限叶子节点或级联触发）
   */
  async fail(reason?: string, error?: Error): Promise<void> {
    // 有子节点的任务不能直接失败
    if (this.getRealChildren().length > 0) {
      throw new Error(`任务 ${this.id} 有子任务，无法直接失败`);
    }

    await this.setStatus(
      TaskStatus.FAILED,
      TaskStatusChangeEvent.FAILED,
      TriggerType.MANUAL,
      reason,
      error
    );
  }

  /**
   * 取消任务
   */
  async cancel(reason?: string): Promise<void> {
    if (TaskStatusUtils.isCompleted(this.data.status)) {
      throw new Error(`任务 ${this.id} 当前状态 ${this.data.status} 无法取消`);
    }

    await this.setStatus(
      TaskStatus.CANCELLED,
      TaskStatusChangeEvent.CANCELLED,
      TriggerType.MANUAL,
      reason
    );
  }

  /**
   * 重试失败的任务
   * @param reason 重试原因
   * @param resetProgress 是否重置进度，默认为 true
   */
  async retry(reason?: string, resetProgress: boolean = true): Promise<void> {
    // 检查任务是否可以重试
    if (!TaskStatusUtils.canRetry(this.data.status)) {
      throw new Error(`任务 ${this.id} 当前状态 ${this.data.status} 无法重试`);
    }

    // 检查是否超过重试限制
    const executorConfig =
      this.data.executorConfig || this.data.metadata?.executorConfig;
    const maxRetries = executorConfig?.retries || 0;
    const currentRetries = this.data.metadata?.currentRetries || 0;

    if (maxRetries > 0 && currentRetries >= maxRetries) {
      throw new Error(
        `任务 ${this.id} 已达到最大重试次数 ${maxRetries}，无法继续重试`
      );
    }

    this.log.info(
      {
        taskId: this.id,
        currentRetries,
        maxRetries,
        reason
      },
      '开始重试失败的任务'
    );

    // 更新重试相关的元数据
    const newCurrentRetries = currentRetries + 1;
    const now = new Date();

    // 构建重试历史记录
    const retryHistory = this.data.metadata?.retryHistory || [];
    retryHistory.push({
      attemptNumber: newCurrentRetries,
      timestamp: now,
      reason: reason || '手动重试',
      error: undefined // 这次重试还没有错误信息
    });

    // 更新元数据
    this.updateMetadata(
      (oldMetadata) => ({
        ...oldMetadata,
        currentRetries: newCurrentRetries,
        lastRetryAt: now,
        retryHistory
      }),
      `重试任务：第 ${newCurrentRetries} 次尝试`
    );

    // 重置进度（如果需要）
    if (resetProgress) {
      this.data.progress = 0;
    }

    // 更新状态到 PENDING，然后自动启动任务
    await this.setStatus(
      TaskStatus.PENDING,
      TaskStatusChangeEvent.RETRIED,
      TriggerType.MANUAL,
      reason || `重试任务：第 ${newCurrentRetries} 次尝试`
    );

    // 自动启动重试的任务
    try {
      await this.start('重试后自动启动');
    } catch (error) {
      this.log.error(
        {
          taskId: this.id,
          currentRetries: newCurrentRetries,
          error: error instanceof Error ? error.message : String(error)
        },
        '重试任务启动失败'
      );
      throw error;
    }

    this.log.info(
      {
        taskId: this.id,
        currentRetries: newCurrentRetries,
        maxRetries
      },
      '任务重试完成并已启动'
    );
  }

  /**
   * 转为占位符
   */
  toPlaceholder(): TaskNodePlaceholder {
    return {
      id: this.id,
      name: this.data.name,
      status: this.data.status,
      progress: this.data.progress,
      completedAt: new Date(),
      isPlaceholder: true
    };
  }

  /**
   * 获取任务树统计信息
   */
  getTreeStatistics(): any {
    const allNodes = this.toArray();
    const stats = {
      totalTasks: allNodes.length,
      byStatus: {} as Record<TaskStatus, number>,
      totalProgress: Math.round(
        allNodes.reduce((sum, node) => sum + node.progress, 0) / allNodes.length
      )
    };

    // 统计各状态的任务数量
    for (const status of Object.values(TaskStatus)) {
      stats.byStatus[status] = allNodes.filter(
        (node) => node.status === status
      ).length;
    }

    return stats;
  }
}

export const createTaskFactory =
  (
    log: Logger,
    statusSyncSubscribe: ReturnType<typeof handleStatusSync>,
    nodeCreationSubscribe: ReturnType<typeof handleNodeCreation>,
    treeCompletionSubscribe: ReturnType<typeof handleTreeCompletion>,
    metadataChangeSubscribe: ReturnType<typeof handleMetadataChange>,
    createSharedContext: ReturnType<typeof SharedContext.createSharedFactory>,
    contextSubscribe: ReturnType<typeof handleContextChange>,
    app: IStratixApp
  ) =>
  async (params: ExtendedCreateTaskParams): Promise<TaskNode> => {
    const { data, parentId, autoStart, contextData } = params;
    const taskTreeService = app.tryResolve('taskTreeService');
    if (!taskTreeService) {
      throw new Error('TaskTreeService not found');
    }

    const id = params.id || ids.generateTaskId();
    log.debug(
      {
        taskId: id,
        parentId,
        executorName: data.executorName,
        autoStart
      },
      '开始创建任务节点'
    );

    /**
     * 建立父子关系
     */
    const establishParentChildRelation = (
      taskNode: TaskNode,
      parentId: string
    ) => {
      const parentNode = taskTreeService.getTask(parentId);
      if (!parentNode) {
        throw new Error(`父任务 ${parentId} 不存在`);
      }
      if (!(parentNode instanceof TaskNode)) {
        throw new Error(`父任务 ${parentId} 是占位符`);
      }

      parentNode.addChild(taskNode);
      log.debug(
        {
          childId: taskNode.id,
          parentId
        },
        '父子关系建立完成'
      );
    };

    /**
     * 为任务节点订阅所有相关事件
     * TaskNode完成后会自动清理所有订阅，无需手动取消
     */
    const subscribeToNode = (taskNode: TaskNode): void => {
      const subscribedEvents: string[] = [];

      // 1. 状态同步事件

      taskNode.on(TASK_NODE_EVENTS.STATUS_SYNC, statusSyncSubscribe);
      subscribedEvents.push('STATUS_SYNC');

      // // 2. 节点创建事件
      // taskNode.on(TASK_NODE_EVENTS.NODE_CREATED, nodeCreationSubscribe);
      // subscribedEvents.push('NODE_CREATED');

      // 4. 节点占位符转换事件
      taskNode.on(
        TASK_NODE_EVENTS.NODE_CONVERTED_TO_PLACEHOLDER,
        taskTreeService.handleNodePlaceholderConversion.bind(taskTreeService)
      );
      subscribedEvents.push('NODE_CONVERTED_TO_PLACEHOLDER');

      // 5. 共享上下文变更事件
      taskNode.on(
        TASK_NODE_EVENTS.CONTEXT_CHANGED,
        contextSubscribe.handleContextChange
      );
      subscribedEvents.push('CONTEXT_CHANGED');

      if (taskNode.isRoot()) {
        // 6. 任务树完成事件（只有根节点需要）
        taskNode.on(TASK_NODE_EVENTS.TREE_COMPLETED, treeCompletionSubscribe);
        taskNode.on(
          TASK_NODE_EVENTS.TREE_COMPLETED,
          contextSubscribe.handleContextDeleted
        );
        taskNode.on(
          TASK_NODE_EVENTS.TREE_COMPLETED,
          taskTreeService.handleClearTree.bind(taskTreeService)
        );
        subscribedEvents.push('TREE_COMPLETED');
      }
      // 7. 元数据变更事件
      taskNode.on(TASK_NODE_EVENTS.METADATA_CHANGED, metadataChangeSubscribe);
      subscribedEvents.push('METADATA_CHANGED');

      log.debug(
        {
          taskId: taskNode.id,
          isRoot: taskNode.isRoot(),
          subscribedEvents
        },
        '节点函数式事件订阅完成'
      );
    };

    let sharedContext: SharedContext | undefined = undefined;
    // 如果提供了 createSharedContext 函数，说明这是根任务，需要创建 SharedContext
    if (!parentId) {
      sharedContext = await createSharedContext(
        id,
        contextData || {},
        params.isRecovery || false
      );
      log.debug(
        {
          taskId: id,
          taskName: data.name
        },
        '根任务已创建 SharedContext'
      );
    }

    // 2. 创建执行器实例，根据名称获取执行器
    // 1. 创建TaskNode实例（isRecovery=false，表示新建任务）
    // 如果是根任务（没有parentId），传入createSharedContext函数
    const taskNode = new TaskNode(
      id,
      data,
      log,
      params.isRecovery || false,
      sharedContext
    );

    // 3. 建立父子关系
    if (parentId) {
      establishParentChildRelation(taskNode, parentId);
    }
    subscribeToNode(taskNode);
    // 发送节点创建事件
    // taskNode.emitNodeCreatedEvent(params.isRecovery || false);
    await nodeCreationSubscribe({
      taskId: taskNode.id,
      taskName: taskNode.data.name,
      taskDescription: taskNode.data.description,
      timestamp: new Date(),
      parentId: taskNode.parent?.id,
      parentName: taskNode.parent?.data.name,
      priority: taskNode.data.priority,
      executorName: taskNode.data.executorName,
      type: taskNode.data.type,
      status: taskNode.data.status,
      progress: taskNode.data.progress,
      isRecovery: params.isRecovery || false,
      metadata: taskNode.data.metadata
    });
    if (data.executorName) {
      const executor = app.tryResolve(data.executorName);
      if (executor) {
        taskNode.setExecutor(executor);
      } else {
        throw new Error(`执行器 ${data.executorName} 不存在`);
      }
    }
    taskTreeService.setTask(id, taskNode);

    return taskNode;
  };
