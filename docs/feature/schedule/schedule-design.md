# Stratix定时任务插件设计

## 1. 插件概述

定时任务插件(`@stratix/schedule`)是Stratix框架的扩展插件，提供灵活、可靠的定时任务调度功能。该插件支持cron表达式、固定间隔和特定时间点触发的任务，并提供任务生命周期管理、分布式锁和错误处理机制。

### 1.1 设计目标

- **声明式配置**：通过纯配置方式定义和管理定时任务
- **灵活调度**：支持多种调度方式（cron、间隔、日期时间）
- **可靠执行**：支持任务重试、超时控制和错误处理
- **分布式支持**：在集群环境中确保任务只执行一次
- **完整监控**：提供任务执行状态和性能指标
- **优雅退出**：应用关闭时妥善处理运行中的任务

### 1.2 核心功能

- 基于cron表达式的任务调度
- 基于时间间隔的重复任务
- 单次执行的延迟任务
- 任务执行状态跟踪
- 分布式锁机制防止重复执行
- 任务超时控制和中断机制
- 失败任务的自动重试策略
- 完整的任务执行日志和指标

## 2. 插件设计

### 2.1 接口定义

```typescript
interface SchedulePluginOptions {
  timezone?: string;                   // 默认时区，如'Asia/Shanghai'
  storage?: 'memory' | 'redis' | 'database'; // 任务存储方式
  defaultLockDuration?: number;        // 默认锁定时长（毫秒）
  defaultTimeout?: number;             // 默认任务超时时间（毫秒）
  defaultRetry?: {                     // 默认重试策略
    attempts: number;                  // 重试次数
    delay: number;                     // 重试延迟（毫秒）
    backoff?: 'fixed' | 'exponential'; // 重试延迟策略
  };
  tasks?: Record<string, TaskDefinition>; // 任务定义
}

interface TaskDefinition {
  schedule: string | number | Date | CronOptions; // 调度表达式
  handler: string | TaskHandler;       // 任务处理函数或函数路径
  enabled?: boolean;                   // 是否启用，默认true
  timeout?: number;                    // 任务超时时间（毫秒）
  retry?: {                            // 重试策略
    attempts: number;                  // 重试次数
    delay: number;                     // 重试延迟（毫秒）
    backoff?: 'fixed' | 'exponential'; // 重试延迟策略
  };
  lock?: {                             // 分布式锁配置
    enabled: boolean;                  // 是否启用锁
    duration?: number;                 // 锁定时长（毫秒）
    key?: string | ((task: Task) => string); // 锁键名
  };
  runOnInit?: boolean;                 // 应用启动时立即执行一次
  runOnSingleInstance?: boolean;       // 仅在单个实例上运行
  metadata?: Record<string, any>;      // 任务元数据
}

interface CronOptions {
  expression: string;                  // Cron表达式
  timezone?: string;                   // 时区
}

// 任务处理函数类型
type TaskHandler = (task: Task, app: StratixApp) => Promise<any>;

// 任务实例接口
interface Task {
  id: string;                          // 任务ID
  name: string;                        // 任务名称
  metadata: Record<string, any>;       // 任务元数据
  attempt: number;                     // 当前尝试次数
  lastRun: Date | null;                // 上次运行时间
  nextRun: Date | null;                // 下次运行时间
  runtime: {                           // 运行时信息
    startTime: Date | null;            // 开始时间
    endTime: Date | null;              // 结束时间
    duration: number | null;           // 执行时长（毫秒）
  };
  state: 'idle' | 'running' | 'succeeded' | 'failed'; // 任务状态
  result: any;                         // 任务结果
  error: Error | null;                 // 任务错误
}

// 插件API接口
interface ScheduleAPI {
  addTask(name: string, definition: TaskDefinition): Promise<void>;
  removeTask(name: string): Promise<boolean>;
  enableTask(name: string): Promise<boolean>;
  disableTask(name: string): Promise<boolean>;
  getTasks(): Promise<Record<string, Task>>;
  getTask(name: string): Promise<Task | null>;
  runTask(name: string): Promise<any>;
  pauseAll(): Promise<void>;
  resumeAll(): Promise<void>;
  getMetrics(): Promise<ScheduleMetrics>;
}

interface ScheduleMetrics {
  totalTasks: number;
  enabledTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  // 其他指标...
}
```

### 2.2 核心组件

1. **调度器(Scheduler)**：负责基于配置创建和管理定时任务
2. **任务管理器(TaskManager)**：处理任务的存储、检索和状态管理
3. **执行器(Executor)**：负责任务的实际执行、超时控制和结果处理
4. **锁管理器(LockManager)**：提供分布式锁机制，防止任务重复执行
5. **指标收集器(MetricsCollector)**：收集和提供任务执行指标

## 3. 使用示例

### 3.1 基本配置

```typescript
// 基本使用
app.register(require('@stratix/schedule'), {
  timezone: 'Asia/Shanghai',
  storage: 'memory',
  defaultTimeout: 60000, // 默认超时1分钟
  defaultRetry: {
    attempts: 3,
    delay: 5000,
    backoff: 'exponential'
  },
  tasks: {
    'cleanup': {
      schedule: '0 0 * * *', // 每天午夜执行
      handler: 'services.cleanupService.run',
      timeout: 300000, // 5分钟
      lock: {
        enabled: true,
        duration: 600000 // 10分钟
      }
    },
    'syncData': {
      schedule: 3600000, // 每小时执行一次
      handler: async (task, app) => {
        const { database, logger } = app;
        logger.info(`开始数据同步，任务ID: ${task.id}`);
        // 执行数据同步逻辑...
        return { synced: true };
      },
      retry: {
        attempts: 5,
        delay: 60000
      },
      runOnSingleInstance: true
    },
    'sendNewsletter': {
      schedule: new Date('2023-12-31T10:00:00'), // 特定时间执行
      handler: 'services.newsletterService.send',
      enabled: process.env.NODE_ENV === 'production',
      metadata: {
        description: '发送年终总结邮件'
      }
    }
  }
});

// 使用API
const scheduler = app.schedule;

// 动态添加任务
await scheduler.addTask('generateReport', {
  schedule: '0 9 * * 1', // 每周一上午9点
  handler: 'services.reportService.generate',
  metadata: {
    reportType: 'weekly'
  }
});

// 手动触发任务
await scheduler.runTask('generateReport');

// 禁用任务
await scheduler.disableTask('syncData');

// 获取任务指标
const metrics = await scheduler.getMetrics();
app.logger.info('Schedule metrics', metrics);
```

### 3.2 高级使用

```typescript
// 纯配置声明
const app = createApp({
  name: 'my-scheduled-app',
  logger: {
    level: 'info'
  },
  database: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'my_db',
      user: 'postgres',
      password: 'postgres'
    }
  },
  schedule: {
    storage: 'database', // 使用数据库存储任务状态
    tasks: {
      'processQueue': {
        schedule: {
          expression: '*/15 * * * *', // 每15分钟
          timezone: 'UTC'
        },
        handler: 'tasks.processQueue',
        lock: {
          enabled: true,
          key: (task) => `lock:${task.name}:${new Date().toISOString().split('T')[0]}`
        },
        runOnInit: true,
        metadata: {
          description: '处理待处理队列中的项目',
          priority: 'high'
        }
      },
      'generateReports': {
        schedule: '0 1 * * *', // 每天凌晨1点
        handler: 'tasks.reports.generate',
        timeout: 1800000, // 30分钟
        retry: {
          attempts: 2,
          delay: 300000 // 5分钟
        }
      },
      'healthCheck': {
        schedule: 300000, // 每5分钟
        handler: async (task, app) => {
          const services = ['database', 'redis', 'api'];
          const results = {};
          
          for (const service of services) {
            try {
              // 检查服务健康状态...
              results[service] = 'healthy';
            } catch (error) {
              results[service] = 'unhealthy';
              app.logger.error(`Health check failed for ${service}`, error);
            }
          }
          
          return results;
        },
        timeout: 10000 // 10秒
      }
    }
  }
});

// 任务实现示例
module.exports = {
  tasks: {
    processQueue: async function(task, app) {
      const { database, logger } = app;
      
      logger.info(`开始处理队列，尝试次数: ${task.attempt}`);
      
      // 获取待处理项
      const items = await database('queue')
        .where('status', 'pending')
        .limit(100);
        
      logger.info(`找到 ${items.length} 个待处理项`);
      
      let processed = 0;
      let failed = 0;
      
      for (const item of items) {
        try {
          // 处理队列项...
          await database('queue')
            .where('id', item.id)
            .update({ status: 'completed' });
            
          processed++;
        } catch (error) {
          logger.error(`处理项 ${item.id} 失败`, error);
          
          await database('queue')
            .where('id', item.id)
            .update({ 
              status: 'failed',
              error: error.message,
              retries: item.retries + 1
            });
            
          failed++;
        }
      }
      
      return { processed, failed };
    },
    reports: {
      generate: async function(task, app) {
        const { database, logger } = app;
        logger.info('开始生成报表');
        
        // 生成各种报表...
        
        return { generated: true };
      }
    }
  }
};
```

## 4. 最佳实践

### 4.1 任务设计原则

1. **原子性**: 每个定时任务应专注于单一职责
2. **幂等性**: 任务应设计为可重复执行而不产生副作用
3. **容错性**: 任务应优雅处理错误和边缘情况
4. **可观测性**: 任务应生成足够的日志和指标以便监控

### 4.2 生产环境建议

1. 对关键任务使用分布式锁确保只执行一次
2. 设置合理的超时时间和重试策略
3. 为长时间运行的任务实现检查点和恢复机制
4. 使用持久化存储（如数据库）来跟踪任务状态
5. 实现健康检查和警报机制及时发现问题

## 5. 与其他插件集成

### 5.1 与数据库插件集成

```typescript
// 使用数据库存储任务状态
app.register(require('@stratix/database'), {
  client: 'postgresql',
  connection: { /* ... */ }
})
.register(require('@stratix/schedule'), {
  storage: 'database',
  tasks: { /* ... */ }
});
```

### 5.2 与日志插件集成

```typescript
// 配置任务日志
app.register(require('@stratix/logger'), {
  level: 'info',
  loggers: {
    schedule: {
      level: 'debug',
      destination: './logs/schedule.log'
    }
  }
})
.register(require('@stratix/schedule'), {
  // ...
});
```

### 5.3 与缓存插件集成

```typescript
// 使用Redis作为分布式锁
app.register(require('@stratix/cache'), {
  driver: 'redis',
  connection: { /* ... */ }
})
.register(require('@stratix/schedule'), {
  storage: 'redis',
  tasks: { /* ... */ }
});
```

## 6. 实现细节

### 6.1 插件实现示例

```typescript
const schedulePlugin: StratixPlugin<SchedulePluginOptions> = {
  name: 'schedule',
  dependencies: ['core'],
  optionalDependencies: ['logger', 'cache', 'database'],
  register: async (app, options) => {
    const { 
      timezone = 'UTC',
      storage = 'memory',
      tasks = {} 
    } = options;
    
    // 创建调度器实例
    const scheduler = createScheduler(app, {
      timezone,
      storage,
      ...options
    });
    
    // 注册任务
    for (const [name, definition] of Object.entries(tasks)) {
      await scheduler.addTask(name, definition);
    }
    
    // 添加装饰器
    app.decorate('schedule', scheduler);
    
    // 应用启动时启动调度器
    app.hook('afterStart', async () => {
      await scheduler.start();
      if (app.hasPlugin('logger')) {
        app.logger.info('定时任务调度器已启动');
      }
    });
    
    // 应用关闭时停止调度器
    app.hook('beforeClose', async () => {
      await scheduler.stop();
    });
  },
  schema: {
    type: 'object',
    properties: {
      timezone: { type: 'string' },
      storage: { type: 'string', enum: ['memory', 'redis', 'database'] },
      defaultTimeout: { type: 'number', minimum: 0 },
      defaultRetry: { 
        type: 'object',
        properties: {
          attempts: { type: 'number', minimum: 0 },
          delay: { type: 'number', minimum: 0 },
          backoff: { type: 'string', enum: ['fixed', 'exponential'] }
        }
      },
      tasks: { type: 'object' }
    }
  }
};
```

### 6.2 扩展接口

除了核心API外，定时任务插件还提供以下扩展点：

1. **自定义存储**: 实现自定义任务状态存储
2. **事件监听**: 订阅任务生命周期事件
3. **中间件**: 为任务执行添加前置和后置处理逻辑
4. **分布式协调**: 自定义分布式环境中的任务协调策略

## 7. 未来拓展方向

1. 支持更复杂的任务依赖关系和工作流
2. 提供任务执行历史和分析报表
3. 基于负载和资源使用情况的动态调度
4. 可视化管理界面
5. 支持更多存储后端和调度算法 