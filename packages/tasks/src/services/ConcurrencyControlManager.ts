/**
 * 并发控制管理器
 * 提供工作流实例的并发执行控制和资源管理
 */

import { AwilixContainer, RESOLVER, type Logger } from '@stratix/core';
import { TasksPluginOptions } from '../index.js';

/**
 * 并发控制配置
 */
export interface ConcurrencyConfig {
  maxConcurrentWorkflows: number; // 最大并发工作流数量
  maxConcurrentNodesPerWorkflow: number; // 每个工作流最大并发节点数
  maxConcurrentTasksPerNode: number; // 每个节点最大并发任务数
  resourceLimits: {
    maxMemoryUsage: number; // 最大内存使用量（MB）
    maxCpuUsage: number; // 最大CPU使用率（%）
  };
  queueConfig: {
    maxQueueSize: number; // 最大队列大小
    priorityLevels: number; // 优先级级别数
  };
}

/**
 * 执行槽位信息
 */
export interface ExecutionSlot {
  id: string;
  type: 'workflow' | 'node' | 'task';
  instanceId: string;
  nodeId?: string;
  taskId?: string;
  priority: number;
  startTime: Date;
  estimatedDuration?: number;
}

/**
 * 资源使用情况
 */
export interface ResourceUsage {
  memoryUsage: number; // 内存使用量（MB）
  cpuUsage: number; // CPU使用率（%）
  activeSlots: number; // 活跃槽位数
  queuedItems: number; // 队列中的项目数
}

/**
 * 并发控制管理器
 */
export default class ConcurrencyControlManager {
  private readonly activeSlots = new Map<string, ExecutionSlot>();
  private readonly workflowSlots = new Map<string, Set<string>>(); // 工作流ID -> 槽位ID集合
  private readonly nodeSlots = new Map<string, Set<string>>(); // 节点ID -> 槽位ID集合
  private readonly executionQueue: ExecutionSlot[] = [];
  private resourceMonitorTimer?: NodeJS.Timeout | undefined;

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      // 从插件配置中提取并发控制配置
      const pluginConfig = container.resolve('config') as TasksPluginOptions;
      const userConfig =
        pluginConfig.concurrency || ({} as Partial<ConcurrencyConfig>);

      // 提供完整的默认配置
      const options: ConcurrencyConfig = {
        maxConcurrentWorkflows: userConfig.maxConcurrentWorkflows || 10,
        maxConcurrentNodesPerWorkflow:
          userConfig.maxConcurrentNodesPerWorkflow || 5,
        maxConcurrentTasksPerNode: userConfig.maxConcurrentTasksPerNode || 3,
        resourceLimits: {
          maxMemoryUsage: userConfig.resourceLimits?.maxMemoryUsage || 1024,
          maxCpuUsage: userConfig.resourceLimits?.maxCpuUsage || 80
        },
        queueConfig: {
          maxQueueSize: userConfig.queueConfig?.maxQueueSize || 100,
          priorityLevels: userConfig.queueConfig?.priorityLevels || 5
        }
      };

      return { options };
    }
  };

  constructor(
    private readonly logger: Logger,
    private readonly options: ConcurrencyConfig
  ) {
    this.startResourceMonitoring();
  }

  /**
   * 请求执行槽位
   */
  async requestExecutionSlot(
    type: 'workflow' | 'node' | 'task',
    instanceId: string,
    nodeId?: string,
    taskId?: string,
    priority: number = 0,
    estimatedDuration?: number
  ): Promise<string | null> {
    const slotId = this.generateSlotId(type, instanceId, nodeId, taskId);

    try {
      // 检查是否可以立即分配槽位
      if (this.canAllocateSlot(type, instanceId, nodeId)) {
        const slot: ExecutionSlot = {
          id: slotId,
          type,
          instanceId,
          ...(nodeId && { nodeId }),
          ...(taskId && { taskId }),
          priority,
          startTime: new Date(),
          ...(estimatedDuration && { estimatedDuration })
        };

        this.allocateSlot(slot);

        this.logger.debug('分配执行槽位', {
          slotId,
          type,
          instanceId,
          nodeId,
          taskId,
          activeSlots: this.activeSlots.size
        });

        return slotId;
      }

      // 无法立即分配，加入队列
      if (this.executionQueue.length >= this.options.queueConfig.maxQueueSize) {
        this.logger.warn('执行队列已满，拒绝请求', {
          queueSize: this.executionQueue.length,
          maxQueueSize: this.options.queueConfig.maxQueueSize
        });
        return null;
      }

      const queuedSlot: ExecutionSlot = {
        id: slotId,
        type,
        instanceId,
        ...(nodeId && { nodeId }),
        ...(taskId && { taskId }),
        priority,
        startTime: new Date(),
        ...(estimatedDuration && { estimatedDuration })
      };

      this.addToQueue(queuedSlot);

      this.logger.debug('请求加入执行队列', {
        slotId,
        type,
        instanceId,
        queuePosition: this.executionQueue.length
      });

      return slotId;
    } catch (error) {
      this.logger.error('请求执行槽位失败', {
        slotId,
        type,
        instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * 释放执行槽位
   */
  async releaseExecutionSlot(slotId: string): Promise<boolean> {
    try {
      const slot = this.activeSlots.get(slotId);
      if (!slot) {
        this.logger.warn('尝试释放不存在的槽位', { slotId });
        return false;
      }

      this.deallocateSlot(slot);

      this.logger.debug('释放执行槽位', {
        slotId,
        type: slot.type,
        instanceId: slot.instanceId,
        duration: Date.now() - slot.startTime.getTime(),
        remainingSlots: this.activeSlots.size
      });

      // 尝试从队列中分配新的槽位
      await this.processQueue();

      return true;
    } catch (error) {
      this.logger.error('释放执行槽位失败', {
        slotId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 获取资源使用情况
   */
  getResourceUsage(): ResourceUsage {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    return {
      memoryUsage: memoryUsageMB,
      cpuUsage: this.getCurrentCpuUsage(),
      activeSlots: this.activeSlots.size,
      queuedItems: this.executionQueue.length
    };
  }

  /**
   * 检查是否可以分配槽位
   */
  private canAllocateSlot(
    type: 'workflow' | 'node' | 'task',
    instanceId: string,
    nodeId?: string
  ): boolean {
    // 检查资源限制
    const resourceUsage = this.getResourceUsage();
    if (
      resourceUsage.memoryUsage > this.options.resourceLimits.maxMemoryUsage ||
      resourceUsage.cpuUsage > this.options.resourceLimits.maxCpuUsage
    ) {
      return false;
    }

    // 检查工作流级别的并发限制
    if (type === 'workflow') {
      const activeWorkflows = new Set();
      for (const slot of this.activeSlots.values()) {
        if (slot.type === 'workflow') {
          activeWorkflows.add(slot.instanceId);
        }
      }
      return activeWorkflows.size < this.options.maxConcurrentWorkflows;
    }

    // 检查节点级别的并发限制
    if (type === 'node') {
      const workflowSlots = this.workflowSlots.get(instanceId) || new Set();
      const nodeSlots = Array.from(workflowSlots).filter((slotId) => {
        const slot = this.activeSlots.get(slotId);
        return slot && slot.type === 'node';
      });
      return nodeSlots.length < this.options.maxConcurrentNodesPerWorkflow;
    }

    // 检查任务级别的并发限制
    if (type === 'task' && nodeId) {
      const nodeKey = `${instanceId}:${nodeId}`;
      const nodeSlots = this.nodeSlots.get(nodeKey) || new Set();
      const taskSlots = Array.from(nodeSlots).filter((slotId) => {
        const slot = this.activeSlots.get(slotId);
        return slot && slot.type === 'task';
      });
      return taskSlots.length < this.options.maxConcurrentTasksPerNode;
    }

    return true;
  }

  /**
   * 分配槽位
   */
  private allocateSlot(slot: ExecutionSlot): void {
    this.activeSlots.set(slot.id, slot);

    // 更新工作流槽位映射
    if (!this.workflowSlots.has(slot.instanceId)) {
      this.workflowSlots.set(slot.instanceId, new Set());
    }
    this.workflowSlots.get(slot.instanceId)!.add(slot.id);

    // 更新节点槽位映射
    if (slot.nodeId) {
      const nodeKey = `${slot.instanceId}:${slot.nodeId}`;
      if (!this.nodeSlots.has(nodeKey)) {
        this.nodeSlots.set(nodeKey, new Set());
      }
      this.nodeSlots.get(nodeKey)!.add(slot.id);
    }
  }

  /**
   * 释放槽位
   */
  private deallocateSlot(slot: ExecutionSlot): void {
    this.activeSlots.delete(slot.id);

    // 更新工作流槽位映射
    const workflowSlots = this.workflowSlots.get(slot.instanceId);
    if (workflowSlots) {
      workflowSlots.delete(slot.id);
      if (workflowSlots.size === 0) {
        this.workflowSlots.delete(slot.instanceId);
      }
    }

    // 更新节点槽位映射
    if (slot.nodeId) {
      const nodeKey = `${slot.instanceId}:${slot.nodeId}`;
      const nodeSlots = this.nodeSlots.get(nodeKey);
      if (nodeSlots) {
        nodeSlots.delete(slot.id);
        if (nodeSlots.size === 0) {
          this.nodeSlots.delete(nodeKey);
        }
      }
    }
  }

  /**
   * 添加到队列
   */
  private addToQueue(slot: ExecutionSlot): void {
    // 按优先级插入队列
    let insertIndex = this.executionQueue.length;
    for (let i = 0; i < this.executionQueue.length; i++) {
      if (this.executionQueue[i].priority < slot.priority) {
        insertIndex = i;
        break;
      }
    }
    this.executionQueue.splice(insertIndex, 0, slot);
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const slot = this.executionQueue[0];

      if (this.canAllocateSlot(slot.type, slot.instanceId, slot.nodeId)) {
        this.executionQueue.shift();
        this.allocateSlot(slot);

        this.logger.debug('从队列分配槽位', {
          slotId: slot.id,
          type: slot.type,
          instanceId: slot.instanceId,
          waitTime: Date.now() - slot.startTime.getTime()
        });
      } else {
        break;
      }
    }
  }

  /**
   * 生成槽位ID
   */
  private generateSlotId(
    type: string,
    instanceId: string,
    nodeId?: string,
    taskId?: string
  ): string {
    const parts = [type, instanceId];
    if (nodeId) parts.push(nodeId);
    if (taskId) parts.push(taskId);
    return parts.join(':') + ':' + Date.now();
  }

  /**
   * 获取当前CPU使用率（简化实现）
   */
  private getCurrentCpuUsage(): number {
    // 这里是一个简化的实现，实际应用中可能需要更复杂的CPU监控
    const usage = process.cpuUsage();
    return Math.min(((usage.user + usage.system) / 1000000) * 100, 100);
  }

  /**
   * 启动资源监控
   */
  private startResourceMonitoring(): void {
    this.resourceMonitorTimer = setInterval(() => {
      const usage = this.getResourceUsage();

      if (
        usage.memoryUsage > this.options.resourceLimits.maxMemoryUsage * 0.9 ||
        usage.cpuUsage > this.options.resourceLimits.maxCpuUsage * 0.9
      ) {
        this.logger.warn('资源使用率接近限制', usage);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 停止资源监控
   */
  stopResourceMonitoring(): void {
    if (this.resourceMonitorTimer) {
      clearInterval(this.resourceMonitorTimer);
      this.resourceMonitorTimer = undefined;
    }
  }

  /**
   * 清理所有槽位
   */
  cleanup(): void {
    this.activeSlots.clear();
    this.workflowSlots.clear();
    this.nodeSlots.clear();
    this.executionQueue.length = 0;
    this.stopResourceMonitoring();
  }
}
