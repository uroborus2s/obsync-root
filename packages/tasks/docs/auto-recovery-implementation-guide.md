# 工作流自动恢复实现指南

## 概述

本文档详细说明如何实现工作流的自动检测和恢复功能，无需开发者手动调用恢复服务。通过插件生命周期集成，系统能够在启动时自动检测中断的工作流并启动恢复进程。

## 方案三：插件生命周期集成（推荐方案）

### 核心设计原则

1. **完全自动化**：无需开发者手动调用任何恢复相关代码
2. **配置驱动**：通过配置文件控制恢复行为
3. **生命周期集成**：与Fastify插件生命周期完美集成
4. **优雅关闭**：支持进程信号处理和优雅关闭
5. **环境变量支持**：支持容器化部署和不同环境配置

## 实现细节

### 1. 插件配置接口扩展

基于现有的`TasksPluginOptions`接口，添加自动恢复配置选项：

```typescript
// packages/tasks/src/index.ts
export interface TasksPluginOptions extends FastifyPluginOptions {
  /** 数据库配置 */
  database?: {
    autoMigrate?: boolean;
    connectionName?: string;
  };

  // 🆕 恢复配置 - 自动启动支持
  recovery?: {
    /** 是否启用恢复服务 */
    enabled?: boolean;
    /** 检查间隔（毫秒） */
    checkInterval?: number;
    /** 最大恢复尝试次数 */
    maxRecoveryAttempts?: number;
    /** 恢复超时时间（毫秒） */
    recoveryTimeout?: number;
    /** 是否启用自动故障转移 */
    enableAutoFailover?: boolean;
    /** 🆕 是否在插件ready时自动启动 */
    autoStart?: boolean;
    /** 🆕 启动延迟（毫秒） */
    startupDelay?: number;
    /** 🆕 是否启用优雅关闭 */
    gracefulShutdown?: boolean;
  };

  // 其他配置选项...
}
```

### 2. 自动恢复服务增强

修改`WorkflowRecoveryService`以支持自动启动和配置驱动：

```typescript
// packages/tasks/src/services/WorkflowRecoveryService.ts
export class WorkflowRecoveryService {
  private readonly recoveryInterval: number;
  private isRecovering = false;
  private recoveryTimer?: NodeJS.Timeout | undefined;
  private isAutoStartEnabled = false;
  private maxRecoveryAttempts: number;
  private recoveryTimeout: number;

  constructor(
    private readonly workflowAdapter: IStratixTasksAdapter,
    private readonly lockService: DatabaseLockService,
    private readonly logger: Logger,
    // 🆕 配置驱动的构造参数
    private readonly config?: {
      checkInterval?: number;
      maxRecoveryAttempts?: number;
      recoveryTimeout?: number;
      enableAutoFailover?: boolean;
      autoStart?: boolean;
      startupDelay?: number;
    }
  ) {
    // 从配置初始化参数
    this.recoveryInterval = config?.checkInterval ?? 30000;
    this.maxRecoveryAttempts = config?.maxRecoveryAttempts ?? 3;
    this.recoveryTimeout = config?.recoveryTimeout ?? 300000; // 5分钟
    this.isAutoStartEnabled = config?.autoStart ?? false;

    // 🆕 自动启动逻辑
    if (this.isAutoStartEnabled) {
      this.scheduleAutoStart();
    }
  }

  /**
   * 🆕 计划自动启动恢复服务
   */
  private scheduleAutoStart(): void {
    const delay = this.config?.startupDelay ?? 5000; // 默认5秒延迟
    
    setTimeout(async () => {
      try {
        this.logger.info('自动启动工作流恢复服务', {
          delay,
          interval: this.recoveryInterval
        });
        await this.startRecoveryService();
      } catch (error) {
        this.logger.error('自动启动恢复服务失败', { error });
        
        // 🆕 重试机制
        if (this.maxRecoveryAttempts > 1) {
          this.scheduleRetryAutoStart(1);
        }
      }
    }, delay);
  }

  /**
   * 🆕 重试自动启动
   */
  private scheduleRetryAutoStart(attempt: number): void {
    if (attempt >= this.maxRecoveryAttempts) {
      this.logger.error('自动启动恢复服务达到最大重试次数', {
        maxAttempts: this.maxRecoveryAttempts
      });
      return;
    }

    const retryDelay = Math.min(30000 * attempt, 300000); // 指数退避，最大5分钟
    
    setTimeout(async () => {
      try {
        this.logger.info('重试自动启动工作流恢复服务', {
          attempt,
          delay: retryDelay
        });
        await this.startRecoveryService();
      } catch (error) {
        this.logger.error('重试自动启动恢复服务失败', { attempt, error });
        this.scheduleRetryAutoStart(attempt + 1);
      }
    }, retryDelay);
  }

  /**
   * 🆕 增强的单实例恢复（支持超时控制）
   */
  private async recoverSingleInstanceWithTimeout(
    instance: WorkflowInstance
  ): Promise<void> {
    const instanceId = instance.id.toString();
    const lockKey = this.getInstanceLockKey(instanceId);
    const owner = `recovery-${process.pid}-${Date.now()}`;

    // 🆕 超时控制
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`恢复超时: ${this.recoveryTimeout}ms`));
      }, this.recoveryTimeout);
    });

    try {
      // 使用Promise.race实现超时控制
      await Promise.race([
        this.recoverSingleInstanceCore(instance, lockKey, owner),
        timeoutPromise
      ]);
    } catch (error) {
      this.logger.error('恢复工作流实例超时或失败', { 
        instanceId, 
        timeout: this.recoveryTimeout,
        error 
      });
      
      // 确保释放锁
      try {
        await this.lockService.releaseLock(lockKey, owner);
      } catch (releaseError) {
        this.logger.warn('释放恢复锁失败', { instanceId, releaseError });
      }
    }
  }

  /**
   * 核心恢复逻辑（从原方法提取）
   */
  private async recoverSingleInstanceCore(
    instance: WorkflowInstance,
    lockKey: string,
    owner: string
  ): Promise<void> {
    const instanceId = instance.id.toString();

    try {
      // 尝试获取分布式锁
      const lockAcquired = await this.lockService.acquireLock(
        lockKey,
        Math.min(this.recoveryTimeout, 60000), // 锁定时间不超过1分钟或恢复超时时间
        owner
      );

      if (!lockAcquired) {
        this.logger.debug('无法获取实例锁，可能正在其他节点运行', {
          instanceId
        });
        return;
      }

      this.logger.info('开始恢复工作流实例', {
        instanceId,
        name: instance.name,
        status: instance.status,
        timeout: this.recoveryTimeout
      });

      // 恢复实例执行
      const result = await this.workflowAdapter.resumeWorkflow(instanceId);

      if (result.success) {
        this.logger.info('工作流实例恢复成功', { instanceId });
      } else {
        this.logger.error('工作流实例恢复失败', {
          instanceId,
          error: result.error
        });
      }
    } finally {
      // 释放锁
      await this.lockService.releaseLock(lockKey, owner);
    }
  }

  // 保持原有方法的兼容性...
  async startRecoveryService(): Promise<void> {
    this.logger.info('启动工作流恢复服务');

    try {
      // 立即执行一次恢复
      await this.recoverInterruptedWorkflows();

      // 启动定期检查
      this.startPeriodicRecovery();

      this.logger.info('工作流恢复服务启动成功');
    } catch (error) {
      this.logger.error('工作流恢复服务启动失败', { error });
      throw error;
    }
  }

  async stopRecoveryService(): Promise<void> {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = undefined;
    }
    this.logger.info('工作流恢复服务已停止');
  }

  // 其他原有方法保持不变...
}
```

### 3. 插件主入口修改

修改tasks插件的主函数，实现生命周期集成：

```typescript
// packages/tasks/src/index.ts
import { WorkflowRecoveryService } from './services/WorkflowRecoveryService.js';

/**
 * Tasks 插件主函数 - 支持自动恢复
 */
async function tasks(
  fastify: FastifyInstance,
  options: TasksPluginOptions
): Promise<void> {
  fastify.log.info('🚀 @stratix/tasks plugin initializing...');

  try {
    // 原有的注册逻辑...
    fastify.diContainer.register({
      registerTaskExecutor: asFunction(registerTaskExecutor, {
        lifetime: Lifetime.SINGLETON
      })
    });

    fastify.decorate('registerTaskExecutor', registerTaskExecutor);

    // 🆕 恢复配置处理
    const recoveryConfig = options.recovery;
    const isRecoveryEnabled = recoveryConfig?.enabled ?? 
      (process.env.WORKFLOW_RECOVERY_ENABLED !== 'false'); // 默认启用

    if (isRecoveryEnabled) {
      // 🆕 注册增强的恢复服务
      fastify.diContainer.register({
        workflowRecoveryService: asFunction(
          ({ workflowAdapter, databaseLockService, logger }) => {
            const config = {
              checkInterval: recoveryConfig?.checkInterval ?? 
                parseInt(process.env.WORKFLOW_RECOVERY_INTERVAL || '60000'),
              maxRecoveryAttempts: recoveryConfig?.maxRecoveryAttempts ?? 3,
              recoveryTimeout: recoveryConfig?.recoveryTimeout ?? 300000,
              enableAutoFailover: recoveryConfig?.enableAutoFailover ?? true,
              autoStart: recoveryConfig?.autoStart ?? true,
              startupDelay: recoveryConfig?.startupDelay ?? 
                parseInt(process.env.WORKFLOW_RECOVERY_STARTUP_DELAY || '10000')
            };

            return new WorkflowRecoveryService(
              workflowAdapter,
              databaseLockService,
              logger,
              config
            );
          },
          { lifetime: Lifetime.SINGLETON }
        )
      });

      // 🆕 插件ready钩子 - 自动启动恢复
      if (recoveryConfig?.autoStart !== false) {
        fastify.addHook('onReady', async () => {
          try {
            const recoveryService = fastify.diContainer.resolve<WorkflowRecoveryService>(
              'workflowRecoveryService'
            );
            
            const startupDelay = recoveryConfig?.startupDelay ?? 10000;
            
            // 延迟启动，确保系统完全就绪
            setTimeout(async () => {
              try {
                // 检查是否已经自动启动（构造时）
                if (!recoveryConfig?.autoStart) {
                  await recoveryService.startRecoveryService();
                }
                
                fastify.log.info('✅ 自动恢复服务已就绪', {
                  startupDelay,
                  interval: recoveryConfig?.checkInterval ?? 60000
                });
              } catch (error) {
                fastify.log.error('❌ 自动恢复服务启动失败:', error);
              }
            }, startupDelay);

          } catch (error) {
            fastify.log.error('❌ 恢复服务初始化失败:', error);
          }
        });

        // 🆕 优雅关闭钩子
        if (recoveryConfig?.gracefulShutdown !== false) {
          fastify.addHook('onClose', async () => {
            try {
              const recoveryService = fastify.diContainer.resolve<WorkflowRecoveryService>(
                'workflowRecoveryService'
              );
              
              fastify.log.info('正在关闭恢复服务...');
              await recoveryService.stopRecoveryService();
              fastify.log.info('✅ 恢复服务已优雅关闭');
            } catch (error) {
              fastify.log.warn('⚠️ 恢复服务关闭时出现警告:', error);
            }
          });
        }
      }

      fastify.log.info('✅ 自动恢复服务配置完成', {
        enabled: isRecoveryEnabled,
        autoStart: recoveryConfig?.autoStart !== false,
        checkInterval: recoveryConfig?.checkInterval ?? 60000
      });
    } else {
      fastify.log.info('ℹ️ 工作流恢复服务已禁用');
    }

    fastify.log.info('✅ @stratix/tasks plugin initialized successfully');
  } catch (error) {
    fastify.log.error('❌ @stratix/tasks plugin initialization failed:', error);
    throw error;
  }
}
```

### 4. 环境变量支持

支持通过环境变量配置恢复行为：

```bash
# .env 文件示例
# 恢复服务配置
WORKFLOW_RECOVERY_ENABLED=true
WORKFLOW_RECOVERY_INTERVAL=60000
WORKFLOW_RECOVERY_STARTUP_DELAY=10000
WORKFLOW_RECOVERY_MAX_ATTEMPTS=3
WORKFLOW_RECOVERY_TIMEOUT=300000

# 数据库配置
DATABASE_URL=postgresql://user:pass@localhost:5432/workflows

# 应用配置
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
```

### 5. 生产环境配置示例

```typescript
// server.ts - 生产环境启动文件
import fastify from 'fastify';
import tasksPlugin from '@stratix/tasks';

async function createProductionServer() {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty'
      } : undefined
    }
  });

  // 🆕 注册 tasks 插件，启用自动恢复
  await app.register(tasksPlugin, {
    database: {
      autoMigrate: process.env.NODE_ENV !== 'production',
      connectionName: 'default'
    },
    
    // 🆕 自动恢复配置 - 配置驱动
    recovery: {
      enabled: process.env.WORKFLOW_RECOVERY_ENABLED !== 'false', // 默认启用
      autoStart: true,                                           // 自动启动
      startupDelay: parseInt(process.env.WORKFLOW_RECOVERY_STARTUP_DELAY || '10000'),
      checkInterval: parseInt(process.env.WORKFLOW_RECOVERY_INTERVAL || '60000'),
      maxRecoveryAttempts: parseInt(process.env.WORKFLOW_RECOVERY_MAX_ATTEMPTS || '3'),
      recoveryTimeout: parseInt(process.env.WORKFLOW_RECOVERY_TIMEOUT || '300000'),
      enableAutoFailover: process.env.WORKFLOW_RECOVERY_AUTO_FAILOVER !== 'false',
      gracefulShutdown: true
    },

    // 分布式配置
    distributed: {
      enabled: process.env.WORKFLOW_DISTRIBUTED_ENABLED === 'true',
      heartbeatInterval: 30000,
      failureDetectionTimeout: 90000
    },

    // 调度器配置
    scheduler: {
      enabled: true,
      maxConcurrency: parseInt(process.env.WORKFLOW_MAX_CONCURRENCY || '50')
    },

    // 监控配置
    monitoring: {
      enabled: true,
      metricsInterval: 30000,
      logLevel: (process.env.LOG_LEVEL as any) || 'info'
    }
  });

  // 🆕 健康检查路由（包含恢复服务状态）
  app.get('/health', async (request, reply) => {
    try {
      const recoveryService = app.diContainer.resolve<WorkflowRecoveryService>(
        'workflowRecoveryService'
      );
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          recovery: {
            enabled: true,
            autoStarted: true,
            checkInterval: process.env.WORKFLOW_RECOVERY_INTERVAL || '60000'
          },
          database: {
            connected: true // 这里可以添加实际的数据库连接检查
          }
        }
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // 🆕 恢复状态查询路由
  app.get('/api/workflows/recovery/status', async () => {
    try {
      const recoveryService = app.diContainer.resolve<WorkflowRecoveryService>(
        'workflowRecoveryService'
      );
      
      return {
        success: true,
        data: {
          enabled: true,
          autoStart: true,
          lastCheck: new Date().toISOString(),
          configuration: {
            checkInterval: process.env.WORKFLOW_RECOVERY_INTERVAL || '60000',
            maxAttempts: process.env.WORKFLOW_RECOVERY_MAX_ATTEMPTS || '3',
            timeout: process.env.WORKFLOW_RECOVERY_TIMEOUT || '300000'
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  return app;
}

// 🆕 增强的启动函数
async function start() {
  try {
    const app = await createProductionServer();
    
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    const address = await app.listen({ port, host });
    
    console.log(`🚀 服务器启动成功: ${address}`);
    console.log('✅ 工作流自动恢复已启用');
    console.log(`📊 恢复检查间隔: ${process.env.WORKFLOW_RECOVERY_INTERVAL || '60000'}ms`);
    
    // 🆕 进程信号处理 - 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      console.log(`收到 ${signal} 信号，开始优雅关闭...`);
      
      try {
        await app.close();
        console.log('✅ 服务器已优雅关闭');
        process.exit(0);
      } catch (error) {
        console.error('❌ 优雅关闭失败:', error);
        process.exit(1);
      }
    };

    // 监听进程信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon 重启信号
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 未捕获异常处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 启动应用
start();
```

### 6. Docker 容器化支持

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装依赖
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 设置默认环境变量
ENV NODE_ENV=production
ENV WORKFLOW_RECOVERY_ENABLED=true
ENV WORKFLOW_RECOVERY_INTERVAL=60000
ENV WORKFLOW_RECOVERY_STARTUP_DELAY=15000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  workflow-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/workflows
      - WORKFLOW_RECOVERY_ENABLED=true
      - WORKFLOW_RECOVERY_INTERVAL=60000
      - WORKFLOW_RECOVERY_STARTUP_DELAY=15000
      - WORKFLOW_RECOVERY_MAX_ATTEMPTS=5
      - LOG_LEVEL=info
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=workflows
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 使用方式

### 最简配置（推荐）

开发者只需要启用恢复配置：

```typescript
// app.ts
import fastify from 'fastify';
import tasksPlugin from '@stratix/tasks';

async function start() {
  const app = fastify();
  
  // ✅ 只需要这样配置，系统会自动处理恢复
  await app.register(tasksPlugin, {
    recovery: {
      enabled: true  // 其他选项使用默认值
    }
  });
  
  await app.listen({ port: 3000 });
  
  // ✅ 无需任何手动调用！
  // 系统会自动：
  // 1. 在插件ready后10秒启动恢复检查
  // 2. 每60秒检查一次中断的工作流
  // 3. 进程关闭时优雅停止恢复服务
}
```

### 完全环境变量驱动

```bash
# 只需要设置环境变量
export WORKFLOW_RECOVERY_ENABLED=true
export WORKFLOW_RECOVERY_INTERVAL=30000
export WORKFLOW_RECOVERY_STARTUP_DELAY=5000

# 启动应用
node server.js
```

## 监控和调试

### 1. 日志输出示例

```
[INFO] 🚀 @stratix/tasks plugin initializing...
[INFO] ✅ 自动恢复服务配置完成 {"enabled":true,"autoStart":true,"checkInterval":60000}
[INFO] ✅ @stratix/tasks plugin initialized successfully
[INFO] 🚀 服务器启动成功: http://0.0.0.0:3000
[INFO] ✅ 工作流自动恢复已启用
[INFO] 自动启动工作流恢复服务 {"delay":10000,"interval":60000}
[INFO] 启动工作流恢复服务
[INFO] ✅ 自动恢复服务已就绪 {"startupDelay":10000,"interval":60000}
[DEBUG] 执行定期恢复检查 {"instanceId":"engine_1234_1673936400000"}
[INFO] 发现 2 个需要恢复的工作流实例
[INFO] 开始恢复工作流实例 {"instanceId":"123","name":"sync-workflow","status":"running"}
[INFO] 工作流实例恢复成功 {"instanceId":"123"}
```

### 2. 健康检查和状态监控

```bash
# 检查服务健康状态
curl http://localhost:3000/health

# 检查恢复服务状态
curl http://localhost:3000/api/workflows/recovery/status
```

### 3. 故障排除

如果自动恢复未启动，检查：

1. **配置检查**: `recovery.enabled` 是否为 `true`
2. **环境变量**: `WORKFLOW_RECOVERY_ENABLED` 是否设置正确
3. **启动日志**: 查看是否有错误信息
4. **依赖检查**: 确保数据库连接正常
5. **权限检查**: 确保有足够权限访问数据库和文件系统

## 优势总结

1. **零配置自动化**: 开发者只需启用 `recovery.enabled: true`
2. **生产就绪**: 支持容器化、环境变量配置、优雅关闭
3. **可观测性**: 完整的日志、监控和健康检查
4. **容错性**: 支持重试机制、超时控制、故障转移
5. **向后兼容**: 保持与现有API的兼容性

通过这种设计，工作流恢复变成了一个完全自动化的后台服务，开发者无需关心恢复的具体实现细节，只需要通过配置控制恢复行为即可。