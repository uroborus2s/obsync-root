# Stratix 插件间服务共享使用示例

## 基础使用示例

### 1. 简单服务注册和使用

#### 服务提供者插件

```typescript
// packages/user-plugin/src/index.ts
import { StratixPlugin } from '@stratix/core';

class UserPlugin extends StratixPlugin {
  constructor(fastify: FastifyInstance) {
    super('user', fastify);
  }

  async initialize(): Promise<void> {
    // 注册用户服务
    this.registerPublicService(
      'userService',
      {
        create: async (context) => {
          const database = context.container.resolve('database');
          return new UserService(database, context.logger);
        },
        destroy: async (instance) => {
          await instance.cleanup();
        },
        healthCheck: async (instance) => {
          return await instance.isConnected();
        }
      },
      {
        version: '1.0.0',
        description: '用户管理服务',
        dependencies: ['database'],
        tags: ['user', 'core']
      }
    );

    this.logger.info('User plugin initialized');
  }
}

class UserService {
  constructor(
    private database: any,
    private logger: any
  ) {}

  async getUser(id: string): Promise<User> {
    this.logger.debug(`Getting user: ${id}`);
    return await this.database.findUser(id);
  }

  async createUser(userData: CreateUserData): Promise<User> {
    this.logger.info(`Creating user: ${userData.email}`);
    return await this.database.createUser(userData);
  }

  async isConnected(): Promise<boolean> {
    return this.database.isConnected();
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up user service');
  }
}

export const userPlugin = {
  name: 'user',
  register: async (fastify: FastifyInstance) => {
    const plugin = new UserPlugin(fastify);
    await plugin.initialize();
  }
};
```

#### 服务消费者插件

```typescript
// packages/notification-plugin/src/index.ts
import { StratixPlugin } from '@stratix/core';

class NotificationPlugin extends StratixPlugin {
  private userService?: any;

  constructor(fastify: FastifyInstance) {
    super('notification', fastify);
  }

  async initialize(): Promise<void> {
    // 获取用户服务
    this.userService = await this.getService('user', 'userService');

    // 注册通知服务
    this.registerPublicService(
      'notificationService',
      {
        create: async (context) => {
          return new NotificationService(this.userService, context.logger);
        }
      },
      {
        version: '1.0.0',
        description: '通知服务',
        dependencies: ['user.userService']
      }
    );

    this.logger.info('Notification plugin initialized');
  }
}

class NotificationService {
  constructor(
    private userService: any,
    private logger: any
  ) {}

  async sendUserNotification(userId: string, message: string): Promise<void> {
    // 使用用户服务获取用户信息
    const user = await this.userService.getUser(userId);
    
    this.logger.info(`Sending notification to ${user.email}: ${message}`);
    
    // 发送通知逻辑
    await this.sendEmail(user.email, message);
  }

  private async sendEmail(email: string, message: string): Promise<void> {
    // 邮件发送实现
    console.log(`Email sent to ${email}: ${message}`);
  }
}

export const notificationPlugin = {
  name: 'notification',
  register: async (fastify: FastifyInstance) => {
    const plugin = new NotificationPlugin(fastify);
    await plugin.initialize();
  }
};
```

### 2. 应用配置和启动

```typescript
// apps/example-app/src/index.ts
import { Stratix } from '@stratix/core';
import { userPlugin } from '@my-org/user-plugin';
import { notificationPlugin } from '@my-org/notification-plugin';

async function createApp() {
  const app = await Stratix.create({
    server: {
      host: '0.0.0.0',
      port: 3000
    },
    
    plugins: [
      // 先加载用户插件
      {
        plugin: userPlugin,
        options: {
          database: {
            host: 'localhost',
            port: 5432,
            database: 'myapp'
          }
        }
      },
      
      // 再加载通知插件（依赖用户插件）
      {
        plugin: notificationPlugin,
        options: {
          email: {
            provider: 'smtp',
            host: 'smtp.example.com'
          }
        }
      }
    ]
  });

  return app;
}

async function main() {
  const app = await createApp();
  
  // 测试服务调用
  const notificationService = await app.serviceRegistry.getPublicService(
    'main',
    'notification',
    'notificationService'
  );
  
  await notificationService.sendUserNotification('user123', 'Welcome!');
  
  await app.listen();
  console.log('App started on http://localhost:3000');
}

main().catch(console.error);
```

## 高级使用示例

### 1. 带有权限控制的服务

```typescript
// packages/admin-plugin/src/index.ts
class AdminPlugin extends StratixPlugin {
  async initialize(): Promise<void> {
    // 设置插件角色
    this.fastify.serviceAccessControl.setPluginRole('admin', ['admin', 'superuser']);
    
    // 注册管理服务（只有管理员可以访问）
    this.registerPublicService(
      'adminService',
      {
        create: async (context) => new AdminService(context.logger)
      },
      {
        version: '1.0.0',
        description: '管理员服务',
        tags: ['admin', 'restricted']
      }
    );

    // 设置访问权限
    this.fastify.serviceAccessControl.grantAccess(
      'admin',
      'adminService',
      ['role:admin', 'role:superuser']
    );
  }
}

class AdminService {
  constructor(private logger: any) {}

  async deleteAllUsers(): Promise<void> {
    this.logger.warn('Deleting all users - admin operation');
    // 危险操作，只有管理员可以执行
  }

  async getSystemStats(): Promise<SystemStats> {
    return {
      userCount: 1000,
      activeConnections: 50,
      memoryUsage: process.memoryUsage()
    };
  }
}
```

### 2. 异步服务初始化

```typescript
// packages/database-plugin/src/index.ts
class DatabasePlugin extends StratixPlugin {
  async initialize(): Promise<void> {
    // 注册数据库连接服务
    this.registerPublicService(
      'database',
      {
        create: async (context) => {
          const db = new DatabaseService(context.config);
          await db.connect(); // 异步初始化
          return db;
        },
        destroy: async (instance) => {
          await instance.disconnect();
        },
        healthCheck: async (instance) => {
          return await instance.ping();
        }
      },
      {
        version: '2.0.0',
        description: '数据库连接服务',
        healthCheckInterval: 30000
      }
    );

    // 注册缓存服务（依赖数据库）
    this.registerPublicService(
      'cache',
      {
        create: async (context) => {
          const database = await context.container.resolve('database.database');
          const cache = new CacheService(database, context.logger);
          await cache.initialize();
          return cache;
        }
      },
      {
        version: '1.0.0',
        description: '缓存服务',
        dependencies: ['database.database']
      }
    );
  }
}

class DatabaseService {
  private connection?: any;

  constructor(private config: any) {}

  async connect(): Promise<void> {
    this.connection = await createConnection(this.config);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.connection.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async query(sql: string, params?: any[]): Promise<any> {
    return await this.connection.query(sql, params);
  }
}
```

### 3. 服务版本管理

```typescript
// packages/api-plugin/src/index.ts
class ApiPlugin extends StratixPlugin {
  async initialize(): Promise<void> {
    // 注册API服务V1（向后兼容）
    this.registerPublicService(
      'apiV1',
      {
        create: async (context) => new ApiServiceV1(context.logger)
      },
      {
        version: '1.0.0',
        description: 'API服务V1版本',
        tags: ['api', 'deprecated']
      }
    );

    // 注册API服务V2（当前版本）
    this.registerPublicService(
      'apiV2',
      {
        create: async (context) => new ApiServiceV2(context.logger)
      },
      {
        version: '2.0.0',
        description: 'API服务V2版本',
        tags: ['api', 'current']
      }
    );

    // 注册默认API服务（指向最新版本）
    this.registerPublicService(
      'api',
      {
        create: async (context) => {
          return await context.container.resolve('api.apiV2');
        }
      },
      {
        version: '2.0.0',
        description: 'API服务（默认最新版本）',
        tags: ['api', 'default']
      }
    );
  }
}

class ApiServiceV1 {
  constructor(private logger: any) {}

  async processRequest(data: any): Promise<any> {
    this.logger.warn('Using deprecated API V1');
    return { version: 'v1', result: data };
  }
}

class ApiServiceV2 {
  constructor(private logger: any) {}

  async processRequest(data: any): Promise<any> {
    this.logger.debug('Using API V2');
    return { 
      version: 'v2', 
      result: data,
      timestamp: new Date().toISOString()
    };
  }

  async batchProcess(items: any[]): Promise<any[]> {
    // V2新增的批量处理功能
    return items.map(item => this.processRequest(item));
  }
}
```

### 4. 请求级别的服务

```typescript
// packages/request-context-plugin/src/index.ts
class RequestContextPlugin extends StratixPlugin {
  async initialize(): Promise<void> {
    // 注册请求上下文服务（SCOPED）
    this.fastify.diContainer.register('requestContext', {
      factory: (container) => {
        const request = container.resolve('request');
        const reply = container.resolve('reply');
        return new RequestContextService(request, reply);
      },
      lifetime: 'SCOPED'
    });

    // 注册审计日志服务（依赖请求上下文）
    this.registerPublicService(
      'auditLogger',
      {
        create: async (context) => {
          // 这里不能直接resolve SCOPED服务，需要在请求时动态获取
          return new AuditLoggerService(context.container, context.logger);
        }
      },
      {
        version: '1.0.0',
        description: '审计日志服务'
      }
    );

    // 添加请求钩子来初始化请求级别的服务
    this.fastify.addHook('preHandler', async (request, reply) => {
      // 为每个请求创建独立的容器作用域
      const scope = this.fastify.diContainer.createScope();
      scope.register('request', { value: request });
      scope.register('reply', { value: reply });
      
      // 将作用域附加到请求对象
      (request as any).scope = scope;
    });
  }
}

class RequestContextService {
  constructor(
    private request: any,
    private reply: any
  ) {}

  getCurrentUser(): User | null {
    return this.request.user;
  }

  getTraceId(): string {
    return this.request.headers['x-trace-id'] || 'unknown';
  }

  getClientIP(): string {
    return this.request.ip;
  }
}

class AuditLoggerService {
  constructor(
    private container: any,
    private logger: any
  ) {}

  async logAction(action: string, details: any): Promise<void> {
    // 在运行时获取请求上下文
    const requestContext = this.container.resolve('requestContext');
    
    const auditLog = {
      action,
      details,
      userId: requestContext.getCurrentUser()?.id,
      traceId: requestContext.getTraceId(),
      clientIP: requestContext.getClientIP(),
      timestamp: new Date()
    };

    this.logger.info('Audit log', auditLog);
    
    // 保存到数据库
    await this.saveAuditLog(auditLog);
  }

  private async saveAuditLog(log: any): Promise<void> {
    // 保存审计日志的实现
  }
}
```

### 5. 服务健康检查和监控

```typescript
// packages/monitoring-plugin/src/index.ts
class MonitoringPlugin extends StratixPlugin {
  async initialize(): Promise<void> {
    // 注册监控服务
    this.registerPublicService(
      'monitor',
      {
        create: async (context) => {
          return new MonitoringService(context.fastify.serviceRegistry, context.logger);
        }
      },
      {
        version: '1.0.0',
        description: '系统监控服务'
      }
    );

    // 注册健康检查路由
    this.fastify.get('/health', async (request, reply) => {
      const monitor = await this.getService('monitoring', 'monitor');
      const health = await monitor.getSystemHealth();
      
      const statusCode = health.overall === 'healthy' ? 200 : 503;
      reply.status(statusCode).send(health);
    });

    // 注册服务发现路由
    this.fastify.get('/services', async (request, reply) => {
      const services = this.fastify.serviceRegistry.discoverServices();
      reply.send(services);
    });
  }
}

class MonitoringService {
  constructor(
    private serviceRegistry: any,
    private logger: any
  ) {}

  async getSystemHealth(): Promise<SystemHealthStatus> {
    const services = this.serviceRegistry.discoverServices();
    const healthChecks: Record<string, any> = {};
    
    let healthyCount = 0;
    let totalCount = 0;

    for (const service of services) {
      totalCount++;
      const serviceKey = `${service.pluginName}.${service.serviceName}`;
      
      try {
        const health = await this.serviceRegistry.checkServiceHealth(
          service.pluginName,
          service.serviceName
        );
        
        healthChecks[serviceKey] = health;
        
        if (health.status === 'healthy') {
          healthyCount++;
        }
      } catch (error) {
        healthChecks[serviceKey] = {
          status: 'error',
          message: error.message
        };
      }
    }

    const healthRatio = totalCount > 0 ? healthyCount / totalCount : 1;
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    
    if (healthRatio === 1) {
      overall = 'healthy';
    } else if (healthRatio >= 0.7) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services: healthChecks,
      timestamp: new Date()
    };
  }

  async getServiceMetrics(): Promise<any> {
    // 收集服务性能指标
    return {
      totalServices: this.serviceRegistry.discoverServices().length,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }
}
```

### 6. 错误处理和重试机制

```typescript
// packages/resilient-service/src/index.ts
class ResilientService {
  constructor(
    private serviceAccessor: ServiceAccessor,
    private logger: any
  ) {}

  async callExternalService(data: any): Promise<any> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const externalService = await this.serviceAccessor.getService('external', 'api');
        return await externalService.process(data);
        
      } catch (error) {
        this.logger.warn(`Service call failed (attempt ${attempt}/${maxRetries})`, {
          error: error.message,
          data
        });

        if (attempt === maxRetries) {
          // 最后一次尝试失败，抛出错误
          throw new ServiceCallError(`Service call failed after ${maxRetries} attempts`, error);
        }

        // 指数退避延迟
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class ServiceCallError extends Error {
  constructor(message: string, public originalError: Error) {
    super(message);
    this.name = 'ServiceCallError';
  }
}
```

这些示例展示了Stratix服务共享机制的各种使用场景，从简单的服务注册和调用到复杂的权限控制、版本管理和错误处理。
