/**
 * @stratix/queue 默认配置
 */

import type { QueueConfig } from '../types/config.types.js';

/**
 * 默认队列配置
 */
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  name: 'default',
  enabled: true,

  // 水位监控配置
  watermark: {
    waterMarks: {
      low: 100, // 低水位：100个任务
      normal: 500, // 正常水位：500个任务
      high: 1000, // 高水位：1000个任务
      critical: 2000 // 临界水位：2000个任务
    },
    enabled: true,
    monitorInterval: 5000
  },

  // 背压管理配置
  backpressure: {
    startStreamDelay: 100,
    stopStreamDelay: 200,
    minStreamDuration: 1000,
    cooldownPeriod: 5000,
    enabled: true,
    activationDelay: 500,
    deactivationDelay: 1000,
    adjustmentInterval: 2000,
    highMultiplier: 0.7,
    criticalMultiplier: 0.3
  },

  // 防抖配置
  debounce: {
    lengthChange: 50,
    jobAddition: 100,
    watermarkChange: 200,
    eventEmission: 50
  },

  // 数据库流配置
  databaseStream: {
    batchSize: 50,
    readTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    enableCompression: false,
    prefetchBufferSize: 100
  },

  // 任务处理配置 - 默认并行3个任务
  jobProcessing: {
    concurrency: 3, // 默认并行3个任务
    timeout: 30000,
    defaultMaxAttempts: 3,
    retryDelay: {
      base: 1000,
      multiplier: 2,
      max: 30000
    },
    enablePriority: true,
    processingInterval: 100,

    // 新增：并发执行模式配置
    parallel: {
      enabled: true,
      maxConcurrency: 10, // 最大并发数限制
      batchSize: 5, // 批量获取任务数量
      taskInterval: 50, // 任务启动间隔（毫秒）

      // 动态并发调整
      dynamicAdjustment: {
        enabled: false, // 默认关闭动态调整
        minConcurrency: 1,
        cpuThreshold: 80, // CPU使用率80%以上降低并发
        memoryThreshold: 85, // 内存使用率85%以上降低并发
        checkInterval: 10000 // 10秒检查一次
      }
    }
  },

  // 监控配置
  monitoring: {
    enabled: true,
    metricsInterval: 30000,
    healthCheckInterval: 10000,
    performanceWindowSize: 100,
    enableDetailedLogging: false,
    metricsRetentionTime: 3600000
  },

  // 分组管理配置
  groupManagement: {
    enabled: true,
    statusSyncInterval: 5000,
    statisticsUpdateInterval: 10000,
    autoCreateGroups: true,
    cleanup: {
      enabled: true,
      interval: 300000,
      emptyGroupRetentionTime: 1800000
    }
  },

  // 持久化配置
  persistence: {
    enabled: true,
    batchWriteSize: 100,
    writeInterval: 1000,
    transactionTimeout: 5000,
    connectionPool: {
      min: 2,
      max: 10,
      timeout: 30000
    },
    cleanup: {
      enabled: true,
      interval: 3600000,
      successRetentionTime: 86400000,
      failureRetentionTime: 604800000
    }
  }
};

/**
 * 高吞吐量预设配置
 */
export const HIGH_THROUGHPUT_CONFIG: Partial<QueueConfig> = {
  jobProcessing: {
    concurrency: 10,
    timeout: 60000,
    defaultMaxAttempts: 3,
    retryDelay: {
      base: 1000,
      multiplier: 2,
      max: 30000
    },
    enablePriority: true,
    processingInterval: 50,
    parallel: {
      enabled: true,
      maxConcurrency: 20,
      batchSize: 10,
      taskInterval: 10,
      dynamicAdjustment: {
        enabled: true,
        minConcurrency: 3,
        cpuThreshold: 85,
        memoryThreshold: 90,
        checkInterval: 5000
      }
    }
  },
  watermark: {
    enabled: true,
    waterMarks: {
      low: 500,
      normal: 2000,
      high: 5000,
      critical: 8000
    }
  },
  databaseStream: {
    batchSize: 100,
    readTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    prefetchBufferSize: 200
  }
};

/**
 * 低延迟预设配置
 */
export const LOW_LATENCY_CONFIG: Partial<QueueConfig> = {
  jobProcessing: {
    concurrency: 5,
    timeout: 5000,
    defaultMaxAttempts: 3,
    retryDelay: {
      base: 500,
      multiplier: 1.5,
      max: 5000
    },
    enablePriority: true,
    processingInterval: 10,
    parallel: {
      enabled: true,
      maxConcurrency: 8,
      batchSize: 3,
      taskInterval: 5,
      dynamicAdjustment: {
        enabled: false,
        minConcurrency: 1,
        cpuThreshold: 80,
        memoryThreshold: 85,
        checkInterval: 10000
      }
    }
  },
  debounce: {
    lengthChange: 10,
    jobAddition: 20,
    watermarkChange: 50,
    eventEmission: 10
  }
};

/**
 * 内存优化预设配置
 */
export const MEMORY_OPTIMIZED_CONFIG: Partial<QueueConfig> = {
  jobProcessing: {
    concurrency: 2,
    timeout: 30000,
    defaultMaxAttempts: 3,
    retryDelay: {
      base: 2000,
      multiplier: 2,
      max: 30000
    },
    enablePriority: true,
    processingInterval: 200,
    parallel: {
      enabled: true,
      maxConcurrency: 3,
      batchSize: 2,
      taskInterval: 100,
      dynamicAdjustment: {
        enabled: true,
        minConcurrency: 1,
        cpuThreshold: 70,
        memoryThreshold: 75,
        checkInterval: 15000
      }
    }
  },
  watermark: {
    enabled: true,
    waterMarks: {
      low: 50,
      normal: 200,
      high: 400,
      critical: 600
    }
  },
  databaseStream: {
    batchSize: 20,
    readTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    prefetchBufferSize: 30
  }
};

/**
 * 获取预设配置
 */
export function getPresetConfig(
  preset: 'high_throughput' | 'low_latency' | 'memory_optimized'
): Partial<QueueConfig> {
  switch (preset) {
    case 'high_throughput':
      return HIGH_THROUGHPUT_CONFIG;
    case 'low_latency':
      return LOW_LATENCY_CONFIG;
    case 'memory_optimized':
      return MEMORY_OPTIMIZED_CONFIG;
    default:
      return {};
  }
}

/**
 * 合并配置
 */
export function mergeConfig(
  base: QueueConfig,
  override: Partial<QueueConfig>
): QueueConfig {
  return {
    ...base,
    ...override,
    watermark: {
      ...base.watermark,
      ...override.watermark,
      waterMarks: {
        ...base.watermark.waterMarks,
        ...override.watermark?.waterMarks
      }
    },
    backpressure: {
      ...base.backpressure,
      ...override.backpressure
    },
    debounce: {
      ...base.debounce,
      ...override.debounce
    },
    databaseStream: {
      ...base.databaseStream,
      ...override.databaseStream
    },
    jobProcessing: {
      ...base.jobProcessing,
      ...override.jobProcessing,
      retryDelay: {
        ...base.jobProcessing.retryDelay,
        ...override.jobProcessing?.retryDelay
      },
      parallel: {
        ...base.jobProcessing.parallel,
        ...override.jobProcessing?.parallel,
        dynamicAdjustment: {
          ...base.jobProcessing.parallel.dynamicAdjustment,
          ...override.jobProcessing?.parallel?.dynamicAdjustment
        }
      }
    },
    monitoring: {
      ...base.monitoring,
      ...override.monitoring
    },
    groupManagement: {
      ...base.groupManagement,
      ...override.groupManagement,
      cleanup: {
        ...base.groupManagement.cleanup,
        ...override.groupManagement?.cleanup
      }
    },
    persistence: {
      ...base.persistence,
      ...override.persistence,
      connectionPool: {
        ...base.persistence.connectionPool,
        ...override.persistence?.connectionPool
      },
      cleanup: {
        ...base.persistence.cleanup,
        ...override.persistence?.cleanup
      }
    }
  };
}
