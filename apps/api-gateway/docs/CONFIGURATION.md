# API网关配置指南

本文档详细说明了 Stratix API 网关的配置管理系统，包括环境变量设置、配置验证和最佳实践。

## 配置架构

网关采用统一的配置管理系统，所有配置都通过环境变量读取，并提供类型安全的验证机制。

### 核心配置函数

```typescript
import { getValidatedConfig } from './utils/authUtils.js';

// 获取并验证配置
const { config, validation } = getValidatedConfig();

if (!validation.valid) {
  console.error('配置验证失败:', validation.errors);
  process.exit(1);
}
```

## 环境变量配置

### 服务器配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `PORT` | `8090` | 服务器监听端口 |
| `HOST` | `0.0.0.0` | 服务器监听地址 |
| `NODE_ENV` | `development` | 运行环境 |
| `GATEWAY_VERSION` | `1.0.0` | 网关版本号 |

### 数据库配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `DB_HOST` | `120.46.26.206` | 数据库主机地址 |
| `DB_PORT` | `3306` | 数据库端口 |
| `DB_NAME` | `syncdb` | 数据库名称 |
| `DB_USER` | `sync_user` | 数据库用户名 |
| `DB_PASSWORD` | `XtbF&anPR8(zzsL3QY2` | 数据库密码 |

### JWT 认证配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `JWT_SECRET` | `fallback-secret-key` | JWT 签名密钥（生产环境必须设置，同时用于Cookie签名） |
| `TOKEN_EXPIRY` | `1h` | Token 过期时间 |
| `REFRESH_TOKEN_EXPIRY` | `7d` | 刷新 Token 过期时间 |
| `COOKIE_NAME` | `wps_jwt_token` | Cookie 名称 |

### Cookie 配置

Cookie功能基于 `@fastify/cookie` 插件实现，支持以下特性：

- **自动解析**: 在 `onRequest` 钩子中自动解析请求中的Cookie
- **签名支持**: 使用JWT_SECRET对Cookie进行签名，防止篡改
- **安全选项**: 支持 `httpOnly`、`secure`、`sameSite` 等安全选项
- **过期管理**: 支持设置Cookie的过期时间和最大存活时间

**Cookie安全配置**：
- 生产环境自动启用 `secure` 属性（仅HTTPS传输）
- 默认启用 `httpOnly` 属性（防止XSS攻击）
- 使用 `sameSite=lax` 属性（防止CSRF攻击）
- 启用 `signed=true` 属性（防止cookie篡改）

**Secret密钥要求**：
- 最小长度：32字符（推荐64字符以上）
- 必须包含随机字符，避免使用简单密码
- 生产环境必须使用环境变量配置
- 用于HMAC-SHA256签名算法
- 默认值仅供开发测试使用
| `AUTH_ENABLED` | `true` | 是否启用认证 |

### WPS API 配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `WPS_API_BASE_URL` | `https://openapi.wps.cn` | WPS API 基础地址 |
| `WPS_CLIENT_ID` | `AK20250614WBSGPX` | WPS 客户端 ID |
| `WPS_CLIENT_SECRET` | `8f36473839cc5c5c30bb9a0b5b2167d7` | WPS 客户端密钥 |
| `WPS_REDIRECT_URI` | `http://localhost:3000/api/auth/authorization` | OAuth 回调地址 |

### 后端服务配置

#### Tasks 服务

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `TASKS_SERVICE_PROTOCOL` | `http` | 协议类型 |
| `TASKS_SERVICE_HOST` | `localhost` | 服务主机 |
| `TASKS_SERVICE_PORT` | `3001` | 服务端口 |
| `TASKS_SERVICE_TIMEOUT` | `30000` | 超时时间（毫秒） |
| `TASKS_SERVICE_RETRIES` | `3` | 重试次数 |

#### Users 服务

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `USER_SERVICE_PROTOCOL` | `http` | 协议类型 |
| `USER_SERVICE_HOST` | `localhost` | 服务主机 |
| `USER_SERVICE_PORT` | `3002` | 服务端口 |
| `USER_SERVICE_TIMEOUT` | `30000` | 超时时间（毫秒） |
| `USER_SERVICE_RETRIES` | `3` | 重试次数 |

### Redis 配置（可选）

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `REDIS_HOST` | - | Redis 主机地址 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | - | Redis 密码 |

### 限流配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `GLOBAL_RATE_LIMIT` | `10000` | 全局限流最大请求数 |
| `GLOBAL_RATE_WINDOW` | `1 minute` | 限流时间窗口 |

### CORS 配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `CORS_ORIGIN` | - | 允许的源地址（逗号分隔） |

## 配置验证

系统会自动验证配置的有效性，包括：

### 错误检查（阻止启动）

- 生产环境必须设置自定义的 `JWT_SECRET`
- 数据库密码不能为空
- 端口范围必须在 1-65535 之间

### 警告检查（不阻止启动）

- 开发环境使用默认 JWT 密钥
- 生产环境使用默认 WPS API 凭据
- 服务超时时间过低（< 1秒）

## 使用示例

### 基本配置

```bash
# .env 文件
NODE_ENV=production
PORT=8090
HOST=0.0.0.0

# 数据库配置
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=your-database
DB_USER=your-username
DB_PASSWORD=your-password

# JWT 配置（生产环境必须设置）
JWT_SECRET=your-super-secret-jwt-key
TOKEN_EXPIRY=2h
COOKIE_NAME=app_token

# WPS API 配置
WPS_CLIENT_ID=your-wps-client-id
WPS_CLIENT_SECRET=your-wps-client-secret
WPS_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

### Docker 环境

```yaml
# docker-compose.yml
version: '3.8'
services:
  api-gateway:
    image: stratix-gateway:latest
    environment:
      - NODE_ENV=production
      - PORT=8090
      - JWT_SECRET=${JWT_SECRET}
      - DB_HOST=${DB_HOST}
      - DB_PASSWORD=${DB_PASSWORD}
      - WPS_CLIENT_ID=${WPS_CLIENT_ID}
      - WPS_CLIENT_SECRET=${WPS_CLIENT_SECRET}
    ports:
      - "8090:8090"
```

### Kubernetes 配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-config
data:
  NODE_ENV: "production"
  PORT: "8090"
  HOST: "0.0.0.0"
  DB_HOST: "mysql-service"
  DB_PORT: "3306"
  DB_NAME: "gateway_db"
---
apiVersion: v1
kind: Secret
metadata:
  name: gateway-secrets
type: Opaque
stringData:
  JWT_SECRET: "your-jwt-secret"
  DB_PASSWORD: "your-db-password"
  WPS_CLIENT_SECRET: "your-wps-secret"
```

## 最佳实践

### 安全性

1. **生产环境必须设置自定义密钥**
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **使用环境变量管理敏感信息**
   - 不要在代码中硬编码密钥
   - 使用 `.env` 文件进行本地开发
   - 生产环境使用容器编排工具的密钥管理

3. **定期轮换密钥**
   - JWT 密钥应定期更换
   - 数据库密码应定期更新

### 性能优化

1. **合理设置超时时间**
   ```bash
   TASKS_SERVICE_TIMEOUT=30000  # 30秒
   USER_SERVICE_TIMEOUT=15000   # 15秒
   ```

2. **配置适当的重试次数**
   ```bash
   TASKS_SERVICE_RETRIES=3
   USER_SERVICE_RETRIES=2
   ```

3. **启用 Redis 缓存**
   ```bash
   REDIS_HOST=redis-cluster
   REDIS_PORT=6379
   ```

### 监控配置

1. **启用详细日志**
   ```bash
   NODE_ENV=production  # 自动优化日志级别
   ```

2. **配置健康检查**
   - 网关自动提供 `/health` 和 `/status` 端点
   - 配置负载均衡器使用这些端点进行健康检查

## 故障排除

### 常见配置错误

1. **JWT_SECRET 未设置**
   ```
   错误: JWT_SECRET must be set in production environment
   解决: 设置 JWT_SECRET 环境变量
   ```

2. **数据库连接失败**
   ```
   错误: Database password is required
   解决: 检查 DB_PASSWORD 环境变量
   ```

3. **端口冲突**
   ```
   错误: Invalid server port: 99999
   解决: 设置有效的端口范围 (1-65535)
   ```

### 配置验证

使用内置的配置验证功能：

```typescript
import { getValidatedConfig } from './utils/authUtils.js';

const { config, validation } = getValidatedConfig();

console.log('配置验证结果:');
console.log('有效:', validation.valid);
console.log('错误:', validation.errors);
console.log('警告:', validation.warnings);
```

## 相关文档

- [部署指南](./DEPLOYMENT.md)
- [监控指南](./MONITORING.md)
- [API 文档](./API.md)
