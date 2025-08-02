// @stratix/icasync 任务系统引导程序
// 负责初始化和配置整个任务系统

import { Logger } from '@stratix/core';
import type { IWorkflowAdapter } from '@stratix/tasks';
import { TaskOrchestrator } from './services/TaskOrchestrator.js';
import { DataAggregationProcessor } from './processors/DataAggregationProcessor.js';
import { CalendarCreationProcessor } from './processors/CalendarCreationProcessor.js';
import type { IcasyncServices, IcasyncTaskType } from './types/task-types.js';

/**
 * 任务系统配置
 */
export interface TaskSystemConfig {
  /** 是否启用任务系统 */
  enabled: boolean;
  /** 工作流适配器配置 */
  workflowAdapter: {
    type: 'memory' | 'redis' | 'database';
    config: Record<string, any>;
  };
  /** 任务处理器配置 */
  processors: {
    [K in IcasyncTaskType]?: {
      enabled: boolean;
      config?: Record<string, any>;
    };
  };
  /** 监控配置 */
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  /** 性能配置 */
  performance: {
    defaultTimeout: number;
    defaultRetries: number;
    maxConcurrentWorkflows: number;
    resourceLimits: {
      maxMemoryUsage: number;
      maxCpuUsage: number;
    };
  };
}

/**
 * 默认任务系统配置
 */
export const DEFAULT_TASK_SYSTEM_CONFIG: TaskSystemConfig = {
  enabled: true,
  workflowAdapter: {
    type: 'memory',
    config: {}
  },
  processors: {
    data_validation: { enabled: true },
    data_aggregation: { enabled: true },
    data_cleanup: { enabled: true },
    calendar_creation: { enabled: true },
    calendar_deletion: { enabled: true },
    calendar_update: { enabled: true },
    participant_addition: { enabled: true },
    participant_removal: { enabled: true },
    participant_sync: { enabled: true },
    schedule_creation: { enabled: true },
    schedule_deletion: { enabled: true },
    schedule_update: { enabled: true },
    status_update: { enabled: true },
    sync_completion: { enabled: true },
    report_generation: { enabled: true }
  },
  monitoring: {
    enabled: true,
    metricsInterval: 30000, // 30秒
    logLevel: 'info'
  },
  performance: {
    defaultTimeout: 300000, // 5分钟
    defaultRetries: 3,
    maxConcurrentWorkflows: 5,
    resourceLimits: {
      maxMemoryUsage: 0.8, // 80%
      maxCpuUsage: 0.7     // 70%
    }
  }
};

/**
 * 任务系统引导程序
 * 
 * 功能：
 * 1. 初始化任务编排器
 * 2. 注册所有任务处理器
 * 3. 配置监控和性能管理
 * 4. 提供统一的任务系统入口
 */
export class TaskSystemBootstrap {
  private orchestrator?: TaskOrchestrator;
  private isInitialized = false;

  constructor(
    private readonly workflowAdapter: IWorkflowAdapter,
    private readonly services: IcasyncServices,
    private readonly logger: Logger,
    private readonly config: TaskSystemConfig = DEFAULT_TASK_SYSTEM_CONFIG
  ) {}

  /**
   * 初始化任务系统
   */
  async initialize(): Promise<TaskOrchestrator> {
    if (this.isInitialized) {
      return this.orchestrator!;
    }

    if (!this.config.enabled) {
      throw new Error('Task system is disabled in configuration');
    }

    this.logger.info('开始初始化任务系统', {
      config: {
        workflowAdapterType: this.config.workflowAdapter.type,
        enabledProcessors: Object.entries(this.config.processors)
          .filter(([_, config]) => config.enabled)
          .map(([type]) => type),
        monitoringEnabled: this.config.monitoring.enabled
      }
    });

    try {
      // 1. 创建任务编排器
      this.orchestrator = new TaskOrchestrator(
        this.workflowAdapter,
        this.services,
        this.logger
      );

      // 2. 注册任务处理器
      await this.registerProcessors();

      // 3. 启动监控（如果启用）
      if (this.config.monitoring.enabled) {
        await this.startMonitoring();
      }

      // 4. 验证系统状态
      await this.validateSystemHealth();

      this.isInitialized = true;
      this.logger.info('任务系统初始化完成');

      return this.orchestrator;
    } catch (error) {
      this.logger.error('任务系统初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取任务编排器
   */
  getOrchestrator(): TaskOrchestrator {
    if (!this.isInitialized || !this.orchestrator) {
      throw new Error('Task system not initialized. Call initialize() first.');
    }
    return this.orchestrator;
  }

  /**
   * 关闭任务系统
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    this.logger.info('开始关闭任务系统');

    try {
      // 1. 停止所有活跃的工作流
      if (this.orchestrator) {
        const activeWorkflows = this.orchestrator.getActiveWorkflows();
        for (const workflowId of activeWorkflows) {
          await this.orchestrator.stopWorkflow(workflowId);
        }
      }

      // 2. 停止监控
      await this.stopMonitoring();

      // 3. 清理资源
      this.orchestrator = undefined;
      this.isInitialized = false;

      this.logger.info('任务系统关闭完成');
    } catch (error) {
      this.logger.error('任务系统关闭失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 注册任务处理器
   */
  private async registerProcessors(): Promise<void> {
    this.logger.info('开始注册任务处理器');

    // 数据聚合处理器
    if (this.config.processors.data_aggregation?.enabled) {
      const processor = new DataAggregationProcessor(
        this.services.courseRawRepository,
        this.services.juheRenwuRepository,
        this.logger
      );
      this.orchestrator!.registerProcessor(processor);
    }

    // 日历创建处理器
    if (this.config.processors.calendar_creation?.enabled) {
      const processor = new CalendarCreationProcessor(
        this.services.calendarSyncService,
        this.services.juheRenwuRepository,
        this.logger
      );
      this.orchestrator!.registerProcessor(processor);
    }

    // TODO: 注册其他处理器
    // - DataValidationProcessor
    // - DataCleanupProcessor
    // - CalendarDeletionProcessor
    // - CalendarUpdateProcessor
    // - ParticipantAdditionProcessor
    // - ParticipantRemovalProcessor
    // - ScheduleCreationProcessor
    // - ScheduleDeletionProcessor
    // - ScheduleUpdateProcessor
    // - StatusUpdateProcessor
    // - SyncCompletionProcessor
    // - ReportGenerationProcessor

    const registeredProcessors = this.orchestrator!.getRegisteredProcessors();
    this.logger.info('任务处理器注册完成', {
      totalProcessors: registeredProcessors.length,
      processors: registeredProcessors.map(p => ({ type: p.type, name: p.name }))
    });
  }

  /**
   * 启动监控
   */
  private async startMonitoring(): Promise<void> {
    this.logger.info('启动任务系统监控', {
      metricsInterval: this.config.monitoring.metricsInterval,
      logLevel: this.config.monitoring.logLevel
    });

    // 启动资源监控
    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);

    // 启动健康检查
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoring.metricsInterval * 2);
  }

  /**
   * 停止监控
   */
  private async stopMonitoring(): Promise<void> {
    this.logger.info('停止任务系统监控');
    // 这里可以清理定时器等资源
  }

  /**
   * 收集系统指标
   */
  private collectMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metrics = {
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        activeWorkflows: this.orchestrator?.getActiveWorkflows().length || 0,
        registeredProcessors: this.orchestrator?.getRegisteredProcessors().length || 0,
        timestamp: new Date().toISOString()
      };

      // 检查资源限制
      const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
      if (memoryUsagePercent > this.config.performance.resourceLimits.maxMemoryUsage) {
        this.logger.warn('内存使用率过高', {
          current: memoryUsagePercent,
          limit: this.config.performance.resourceLimits.maxMemoryUsage
        });
      }

      if (this.config.monitoring.logLevel === 'debug') {
        this.logger.debug('系统指标', metrics);
      }
    } catch (error) {
      this.logger.error('收集系统指标失败', { error: error.message });
    }
  }

  /**
   * 执行健康检查
   */
  private performHealthCheck(): void {
    try {
      const healthStatus = {
        taskSystemInitialized: this.isInitialized,
        orchestratorAvailable: !!this.orchestrator,
        activeWorkflows: this.orchestrator?.getActiveWorkflows().length || 0,
        registeredProcessors: this.orchestrator?.getRegisteredProcessors().length || 0,
        timestamp: new Date().toISOString()
      };

      // 检查系统健康状态
      if (!this.isInitialized || !this.orchestrator) {
        this.logger.error('任务系统健康检查失败：系统未初始化');
        return;
      }

      const registeredProcessors = this.orchestrator.getRegisteredProcessors();
      const enabledProcessorCount = Object.values(this.config.processors)
        .filter(config => config.enabled).length;

      if (registeredProcessors.length < enabledProcessorCount) {
        this.logger.warn('部分任务处理器未注册', {
          registered: registeredProcessors.length,
          expected: enabledProcessorCount
        });
      }

      if (this.config.monitoring.logLevel === 'debug') {
        this.logger.debug('健康检查完成', healthStatus);
      }
    } catch (error) {
      this.logger.error('健康检查失败', { error: error.message });
    }
  }

  /**
   * 验证系统健康状态
   */
  private async validateSystemHealth(): Promise<void> {
    // 验证工作流适配器
    if (!this.workflowAdapter) {
      throw new Error('Workflow adapter not available');
    }

    // 验证服务依赖
    const requiredServices = [
      'courseRawRepository',
      'juheRenwuRepository',
      'calendarSyncService'
    ];

    for (const serviceName of requiredServices) {
      if (!this.services[serviceName]) {
        throw new Error(`Required service not available: ${serviceName}`);
      }
    }

    // 验证处理器注册
    const registeredProcessors = this.orchestrator!.getRegisteredProcessors();
    if (registeredProcessors.length === 0) {
      throw new Error('No task processors registered');
    }

    this.logger.info('系统健康状态验证通过', {
      registeredProcessors: registeredProcessors.length,
      availableServices: Object.keys(this.services).length
    });
  }
}
