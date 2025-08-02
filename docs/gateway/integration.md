# @stratix/gateway 集成方案

## 概述

本文档描述了 `@stratix/gateway` 与现有 Stratix 生态系统插件的集成方案，包括与 `@stratix/tasks` 和 `@stratix/icasync` 的深度集成。

## 整体架构集成

### 系统架构图

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App]
        MOBILE[Mobile App]
        API_CLIENT[API Client]
    end
    
    subgraph "Gateway Layer"
        GATEWAY[@stratix/gateway]
        AUTH[Auth Manager]
        SECURITY[Security Guard]
        RATE_LIMIT[Rate Limiter]
        MONITOR[Metrics Collector]
    end
    
    subgraph "Service Layer"
        TASKS[@stratix/tasks]
        ICASYNC[@stratix/icasync]
        CORE[@stratix/core]
        UTILS[@stratix/utils]
    end
    
    subgraph "Data Layer"
        DB[(Database)]
        REDIS[(Redis)]
        WPS[WPS API]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    API_CLIENT --> GATEWAY
    
    GATEWAY --> AUTH
    GATEWAY --> SECURITY
    GATEWAY --> RATE_LIMIT
    GATEWAY --> MONITOR
    
    GATEWAY --> TASKS
    GATEWAY --> ICASYNC
    GATEWAY --> CORE
    
    TASKS --> DB
    ICASYNC --> DB
    ICASYNC --> WPS
    RATE_LIMIT --> REDIS
    MONITOR --> REDIS
```

## 与 @stratix/tasks 集成

### 1. 任务管理API网关化

```typescript
// apps/ica-sync/src/config/gateway.ts
export const tasksGatewayConfig = {
  routes: [
    // 任务树管理
    {
      id: 'tasks-trees',
      path: '/api/tasks/trees/**',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      target: 'internal://tasks',
      auth: {
        required: true,
        providers: ['jwt'],
        roles: ['admin', 'operator'],
        permissions: ['tasks:read', 'tasks:write']
      },
      rateLimit: {
        limit: 100,
        window: 60000,
        keyGenerator: 'user'
      },
      validation: {
        body: {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 100 },
              description: { type: 'string', maxLength: 500 },
              executionMode: { 
                type: 'string', 
                enum: ['sequential', 'parallel'] 
              }
            },
            required: ['name']
          }
        }
      }
    },
    
    // 任务执行控制
    {
      id: 'tasks-execution',
      path: '/api/tasks/trees/:treeId/execute',
      methods: ['POST'],
      target: 'internal://tasks',
      auth: {
        required: true,
        providers: ['jwt'],
        permissions: ['tasks:execute']
      },
      rateLimit: {
        limit: 20,
        window: 60000,
        keyGenerator: 'user-path'
      },
      transformation: {
        request: [
          {
            type: 'header',
            operation: 'add',
            target: 'X-Executor-ID',
            value: '${user.id}'
          },
          {
            type: 'header',
            operation: 'add',
            target: 'X-Execution-Source',
            value: 'gateway'
          }
        ]
      }
    },
    
    // 任务监控（只读）
    {
      id: 'tasks-monitoring',
      path: '/api/tasks/stats/**',
      methods: ['GET'],
      target: 'internal://tasks',
      auth: {
        required: true,
        providers: ['jwt', 'apiKey'],
        permissions: ['tasks:read']
      },
      rateLimit: {
        limit: 200,
        window: 60000,
        keyGenerator: 'user'
      },
      caching: {
        enabled: true,
        ttl: 30,
        keyGenerator: 'path-user'
      }
    }
  ]
};
```

### 2. 任务执行权限控制

```typescript
// 自定义任务权限拦截器
class TaskPermissionInterceptor extends BaseInterceptor {
  name = 'taskPermission';
  order = 120;

  async preHandle(context: RequestContext): Promise<InterceptorResult> {
    if (!this.isTasksAPI(context)) {
      return { continue: true };
    }

    const action = this.extractTaskAction(context);
    const resourceId = this.extractResourceId(context);

    // 检查用户是否有权限操作特定任务
    const hasPermission = await this.checkTaskPermission(
      context.user!,
      action,
      resourceId
    );

    if (!hasPermission) {
      return this.createErrorResult(
        403,
        'Insufficient permissions for task operation',
        'TASK_PERMISSION_DENIED',
        { action, resourceId }
      );
    }

    return { continue: true };
  }

  private isTasksAPI(context: RequestContext): boolean {
    return context.request.url.startsWith('/api/tasks');
  }

  private extractTaskAction(context: RequestContext): string {
    const method = context.request.method;
    const path = context.request.url;

    if (path.includes('/execute')) return 'execute';
    if (path.includes('/pause')) return 'control';
    if (path.includes('/cancel')) return 'control';
    if (method === 'DELETE') return 'delete';
    if (method === 'PUT') return 'update';
    if (method === 'POST') return 'create';
    return 'read';
  }

  private extractResourceId(context: RequestContext): string | null {
    const match = context.request.url.match(/\/trees\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private async checkTaskPermission(
    user: UserInfo,
    action: string,
    resourceId: string | null
  ): Promise<boolean> {
    // 管理员有所有权限
    if (user.roles.includes('admin')) {
      return true;
    }

    // 检查基础权限
    const requiredPermission = `tasks:${action}`;
    if (!user.permissions.includes(requiredPermission)) {
      return false;
    }

    // 如果是特定资源操作，检查资源权限
    if (resourceId && ['execute', 'control', 'delete'].includes(action)) {
      return await this.checkResourceOwnership(user, resourceId);
    }

    return true;
  }

  private async checkResourceOwnership(
    user: UserInfo,
    resourceId: string
  ): Promise<boolean> {
    // 这里可以查询任务树的创建者或分配的执行者
    // 简化实现，实际应该查询数据库
    return true;
  }
}
```

## 与 @stratix/icasync 集成

### 1. 同步服务API网关化

```typescript
// apps/ica-sync/src/config/gateway.ts
export const icasyncGatewayConfig = {
  routes: [
    // 手动同步触发
    {
      id: 'sync-manual',
      path: '/api/sync/manual',
      methods: ['POST'],
      target: 'internal://icasync',
      auth: {
        required: true,
        providers: ['jwt'],
        roles: ['teacher', 'admin'],
        permissions: ['sync:trigger']
      },
      rateLimit: {
        limit: 10,
        window: 300000, // 5分钟内最多10次
        keyGenerator: 'user',
        response: {
          statusCode: 429,
          message: '同步请求过于频繁，请稍后再试'
        }
      },
      validation: {
        body: {
          schema: {
            type: 'object',
            properties: {
              scheduleIds: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 50
              },
              options: {
                type: 'object',
                properties: {
                  force: { type: 'boolean' },
                  notify: { type: 'boolean' }
                }
              }
            },
            required: ['scheduleIds']
          }
        }
      }
    },
    
    // 同步状态查询
    {
      id: 'sync-status',
      path: '/api/sync/status/**',
      methods: ['GET'],
      target: 'internal://icasync',
      auth: {
        required: true,
        providers: ['jwt', 'apiKey'],
        permissions: ['sync:read']
      },
      rateLimit: {
        limit: 100,
        window: 60000,
        keyGenerator: 'user'
      },
      caching: {
        enabled: true,
        ttl: 10, // 10秒缓存
        condition: 'status_code == 200'
      }
    },
    
    // 同步历史记录
    {
      id: 'sync-history',
      path: '/api/sync/history',
      methods: ['GET'],
      target: 'internal://icasync',
      auth: {
        required: true,
        providers: ['jwt'],
        permissions: ['sync:read']
      },
      rateLimit: {
        limit: 50,
        window: 60000,
        keyGenerator: 'user'
      },
      transformation: {
        request: [
          {
            type: 'query',
            operation: 'add',
            target: 'userId',
            value: '${user.id}'
          }
        ],
        response: [
          {
            type: 'body',
            operation: 'remove',
            source: 'internalData'
          }
        ]
      }
    },
    
    // 配置管理（仅管理员）
    {
      id: 'sync-config',
      path: '/api/sync/config/**',
      methods: ['GET', 'PUT'],
      target: 'internal://icasync',
      auth: {
        required: true,
        providers: ['jwt'],
        roles: ['admin'],
        permissions: ['sync:config']
      },
      rateLimit: {
        limit: 20,
        window: 60000,
        keyGenerator: 'user'
      }
    }
  ]
};
```

### 2. 同步任务与网关集成

```typescript
// 扩展同步服务以支持网关集成
class EnhancedSyncOrchestrator extends SyncOrchestrator {
  private gatewayManager: GatewayManager;

  constructor(
    // ... 原有依赖
    gatewayManager: GatewayManager
  ) {
    super(/* ... 原有参数 */);
    this.gatewayManager = gatewayManager;
  }

  /**
   * 通过网关触发的同步请求
   */
  async syncViaGateway(
    scheduleIds: string[],
    options: any,
    context: RequestContext
  ): Promise<any> {
    // 记录网关请求信息
    const gatewayInfo = {
      requestId: context.requestId,
      traceId: context.traceId,
      userId: context.user?.id,
      userAgent: context.request.headers['user-agent'],
      clientIP: this.getClientIP(context.request)
    };

    // 创建增强的同步任务
    const tree = await this.taskManager.createTree({
      name: `网关同步任务 - ${gatewayInfo.requestId}`,
      description: `通过API网关触发的同步任务`,
      executionMode: 'sequential',
      metadata: {
        source: 'gateway',
        gatewayInfo,
        scheduleIds,
        options
      },
      rootNode: {
        name: '网关同步根任务',
        method: 'batchSync',
        parameters: {
          scheduleIds,
          options: {
            ...options,
            source: 'gateway',
            requestId: gatewayInfo.requestId
          }
        }
      }
    });

    // 执行任务并返回执行ID
    const executionId = await this.taskManager.executeTree(tree.id);

    // 记录到网关指标
    this.gatewayManager.getMetrics().recordSyncRequest(gatewayInfo);

    return {
      success: true,
      data: {
        treeId: tree.id,
        executionId,
        requestId: gatewayInfo.requestId,
        scheduleCount: scheduleIds.length
      }
    };
  }

  private getClientIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.ip ||
      'unknown'
    );
  }
}
```

## 完整应用集成示例

### 1. apps/ica-sync 主应用配置

```typescript
// apps/ica-sync/src/index.ts
import { Stratix } from '@stratix/core';
import { gatewayPlugin } from '@stratix/gateway';
import { tasksPlugin } from '@stratix/tasks';
import { icaSyncPlugin } from '@stratix/icasync';
import { databasePlugin } from '@stratix/database';

async function createIcaSyncApp() {
  const app = await Stratix.create({
    server: {
      host: '0.0.0.0',
      port: process.env.PORT || 3000
    },
    
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.NODE_ENV === 'development'
    },

    plugins: [
      // 1. 数据库插件（基础依赖）
      {
        plugin: databasePlugin,
        options: {
          connection: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'ica_sync',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password'
          },
          pool: {
            min: 2,
            max: 10
          }
        }
      },

      // 2. 任务管理插件
      {
        plugin: tasksPlugin,
        options: {
          execution: {
            maxConcurrency: 5,
            defaultTimeout: 300000, // 5分钟
            retryAttempts: 3,
            enableCheckpoints: true
          },
          locks: {
            globalLockTimeout: 3600000, // 1小时
            treeLockTimeout: 1800000    // 30分钟
          },
          monitoring: {
            enableMetrics: true,
            logLevel: 'info'
          }
        }
      },

      // 3. 课表同步插件
      {
        plugin: icaSyncPlugin,
        options: {
          wps: {
            appId: process.env.WPS_APP_ID,
            appSecret: process.env.WPS_APP_SECRET,
            baseURL: process.env.WPS_BASE_URL || 'https://open.wps.cn'
          },
          sync: {
            batchSize: 10,
            timeout: 30000,
            retryAttempts: 3
          },
          schedule: {
            enabled: true,
            cron: '0 */30 * * * *' // 每30分钟执行一次
          }
        }
      },

      // 4. API网关插件（最后加载）
      {
        plugin: gatewayPlugin,
        options: {
          global: {
            timeout: 30000,
            retries: 3,
            tracing: true,
            metrics: true
          },

          routes: [
            // 合并所有路由配置
            ...tasksGatewayConfig.routes,
            ...icasyncGatewayConfig.routes,
            
            // 健康检查（公开）
            {
              id: 'health-check',
              path: '/health',
              methods: ['GET'],
              target: 'internal://health',
              auth: { required: false },
              rateLimit: {
                limit: 1000,
                window: 60000,
                keyGenerator: 'ip'
              }
            }
          ],

          auth: {
            jwt: {
              secret: process.env.JWT_SECRET || 'your-secret-key',
              algorithm: 'HS256',
              expiresIn: '8h',
              issuer: 'ica-sync-gateway',
              audience: 'ica-sync-clients'
            },
            apiKey: {
              header: 'X-API-Key',
              query: 'api_key'
            }
          },

          security: {
            cors: {
              origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
              methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
              allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
              credentials: true,
              maxAge: 86400
            },
            headers: {
              frameOptions: 'DENY',
              contentTypeOptions: true,
              xssProtection: '1; mode=block',
              hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: false
              }
            },
            maliciousDetection: {
              enabled: true,
              sqlInjection: true,
              pathTraversal: true,
              commandInjection: true
            }
          },

          rateLimit: {
            limit: 1000,
            window: 60000,
            algorithm: 'sliding-window',
            keyGenerator: 'ip'
          },

          monitoring: {
            metrics: true,
            metricsInterval: 60000,
            healthCheck: true,
            healthCheckInterval: 30000
          },

          logging: {
            level: 'info',
            accessLog: true,
            errorLog: true,
            securityLog: true,
            format: 'json'
          }
        }
      }
    ]
  });

  return app;
}

// 启动应用
async function main() {
  try {
    const app = await createIcaSyncApp();
    
    await app.listen();
    
    console.log('🚀 ICA Sync Application started successfully');
    console.log(`📡 Server listening on http://localhost:${process.env.PORT || 3000}`);
    console.log('🔗 Available endpoints:');
    console.log('  - GET  /health                    - Health check');
    console.log('  - GET  /api/gateway/health        - Gateway health');
    console.log('  - GET  /api/tasks/stats           - Task statistics');
    console.log('  - POST /api/sync/manual           - Manual sync trigger');
    console.log('  - GET  /api/sync/status           - Sync status');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

main();
```

### 2. 环境配置

```bash
# .env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ica_sync
DB_USER=postgres
DB_PASSWORD=your-db-password

# JWT配置
JWT_SECRET=your-super-secret-jwt-key

# WPS配置
WPS_APP_ID=your-wps-app-id
WPS_APP_SECRET=your-wps-app-secret
WPS_BASE_URL=https://open.wps.cn

# CORS配置
CORS_ORIGINS=http://localhost:3000,https://app.example.com

# Redis配置（可选，用于分布式限流）
REDIS_URL=redis://localhost:6379
```

### 3. Docker Compose 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ica_sync
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 监控和运维

### 1. 健康检查端点

```bash
# 应用健康检查
curl http://localhost:3000/health

# 网关健康检查
curl http://localhost:3000/api/gateway/health

# 任务系统健康检查
curl http://localhost:3000/api/tasks/health

# 同步服务健康检查
curl http://localhost:3000/api/sync/health
```

### 2. 指标监控

```bash
# 网关指标
curl http://localhost:3000/api/gateway/metrics

# 任务指标
curl http://localhost:3000/api/tasks/stats

# 同步指标
curl http://localhost:3000/api/sync/stats
```

### 3. 日志聚合

所有组件的日志都会通过网关的日志拦截器进行统一格式化和聚合，便于后续的日志分析和监控告警。

## 总结

通过 `@stratix/gateway` 的集成，整个 ICA 同步系统获得了：

1. **统一的API入口**：所有服务通过网关统一暴露
2. **完善的安全防护**：认证、授权、CORS、XSS等全面防护
3. **精细的访问控制**：基于角色和权限的细粒度控制
4. **智能的限流保护**：防止服务过载和滥用
5. **全面的监控体系**：请求追踪、性能监控、错误统计
6. **灵活的扩展能力**：支持自定义拦截器和插件

这种集成方案既保持了各个插件的独立性，又通过网关实现了统一的横切关注点处理，为整个系统提供了企业级的API管理能力。
