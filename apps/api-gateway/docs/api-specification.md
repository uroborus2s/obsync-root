# Stratix API Gateway 接口规范文档

## 1. 概述

本文档定义了 Stratix API Gateway 的管理接口规范，包括路由管理、认证配置、监控数据、健康检查等核心 API。所有 API 遵循 RESTful 设计原则，使用 JSON 格式进行数据交换。

### 1.1 基础信息

- **Base URL**: `https://gateway.example.com/admin/api/v1`
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`
- **字符编码**: UTF-8

### 1.2 通用响应格式

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

### 1.3 错误码规范

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| `INVALID_REQUEST` | 400 | 请求参数无效 |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突 |
| `RATE_LIMITED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 内部服务器错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |

## 2. 路由管理 API

### 2.1 获取路由列表

```http
GET /routes
```

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20, 最大: 100)
- `status`: 路由状态 (`active`, `inactive`, `all`)
- `search`: 搜索关键词

**响应示例:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "route-001",
        "name": "用户服务路由",
        "path": "/api/users/*",
        "method": ["GET", "POST", "PUT", "DELETE"],
        "upstream": {
          "type": "service_discovery",
          "serviceName": "user-service",
          "loadBalancer": "round_robin"
        },
        "plugins": ["auth", "rate-limit"],
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 2.2 创建路由

```http
POST /routes
```

**请求体:**
```json
{
  "name": "订单服务路由",
  "path": "/api/orders/*",
  "method": ["GET", "POST"],
  "upstream": {
    "type": "static",
    "targets": [
      {
        "url": "http://order-service-1:3000",
        "weight": 100
      },
      {
        "url": "http://order-service-2:3000",
        "weight": 100
      }
    ],
    "loadBalancer": "weighted_round_robin"
  },
  "plugins": ["auth", "rate-limit"],
  "config": {
    "timeout": 30000,
    "retries": 3
  }
}
```

### 2.3 更新路由

```http
PUT /routes/{routeId}
```

### 2.4 删除路由

```http
DELETE /routes/{routeId}
```

### 2.5 获取路由详情

```http
GET /routes/{routeId}
```

## 3. 服务管理 API

### 3.1 获取服务列表

```http
GET /services
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "service-001",
        "name": "user-service",
        "description": "用户管理服务",
        "instances": [
          {
            "id": "instance-001",
            "url": "http://user-service-1:3000",
            "status": "healthy",
            "weight": 100,
            "lastHealthCheck": "2024-01-01T00:00:00Z"
          }
        ],
        "healthCheck": {
          "path": "/health",
          "interval": 30,
          "timeout": 5,
          "retries": 3
        }
      }
    ]
  }
}
```

### 3.2 注册服务

```http
POST /services
```

### 3.3 更新服务

```http
PUT /services/{serviceId}
```

### 3.4 注销服务

```http
DELETE /services/{serviceId}
```

## 4. 认证配置 API

### 4.1 获取认证配置

```http
GET /auth/config
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "oauth2": {
      "enabled": true,
      "provider": "wps",
      "clientId": "your-client-id",
      "authUrl": "https://auth.wps.com/oauth2/authorize",
      "tokenUrl": "https://auth.wps.com/oauth2/token",
      "userInfoUrl": "https://auth.wps.com/oauth2/userinfo",
      "scopes": ["read", "write"]
    },
    "jwt": {
      "enabled": true,
      "algorithm": "RS256",
      "publicKey": "-----BEGIN PUBLIC KEY-----...",
      "issuer": "wps-gateway",
      "audience": "api-gateway"
    }
  }
}
```

### 4.2 更新认证配置

```http
PUT /auth/config
```

### 4.3 获取用户权限

```http
GET /auth/permissions/{userId}
```

### 4.4 更新用户权限

```http
PUT /auth/permissions/{userId}
```

## 5. 限流配置 API

### 5.1 获取限流规则

```http
GET /rate-limits
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": "rule-001",
        "name": "API 全局限流",
        "type": "global",
        "limit": 1000,
        "window": "1m",
        "key": "ip",
        "status": "active"
      },
      {
        "id": "rule-002",
        "name": "用户 API 限流",
        "type": "route",
        "routeId": "route-001",
        "limit": 100,
        "window": "1m",
        "key": "user_id",
        "status": "active"
      }
    ]
  }
}
```

### 5.2 创建限流规则

```http
POST /rate-limits
```

### 5.3 更新限流规则

```http
PUT /rate-limits/{ruleId}
```

### 5.4 删除限流规则

```http
DELETE /rate-limits/{ruleId}
```

## 6. 监控数据 API

### 6.1 获取实时指标

```http
GET /metrics/realtime
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T00:00:00Z",
    "metrics": {
      "requests": {
        "total": 1000,
        "success": 950,
        "error": 50,
        "rps": 16.67
      },
      "latency": {
        "p50": 50,
        "p90": 100,
        "p95": 150,
        "p99": 300
      },
      "system": {
        "cpu": 45.5,
        "memory": 67.8,
        "connections": 234
      }
    }
  }
}
```

### 6.2 获取历史指标

```http
GET /metrics/history
```

**查询参数:**
- `start`: 开始时间 (ISO 8601)
- `end`: 结束时间 (ISO 8601)
- `interval`: 聚合间隔 (`1m`, `5m`, `1h`, `1d`)
- `metrics`: 指标类型 (逗号分隔)

### 6.3 获取错误日志

```http
GET /logs/errors
```

### 6.4 获取访问日志

```http
GET /logs/access
```

## 7. 健康检查 API

### 7.1 网关健康检查

```http
GET /health
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "uptime": 86400,
    "checks": {
      "database": "healthy",
      "redis": "healthy",
      "consul": "healthy"
    }
  }
}
```

### 7.2 详细健康检查

```http
GET /health/detailed
```

### 7.3 就绪检查

```http
GET /ready
```

### 7.4 存活检查

```http
GET /alive
```

## 8. 配置管理 API

### 8.1 获取网关配置

```http
GET /config
```

### 8.2 更新网关配置

```http
PUT /config
```

### 8.3 重载配置

```http
POST /config/reload
```

### 8.4 导出配置

```http
GET /config/export
```

### 8.5 导入配置

```http
POST /config/import
```

## 9. 插件管理 API

### 9.1 获取插件列表

```http
GET /plugins
```

### 9.2 启用插件

```http
POST /plugins/{pluginName}/enable
```

### 9.3 禁用插件

```http
POST /plugins/{pluginName}/disable
```

### 9.4 获取插件配置

```http
GET /plugins/{pluginName}/config
```

### 9.5 更新插件配置

```http
PUT /plugins/{pluginName}/config
```

## 10. 缓存管理 API

### 10.1 获取缓存统计

```http
GET /cache/stats
```

### 10.2 清空缓存

```http
DELETE /cache
```

### 10.3 清空指定缓存

```http
DELETE /cache/{key}
```

## 11. 证书管理 API

### 11.1 获取证书列表

```http
GET /certificates
```

### 11.2 上传证书

```http
POST /certificates
```

### 11.3 更新证书

```http
PUT /certificates/{certId}
```

### 11.4 删除证书

```http
DELETE /certificates/{certId}
```

## 12. 数据类型定义

### 12.1 路由类型

```typescript
interface Route {
  id: string;
  name: string;
  path: string;
  method: HttpMethod[];
  upstream: Upstream;
  plugins: string[];
  config?: RouteConfig;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface Upstream {
  type: 'static' | 'service_discovery';
  serviceName?: string;
  targets?: Target[];
  loadBalancer: LoadBalancerType;
}

interface Target {
  url: string;
  weight: number;
  status?: 'healthy' | 'unhealthy';
}

type LoadBalancerType = 
  | 'round_robin' 
  | 'weighted_round_robin' 
  | 'least_connections' 
  | 'ip_hash';

type HttpMethod = 
  | 'GET' 
  | 'POST' 
  | 'PUT' 
  | 'DELETE' 
  | 'PATCH' 
  | 'HEAD' 
  | 'OPTIONS';
```

### 12.2 服务类型

```typescript
interface Service {
  id: string;
  name: string;
  description?: string;
  instances: ServiceInstance[];
  healthCheck: HealthCheck;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface ServiceInstance {
  id: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  weight: number;
  lastHealthCheck: string;
  metadata?: Record<string, any>;
}

interface HealthCheck {
  path: string;
  interval: number;
  timeout: number;
  retries: number;
  expectedStatus?: number[];
}
```

### 12.3 限流规则类型

```typescript
interface RateLimitRule {
  id: string;
  name: string;
  type: 'global' | 'route' | 'user';
  routeId?: string;
  limit: number;
  window: string;
  key: 'ip' | 'user_id' | 'api_key';
  status: 'active' | 'inactive';
  whitelist?: string[];
  blacklist?: string[];
}
```
