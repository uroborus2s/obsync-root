/**
 * 分布式执行相关类型定义
 */

/**
 * 工作流引擎实例信息
 */
export interface WorkflowEngineInstance {
  /** 实例ID */
  instanceId: string;
  /** 主机名 */
  hostname: string;
  /** 进程ID */
  processId: number;
  /** 启动时间 */
  startedAt: Date;
  /** 最后心跳时间 */
  lastHeartbeat: Date;
  /** 实例状态 */
  status: 'active' | 'inactive' | 'maintenance';
  /** 负载信息 */
  load: {
    /** 正在执行的工作流数量 */
    activeWorkflows: number;
    /** CPU使用率 */
    cpuUsage: number;
    /** 内存使用率 */
    memoryUsage: number;
  };
  /** 支持的执行器列表 */
  supportedExecutors: string[];
}

/**
 * 分布式锁信息
 */
export interface DistributedLock {
  /** 锁键 */
  lockKey: string;
  /** 锁拥有者 */
  owner: string;
  /** 锁类型 */
  lockType: 'workflow' | 'node' | 'resource';
  /** 过期时间 */
  expiresAt: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 锁数据 */
  lockData?: Record<string, any>;
}

/**
 * 节点执行分配策略
 */
export type NodeAssignmentStrategy =
  | 'round-robin' // 轮询分配
  | 'load-balanced' // 负载均衡
  | 'affinity' // 亲和性分配
  | 'capability' // 能力匹配
  | 'locality'; // 本地优先

/**
 * 引擎发现配置
 */
export interface EngineDiscoveryConfig {
  /** 是否启用动态引擎发现 */
  enabled: boolean;
  /** 基础检查间隔（毫秒） */
  baseInterval: number;
  /** 最大检查间隔（毫秒） */
  maxInterval: number;
  /** 增量同步阈值（连续无变化次数） */
  incrementalThreshold: number;
  /** 全量同步间隔（毫秒） */
  fullSyncInterval: number;
  /** 是否启用智能间隔调整 */
  enableSmartInterval: boolean;
}

/**
 * 分布式调度配置
 */
export interface DistributedSchedulingConfig {
  /** 节点分配策略 */
  assignmentStrategy: NodeAssignmentStrategy;
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number;
  /** 锁超时时间（毫秒） */
  lockTimeout: number;
  /** 故障检测超时（毫秒） */
  failureDetectionTimeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 启用故障转移 */
  enableFailover: boolean;
  /** 引擎发现配置 */
  engineDiscovery?: EngineDiscoveryConfig;
}

/**
 * 工作流执行分配结果
 */
export interface WorkflowAssignment {
  /** 工作流实例ID */
  workflowInstanceId: number;
  /** 分配的引擎实例ID */
  assignedEngineId: string;
  /** 分配时间 */
  assignedAt: Date;
  /** 分配原因 */
  assignmentReason: string;
}

/**
 * 节点执行分配结果
 */
export interface NodeAssignment {
  /** 节点ID */
  nodeId: string;
  /** 工作流实例ID */
  workflowInstanceId: number;
  /** 分配的引擎实例ID */
  assignedEngineId: string;
  /** 分配时间 */
  assignedAt: Date;
  /** 预计执行时间 */
  estimatedDuration?: number;
}

/**
 * 故障转移事件
 */
export interface FailoverEvent {
  /** 事件ID */
  eventId: string;
  /** 故障引擎实例ID */
  failedEngineId: string;
  /** 接管引擎实例ID */
  takeoverEngineId: string;
  /** 受影响的工作流实例列表 */
  affectedWorkflows: number[];
  /** 受影响的节点列表 */
  affectedNodes: string[];
  /** 故障转移时间 */
  failoverAt: Date;
  /** 故障转移原因 */
  failoverReason: string;
}

/**
 * 引擎发现事件
 */
export interface EngineDiscoveryEvent {
  /** 事件类型 */
  type: 'engine_added' | 'engine_updated' | 'engine_removed';
  /** 引擎实例 */
  engine: WorkflowEngineInstance;
  /** 发现时间 */
  discoveredAt: Date;
  /** 发现方式 */
  discoveryMethod: 'incremental' | 'full_sync' | 'manual';
}

/**
 * 引擎发现统计信息
 */
export interface EngineDiscoveryMetrics {
  /** 总发现次数 */
  totalDiscoveries: number;
  /** 增量同步次数 */
  incrementalSyncs: number;
  /** 全量同步次数 */
  fullSyncs: number;
  /** 最后同步时间 */
  lastSyncAt: Date;
  /** 当前检查间隔 */
  currentInterval: number;
  /** 连续无变化次数 */
  consecutiveNoChanges: number;
}

/**
 * 分布式执行统计信息
 */
export interface DistributedExecutionStats {
  /** 总引擎实例数 */
  totalEngines: number;
  /** 活跃引擎实例数 */
  activeEngines: number;
  /** 总工作流数 */
  totalWorkflows: number;
  /** 正在执行的工作流数 */
  runningWorkflows: number;
  /** 总节点数 */
  totalNodes: number;
  /** 正在执行的节点数 */
  runningNodes: number;
  /** 平均负载 */
  averageLoad: number;
  /** 故障转移次数 */
  failoverCount: number;
}
