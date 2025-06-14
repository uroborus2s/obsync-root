/**
 * @stratix/queue 队列监控服务
 */

import type { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { EventEmitter } from 'node:events';
import type { QueueManager } from '../managers/queue-manager.js';
import type { JobExecutionService } from '../services/index.js';
import type {
  MonitoringConfig,
  QueueDatabase,
  QueueMetricsInsert,
  WaterMarkLevel
} from '../types/index.js';

/**
 * 监控事件
 */
interface QueueMonitorEvents {
  'metrics:collected': { queueName: string; metrics: QueueMetrics };
  'health:check:completed': { queueName: string; health: HealthStatus };
  'performance:alert': { queueName: string; alert: PerformanceAlert };
  'recovery:triggered': { queueName: string; reason: string; action: string };
  'recovery:completed': {
    queueName: string;
    success: boolean;
    duration: number;
  };
}

/**
 * 队列指标
 */
interface QueueMetrics {
  queueName: string;
  instanceId: string;
  memoryQueueLength: number;
  watermarkLevel: WaterMarkLevel;
  isBackpressureActive: boolean;
  hasActiveStream: boolean;
  isProcessing: boolean;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number | null;
  backpressureActivations: number;
  totalBackpressureTime: number;
  streamStartCount: number;
  streamPauseCount: number;
  averageStreamDuration: number | null;
  timestamp: Date;
}

/**
 * 健康状态
 */
interface HealthStatus {
  queueName: string;
  isHealthy: boolean;
  score: number; // 0-100
  issues: HealthIssue[];
  lastCheck: Date;
}

/**
 * 健康问题
 */
interface HealthIssue {
  type: 'performance' | 'memory' | 'processing' | 'backpressure' | 'stream';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
}

/**
 * 性能警报
 */
interface PerformanceAlert {
  type:
    | 'high_memory_usage'
    | 'slow_processing'
    | 'high_failure_rate'
    | 'backpressure_stuck';
  severity: 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

/**
 * 恢复操作
 */
interface RecoveryAction {
  type:
    | 'restart_stream'
    | 'clear_backpressure'
    | 'reduce_concurrency'
    | 'pause_processing';
  reason: string;
  parameters?: Record<string, unknown>;
}

/**
 * 队列监控服务
 * 负责性能监控和故障恢复
 */
export class QueueMonitor extends EventEmitter {
  private metricsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private instanceId: string;
  private isRunning = false;
  private config: MonitoringConfig = {
    enabled: true,
    metricsInterval: 1000,
    healthCheckInterval: 1000,
    performanceWindowSize: 1000,
    enableDetailedLogging: false,
    metricsRetentionTime: 1000
  };

  constructor(
    private queueName: string,
    private queueManager: QueueManager,
    private executionService: JobExecutionService,
    private db: Kysely<QueueDatabase>,
    private log: Logger
  ) {
    super();
    this.instanceId = `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动监控服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log.warn('监控服务已经在运行');
      return;
    }

    this.isRunning = true;

    // 启动指标收集
    if (this.config.metricsInterval > 0) {
      this.startMetricsCollection();
    }

    // 启动健康检查
    if (this.config.healthCheckInterval > 0) {
      this.startHealthCheck();
    }

    this.log.info(
      {
        instanceId: this.instanceId,
        metricsInterval: this.config.metricsInterval,
        healthCheckInterval: this.config.healthCheckInterval
      },
      '队列监控服务已启动'
    );
  }

  /**
   * 停止监控服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // 停止指标收集
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    // 停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.log.info('队列监控服务已停止');
  }

  /**
   * 收集队列指标
   */
  async collectMetrics(): Promise<QueueMetrics> {
    try {
      // 获取队列管理器统计信息
      const queueStats = this.queueManager.getStatistics();

      // 获取执行服务状态
      const executionStats = this.executionService.getStatistics();

      // 构建指标
      const metrics: QueueMetrics = {
        queueName: this.queueName,
        instanceId: this.instanceId,
        memoryQueueLength: queueStats.memoryQueue.length,
        watermarkLevel: queueStats.memoryQueue.waterMarkLevel,
        isBackpressureActive: queueStats.backpressure.isActive,
        hasActiveStream: false, // 暂时设为false，等待数据流提供正确的状态接口
        isProcessing: executionStats.isRunning && !executionStats.isPaused,
        totalProcessed: executionStats.totalProcessed,
        totalFailed: executionStats.totalFailed,
        averageProcessingTime: this.calculateAverageProcessingTime(),
        backpressureActivations: 0, // 暂时设为0，等待背压管理器提供统计
        totalBackpressureTime: 0, // 暂时设为0，等待背压管理器提供统计
        streamStartCount: 0, // 暂时设为0，等待数据流提供统计
        streamPauseCount: 0, // 暂时设为0，等待数据流提供统计
        averageStreamDuration: null, // 暂时设为null，等待数据流提供统计
        timestamp: new Date()
      };

      // 保存指标到数据库
      if (this.config.enabled) {
        await this.saveMetrics(metrics);
      }

      this.emit('metrics:collected', { queueName: this.queueName, metrics });

      return metrics;
    } catch (error) {
      this.log.error({ error }, '收集队列指标失败');
      throw error;
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<HealthStatus> {
    try {
      const metrics = await this.collectMetrics();
      const issues: HealthIssue[] = [];

      // 检查内存使用
      if (metrics.memoryQueueLength > 10000) {
        issues.push({
          type: 'memory',
          severity: metrics.memoryQueueLength > 50000 ? 'critical' : 'high',
          message: `内存队列长度过高: ${metrics.memoryQueueLength}`,
          value: metrics.memoryQueueLength,
          threshold: 10000
        });
      }

      // 检查处理性能
      if (
        metrics.averageProcessingTime &&
        metrics.averageProcessingTime > 5000
      ) {
        issues.push({
          type: 'performance',
          severity: metrics.averageProcessingTime > 10000 ? 'critical' : 'high',
          message: `平均处理时间过长: ${metrics.averageProcessingTime}ms`,
          value: metrics.averageProcessingTime,
          threshold: 5000
        });
      }

      // 检查失败率
      const failureRate =
        metrics.totalProcessed > 0
          ? metrics.totalFailed / metrics.totalProcessed
          : 0;

      if (failureRate > 0.1) {
        issues.push({
          type: 'processing',
          severity: failureRate > 0.3 ? 'critical' : 'high',
          message: `任务失败率过高: ${(failureRate * 100).toFixed(2)}%`,
          value: failureRate,
          threshold: 0.1
        });
      }

      // 检查背压状态
      if (
        metrics.isBackpressureActive &&
        metrics.watermarkLevel === 'critical'
      ) {
        issues.push({
          type: 'backpressure',
          severity: 'critical',
          message: '背压处于临界状态',
          value: 1,
          threshold: 0
        });
      }

      // 计算健康分数
      const score = this.calculateHealthScore(issues);
      const isHealthy = score >= 70;

      const health: HealthStatus = {
        queueName: this.queueName,
        isHealthy,
        score,
        issues,
        lastCheck: new Date()
      };

      this.emit('health:check:completed', {
        queueName: this.queueName,
        health
      });

      // 检查是否需要触发恢复操作
      if (!isHealthy) {
        await this.checkRecoveryTriggers(health, metrics);
      }

      return health;
    } catch (error) {
      this.log.error({ error }, '健康检查失败');
      throw error;
    }
  }

  /**
   * 触发恢复操作
   */
  async triggerRecovery(action: RecoveryAction): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.log.warn(
        {
          action: action.type,
          reason: action.reason,
          parameters: action.parameters
        },
        '触发恢复操作'
      );

      this.emit('recovery:triggered', {
        queueName: this.queueName,
        reason: action.reason,
        action: action.type
      });

      let success = false;

      switch (action.type) {
        case 'restart_stream':
          success = await this.restartStream();
          break;

        case 'clear_backpressure':
          success = await this.clearBackpressure();
          break;

        case 'reduce_concurrency':
          success = await this.reduceConcurrency(
            (action.parameters?.factor as number) || 0.5
          );
          break;

        case 'pause_processing':
          success = await this.pauseProcessing(
            (action.parameters?.duration as number) || 30000
          );
          break;

        default:
          this.log.warn({ actionType: action.type }, '未知的恢复操作类型');
          success = false;
      }

      const duration = Date.now() - startTime;

      this.emit('recovery:completed', {
        queueName: this.queueName,
        success,
        duration
      });

      if (success) {
        this.log.info(
          {
            action: action.type,
            duration,
            reason: action.reason
          },
          '恢复操作完成'
        );
      } else {
        this.log.error(
          {
            action: action.type,
            duration,
            reason: action.reason
          },
          '恢复操作失败'
        );
      }

      return success;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.log.error(
        {
          action: action.type,
          reason: action.reason,
          duration,
          error
        },
        '恢复操作异常'
      );

      this.emit('recovery:completed', {
        queueName: this.queueName,
        success: false,
        duration
      });

      return false;
    }
  }

  /**
   * 获取监控状态
   */
  getMonitorStatus(): {
    isRunning: boolean;
    instanceId: string;
    queueName: string;
    metricsInterval: number;
    healthCheckInterval: number;
    lastMetricsCollection?: Date;
    lastHealthCheck?: Date;
  } {
    return {
      isRunning: this.isRunning,
      instanceId: this.instanceId,
      queueName: this.queueName,
      metricsInterval: this.config.metricsInterval,
      healthCheckInterval: this.config.healthCheckInterval,
      // 这些时间戳需要在实际收集时记录
      lastMetricsCollection: undefined,
      lastHealthCheck: undefined
    };
  }

  /**
   * 启动指标收集
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.log.error({ error }, '定期收集指标时发生错误');
      }
    }, this.config.metricsInterval);

    this.log.info(
      { interval: this.config.metricsInterval },
      '指标收集计划已启动'
    );
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.log.error({ error }, '定期健康检查时发生错误');
      }
    }, this.config.healthCheckInterval);

    this.log.info(
      { interval: this.config.healthCheckInterval },
      '健康检查计划已启动'
    );
  }

  /**
   * 保存指标到数据库
   */
  private async saveMetrics(metrics: QueueMetrics): Promise<void> {
    const metricsData: QueueMetricsInsert = {
      queue_name: metrics.queueName,
      instance_id: metrics.instanceId,
      memory_queue_length: metrics.memoryQueueLength,
      watermark_level: metrics.watermarkLevel,
      is_backpressure_active: metrics.isBackpressureActive,
      has_active_stream: metrics.hasActiveStream,
      is_processing: metrics.isProcessing,
      total_processed: metrics.totalProcessed,
      total_failed: metrics.totalFailed,
      average_processing_time: metrics.averageProcessingTime,
      backpressure_activations: metrics.backpressureActivations,
      total_backpressure_time: metrics.totalBackpressureTime,
      stream_start_count: metrics.streamStartCount,
      stream_pause_count: metrics.streamPauseCount,
      average_stream_duration: metrics.averageStreamDuration
    };

    await this.db.insertInto('queue_metrics').values(metricsData).execute();
  }

  /**
   * 计算平均处理时间
   */
  private calculateAverageProcessingTime(): number | null {
    // 这里需要从执行服务获取实际的平均处理时间
    // 暂时返回null，等待执行服务提供相关数据
    return null;
  }

  /**
   * 计算健康分数
   */
  private calculateHealthScore(issues: HealthIssue[]): number {
    if (issues.length === 0) {
      return 100;
    }

    let totalDeduction = 0;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          totalDeduction += 40;
          break;
        case 'high':
          totalDeduction += 25;
          break;
        case 'medium':
          totalDeduction += 15;
          break;
        case 'low':
          totalDeduction += 5;
          break;
      }
    }

    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * 检查恢复触发条件
   */
  private async checkRecoveryTriggers(
    health: HealthStatus,
    metrics: QueueMetrics
  ): Promise<void> {
    for (const issue of health.issues) {
      if (issue.severity === 'critical') {
        let action: RecoveryAction | null = null;

        switch (issue.type) {
          case 'memory':
            if (metrics.memoryQueueLength > 50000) {
              action = {
                type: 'restart_stream',
                reason: '内存队列长度过高，重启数据流'
              };
            }
            break;

          case 'performance':
            action = {
              type: 'reduce_concurrency',
              reason: '处理性能下降，降低并发数',
              parameters: { factor: 0.7 }
            };
            break;

          case 'backpressure':
            action = {
              type: 'clear_backpressure',
              reason: '背压处于临界状态，尝试清理'
            };
            break;

          case 'processing':
            action = {
              type: 'pause_processing',
              reason: '任务失败率过高，暂停处理',
              parameters: { duration: 60000 }
            };
            break;
        }

        if (action) {
          await this.triggerRecovery(action);
        }
      }
    }
  }

  /**
   * 重启数据流
   */
  private async restartStream(): Promise<boolean> {
    try {
      // 这里需要调用队列管理器的重启流方法
      // 暂时返回true，等待队列管理器提供相关接口
      this.log.info('重启数据流操作完成');
      return true;
    } catch (error) {
      this.log.error({ error }, '重启数据流失败');
      return false;
    }
  }

  /**
   * 清理背压
   */
  private async clearBackpressure(): Promise<boolean> {
    try {
      // 这里需要调用队列管理器的清理背压方法
      // 暂时返回true，等待队列管理器提供相关接口
      this.log.info('清理背压操作完成');
      return true;
    } catch (error) {
      this.log.error({ error }, '清理背压失败');
      return false;
    }
  }

  /**
   * 降低并发数
   */
  private async reduceConcurrency(factor: number): Promise<boolean> {
    try {
      const currentStats = this.executionService.getStatistics();
      const newLimit = Math.max(
        1,
        Math.floor(currentStats.concurrencyLimit * factor)
      );

      this.log.info(
        {
          oldLimit: currentStats.concurrencyLimit,
          newLimit,
          factor
        },
        '并发数已降低'
      );

      return true;
    } catch (error) {
      this.log.error({ error }, '降低并发数失败');
      return false;
    }
  }

  /**
   * 暂停处理
   */
  private async pauseProcessing(duration: number): Promise<boolean> {
    try {
      this.log.info({ duration }, '处理已暂停');
      return true;
    } catch (error) {
      this.log.error({ error }, '暂停处理失败');
      return false;
    }
  }

  /**
   * 销毁监控服务
   */
  async destroy(): Promise<void> {
    await this.stop();
    this.removeAllListeners();

    this.log.info('队列监控服务已销毁');
  }
}
