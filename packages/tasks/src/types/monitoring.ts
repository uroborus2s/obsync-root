/**
 * 监控相关类型定义
 */

/**
 * 监控服务接口
 */
export interface MonitoringService {
  /**
   * 启动监控服务
   * @param config 监控配置
   */
  start(config: MonitoringConfig): Promise<void>;
  
  /**
   * 停止监控服务
   */
  stop(): Promise<void>;
  
  /**
   * 记录工作流指标
   * @param instance 工作流实例
   */
  recordWorkflowMetrics(instance: any): void;
  
  /**
   * 记录任务指标
   * @param task 任务节点
   * @param duration 执行时长
   */
  recordTaskMetrics(task: any, duration: number): void;
  
  /**
   * 获取系统指标
   */
  getSystemMetrics(): Promise<SystemMetrics>;
  
  /**
   * 获取工作流指标
   * @param timeRange 时间范围
   */
  getWorkflowMetrics(timeRange?: TimeRange): Promise<WorkflowMetrics>;
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 指标收集间隔（毫秒） */
  metricsInterval: number;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 是否启用错误追踪 */
  enableErrorTracking?: boolean;
  /** 指标存储配置 */
  storage?: {
    type: 'memory' | 'redis' | 'prometheus';
    config?: any;
  };
}

/**
 * 时间范围
 */
export interface TimeRange {
  /** 开始时间 */
  from: Date;
  /** 结束时间 */
  to: Date;
}

/**
 * 系统指标
 */
export interface SystemMetrics {
  /** CPU使用率 */
  cpuUsage: number;
  /** 内存使用率 */
  memoryUsage: number;
  /** 磁盘使用率 */
  diskUsage: number;
  /** 网络IO */
  networkIO: {
    bytesIn: number;
    bytesOut: number;
  };
  /** 活跃连接数 */
  activeConnections: number;
  /** 系统负载 */
  systemLoad: number[];
  /** 采集时间 */
  timestamp: Date;
}

/**
 * 工作流指标
 */
export interface WorkflowMetrics {
  /** 总工作流数 */
  totalWorkflows: number;
  /** 运行中工作流数 */
  runningWorkflows: number;
  /** 已完成工作流数 */
  completedWorkflows: number;
  /** 失败工作流数 */
  failedWorkflows: number;
  /** 成功率 */
  successRate: number;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 吞吐量 */
  throughput: number;
  /** 错误率 */
  errorRate: number;
  /** 按状态分组的统计 */
  statusDistribution: Record<string, number>;
  /** 按类型分组的统计 */
  typeDistribution: Record<string, number>;
  /** 时间序列数据 */
  timeSeries?: TimeSeriesData[];
}

/**
 * 时间序列数据
 */
export interface TimeSeriesData {
  /** 时间戳 */
  timestamp: Date;
  /** 指标值 */
  value: number;
  /** 指标名称 */
  metric: string;
  /** 标签 */
  labels?: Record<string, string>;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 响应时间分布 */
  responseTimeDistribution: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** 请求率 */
  requestRate: number;
  /** 错误率 */
  errorRate: number;
  /** 并发数 */
  concurrency: number;
  /** 队列长度 */
  queueLength: number;
}

/**
 * 告警规则
 */
export interface AlertRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 指标名称 */
  metric: string;
  /** 条件 */
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
  };
  /** 持续时间 */
  duration: number;
  /** 告警级别 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 是否启用 */
  enabled: boolean;
  /** 通知渠道 */
  notifications: NotificationChannel[];
}

/**
 * 通知渠道
 */
export interface NotificationChannel {
  /** 渠道类型 */
  type: 'email' | 'webhook' | 'slack' | 'sms';
  /** 渠道配置 */
  config: Record<string, any>;
}

/**
 * 告警事件
 */
export interface AlertEvent {
  /** 事件ID */
  id: string;
  /** 规则ID */
  ruleId: string;
  /** 事件类型 */
  type: 'triggered' | 'resolved';
  /** 指标值 */
  value: number;
  /** 触发时间 */
  timestamp: Date;
  /** 事件描述 */
  description: string;
  /** 严重级别 */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 日志记录器接口
 */
export interface Logger {
  /**
   * 记录调试日志
   * @param message 日志消息
   * @param args 额外参数
   */
  debug(message: string, ...args: any[]): void;
  
  /**
   * 记录信息日志
   * @param message 日志消息
   * @param args 额外参数
   */
  info(message: string, ...args: any[]): void;
  
  /**
   * 记录警告日志
   * @param message 日志消息
   * @param args 额外参数
   */
  warn(message: string, ...args: any[]): void;
  
  /**
   * 记录错误日志
   * @param message 日志消息
   * @param args 额外参数
   */
  error(message: string, ...args: any[]): void;
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  /** 日志ID */
  id: string;
  /** 工作流实例ID */
  workflowInstanceId: string;
  /** 任务节点ID */
  taskNodeId?: string;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 日志消息 */
  message: string;
  /** 详细信息 */
  details?: any;
  /** 执行器名称 */
  executorName?: string;
  /** 执行阶段 */
  executionPhase?: 'start' | 'progress' | 'complete' | 'error' | 'retry';
  /** 时间戳 */
  timestamp: Date;
}
