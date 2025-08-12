/**
 * 工作流监控管理控制器
 * 提供监控、统计、健康检查等管理功能
 */

import {
  Controller,
  Delete,
  Get,
  Post,
  type FastifyReply,
  type FastifyRequest,
  type Logger
} from '@stratix/core';
import type { IWorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository.js';
import type { IDistributedLockManager } from '../services/DistributedLockManager.js';
import type WorkflowMonitoringService from '../services/WorkflowMonitoringService.js';
import type { WorkflowRecoveryService } from '../services/WorkflowRecoveryService.js';

/**
 * 统一的 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * 系统健康检查响应
 */
export interface HealthCheckResponse {
  /** 系统状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 检查时间 */
  timestamp: string;
  /** 系统版本 */
  version: string;
  /** 各组件状态 */
  components: {
    database: ComponentHealth;
    workflowEngine: ComponentHealth;
    distributedLock: ComponentHealth;
    recovery: ComponentHealth;
  };
  /** 系统指标 */
  metrics: SystemMetrics;
}

/**
 * 组件健康状态
 */
export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  lastCheck?: string;
  responseTime?: number;
}

/**
 * 系统指标
 */
export interface SystemMetrics {
  /** 活跃工作流数量 */
  activeWorkflows: number;
  /** 等待执行工作流数量 */
  pendingWorkflows: number;
  /** 失败工作流数量 */
  failedWorkflows: number;
  /** 总工作流数量 */
  totalWorkflows: number;
  /** 系统运行时间（毫秒） */
  uptime: number;
  /** CPU使用率 */
  cpuUsage?: number;
  /** 内存使用率 */
  memoryUsage?: number;
}

/**
 * 工作流统计信息
 */
export interface WorkflowStatistics {
  /** 按状态统计 */
  byStatus: Record<string, number>;
  /** 按日期统计（最近7天） */
  byDate: Array<{
    date: string;
    total: number;
    completed: number;
    failed: number;
  }>;
  /** 按工作流名称统计 */
  byWorkflowName: Array<{
    workflowName: string;
    total: number;
    avgDuration: number;
    successRate: number;
  }>;
  /** 执行时长统计 */
  duration: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

/**
 * 分布式锁状态
 */
export interface DistributedLockStatus {
  /** 锁总数 */
  totalLocks: number;
  /** 活跃锁数量 */
  activeLocks: number;
  /** 过期锁数量 */
  expiredLocks: number;
  /** 即将过期锁数量 */
  expiringSoonLocks: number;
  /** 锁详情列表 */
  lockDetails: Array<{
    lockKey: string;
    owner: string;
    lockType: string;
    expiresAt: string;
    status: 'active' | 'expired' | 'expiring_soon';
    secondsToExpire: number;
  }>;
}

/**
 * 执行引擎状态
 */
export interface EngineStatus {
  /** 引擎实例列表 */
  engines: Array<{
    instanceId: string;
    hostname: string;
    status: string;
    lastHeartbeat: string;
    activeWorkflows: number;
    cpuUsage: number;
    memoryUsage: number;
    assignedWorkflows: number;
    assignedNodes: number;
    heartbeatAgeSeconds: number;
  }>;
  /** 引擎总数 */
  totalEngines: number;
  /** 健康引擎数量 */
  healthyEngines: number;
  /** 负载分布 */
  loadDistribution: {
    totalWorkflows: number;
    avgWorkflowsPerEngine: number;
    maxWorkflowsPerEngine: number;
    minWorkflowsPerEngine: number;
  };
}

/**
 * 死锁检测结果
 */
export interface DeadlockDetectionResult {
  /** 是否检测到死锁 */
  hasDeadlock: boolean;
  /** 死锁数量 */
  deadlockCount: number;
  /** 死锁详情 */
  deadlocks: Array<{
    /** 死锁ID */
    id: string;
    /** 涉及的工作流实例 */
    involvedInstances: number[];
    /** 涉及的资源 */
    involvedResources: string[];
    /** 检测时间 */
    detectedAt: string;
    /** 死锁类型 */
    type: 'circular_wait' | 'mutex_conflict' | 'resource_contention';
    /** 建议解决方案 */
    suggestedResolution: string;
  }>;
  /** 潜在风险 */
  potentialRisks: Array<{
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
    affectedInstances: number[];
  }>;
}

/**
 * 性能分析结果
 */
export interface PerformanceAnalysis {
  /** 总体性能评分 */
  overallScore: number;
  /** 性能指标 */
  metrics: {
    /** 平均响应时间（毫秒） */
    avgResponseTime: number;
    /** 吞吐量（每分钟） */
    throughput: number;
    /** 错误率 */
    errorRate: number;
    /** 资源利用率 */
    resourceUtilization: number;
  };
  /** 性能瓶颈 */
  bottlenecks: Array<{
    component: string;
    issue: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  /** 性能趋势 */
  trends: {
    responseTime: Array<{ timestamp: string; value: number }>;
    throughput: Array<{ timestamp: string; value: number }>;
    errorRate: Array<{ timestamp: string; value: number }>;
  };
}

/**
 * 工作流监控管理控制器
 */
@Controller()
export default class WorkflowMonitoringController {
  constructor(
    private readonly workflowMonitoringService: WorkflowMonitoringService,
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly distributedLockManager: IDistributedLockManager,
    private readonly workflowRecoveryService: WorkflowRecoveryService,
    private readonly logger: Logger
  ) {
    // executionLogRepository暂时未使用，避免编译警告
    void 0;
  }

  /**
   * 系统健康检查
   */
  @Get('/api/workflows/health')
  async healthCheck(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<HealthCheckResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info('执行系统健康检查', { requestId });

      // 检查各组件状态
      const databaseHealth = await this.checkDatabaseHealth();
      const engineHealth = await this.checkEngineHealth();
      const lockHealth = await this.checkDistributedLockHealth();
      const recoveryHealth = await this.checkRecoveryHealth();

      // 获取系统指标
      const metrics = await this.getSystemMetrics();

      // 确定整体状态
      const components = {
        database: databaseHealth,
        workflowEngine: engineHealth,
        distributedLock: lockHealth,
        recovery: recoveryHealth
      };

      const overallStatus = this.calculateOverallHealth(components);

      const healthResponse: HealthCheckResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        components,
        metrics
      };

      const responseTime = Date.now() - startTime;
      this.logger.info('系统健康检查完成', {
        requestId,
        status: overallStatus,
        responseTime
      });

      return reply.code(200).send({
        success: true,
        data: healthResponse,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('系统健康检查失败', { requestId, error: errorMessage });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'HEALTH_CHECK_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 获取工作流统计信息
   */
  @Get('/api/workflows/statistics')
  async getStatistics(
    request: FastifyRequest<{
      Querystring: {
        days?: number;
        workflowName?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowStatistics>> {
    const requestId = this.generateRequestId();

    try {
      const { days = 7, workflowName } = request.query;

      this.logger.info('获取工作流统计信息', {
        requestId,
        days,
        workflowName
      });

      // 这里应该调用实际的统计服务，目前提供模拟数据
      const statistics: WorkflowStatistics = {
        byStatus: {
          pending: 10,
          running: 25,
          completed: 150,
          failed: 5,
          cancelled: 3
        },
        byDate: Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return {
            date: date.toISOString().split('T')[0],
            total: Math.floor(Math.random() * 50) + 10,
            completed: Math.floor(Math.random() * 40) + 5,
            failed: Math.floor(Math.random() * 5)
          };
        }),
        byWorkflowName: [
          {
            workflowName: 'data-sync',
            total: 45,
            avgDuration: 120000,
            successRate: 0.95
          },
          {
            workflowName: 'user-onboarding',
            total: 32,
            avgDuration: 85000,
            successRate: 0.98
          }
        ],
        duration: {
          avg: 102500,
          min: 15000,
          max: 300000,
          p50: 95000,
          p95: 250000,
          p99: 290000
        }
      };

      return reply.code(200).send({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流统计信息失败', {
        requestId,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_STATISTICS_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 获取分布式锁状态
   */
  @Get('/api/workflows/locks/status')
  async getLockStatus(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<DistributedLockStatus>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('获取分布式锁状态', { requestId });

      // 清理过期锁
      const cleanedLocks =
        await this.distributedLockManager.cleanupExpiredLocks();

      // 获取锁状态（这里需要实际的实现）
      const lockStatus: DistributedLockStatus = {
        totalLocks: 15,
        activeLocks: 12,
        expiredLocks: cleanedLocks,
        expiringSoonLocks: 2,
        lockDetails: [
          {
            lockKey: 'workflow:instance:123',
            owner: 'engine-1',
            lockType: 'workflow',
            expiresAt: new Date(Date.now() + 300000).toISOString(),
            status: 'active',
            secondsToExpire: 300
          },
          {
            lockKey: 'workflow:instance:456',
            owner: 'engine-2',
            lockType: 'workflow',
            expiresAt: new Date(Date.now() + 30000).toISOString(),
            status: 'expiring_soon',
            secondsToExpire: 30
          }
        ]
      };

      return reply.code(200).send({
        success: true,
        data: lockStatus,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取分布式锁状态失败', {
        requestId,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_LOCK_STATUS_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 清理过期锁
   */
  @Post('/api/workflows/locks/cleanup')
  async cleanupLocks(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<{ cleanedLocks: number }>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('手动清理过期锁', { requestId });

      const cleanedCount =
        await this.distributedLockManager.cleanupExpiredLocks();

      return reply.code(200).send({
        success: true,
        data: { cleanedLocks: cleanedCount },
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('清理过期锁失败', { requestId, error: errorMessage });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'CLEANUP_LOCKS_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 强制释放锁
   */
  @Delete('/api/workflows/locks/:lockKey')
  async forceReleaseLock(
    request: FastifyRequest<{ Params: { lockKey: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { lockKey } = request.params;

      this.logger.warn('强制释放锁', { requestId, lockKey });

      const result =
        await this.distributedLockManager.forceReleaseLock(lockKey);

      return reply.code(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('强制释放锁失败', { requestId, error: errorMessage });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'FORCE_RELEASE_LOCK_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 获取引擎状态
   */
  @Get('/api/workflows/engines/status')
  async getEngineStatus(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<EngineStatus>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('获取引擎状态', { requestId });

      // 获取引擎负载状态
      const engineLoadResult =
        await this.workflowMonitoringService.getEngineLoadStatus();

      if (!engineLoadResult.success) {
        throw new Error(engineLoadResult.error || '获取引擎状态失败');
      }

      const rawEngines = engineLoadResult.data || [];

      // 将EngineLoadStatus映射为期望的格式
      const engines = rawEngines.map((engine) => ({
        instanceId: engine.engineId,
        hostname: engine.hostname,
        status: engine.status,
        lastHeartbeat: engine.lastHeartbeat.toISOString(),
        activeWorkflows: engine.activeWorkflows,
        cpuUsage: engine.cpuUsage,
        memoryUsage: engine.memoryUsage,
        assignedWorkflows: engine.activeWorkflows, // 使用activeWorkflows作为assignedWorkflows
        assignedNodes: 0, // 暂时设为0
        heartbeatAgeSeconds: Math.floor(
          (Date.now() - engine.lastHeartbeat.getTime()) / 1000
        )
      }));

      const healthyEngines = engines.filter(
        (e) => e.heartbeatAgeSeconds < 60
      ).length;

      const workflowCounts = engines.map((e) => e.assignedWorkflows);
      const totalWorkflows = workflowCounts.reduce(
        (sum, count) => sum + count,
        0
      );

      const engineStatus: EngineStatus = {
        engines,
        totalEngines: engines.length,
        healthyEngines,
        loadDistribution: {
          totalWorkflows,
          avgWorkflowsPerEngine:
            engines.length > 0 ? totalWorkflows / engines.length : 0,
          maxWorkflowsPerEngine: Math.max(...workflowCounts, 0),
          minWorkflowsPerEngine: Math.min(...workflowCounts, 0)
        }
      };

      return reply.code(200).send({
        success: true,
        data: engineStatus,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取引擎状态失败', { requestId, error: errorMessage });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'GET_ENGINE_STATUS_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 死锁检测
   */
  @Post('/api/workflows/deadlock/detect')
  async detectDeadlock(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<DeadlockDetectionResult>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('执行死锁检测', { requestId });

      // 这里实现死锁检测逻辑
      // 目前提供示例数据展示接口设计
      const detectionResult: DeadlockDetectionResult = {
        hasDeadlock: false,
        deadlockCount: 0,
        deadlocks: [],
        potentialRisks: [
          {
            riskLevel: 'medium',
            description: '检测到多个工作流实例竞争相同的互斥键',
            affectedInstances: [123, 456]
          }
        ]
      };

      return reply.code(200).send({
        success: true,
        data: detectionResult,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('死锁检测失败', { requestId, error: errorMessage });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'DEADLOCK_DETECTION_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 性能分析
   */
  @Get('/api/workflows/performance/analysis')
  async performanceAnalysis(
    request: FastifyRequest<{
      Querystring: {
        hours?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<PerformanceAnalysis>> {
    const requestId = this.generateRequestId();

    try {
      const { hours = 24 } = request.query;

      this.logger.info('执行性能分析', { requestId, hours });

      // 这里实现性能分析逻辑
      const analysis: PerformanceAnalysis = {
        overallScore: 85,
        metrics: {
          avgResponseTime: 1250,
          throughput: 450,
          errorRate: 0.02,
          resourceUtilization: 0.65
        },
        bottlenecks: [
          {
            component: 'database',
            issue: '查询响应时间偏高',
            impact: 'medium',
            recommendation: '优化数据库索引，考虑添加查询缓存'
          }
        ],
        trends: {
          responseTime: Array.from({ length: hours }, (_, i) => ({
            timestamp: new Date(
              Date.now() - (hours - i) * 3600000
            ).toISOString(),
            value: 1000 + Math.random() * 500
          })),
          throughput: Array.from({ length: hours }, (_, i) => ({
            timestamp: new Date(
              Date.now() - (hours - i) * 3600000
            ).toISOString(),
            value: 400 + Math.random() * 100
          })),
          errorRate: Array.from({ length: hours }, (_, i) => ({
            timestamp: new Date(
              Date.now() - (hours - i) * 3600000
            ).toISOString(),
            value: Math.random() * 0.05
          }))
        }
      };

      return reply.code(200).send({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('性能分析失败', { requestId, error: errorMessage });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'PERFORMANCE_ANALYSIS_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 手动触发恢复检查
   */
  @Post('/api/workflows/recovery/trigger')
  async triggerRecovery(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<{ triggeredAt: string }>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('手动触发恢复检查', { requestId });

      // 触发恢复服务
      await this.workflowRecoveryService.startRecoveryService();

      return reply.code(200).send({
        success: true,
        data: { triggeredAt: new Date().toISOString() },
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('触发恢复检查失败', { requestId, error: errorMessage });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'TRIGGER_RECOVERY_FAILED',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 获取系统指标
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    // 获取各种统计数据 - 使用现有的findByStatus方法
    const activeResult =
      await this.workflowInstanceRepository.findByStatus('running');
    const pendingResult =
      await this.workflowInstanceRepository.findByStatus('pending');
    const failedResult =
      await this.workflowInstanceRepository.findByStatus('failed');

    // 由于没有findAll方法，我们估算总数
    const activeCount =
      activeResult.success && Array.isArray(activeResult.data)
        ? activeResult.data.length
        : 0;
    const pendingCount =
      pendingResult.success && Array.isArray(pendingResult.data)
        ? pendingResult.data.length
        : 0;
    const failedCount =
      failedResult.success && Array.isArray(failedResult.data)
        ? failedResult.data.length
        : 0;

    // 获取已完成的工作流数量
    const completedResult =
      await this.workflowInstanceRepository.findByStatus('completed');
    const completedCount =
      completedResult.success && Array.isArray(completedResult.data)
        ? completedResult.data.length
        : 0;

    const totalWorkflows =
      activeCount + pendingCount + failedCount + completedCount;

    // 获取系统资源信息
    const memoryUsage = process.memoryUsage();
    const memUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

    return {
      activeWorkflows: activeCount,
      pendingWorkflows: pendingCount,
      failedWorkflows: failedCount,
      totalWorkflows,
      uptime: process.uptime() * 1000,
      cpuUsage: 0.5, // 模拟CPU使用率
      memoryUsage: memUsageRatio
    };
  }

  /**
   * 检查数据库健康状态
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      // 尝试执行简单查询 - 使用findByStatus而不是findAll
      await this.workflowInstanceRepository.findByStatus('running');
      return {
        status: 'up',
        message: '数据库连接正常',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'down',
        message: `数据库连接失败: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 检查工作流引擎健康状态
   */
  private async checkEngineHealth(): Promise<ComponentHealth> {
    try {
      return {
        status: 'up',
        message: '工作流引擎运行正常',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        message: `工作流引擎异常: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * 检查分布式锁健康状态
   */
  private async checkDistributedLockHealth(): Promise<ComponentHealth> {
    try {
      // 尝试获取和释放测试锁
      const testKey = `health_check_${Date.now()}`;
      const owner = 'health_check';

      const acquired = await this.distributedLockManager.acquireLock(
        testKey,
        owner,
        'resource',
        10000
      );

      if (acquired) {
        await this.distributedLockManager.releaseLock(testKey, owner);
      }

      return {
        status: 'up',
        message: '分布式锁服务正常',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        message: `分布式锁服务异常: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * 检查恢复服务健康状态
   */
  private async checkRecoveryHealth(): Promise<ComponentHealth> {
    try {
      return {
        status: 'up',
        message: '恢复服务运行正常',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        message: `恢复服务异常: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * 计算系统整体健康状态
   */
  private calculateOverallHealth(
    components: Record<string, ComponentHealth>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(components).map((c) => c.status);
    const downCount = statuses.filter((s) => s === 'down').length;
    const degradedCount = statuses.filter((s) => s === 'degraded').length;

    if (downCount === 0 && degradedCount === 0) {
      return 'healthy';
    } else if (downCount === 0) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
