# 重构后的动态健康检查功能

## 概述

本次重构将健康检查逻辑从内联实现提取为独立的可重用函数，增加了Redis健康检查支持，并提供了更好的模块化和可维护性。

## 重构目标

### ✅ 已实现的目标

1. **函数独立性**：将健康检查逻辑提取为独立函数
2. **Redis支持**：新增Redis连接健康检查
3. **模块化设计**：提高代码的可重用性和可测试性
4. **完整的组件检查**：数据库 + Redis + 微服务
5. **类型安全**：完整的TypeScript类型支持
6. **错误处理**：健壮的错误处理机制

## 函数签名

```typescript
const healthCheck = (
  services: GatewayServicesList, 
  redisConfig?: Record<string, any>
) => async (fastifyInstance: FastifyInstance): Promise<boolean>
```

### 参数说明

- **services**: `GatewayServicesList` - 网关服务配置列表
- **redisConfig**: `Record<string, any>` (可选) - Redis配置对象
- **返回值**: `Promise<boolean>` - 整体健康状态

## 健康检查组件

### 1. 数据库健康检查

```typescript
const databaseHealthPromise = (async () => {
  try {
    const databaseApi = fastifyInstance.diContainer.resolve('databaseApi');
    const dbres = await databaseApi.healthCheck();
    return {
      component: 'database',
      healthy: dbres.success && dbres.data,
      details: dbres
    };
  } catch (error) {
    return {
      component: 'database',
      healthy: false,
      error: error instanceof Error ? error.message : 'Database check failed'
    };
  }
})();
```

### 2. Redis健康检查

```typescript
const redisHealthPromise = (async () => {
  if (!redisConfig?.host) {
    return {
      component: 'redis',
      healthy: true, // 未配置时跳过检查
      skipped: true,
      message: 'Redis not configured, skipping check'
    };
  }

  try {
    const { Redis } = await import('ioredis');
    const redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port || 6379,
      ...(redisConfig.password ? { password: redisConfig.password } : {}),
      connectTimeout: 5000,
      lazyConnect: true
    });

    const startTime = Date.now();
    await redis.ping();
    const responseTime = Date.now() - startTime;
    
    await redis.disconnect();
    
    return {
      component: 'redis',
      healthy: true,
      responseTime,
      host: redisConfig.host,
      port: redisConfig.port || 6379
    };
  } catch (error) {
    return {
      component: 'redis',
      healthy: false,
      error: error instanceof Error ? error.message : 'Redis check failed',
      host: redisConfig.host,
      port: redisConfig.port || 6379
    };
  }
})();
```

### 3. 微服务健康检查

保持原有的动态服务发现和健康检查逻辑：

```typescript
const createServiceHealthCheck = (
  serviceName: string,
  serviceConfig: GatewayServicesList[0]['config']
) => {
  // 构建健康检查 URL
  const baseUrl = serviceConfig.upstream.replace(/\/$/, '');
  const healthPath = serviceConfig.healthCheck?.url || '/health';
  const healthUrl = `${baseUrl}${healthPath}`;
  
  // 智能超时配置
  const timeout = serviceConfig.healthCheck?.timeout || 
                 Math.min(serviceConfig.timeout || 30000, 10000);
  
  // 期望状态码
  const expectedStatus = serviceConfig.healthCheck?.expectedStatus || 200;
  
  // 执行健康检查...
};
```

## 配置集成

### 在 stratix.config.ts 中的使用

```typescript
export default (sensitiveConfig: Record<string, any> = {}): StratixConfig => {
  const redisConfig = sensitiveConfig.redis || {};
  const services: GatewayServicesList = /* 服务配置 */;

  return {
    // ... 其他配置
    plugins: [
      {
        name: 'under-pressure',
        plugin: underPressure,
        options: {
          // ... 其他选项
          healthCheck: healthCheck(services, redisConfig)
        }
      }
    ]
  };
};
```

## 健康检查结果结构

### 统一的结果格式

```typescript
interface HealthCheckResult {
  component: 'database' | 'redis' | 'service';
  name?: string;           // 服务名称（仅服务组件）
  healthy: boolean;        // 健康状态
  responseTime?: number;   // 响应时间（毫秒）
  error?: string;          // 错误信息
  details?: any;           // 详细信息
  skipped?: boolean;       // 是否跳过检查
  message?: string;        // 附加消息
}
```

### 日志输出示例

```json
{
  "database": {
    "healthy": true,
    "details": { "component": "database", "healthy": true }
  },
  "redis": {
    "healthy": true,
    "details": { 
      "component": "redis", 
      "healthy": true, 
      "responseTime": 15,
      "host": "localhost",
      "port": 6379
    }
  },
  "services": [
    {
      "component": "service",
      "name": "workflows",
      "healthy": true,
      "statusCode": 200,
      "responseTime": 45,
      "url": "http://localhost:3001/health"
    }
  ],
  "overall": { "healthy": true },
  "summary": {
    "total": 3,
    "healthy": 3,
    "unhealthy": 0
  }
}
```

## Redis配置示例

### 基础配置

```json
{
  "redis": {
    "host": "localhost",
    "port": 6379
  }
}
```

### 带认证的配置

```json
{
  "redis": {
    "host": "redis.example.com",
    "port": 6379,
    "password": "your-redis-password"
  }
}
```

### 跳过Redis检查

```json
{
  "redis": {}
}
```

或者不提供redis配置，健康检查会自动跳过Redis检查。

## 错误处理策略

### 1. 组件级错误隔离

- 每个组件（数据库、Redis、微服务）的检查都是独立的
- 单个组件失败不影响其他组件的检查
- 使用 `Promise.allSettled` 确保所有检查都能完成

### 2. 超时控制

- Redis连接超时：5秒
- 微服务健康检查超时：最大10秒（可配置）
- 使用 `AbortController` 正确处理超时

### 3. 资源清理

- Redis连接在检查完成后立即断开
- HTTP请求超时时正确取消
- 定时器及时清理

## 性能优化

### 1. 并发执行

```typescript
const allHealthChecks = [
  databaseHealthPromise,
  redisHealthPromise,
  ...serviceHealthChecks
];

const allCheckResults = await Promise.allSettled(allHealthChecks);
```

### 2. 连接复用

- Redis使用 `lazyConnect: true` 避免不必要的连接
- 微服务检查复用HTTP连接池

### 3. 智能跳过

- Redis未配置时自动跳过检查
- 减少不必要的网络请求

## 测试和调试

### 1. 单元测试支持

重构后的函数更容易进行单元测试：

```typescript
import { healthCheck } from './stratix.config.js';

describe('Health Check', () => {
  it('should check all components', async () => {
    const mockFastify = /* mock fastify instance */;
    const services = /* test services */;
    const redisConfig = /* test redis config */;
    
    const result = await healthCheck(services, redisConfig)(mockFastify);
    expect(result).toBe(true);
  });
});
```

### 2. 调试日志

详细的调试日志帮助排查问题：

```typescript
fastifyInstance.log.debug('Health check completed', {
  database: { healthy: databaseHealthy, details: databaseResult },
  redis: { healthy: redisHealthy, details: redisResult },
  services: serviceResults,
  overall: { healthy: overallHealthy },
  summary: {
    total: healthResults.length,
    healthy: healthResults.filter(r => r.healthy).length,
    unhealthy: healthResults.filter(r => !r.healthy).length
  }
});
```

## 总结

重构后的健康检查功能提供了：

- ✅ **模块化设计**：独立函数，易于测试和维护
- ✅ **完整的组件覆盖**：数据库 + Redis + 微服务
- ✅ **智能配置处理**：Redis可选，服务动态发现
- ✅ **健壮的错误处理**：组件隔离，超时控制
- ✅ **高性能执行**：并发检查，资源优化
- ✅ **详细的可观测性**：结构化日志，调试信息
- ✅ **类型安全**：完整的TypeScript支持

这个重构大大提高了代码的可维护性和可扩展性，为未来添加更多健康检查组件奠定了良好的基础。
