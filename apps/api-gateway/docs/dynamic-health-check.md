# 动态健康检查功能文档

## 概述

本次改进将 API 网关的健康检查功能从硬编码的服务列表改为基于配置的动态健康检查，能够自动检查所有在 `services` 配置中定义的转发服务的健康状态。

## 功能特性

### 1. 动态服务发现
- 自动读取 `services` 配置数组中的所有服务
- 无需手动维护健康检查的服务列表
- 新增服务时自动包含在健康检查中

### 2. 智能配置优先级
健康检查参数按以下优先级使用：
1. **健康检查专用配置** (`serviceConfig.healthCheck.*`)
2. **服务通用配置** (`serviceConfig.timeout` 等)
3. **系统默认值**

### 3. 完善的错误处理
- 单个服务失败不影响其他服务的检查
- 使用 `Promise.allSettled` 确保所有检查都能完成
- 详细的错误信息记录和调试日志

### 4. 类型安全
- 使用 `GatewayServicesList` 类型确保类型安全
- 完整的 TypeScript 类型推导和检查

## 实现细节

### 健康检查流程

```typescript
// 1. 检查数据库连接
const databaseApi = fastifyInstance.diContainer.resolve('databaseApi');
const dbres = await databaseApi.healthCheck();

// 2. 动态创建服务健康检查
const serviceHealthChecks = services.map(({ name, config }) =>
  createServiceHealthCheck(name, config)
);

// 3. 并发执行所有检查
const serviceCheckResults = await Promise.allSettled(serviceHealthChecks);

// 4. 计算整体健康状态
const overallHealthy = databaseHealthy && allServicesHealthy;
```

### 配置参数优先级

#### 超时时间 (timeout)
```typescript
const timeout = serviceConfig.healthCheck?.timeout ||           // 1. 专用配置
               Math.min(serviceConfig.timeout || 30000, 10000); // 2. 通用配置（最大10秒）
```

#### 健康检查 URL
```typescript
const healthPath = serviceConfig.healthCheck?.url || '/health'; // 默认 /health
const healthUrl = `${baseUrl}${healthPath}`;
```

#### 期望状态码
```typescript
const expectedStatus = serviceConfig.healthCheck?.expectedStatus || 200; // 默认 200
```

#### 自定义请求头
```typescript
headers: {
  'User-Agent': 'Stratix-Gateway-HealthCheck/1.0',
  'Accept': 'application/json',
  ...serviceConfig.healthCheck?.headers  // 合并自定义头部
}
```

### 返回结果结构

每个服务的健康检查结果包含：

```typescript
interface ServiceHealthResult {
  name: string;                    // 服务名称
  status: 'healthy' | 'unhealthy'; // 健康状态
  statusCode?: number;             // HTTP 状态码
  responseTime: number;            // 响应时间（毫秒）
  url: string;                     // 健康检查 URL
  expectedStatus?: number;         // 期望的状态码
  upstream: string;                // 上游服务地址
  error?: string;                  // 错误信息（如果有）
}
```

## 配置示例

### 基础配置
```typescript
const services: GatewayServicesList = [
  {
    name: 'workflows',
    config: {
      name: 'workflows',
      upstream: 'http://localhost:3001',
      prefix: '/api/workflows',
      requireAuth: true,
      timeout: 30000,
      // 使用默认健康检查：GET /health，期望 200 状态码
    }
  }
];
```

### 自定义健康检查配置
```typescript
const services: GatewayServicesList = [
  {
    name: 'users',
    config: {
      name: 'users',
      upstream: 'http://localhost:3002',
      prefix: '/api/users',
      requireAuth: true,
      timeout: 30000,
      healthCheck: {
        url: '/api/health',           // 自定义健康检查路径
        timeout: 5000,               // 自定义超时时间
        expectedStatus: 200,         // 期望状态码
        headers: {                   // 自定义请求头
          'X-Health-Check': 'gateway'
        }
      }
    }
  }
];
```

## 日志和监控

### 调试日志
健康检查完成后会记录详细的调试信息：

```typescript
fastifyInstance.log.debug('Health check completed', {
  database: { healthy: databaseHealthy },
  services: serviceResults,
  overall: { healthy: overallHealthy }
});
```

### 错误日志
当健康检查发生异常时会记录错误：

```typescript
fastifyInstance.log.error('Health check failed with exception', {
  error: error.message,
  stack: error.stack
});
```

## 性能优化

### 1. 并发执行
- 所有服务健康检查并发执行，不是串行
- 使用 `Promise.allSettled` 确保最快的响应时间

### 2. 超时控制
- 健康检查超时时间最大限制为 10 秒
- 防止健康检查阻塞过长时间

### 3. 资源清理
- 使用 `AbortController` 确保超时时正确取消请求
- 及时清理定时器避免内存泄漏

## 错误处理策略

### 1. 服务级错误
- 单个服务失败不影响其他服务检查
- 记录详细的错误信息用于调试

### 2. 系统级错误
- 整个健康检查函数异常时返回 `false`
- 记录完整的错误堆栈信息

### 3. 网络错误
- 处理连接超时、连接拒绝等网络问题
- 提供有意义的错误消息

## 与 under-pressure 插件集成

健康检查函数返回布尔值，符合 `@fastify/under-pressure` 插件的要求：
- `true`：所有检查通过（数据库 + 所有服务）
- `false`：任何检查失败

## 使用建议

### 1. 服务健康检查端点
确保每个微服务都提供健康检查端点：
```typescript
// 微服务中的健康检查端点示例
app.get('/health', async (request, reply) => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});
```

### 2. 监控告警
基于健康检查结果设置监控告警：
- 单个服务持续失败
- 整体健康状态异常
- 响应时间过长

### 3. 配置调优
根据实际情况调整配置：
- 合理设置超时时间
- 根据服务特性自定义健康检查路径
- 配置适当的重试策略

## 总结

动态健康检查功能提供了：
- ✅ 自动化的服务发现和健康检查
- ✅ 灵活的配置优先级机制
- ✅ 完善的错误处理和日志记录
- ✅ 类型安全的实现
- ✅ 高性能的并发执行
- ✅ 与现有系统的无缝集成

这个实现大大简化了网关的维护工作，提高了系统的可观测性和可靠性。
