// @stratix/icasync 任务编排服务
// 负责协调和管理整个同步工作流的执行

import { Logger } from '@stratix/core';
import type { IWorkflowAdapter, WorkflowDefinition, WorkflowStatus } from '@stratix/tasks';
import type {
  IcasyncTaskProcessor,
  TaskExecutionContext,
  WorkflowExecutionResult,
  SyncConfig,
  IcasyncServices,
  IcasyncTaskType,
  ProcessorRegistration
} from '../types/task-types.js';
import { FULL_SYNC_WORKFLOW, INCREMENTAL_SYNC_WORKFLOW } from '../workflows/workflow-definitions.js';

/**
 * 任务编排服务
 * 
 * 功能：
 * 1. 管理任务处理器的注册和生命周期
 * 2. 编排和执行复杂的同步工作流
 * 3. 提供统一的任务监控和状态管理
 * 4. 处理工作流级别的错误和重试
 * 5. 支持动态工作流配置和扩展
 */
export class TaskOrchestrator {
  private readonly processors = new Map<IcasyncTaskType, ProcessorRegistration>();
  private readonly activeWorkflows = new Map<string, WorkflowMonitor>();

  constructor(
    private readonly workflowAdapter: IWorkflowAdapter,
    private readonly services: IcasyncServices,
    private readonly logger: Logger
  ) {
    this.logger.info('TaskOrchestrator 初始化完成');
  }

  /**
   * 注册任务处理器
   */
  registerProcessor(processor: IcasyncTaskProcessor): void {
    const registration: ProcessorRegistration = {
      processor,
      registeredAt: new Date(),
      enabled: true
    };

    this.processors.set(processor.type, registration);
    
    this.logger.info('任务处理器注册成功', {
      processorName: processor.name,
      taskType: processor.type,
      supportsBatch: processor.supportsBatch,
      supportsParallel: processor.supportsParallel
    });
  }

  /**
   * 获取已注册的处理器
   */
  getProcessor(taskType: IcasyncTaskType): IcasyncTaskProcessor | undefined {
    const registration = this.processors.get(taskType);
    return registration?.enabled ? registration.processor : undefined;
  }

  /**
   * 执行全量同步工作流
   */
  async executeFullSync(xnxq: string, config?: SyncConfig): Promise<WorkflowExecutionResult> {
    this.logger.info('开始执行全量同步工作流', { xnxq, config });

    try {
      // 1. 验证前置条件
      await this.validatePrerequisites(xnxq);

      // 2. 创建工作流定义
      const workflowDef = this.createFullSyncWorkflow(xnxq, config);

      // 3. 创建并启动工作流
      const workflowResult = await this.workflowAdapter.createWorkflow(workflowDef);
      if (!workflowResult.success) {
        throw new Error(`创建全量同步工作流失败: ${workflowResult.error}`);
      }

      const workflowId = workflowResult.data!.id;

      // 4. 启动工作流监控
      await this.startWorkflowMonitoring(workflowId, 'full_sync', xnxq);

      // 5. 执行工作流
      const executionResult = await this.workflowAdapter.executeWorkflow(workflowId, {
        timeout: config?.timeout || 1800000, // 30分钟
        retries: config?.retries || 3,
        parallel: config?.parallel || false
      });

      if (!executionResult.success) {
        throw new Error(`启动全量同步工作流失败: ${executionResult.error}`);
      }

      this.logger.info('全量同步工作流启动成功', { workflowId, xnxq });

      return {
        workflowId,
        success: true,
        startedAt: new Date()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('全量同步工作流启动失败', { xnxq, error: errorMessage });
      
      return {
        workflowId: '',
        success: false,
        startedAt: new Date(),
        error: errorMessage
      };
    }
  }

  /**
   * 执行增量同步工作流
   */
  async executeIncrementalSync(xnxq: string, config?: SyncConfig): Promise<WorkflowExecutionResult> {
    this.logger.info('开始执行增量同步工作流', { xnxq, config });

    try {
      // 1. 验证前置条件
      await this.validatePrerequisites(xnxq);

      // 2. 创建工作流定义
      const workflowDef = this.createIncrementalSyncWorkflow(xnxq, config);

      // 3. 创建并启动工作流
      const workflowResult = await this.workflowAdapter.createWorkflow(workflowDef);
      if (!workflowResult.success) {
        throw new Error(`创建增量同步工作流失败: ${workflowResult.error}`);
      }

      const workflowId = workflowResult.data!.id;

      // 4. 启动工作流监控
      await this.startWorkflowMonitoring(workflowId, 'incremental_sync', xnxq);

      // 5. 执行工作流
      const executionResult = await this.workflowAdapter.executeWorkflow(workflowId, {
        timeout: config?.timeout || 600000, // 10分钟
        retries: config?.retries || 2,
        parallel: config?.parallel || true
      });

      if (!executionResult.success) {
        throw new Error(`启动增量同步工作流失败: ${executionResult.error}`);
      }

      this.logger.info('增量同步工作流启动成功', { workflowId, xnxq });

      return {
        workflowId,
        success: true,
        startedAt: new Date()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('增量同步工作流启动失败', { xnxq, error: errorMessage });
      
      return {
        workflowId: '',
        success: false,
        startedAt: new Date(),
        error: errorMessage
      };
    }
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus | null> {
    try {
      const statusResult = await this.workflowAdapter.getWorkflowStatus(workflowId);
      return statusResult.success ? statusResult.data! : null;
    } catch (error) {
      this.logger.error('获取工作流状态失败', { workflowId, error: error.message });
      return null;
    }
  }

  /**
   * 停止工作流
   */
  async stopWorkflow(workflowId: string): Promise<boolean> {
    try {
      // 1. 停止工作流执行
      const stopResult = await this.workflowAdapter.stopWorkflow(workflowId);
      
      // 2. 停止监控
      const monitor = this.activeWorkflows.get(workflowId);
      if (monitor) {
        monitor.stop();
        this.activeWorkflows.delete(workflowId);
      }

      this.logger.info('工作流已停止', { workflowId });
      return stopResult.success;
    } catch (error) {
      this.logger.error('停止工作流失败', { workflowId, error: error.message });
      return false;
    }
  }

  /**
   * 重试工作流
   */
  async retryWorkflow(workflowId: string): Promise<boolean> {
    try {
      const retryResult = await this.workflowAdapter.retryWorkflow(workflowId);
      
      if (retryResult.success) {
        this.logger.info('工作流重试成功', { workflowId });
      } else {
        this.logger.error('工作流重试失败', { workflowId, error: retryResult.error });
      }

      return retryResult.success;
    } catch (error) {
      this.logger.error('工作流重试异常', { workflowId, error: error.message });
      return false;
    }
  }

  /**
   * 获取活跃工作流列表
   */
  getActiveWorkflows(): string[] {
    return Array.from(this.activeWorkflows.keys());
  }

  /**
   * 获取已注册的处理器列表
   */
  getRegisteredProcessors(): Array<{ type: IcasyncTaskType; name: string; enabled: boolean }> {
    return Array.from(this.processors.entries()).map(([type, registration]) => ({
      type,
      name: registration.processor.name,
      enabled: registration.enabled
    }));
  }

  /**
   * 验证前置条件
   */
  private async validatePrerequisites(xnxq: string): Promise<void> {
    // 验证学年学期格式
    if (!/^\d{4}-\d{4}-[12]$/.test(xnxq)) {
      throw new Error(`Invalid xnxq format: ${xnxq}`);
    }

    // 验证必要的处理器是否已注册
    const requiredProcessors = [
      IcasyncTaskType.DATA_VALIDATION,
      IcasyncTaskType.DATA_AGGREGATION,
      IcasyncTaskType.CALENDAR_CREATION
    ];

    for (const processorType of requiredProcessors) {
      if (!this.processors.has(processorType)) {
        throw new Error(`Required processor not registered: ${processorType}`);
      }
    }

    // 验证服务可用性
    if (!this.services.courseRawRepository || !this.services.juheRenwuRepository) {
      throw new Error('Required repositories not available');
    }
  }

  /**
   * 创建全量同步工作流定义
   */
  private createFullSyncWorkflow(xnxq: string, config?: SyncConfig): WorkflowDefinition {
    const workflowDef = {
      ...FULL_SYNC_WORKFLOW,
      name: `全量同步-${xnxq}-${Date.now()}`,
      description: `学年学期 ${xnxq} 的课表全量同步工作流`,
      tasks: FULL_SYNC_WORKFLOW.tasks.map(task => ({
        ...task,
        config: {
          ...task.config,
          xnxq,
          ...config
        }
      })),
      options: {
        ...FULL_SYNC_WORKFLOW.options,
        timeout: config?.timeout || FULL_SYNC_WORKFLOW.options?.timeout,
        retries: config?.retries || FULL_SYNC_WORKFLOW.options?.retries,
        parallel: config?.parallel || FULL_SYNC_WORKFLOW.options?.parallel
      }
    };

    return workflowDef;
  }

  /**
   * 创建增量同步工作流定义
   */
  private createIncrementalSyncWorkflow(xnxq: string, config?: SyncConfig): WorkflowDefinition {
    const workflowDef = {
      ...INCREMENTAL_SYNC_WORKFLOW,
      name: `增量同步-${xnxq}-${Date.now()}`,
      description: `学年学期 ${xnxq} 的课表增量同步工作流`,
      tasks: INCREMENTAL_SYNC_WORKFLOW.tasks.map(task => ({
        ...task,
        config: {
          ...task.config,
          xnxq,
          ...config
        }
      })),
      options: {
        ...INCREMENTAL_SYNC_WORKFLOW.options,
        timeout: config?.timeout || INCREMENTAL_SYNC_WORKFLOW.options?.timeout,
        retries: config?.retries || INCREMENTAL_SYNC_WORKFLOW.options?.retries,
        parallel: config?.parallel || INCREMENTAL_SYNC_WORKFLOW.options?.parallel
      }
    };

    return workflowDef;
  }

  /**
   * 启动工作流监控
   */
  private async startWorkflowMonitoring(workflowId: string, type: string, xnxq: string): Promise<void> {
    try {
      const monitorResult = await this.workflowAdapter.monitorWorkflow(
        workflowId,
        (status: WorkflowStatus) => {
          this.handleWorkflowStatusUpdate(workflowId, type, xnxq, status);
        }
      );

      if (monitorResult.success) {
        const monitor: WorkflowMonitor = {
          workflowId,
          type,
          xnxq,
          startedAt: new Date(),
          stop: monitorResult.data!
        };

        this.activeWorkflows.set(workflowId, monitor);
        this.logger.info('工作流监控启动成功', { workflowId, type, xnxq });
      } else {
        this.logger.warn('工作流监控启动失败', { 
          workflowId, 
          error: monitorResult.error 
        });
      }
    } catch (error) {
      this.logger.error('启动工作流监控异常', { 
        workflowId, 
        error: error.message 
      });
    }
  }

  /**
   * 处理工作流状态更新
   */
  private handleWorkflowStatusUpdate(
    workflowId: string,
    type: string,
    xnxq: string,
    status: WorkflowStatus
  ): void {
    this.logger.info('工作流状态更新', {
      workflowId,
      type,
      xnxq,
      status: status.status,
      progress: status.progress,
      completedTasks: status.completedTasks,
      totalTasks: status.totalTasks,
      failedTasks: status.failedTasks
    });

    // 如果工作流完成或失败，清理监控
    if (['completed', 'failed', 'cancelled'].includes(status.status)) {
      const monitor = this.activeWorkflows.get(workflowId);
      if (monitor) {
        monitor.stop();
        this.activeWorkflows.delete(workflowId);
        
        this.logger.info('工作流执行结束，监控已停止', {
          workflowId,
          finalStatus: status.status,
          duration: monitor.startedAt ? Date.now() - monitor.startedAt.getTime() : 0
        });
      }
    }

    // 可以在这里添加更多的状态处理逻辑
    // 比如发送通知、更新数据库状态、触发后续流程等
  }
}

/**
 * 工作流监控信息
 */
interface WorkflowMonitor {
  workflowId: string;
  type: string;
  xnxq: string;
  startedAt: Date;
  stop: () => void;
}
