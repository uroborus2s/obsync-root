/**
 * 工作流维护服务接口
 * 定义工作流维护相关的服务契约
 */

import { ServiceResult } from './service.js';

// 避免循环导入，在这里重新定义类型
export interface EngineFailureInfo {
  engineId: string;
  hostname: string;
  lastHeartbeat: Date;
  failureReason: string;
  affectedWorkflows: number;
  affectedNodes: number;
  detectedAt: Date;
}

export interface RecoverableInstance {
  instanceId: number;
  workflowName: string;
  status: string;
  lastHeartbeat: Date;
  currentNodeId?: string;
  failureReason?: string;
  canRecover: boolean;
  recoveryStrategy: 'restart' | 'resume' | 'rollback';
}

export interface WorkflowExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecutionTime?: Date;
}

export interface IWorkflowMaintenanceService {
  /**
   * 获取可恢复的工作流实例
   * @param heartbeatTimeoutSeconds 心跳超时时间（秒）
   */
  getRecoverableInstances(
    heartbeatTimeoutSeconds?: number
  ): Promise<ServiceResult<RecoverableInstance[]>>;

  /**
   * 更新工作流心跳
   * @param instanceId 实例ID
   * @param ownerId 拥有者ID
   */
  updateWorkflowHeartbeat(
    instanceId: number,
    ownerId: string
  ): Promise<ServiceResult<number>>;

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): Promise<ServiceResult<number>>;

  /**
   * 检测故障引擎
   * @param heartbeatTimeoutSeconds 心跳超时时间（秒）
   */
  detectFailedEngines(
    heartbeatTimeoutSeconds: number
  ): Promise<ServiceResult<EngineFailureInfo[]>>;

  /**
   * 获取工作流执行统计
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  getWorkflowExecutionStats(
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<WorkflowExecutionStats[]>>;

  /**
   * 批量更新业务键和互斥键
   */
  updateBusinessAndMutexKeys(): Promise<ServiceResult<number>>;
}
