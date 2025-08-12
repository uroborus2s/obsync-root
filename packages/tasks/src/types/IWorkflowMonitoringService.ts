/**
 * 工作流监控服务接口
 * 定义工作流监控相关的服务契约
 */

import { ServiceResult } from './service.js';

// 避免循环导入，在这里重新定义类型
export interface DistributedExecutionStatus {
  workflowInstanceId: number;
  workflowName: string;
  workflowStatus: string;
  workflowEngine?: string;
  workflowStrategy?: string;
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  runningNodes: number;
  pendingNodes: number;
  lastUpdated: Date;
}

export interface EngineLoadStatus {
  engineId: string;
  hostname: string;
  activeWorkflows: number;
  cpuUsage: number;
  memoryUsage: number;
  lastHeartbeat: Date;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface LockStatus {
  lockKey: string;
  owner: string;
  lockType: 'workflow' | 'node' | 'resource';
  acquiredAt: Date;
  expiresAt: Date;
  isExpired: boolean;
}

export interface IWorkflowMonitoringService {
  /**
   * 获取分布式执行状态
   */
  getDistributedExecutionStatus(): Promise<
    ServiceResult<DistributedExecutionStatus[]>
  >;

  /**
   * 获取引擎负载状态
   */
  getEngineLoadStatus(): Promise<ServiceResult<EngineLoadStatus[]>>;

  /**
   * 获取锁状态
   */
  getLockStatus(): Promise<ServiceResult<LockStatus[]>>;

  /**
   * 获取工作流概览统计
   */
  getWorkflowOverview(): Promise<
    ServiceResult<{
      totalWorkflows: number;
      runningWorkflows: number;
      completedWorkflows: number;
      failedWorkflows: number;
      activeEngines: number;
      activeLocks: number;
    }>
  >;

  /**
   * 获取性能指标
   * @param timeRangeHours 时间范围（小时）
   */
  getPerformanceMetrics(timeRangeHours?: number): Promise<
    ServiceResult<{
      avgExecutionTime: number;
      successRate: number;
      throughput: number;
      errorRate: number;
    }>
  >;
}
