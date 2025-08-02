# 基于Stratix框架的API网关服务设计方案

## 🎯 项目概述

基于@stratix/core框架开发一个功能完整的API网关服务，提供认证、授权、路由转发、限流、监控等核心功能。

## 🏗️ 架构设计

### 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Stratix Gateway                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Auth      │  │   Router    │  │  Monitor    │         │
│  │  Plugin     │  │   Plugin    │  │   Plugin    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                 Stratix Core Framework                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Auto DI     │  │ Lifecycle   │  │ Controller  │         │
│  │ Container   │  │ Manager     │  │ System      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    Fastify Server                           │
└─────────────────────────────────────────────────────────────┘
```

### 插件化架构

1. **认证插件** - JWT、OAuth2、API Key等认证方式
2. **路由插件** - 动态路由配置、负载均衡、服务发现
3. **限流插件** - 基于IP、用户、API的限流策略
4. **监控插件** - 请求日志、性能监控、健康检查
5. **缓存插件** - 响应缓存、会话缓存
6. **安全插件** - CORS、CSRF、XSS防护

## 📁 项目结构

```
packages/gateway/
├── src/
│   ├── controllers/          # 控制器
│   │   ├── GatewayController.ts
│   │   ├── AdminController.ts
│   │   └── HealthController.ts
│   ├── plugins/             # 网关插件
│   │   ├── auth/           # 认证插件
│   │   │   ├── jwt-auth.ts
│   │   │   ├── oauth2-auth.ts
│   │   │   └── api-key-auth.ts
│   │   ├── routing/        # 路由插件
│   │   │   ├── dynamic-router.ts
│   │   │   ├── load-balancer.ts
│   │   │   └── service-discovery.ts
│   │   ├── security/       # 安全插件
│   │   │   ├── rate-limiter.ts
│   │   │   ├── cors-handler.ts
│   │   │   └── security-headers.ts
│   │   ├── monitoring/     # 监控插件
│   │   │   ├── request-logger.ts
│   │   │   ├── metrics-collector.ts
│   │   │   └── health-checker.ts
│   │   └── caching/        # 缓存插件
│   │       ├── response-cache.ts
│   │       └── session-cache.ts
│   ├── services/           # 业务服务
│   │   ├── AuthService.ts
│   │   ├── RoutingService.ts
│   │   ├── ConfigService.ts
│   │   └── MetricsService.ts
│   ├── repositories/       # 数据访问层
│   │   ├── RouteRepository.ts
│   │   ├── UserRepository.ts
│   │   └── ConfigRepository.ts
│   ├── types/             # 类型定义
│   │   ├── gateway.ts
│   │   ├── auth.ts
│   │   └── routing.ts
│   ├── utils/             # 工具函数
│   │   ├── proxy-utils.ts
│   │   ├── auth-utils.ts
│   │   └── validation-utils.ts
│   └── index.ts           # 主入口
├── config/
│   ├── gateway.config.ts   # 网关配置
│   ├── routes.config.ts    # 路由配置
│   └── auth.config.ts      # 认证配置
├── database/
│   └── migrations/         # 数据库迁移
├── docs/                   # 文档
├── examples/              # 使用示例
└── package.json
```

## 🔧 核心功能实现

### 1. 网关主入口

```typescript
// src/index.ts
import { Stratix } from '@stratix/core';
import gatewayConfig from '../config/gateway.config.js';

export async function createGateway() {
  const app = await Stratix.run({
    type: 'web',
    configOptions: gatewayConfig
  });

  return app;
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  createGateway()
    .then(app => {
      console.log('🚀 Stratix Gateway started successfully');
      console.log(`📍 Server listening on ${app.getAddress()}`);
    })
    .catch(error => {
      console.error('❌ Failed to start gateway:', error);
      process.exit(1);
    });
}
```

### 2. 网关配置

```typescript
// config/gateway.config.ts
import type { StratixConfig } from '@stratix/core';
import authPlugin from '../src/plugins/auth/jwt-auth.js';
import routingPlugin from '../src/plugins/routing/dynamic-router.js';
import rateLimiterPlugin from '../src/plugins/security/rate-limiter.js';
import monitoringPlugin from '../src/plugins/monitoring/request-logger.js';

export default function createGatewayConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  return {
    server: {
      port: parseInt(process.env.GATEWAY_PORT || '3000'),
      host: process.env.GATEWAY_HOST || '0.0.0.0',
      logger: {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      }
    },

    plugins: [
      // 认证插件
      {
        name: 'jwt-auth',
        plugin: authPlugin,
        options: {
          secret: sensitiveConfig.JWT_SECRET || 'your-secret-key',
          algorithms: ['HS256'],
          expiresIn: '24h',
          issuer: 'stratix-gateway',
          audience: 'api-clients'
        }
      },

      // 路由插件
      {
        name: 'dynamic-router',
        plugin: routingPlugin,
        options: {
          configPath: './config/routes.config.js',
          enableServiceDiscovery: true,
          loadBalancing: {
            strategy: 'round-robin',
            healthCheck: {
              enabled: true,
              interval: 30000,
              timeout: 5000
            }
          }
        }
      },

      // 限流插件
      {
        name: 'rate-limiter',
        plugin: rateLimiterPlugin,
        options: {
          global: {
            max: 1000,
            timeWindow: '1 minute'
          },
          perUser: {
            max: 100,
            timeWindow: '1 minute'
          },
          perIP: {
            max: 200,
            timeWindow: '1 minute'
          }
        }
      },

      // 监控插件
      {
        name: 'request-logger',
        plugin: monitoringPlugin,
        options: {
          logLevel: 'info',
          includeHeaders: false,
          includeBody: false,
          excludePaths: ['/health', '/metrics'],
          enableMetrics: true
        }
      }
    ],

    autoLoad: {
      enabled: true,
      patterns: [
        'controllers/*.{ts,js}',
        'services/*.{ts,js}',
        'repositories/*.{ts,js}'
      ]
    },

    logger: {
      level: 'info',
      enableRequestLogging: true,
      enablePerformanceLogging: true,
      enableErrorTracking: true,
      performanceThreshold: 1000
    }
  };
}
```

### 3. 认证插件

```typescript
// src/plugins/auth/jwt-auth.ts
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

interface JWTAuthOptions {
  secret: string;
  algorithms: string[];
  expiresIn: string;
  issuer: string;
  audience: string;
  excludePaths?: string[];
}

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    username: string;
    roles: string[];
    permissions: string[];
  };
}

async function jwtAuthPlugin(fastify: FastifyInstance, options: JWTAuthOptions) {
  const { secret, algorithms, excludePaths = [] } = options;

  // 注册JWT工具到Fastify实例
  fastify.decorate('jwt', {
    sign: (payload: any) => jwt.sign(payload, secret, {
      algorithm: algorithms[0] as any,
      expiresIn: options.expiresIn,
      issuer: options.issuer,
      audience: options.audience
    }),
    
    verify: (token: string) => jwt.verify(token, secret, {
      algorithms: algorithms as any[],
      issuer: options.issuer,
      audience: options.audience
    })
  });

  // 认证中间件
  fastify.addHook('preHandler', async (request: AuthenticatedRequest, reply: FastifyReply) => {
    // 检查是否为排除路径
    if (excludePaths.some(path => request.url.startsWith(path))) {
      return;
    }

    // 检查Authorization头
    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
      return;
    }

    try {
      // 提取并验证JWT token
      const token = authorization.substring(7);
      const decoded = (fastify as any).jwt.verify(token) as any;

      // 将用户信息附加到请求对象
      request.user = {
        id: decoded.sub,
        username: decoded.username,
        roles: decoded.roles || [],
        permissions: decoded.permissions || []
      };

      fastify.log.debug(`User authenticated: ${request.user.username}`);
    } catch (error) {
      fastify.log.warn(`JWT verification failed: ${error.message}`);
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      return;
    }
  });

  // 权限检查装饰器
  fastify.decorate('requirePermission', (permission: string) => {
    return async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      if (!request.user.permissions.includes(permission)) {
        reply.status(403).send({
          error: 'Forbidden',
          message: `Required permission: ${permission}`
        });
        return;
      }
    };
  });

  // 角色检查装饰器
  fastify.decorate('requireRole', (role: string) => {
    return async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      if (!request.user.roles.includes(role)) {
        reply.status(403).send({
          error: 'Forbidden',
          message: `Required role: ${role}`
        });
        return;
      }
    };
  });

  fastify.log.info('JWT Authentication plugin loaded');
}

export default withRegisterAutoDI(jwtAuthPlugin, {
  discovery: {
    patterns: ['services/AuthService.{ts,js}']
  },
  debug: true
});
```

### 4. 动态路由插件

```typescript
// src/plugins/routing/dynamic-router.ts
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { promisify } from 'util';

interface RouteConfig {
  path: string;
  method?: string | string[];
  target: string | string[];
  rewrite?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  loadBalancing?: {
    strategy: 'round-robin' | 'least-connections' | 'random';
    healthCheck?: boolean;
  };
  auth?: {
    required: boolean;
    roles?: string[];
    permissions?: string[];
  };
  rateLimit?: {
    max: number;
    timeWindow: string;
  };
}

interface DynamicRouterOptions {
  configPath: string;
  enableServiceDiscovery: boolean;
  loadBalancing: {
    strategy: string;
    healthCheck: {
      enabled: boolean;
      interval: number;
      timeout: number;
    };
  };
}

async function dynamicRouterPlugin(fastify: FastifyInstance, options: DynamicRouterOptions) {
  const routeConfigs: RouteConfig[] = [];
  const serviceHealth = new Map<string, boolean>();
  const connectionCounts = new Map<string, number>();

  // 加载路由配置
  async function loadRouteConfig() {
    try {
      const configModule = await import(options.configPath);
      const configs = configModule.default || configModule;
      
      routeConfigs.length = 0;
      routeConfigs.push(...configs);
      
      fastify.log.info(`Loaded ${routeConfigs.length} route configurations`);
    } catch (error) {
      fastify.log.error(`Failed to load route config: ${error.message}`);
    }
  }

  // 健康检查
  async function performHealthCheck(target: string): Promise<boolean> {
    try {
      const response = await fetch(`${target}/health`, {
        method: 'GET',
        timeout: options.loadBalancing.healthCheck.timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // 负载均衡器
  function selectTarget(targets: string[], strategy: string): string {
    if (targets.length === 1) return targets[0];

    switch (strategy) {
      case 'round-robin':
        // 简化的轮询实现
        const index = Math.floor(Date.now() / 1000) % targets.length;
        return targets[index];

      case 'least-connections':
        return targets.reduce((min, target) => {
          const minConnections = connectionCounts.get(min) || 0;
          const targetConnections = connectionCounts.get(target) || 0;
          return targetConnections < minConnections ? target : min;
        });

      case 'random':
        return targets[Math.floor(Math.random() * targets.length)];

      default:
        return targets[0];
    }
  }

  // 代理请求
  async function proxyRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    target: string,
    config: RouteConfig
  ) {
    const targetUrl = new URL(request.url, target);
    
    // 应用路径重写
    if (config.rewrite) {
      for (const [from, to] of Object.entries(config.rewrite)) {
        targetUrl.pathname = targetUrl.pathname.replace(new RegExp(from), to);
      }
    }

    // 准备请求头
    const headers = {
      ...request.headers,
      ...config.headers,
      host: targetUrl.host,
      'x-forwarded-for': request.ip,
      'x-forwarded-proto': request.protocol,
      'x-forwarded-host': request.hostname
    };

    // 删除hop-by-hop头
    delete headers.connection;
    delete headers['transfer-encoding'];

    try {
      // 增加连接计数
      connectionCounts.set(target, (connectionCounts.get(target) || 0) + 1);

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' 
          ? JSON.stringify(request.body) 
          : undefined,
        timeout: config.timeout || 30000
      });

      // 设置响应头
      for (const [key, value] of response.headers.entries()) {
        if (!['connection', 'transfer-encoding'].includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      }

      // 设置状态码并发送响应
      reply.status(response.status);
      
      if (response.body) {
        const body = await response.text();
        reply.send(body);
      } else {
        reply.send();
      }

    } catch (error) {
      fastify.log.error(`Proxy request failed: ${error.message}`);
      reply.status(502).send({
        error: 'Bad Gateway',
        message: 'Failed to proxy request to upstream server'
      });
    } finally {
      // 减少连接计数
      connectionCounts.set(target, Math.max(0, (connectionCounts.get(target) || 1) - 1));
    }
  }

  // 注册动态路由
  function registerRoutes() {
    for (const config of routeConfigs) {
      const methods = Array.isArray(config.method) ? config.method : [config.method || 'GET'];
      
      for (const method of methods) {
        fastify.route({
          method: method.toUpperCase() as any,
          url: config.path,
          handler: async (request: FastifyRequest, reply: FastifyReply) => {
            // 选择目标服务器
            const targets = Array.isArray(config.target) ? config.target : [config.target];
            const healthyTargets = targets.filter(target => 
              !options.loadBalancing.healthCheck.enabled || serviceHealth.get(target) !== false
            );

            if (healthyTargets.length === 0) {
              reply.status(503).send({
                error: 'Service Unavailable',
                message: 'No healthy upstream servers available'
              });
              return;
            }

            const selectedTarget = selectTarget(
              healthyTargets,
              options.loadBalancing.strategy
            );

            await proxyRequest(request, reply, selectedTarget, config);
          },
          preHandler: config.auth?.required ? [
            // 这里可以添加认证检查
          ] : undefined
        });

        fastify.log.debug(`Registered route: ${method.toUpperCase()} ${config.path} -> ${config.target}`);
      }
    }
  }

  // 启动健康检查
  if (options.loadBalancing.healthCheck.enabled) {
    setInterval(async () => {
      const allTargets = new Set<string>();
      
      for (const config of routeConfigs) {
        const targets = Array.isArray(config.target) ? config.target : [config.target];
        targets.forEach(target => allTargets.add(target));
      }

      for (const target of allTargets) {
        const isHealthy = await performHealthCheck(target);
        serviceHealth.set(target, isHealthy);
        
        if (!isHealthy) {
          fastify.log.warn(`Health check failed for: ${target}`);
        }
      }
    }, options.loadBalancing.healthCheck.interval);
  }

  // 初始化
  await loadRouteConfig();
  registerRoutes();

  // 提供重新加载配置的API
  fastify.post('/admin/reload-routes', async (request, reply) => {
    await loadRouteConfig();
    // 注意：在生产环境中，这里需要更复杂的路由重新注册逻辑
    reply.send({ message: 'Routes reloaded successfully' });
  });

  fastify.log.info('Dynamic Router plugin loaded');
}

export default withRegisterAutoDI(dynamicRouterPlugin, {
  discovery: {
    patterns: ['services/RoutingService.{ts,js}']
  },
  debug: true
});
```

### 5. 限流插件

```typescript
// src/plugins/security/rate-limiter.ts
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitRule {
  max: number;
  timeWindow: string;
  keyGenerator?: (request: FastifyRequest) => string;
  skipOnError?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimiterOptions {
  global?: RateLimitRule;
  perUser?: RateLimitRule;
  perIP?: RateLimitRule;
  perRoute?: Record<string, RateLimitRule>;
  storage?: 'memory' | 'redis';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      const resetTime = now + windowMs;
      const record = { count: 1, resetTime };
      this.store.set(key, record);
      return record;
    }

    existing.count++;
    this.store.set(key, existing);
    return existing;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

async function rateLimiterPlugin(fastify: FastifyInstance, options: RateLimiterOptions) {
  const store = new MemoryStore();

  // 定期清理过期记录
  setInterval(() => {
    store.cleanup();
  }, 60000); // 每分钟清理一次

  // 解析时间窗口
  function parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)\s*(second|minute|hour|day)s?$/i);
    if (!match) {
      throw new Error(`Invalid time window format: ${timeWindow}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit as keyof typeof multipliers];
  }

  // 生成限流键
  function generateKey(request: FastifyRequest, type: string, rule: RateLimitRule): string {
    if (rule.keyGenerator) {
      return `${type}:${rule.keyGenerator(request)}`;
    }

    switch (type) {
      case 'global':
        return 'global';
      case 'perUser':
        return `user:${(request as any).user?.id || 'anonymous'}`;
      case 'perIP':
        return `ip:${request.ip}`;
      default:
        return `${type}:${request.url}`;
    }
  }

  // 检查限流
  async function checkRateLimit(
    request: FastifyRequest,
    reply: FastifyReply,
    type: string,
    rule: RateLimitRule
  ): Promise<boolean> {
    const key = generateKey(request, type, rule);
    const windowMs = parseTimeWindow(rule.timeWindow);
    
    try {
      const result = await store.increment(key, windowMs);
      
      // 设置响应头
      reply.header('X-RateLimit-Limit', rule.max);
      reply.header('X-RateLimit-Remaining', Math.max(0, rule.max - result.count));
      reply.header('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (result.count > rule.max) {
        reply.status(429).send({
          error: 'Too Many Requests',
          message: `Rate limit exceeded for ${type}`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
        return false;
      }

      return true;
    } catch (error) {
      fastify.log.error(`Rate limit check failed: ${error.message}`);
      
      if (rule.skipOnError) {
        return true;
      }
      
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Rate limit check failed'
      });
      return false;
    }
  }

  // 注册限流中间件
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // 全局限流
    if (options.global) {
      const allowed = await checkRateLimit(request, reply, 'global', options.global);
      if (!allowed) return;
    }

    // IP限流
    if (options.perIP) {
      const allowed = await checkRateLimit(request, reply, 'perIP', options.perIP);
      if (!allowed) return;
    }

    // 用户限流
    if (options.perUser && (request as any).user) {
      const allowed = await checkRateLimit(request, reply, 'perUser', options.perUser);
      if (!allowed) return;
    }

    // 路由限流
    if (options.perRoute) {
      for (const [routePattern, rule] of Object.entries(options.perRoute)) {
        if (request.url.match(new RegExp(routePattern))) {
          const allowed = await checkRateLimit(request, reply, `route:${routePattern}`, rule);
          if (!allowed) return;
        }
      }
    }
  });

  // 提供限流状态查询API
  fastify.get('/admin/rate-limit/status', async (request, reply) => {
    // 这里可以返回当前限流状态
    reply.send({
      message: 'Rate limiter is active',
      rules: {
        global: !!options.global,
        perIP: !!options.perIP,
        perUser: !!options.perUser,
        perRoute: Object.keys(options.perRoute || {}).length
      }
    });
  });

  fastify.log.info('Rate Limiter plugin loaded');
}

export default withRegisterAutoDI(rateLimiterPlugin, {
  discovery: {
    patterns: ['services/SecurityService.{ts,js}']
  },
  debug: true
});
```

### 6. 网关控制器

```typescript
// src/controllers/GatewayController.ts
import { Controller, Get, Post, Put, Delete } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    username: string;
    roles: string[];
    permissions: string[];
  };
}

@Controller()
export class GatewayController {
  
  @Get('/gateway/info')
  async getGatewayInfo(request: FastifyRequest, reply: FastifyReply) {
    return {
      name: 'Stratix Gateway',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  @Post('/auth/login')
  async login(request: FastifyRequest, reply: FastifyReply) {
    const { username, password } = request.body as any;

    // 这里应该验证用户凭据
    if (username === 'admin' && password === 'password') {
      const token = (request.server as any).jwt.sign({
        sub: '1',
        username: 'admin',
        roles: ['admin'],
        permissions: ['read', 'write', 'admin']
      });

      return {
        token,
        user: {
          id: '1',
          username: 'admin',
          roles: ['admin']
        }
      };
    }

    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid credentials'
    });
  }

  @Get('/auth/profile')
  async getProfile(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    return {
      user: request.user
    };
  }

  @Get('/gateway/routes')
  async getRoutes(request: AuthenticatedRequest, reply: FastifyReply) {
    // 需要管理员权限
    if (!request.user?.roles.includes('admin')) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }

    // 返回当前路由配置
    return {
      routes: [
        // 这里应该从配置服务获取路由信息
      ]
    };
  }

  @Post('/gateway/routes')
  async createRoute(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.user?.roles.includes('admin')) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }

    const routeConfig = request.body;
    
    // 这里应该验证和保存路由配置
    
    return {
      message: 'Route created successfully',
      route: routeConfig
    };
  }

  @Put('/gateway/routes/:id')
  async updateRoute(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.user?.roles.includes('admin')) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }

    const { id } = request.params as any;
    const routeConfig = request.body;
    
    // 这里应该更新路由配置
    
    return {
      message: 'Route updated successfully',
      id,
      route: routeConfig
    };
  }

  @Delete('/gateway/routes/:id')
  async deleteRoute(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.user?.roles.includes('admin')) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }

    const { id } = request.params as any;
    
    // 这里应该删除路由配置
    
    return {
      message: 'Route deleted successfully',
      id
    };
  }
}
```

### 7. 健康检查控制器

```typescript
// src/controllers/HealthController.ts
import { Controller, Get } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Controller()
export class HealthController {

  @Get('/health')
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    return health;
  }

  @Get('/health/detailed')
  async detailedHealthCheck(request: FastifyRequest, reply: FastifyReply) {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      upstreamServices: await this.checkUpstreamServices()
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');

    const health = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks
    };

    if (!allHealthy) {
      reply.status(503);
    }

    return health;
  }

  @Get('/metrics')
  async getMetrics(request: FastifyRequest, reply: FastifyReply) {
    // 返回Prometheus格式的指标
    const metrics = [
      '# HELP gateway_requests_total Total number of requests',
      '# TYPE gateway_requests_total counter',
      'gateway_requests_total 1000',
      '',
      '# HELP gateway_request_duration_seconds Request duration in seconds',
      '# TYPE gateway_request_duration_seconds histogram',
      'gateway_request_duration_seconds_bucket{le="0.1"} 100',
      'gateway_request_duration_seconds_bucket{le="0.5"} 200',
      'gateway_request_duration_seconds_bucket{le="1.0"} 300',
      'gateway_request_duration_seconds_bucket{le="+Inf"} 400',
      'gateway_request_duration_seconds_sum 150.5',
      'gateway_request_duration_seconds_count 400'
    ].join('\n');

    reply.type('text/plain').send(metrics);
  }

  private async checkDatabase(): Promise<{ status: string; message?: string }> {
    try {
      // 这里应该检查数据库连接
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Database check failed' 
      };
    }
  }

  private async checkRedis(): Promise<{ status: string; message?: string }> {
    try {
      // 这里应该检查Redis连接
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Redis check failed' 
      };
    }
  }

  private async checkUpstreamServices(): Promise<{ status: string; services?: any[] }> {
    try {
      // 这里应该检查上游服务
      const services = [
        { name: 'user-service', status: 'healthy', responseTime: 50 },
        { name: 'order-service', status: 'healthy', responseTime: 75 }
      ];

      return { 
        status: 'healthy', 
        services 
      };
    } catch (error) {
      return { 
        status: 'unhealthy'
      };
    }
  }
}
```

## 🚀 部署和使用

### 1. 安装依赖

```bash
npm install @stratix/core fastify jsonwebtoken http-proxy-middleware
npm install --save-dev @types/jsonwebtoken
```

### 2. 启动网关

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 3. 配置示例

```typescript
// config/routes.config.ts
export default [
  {
    path: '/api/users/*',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    target: ['http://user-service-1:3001', 'http://user-service-2:3001'],
    loadBalancing: {
      strategy: 'round-robin',
      healthCheck: true
    },
    auth: {
      required: true,
      permissions: ['user:read', 'user:write']
    }
  },
  {
    path: '/api/orders/*',
    method: ['GET', 'POST'],
    target: 'http://order-service:3002',
    auth: {
      required: true,
      roles: ['user', 'admin']
    },
    rateLimit: {
      max: 50,
      timeWindow: '1 minute'
    }
  },
  {
    path: '/public/*',
    method: 'GET',
    target: 'http://static-service:3003',
    auth: {
      required: false
    }
  }
];
```

## 📊 监控和管理

### 1. 管理API

- `GET /gateway/info` - 网关信息
- `GET /health` - 健康检查
- `GET /metrics` - 监控指标
- `POST /auth/login` - 用户登录
- `GET /auth/profile` - 用户信息
- `GET /gateway/routes` - 路由列表
- `POST /gateway/routes` - 创建路由
- `PUT /gateway/routes/:id` - 更新路由
- `DELETE /gateway/routes/:id` - 删除路由

### 2. 监控指标

- 请求总数和成功率
- 响应时间分布
- 错误率统计
- 限流触发次数
- 上游服务健康状态

### 3. 日志记录

- 请求/响应日志
- 认证失败日志
- 限流触发日志
- 错误和异常日志
- 性能监控日志

## 🔧 扩展功能

### 1. 服务发现

集成Consul、Eureka等服务发现组件，自动发现和注册上游服务。

### 2. 配置中心

集成配置中心，支持动态配置更新，无需重启服务。

### 3. 链路追踪

集成Jaeger、Zipkin等链路追踪系统，提供分布式追踪能力。

### 4. 缓存策略

实现多级缓存策略，提高响应性能。

### 5. 安全增强

- WAF功能
- DDoS防护
- IP白名单/黑名单
- SSL/TLS终端

这个设计方案充分利用了Stratix框架的插件化架构、依赖注入、生命周期管理等特性，构建了一个功能完整、可扩展的API网关服务。