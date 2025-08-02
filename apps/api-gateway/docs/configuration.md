# Stratix API Gateway 配置说明文档

## 1. 概述

本文档详细说明了 Stratix API Gateway 的配置系统，包括配置文件格式、环境变量、插件配置等。配置系统基于 Stratix 框架的配置管理机制，支持多环境配置、配置加密、热重载等特性。

### 1.1 配置层次结构

```
配置优先级 (高到低):
1. 命令行参数
2. 环境变量
3. 配置文件 (.env.local, .env.{NODE_ENV})
4. 默认配置 (stratix.config.ts)
```

### 1.2 配置文件类型

- **主配置文件**: `stratix.config.ts` - TypeScript 配置文件
- **环境配置**: `.env`, `.env.local`, `.env.{NODE_ENV}` - 环境变量文件
- **加密配置**: `config.encrypted.json` - 敏感信息加密存储
- **运行时配置**: 通过 API 动态更新的配置

## 2. 主配置文件 (stratix.config.ts)

### 2.1 基础结构

```typescript
import type { StratixConfig } from '@stratix/core';

export default function createConfig(): StratixConfig {
  return {
    // 应用基础信息
    name: 'api-gateway',
    version: '1.0.0',
    description: 'Stratix API Gateway',
    
    // 服务器配置
    server: {
      host: '0.0.0.0',
      port: 3000,
      logger: {
        level: 'info',
        prettyPrint: process.env.NODE_ENV !== 'production'
      }
    },
    
    // 插件配置
    plugins: [
      // 插件配置数组
    ],
    
    // 自定义配置
    gateway: {
      // 网关特定配置
    }
  };
}
```

### 2.2 服务器配置

```typescript
interface ServerConfig {
  // 网络配置
  host: string;                    // 监听地址，默认 '0.0.0.0'
  port: number;                    // 监听端口，默认 3000
  backlog?: number;                // TCP backlog，默认 511
  
  // HTTPS 配置
  https?: {
    key: string | Buffer;          // 私钥文件路径或内容
    cert: string | Buffer;         // 证书文件路径或内容
    ca?: string | Buffer;          // CA 证书
    passphrase?: string;           // 私钥密码
  };
  
  // HTTP/2 配置
  http2?: boolean;                 // 是否启用 HTTP/2
  
  // 日志配置
  logger: {
    level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    prettyPrint?: boolean;         // 是否美化输出
    file?: string;                 // 日志文件路径
    redact?: string[];             // 需要脱敏的字段
  };
  
  // 请求配置
  bodyLimit?: number;              // 请求体大小限制，默认 1MB
  keepAliveTimeout?: number;       // Keep-Alive 超时时间
  connectionTimeout?: number;      // 连接超时时间
  
  // 安全配置
  trustProxy?: boolean | string;   // 信任代理配置
  disableRequestLogging?: boolean; // 禁用请求日志
}
```

### 2.3 网关特定配置

```typescript
interface GatewayConfig {
  // 路由配置
  routing: {
    caseSensitive?: boolean;       // 路由大小写敏感
    ignoreTrailingSlash?: boolean; // 忽略尾部斜杠
    maxParamLength?: number;       // 参数最大长度
  };
  
  // 代理配置
  proxy: {
    timeout?: number;              // 代理超时时间
    retries?: number;              // 重试次数
    keepAlive?: boolean;           // 保持连接
    maxSockets?: number;           // 最大连接数
  };
  
  // 缓存配置
  cache: {
    enabled: boolean;              // 是否启用缓存
    ttl: number;                   // 默认 TTL
    maxSize: number;               // 最大缓存大小
    redis?: {
      url: string;                 // Redis 连接 URL
      keyPrefix: string;           // 键前缀
    };
  };
  
  // 服务发现配置
  discovery: {
    enabled: boolean;              // 是否启用服务发现
    provider: 'consul' | 'etcd' | 'kubernetes';
    consul?: {
      host: string;
      port: number;
      datacenter?: string;
    };
    etcd?: {
      hosts: string[];
    };
    kubernetes?: {
      namespace: string;
    };
  };
  
  // 监控配置
  monitoring: {
    enabled: boolean;              // 是否启用监控
    metricsPath: string;           // 指标端点路径
    healthPath: string;            // 健康检查路径
    prometheus?: {
      enabled: boolean;
      prefix: string;
    };
  };
}
```

## 3. 环境变量配置

### 3.1 基础环境变量

```bash
# 应用环境
NODE_ENV=production              # 运行环境: development, production, test
PORT=3000                        # 服务端口
HOST=0.0.0.0                     # 监听地址

# 日志配置
LOG_LEVEL=info                   # 日志级别
LOG_FILE=/var/log/gateway.log    # 日志文件路径

# 安全配置
TRUST_PROXY=true                 # 信任代理
BODY_LIMIT=1048576              # 请求体大小限制 (字节)
```

### 3.2 OAuth2 认证配置

```bash
# WPS OAuth2 配置
WPS_CLIENT_ID=your-client-id                    # WPS 客户端 ID
WPS_CLIENT_SECRET=your-client-secret            # WPS 客户端密钥
WPS_AUTH_URL=https://auth.wps.com/oauth2/authorize    # 授权端点
WPS_TOKEN_URL=https://auth.wps.com/oauth2/token       # 令牌端点
WPS_USERINFO_URL=https://auth.wps.com/oauth2/userinfo # 用户信息端点
WPS_JWKS_URL=https://auth.wps.com/.well-known/jwks.json # JWKS 端点
WPS_SCOPE=read,write,profile                    # 权限范围
WPS_REDIRECT_URI=https://gateway.example.com/auth/callback # 回调地址

# JWT 配置
JWT_SECRET=your-jwt-secret                      # JWT 密钥
JWT_EXPIRES_IN=3600                            # JWT 过期时间 (秒)
JWT_ALGORITHM=RS256                            # JWT 算法
```

### 3.3 数据库和缓存配置

```bash
# Redis 配置
REDIS_URL=redis://localhost:6379               # Redis 连接 URL
REDIS_PASSWORD=your-redis-password             # Redis 密码
REDIS_DB=0                                     # Redis 数据库编号
REDIS_KEY_PREFIX=gateway:                      # 键前缀
REDIS_CONNECT_TIMEOUT=5000                     # 连接超时时间
REDIS_COMMAND_TIMEOUT=3000                     # 命令超时时间

# 数据库配置 (可选)
DATABASE_URL=postgresql://user:pass@localhost:5432/gateway # 数据库连接 URL
DATABASE_POOL_MIN=2                            # 连接池最小连接数
DATABASE_POOL_MAX=10                           # 连接池最大连接数
```

### 3.4 服务发现配置

```bash
# Consul 配置
CONSUL_HOST=localhost                          # Consul 主机
CONSUL_PORT=8500                              # Consul 端口
CONSUL_DATACENTER=dc1                         # 数据中心
CONSUL_TOKEN=your-consul-token                # Consul 令牌

# etcd 配置
ETCD_HOSTS=localhost:2379                     # etcd 主机列表
ETCD_USERNAME=your-etcd-username              # etcd 用户名
ETCD_PASSWORD=your-etcd-password              # etcd 密码

# Kubernetes 配置
K8S_NAMESPACE=default                         # Kubernetes 命名空间
K8S_SERVICE_ACCOUNT=/var/run/secrets/kubernetes.io/serviceaccount # 服务账户路径
```

### 3.5 监控和日志配置

```bash
# Prometheus 配置
PROMETHEUS_ENABLED=true                       # 是否启用 Prometheus
PROMETHEUS_PREFIX=gateway_                    # 指标前缀
PROMETHEUS_PORT=9090                          # Prometheus 端口

# 链路追踪配置
JAEGER_ENABLED=true                          # 是否启用 Jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces # Jaeger 端点
JAEGER_SERVICE_NAME=api-gateway              # 服务名称

# 日志聚合配置
ELASTICSEARCH_URL=http://localhost:9200      # Elasticsearch URL
LOGSTASH_HOST=localhost                      # Logstash 主机
LOGSTASH_PORT=5044                          # Logstash 端口
```

## 4. 插件配置

### 4.1 OAuth2 认证插件

```typescript
// OAuth2 认证插件配置
['@stratix/oauth2-auth', {
  wps: {
    clientId: process.env.WPS_CLIENT_ID,
    clientSecret: process.env.WPS_CLIENT_SECRET,
    authorizationUrl: process.env.WPS_AUTH_URL,
    tokenUrl: process.env.WPS_TOKEN_URL,
    userInfoUrl: process.env.WPS_USERINFO_URL,
    jwksUrl: process.env.WPS_JWKS_URL,
    scope: process.env.WPS_SCOPE?.split(',') || ['read'],
    redirectUri: process.env.WPS_REDIRECT_URI,
    
    // 缓存配置
    tokenCacheTtl: 3600,           // Token 缓存时间
    userInfoCacheTtl: 1800,        // 用户信息缓存时间
    
    // 安全配置
    state: true,                   // 启用 state 参数
    pkce: true,                    // 启用 PKCE
    
    // 自定义配置
    customClaims: ['roles', 'permissions'], // 自定义声明
    roleMapping: {                 // 角色映射
      'wps:admin': 'admin',
      'wps:user': 'user'
    }
  }
}]
```

### 4.2 HTTP 代理插件

```typescript
// HTTP 代理插件配置
['@fastify/http-proxy', {
  upstream: process.env.UPSTREAM_URL || 'http://localhost:4000',
  prefix: '/api/v1',
  
  // 代理配置
  rewritePrefix: '',               // 重写前缀
  websocket: true,                 // 支持 WebSocket
  
  // 超时配置
  timeout: 30000,                  // 请求超时
  
  // 重试配置
  retries: 3,                      // 重试次数
  retryDelay: 1000,               // 重试延迟
  
  // 负载均衡配置
  loadBalancer: 'round_robin',     // 负载均衡算法
  
  // 健康检查配置
  healthCheck: {
    path: '/health',               // 健康检查路径
    interval: 30000,               // 检查间隔
    timeout: 5000,                 // 检查超时
    retries: 3                     // 检查重试次数
  },
  
  // 请求/响应处理
  preHandler: async (request, reply) => {
    // 请求预处理
  },
  onResponse: async (request, reply, res) => {
    // 响应后处理
  }
}]
```

### 4.3 限流插件

```typescript
// 限流插件配置
['@fastify/rate-limit', {
  global: true,                    // 全局限流
  max: 100,                        // 最大请求数
  timeWindow: '1 minute',          // 时间窗口
  
  // 存储配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  
  // 键生成器
  keyGenerator: (request) => {
    return request.headers['x-forwarded-for'] || request.ip;
  },
  
  // 白名单
  allowList: ['127.0.0.1', '::1'],
  
  // 错误响应
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`
    };
  },
  
  // 回调函数
  onExceeding: (request, key) => {
    console.log(`Rate limit approaching for ${key}`);
  },
  onExceeded: (request, key) => {
    console.log(`Rate limit exceeded for ${key}`);
  }
}]
```

### 4.4 熔断插件

```typescript
// 熔断插件配置
['@fastify/circuit-breaker', {
  threshold: 5,                    // 失败阈值
  timeout: 10000,                  // 超时时间
  resetTimeout: 30000,             // 重置时间
  
  // 错误处理
  onCircuitOpen: async (req, reply) => {
    reply.statusCode = 503;
    return {
      error: 'Service Unavailable',
      message: 'Circuit breaker is open'
    };
  },
  
  onTimeout: async (req, reply) => {
    reply.statusCode = 504;
    return {
      error: 'Gateway Timeout',
      message: 'Request timeout'
    };
  }
}]
```

## 5. 配置验证

### 5.1 配置模式验证

```typescript
import Joi from 'joi';

// 配置验证模式
const configSchema = Joi.object({
  server: Joi.object({
    host: Joi.string().default('0.0.0.0'),
    port: Joi.number().port().default(3000),
    logger: Joi.object({
      level: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info')
    })
  }),
  
  gateway: Joi.object({
    cache: Joi.object({
      enabled: Joi.boolean().default(true),
      ttl: Joi.number().positive().default(3600),
      redis: Joi.object({
        url: Joi.string().uri().required()
      }).when('enabled', { is: true, then: Joi.required() })
    })
  })
});

// 验证配置
export function validateConfig(config: any) {
  const { error, value } = configSchema.validate(config, {
    allowUnknown: true,
    stripUnknown: false
  });
  
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
  
  return value;
}
```

### 5.2 环境变量验证

```typescript
import { cleanEnv, str, num, bool, url } from 'envalid';

// 环境变量验证
export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: num({ default: 3000 }),
  HOST: str({ default: '0.0.0.0' }),
  
  // OAuth2 配置
  WPS_CLIENT_ID: str(),
  WPS_CLIENT_SECRET: str(),
  WPS_AUTH_URL: url(),
  WPS_TOKEN_URL: url(),
  
  // Redis 配置
  REDIS_URL: url({ default: 'redis://localhost:6379' }),
  REDIS_PASSWORD: str({ default: '' }),
  
  // 监控配置
  PROMETHEUS_ENABLED: bool({ default: true }),
  JAEGER_ENABLED: bool({ default: false })
});
```

## 6. 配置加密

### 6.1 敏感信息加密

```bash
# 使用 Stratix CLI 加密配置
stratix config encrypt production.env

# 生成加密配置文件
stratix config generate --env production --encrypt
```

### 6.2 加密配置格式

```json
{
  "encrypted": true,
  "algorithm": "aes-256-gcm",
  "data": {
    "WPS_CLIENT_SECRET": "encrypted:eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0...",
    "REDIS_PASSWORD": "encrypted:eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0...",
    "JWT_SECRET": "encrypted:eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..."
  }
}
```

## 7. 配置热重载

### 7.1 配置监听

```typescript
// 配置文件监听
import chokidar from 'chokidar';

export class ConfigWatcher {
  private watcher: chokidar.FSWatcher;
  
  constructor(private configPath: string, private onConfigChange: (config: any) => void) {
    this.watcher = chokidar.watch(configPath, {
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('change', this.handleConfigChange.bind(this));
  }
  
  private async handleConfigChange() {
    try {
      // 重新加载配置
      delete require.cache[require.resolve(this.configPath)];
      const newConfig = require(this.configPath);
      
      // 验证配置
      const validatedConfig = validateConfig(newConfig);
      
      // 应用新配置
      this.onConfigChange(validatedConfig);
      
      console.log('Configuration reloaded successfully');
    } catch (error) {
      console.error('Failed to reload configuration:', error);
    }
  }
  
  stop() {
    this.watcher.close();
  }
}
```

### 7.2 动态配置更新

```typescript
// 通过 API 更新配置
fastify.put('/admin/config', {
  preHandler: [requireAuth, requireRole('admin')]
}, async (request, reply) => {
  const newConfig = request.body;
  
  try {
    // 验证配置
    const validatedConfig = validateConfig(newConfig);
    
    // 应用配置
    await applyConfig(validatedConfig);
    
    return { success: true, message: 'Configuration updated' };
  } catch (error) {
    return reply.code(400).send({
      error: 'INVALID_CONFIG',
      message: error.message
    });
  }
});
```

## 8. 配置最佳实践

### 8.1 安全最佳实践

1. **敏感信息加密**: 使用配置加密功能保护敏感信息
2. **环境隔离**: 不同环境使用不同的配置文件
3. **最小权限**: 只配置必要的权限和访问范围
4. **定期轮换**: 定期更新密钥和证书

### 8.2 性能最佳实践

1. **缓存配置**: 合理配置缓存 TTL 和大小
2. **连接池**: 优化数据库和 Redis 连接池配置
3. **超时设置**: 设置合理的超时时间
4. **资源限制**: 配置适当的资源限制

### 8.3 运维最佳实践

1. **配置版本控制**: 使用 Git 管理配置文件
2. **配置备份**: 定期备份重要配置
3. **配置验证**: 部署前验证配置正确性
4. **监控配置**: 监控配置变更和应用状态

## 9. 配置示例

### 9.1 开发环境完整配置

```typescript
// stratix.config.ts (开发环境)
import type { StratixConfig } from '@stratix/core';

export default function createConfig(): StratixConfig {
  return {
    name: 'api-gateway-dev',
    version: '1.0.0',
    description: 'Stratix API Gateway - Development',

    server: {
      host: '0.0.0.0',
      port: 3000,
      logger: {
        level: 'debug',
        prettyPrint: true
      }
    },

    plugins: [
      // OAuth2 认证
      ['@stratix/oauth2-auth', {
        wps: {
          clientId: process.env.WPS_CLIENT_ID,
          clientSecret: process.env.WPS_CLIENT_SECRET,
          authorizationUrl: 'https://auth-dev.wps.com/oauth2/authorize',
          tokenUrl: 'https://auth-dev.wps.com/oauth2/token',
          userInfoUrl: 'https://auth-dev.wps.com/oauth2/userinfo',
          jwksUrl: 'https://auth-dev.wps.com/.well-known/jwks.json',
          scope: ['read', 'write', 'profile'],
          redirectUri: 'http://localhost:3000/auth/callback',
          tokenCacheTtl: 3600,
          userInfoCacheTtl: 1800
        }
      }],

      // HTTP 代理
      ['@fastify/http-proxy', {
        upstream: 'http://localhost:4000',
        prefix: '/api/v1',
        websocket: true
      }],

      // 限流
      ['@fastify/rate-limit', {
        max: 1000,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip
      }],

      // 熔断
      ['@fastify/circuit-breaker', {
        threshold: 10,
        timeout: 30000,
        resetTimeout: 60000
      }],

      // CORS
      ['@fastify/cors', {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      }]
    ],

    gateway: {
      routing: {
        caseSensitive: false,
        ignoreTrailingSlash: true
      },

      cache: {
        enabled: true,
        ttl: 300,
        maxSize: 1000,
        redis: {
          url: 'redis://localhost:6379',
          keyPrefix: 'gateway:dev:'
        }
      },

      discovery: {
        enabled: false
      },

      monitoring: {
        enabled: true,
        metricsPath: '/metrics',
        healthPath: '/health'
      }
    }
  };
}
```

### 9.2 生产环境完整配置

```typescript
// stratix.config.ts (生产环境)
import type { StratixConfig } from '@stratix/core';

export default function createConfig(): StratixConfig {
  return {
    name: 'api-gateway-prod',
    version: '1.0.0',
    description: 'Stratix API Gateway - Production',

    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '3000'),
      logger: {
        level: 'info',
        prettyPrint: false,
        file: '/var/log/gateway/app.log'
      },
      trustProxy: true,
      bodyLimit: 1048576,
      keepAliveTimeout: 5000
    },

    plugins: [
      // OAuth2 认证
      ['@stratix/oauth2-auth', {
        wps: {
          clientId: process.env.WPS_CLIENT_ID,
          clientSecret: process.env.WPS_CLIENT_SECRET,
          authorizationUrl: process.env.WPS_AUTH_URL,
          tokenUrl: process.env.WPS_TOKEN_URL,
          userInfoUrl: process.env.WPS_USERINFO_URL,
          jwksUrl: process.env.WPS_JWKS_URL,
          scope: process.env.WPS_SCOPE?.split(',') || ['read'],
          redirectUri: process.env.WPS_REDIRECT_URI,
          tokenCacheTtl: 3600,
          userInfoCacheTtl: 1800,
          state: true,
          pkce: true
        }
      }],

      // 服务发现
      ['@stratix/service-discovery', {
        provider: 'consul',
        consul: {
          host: process.env.CONSUL_HOST || 'localhost',
          port: parseInt(process.env.CONSUL_PORT || '8500'),
          datacenter: process.env.CONSUL_DATACENTER || 'dc1'
        }
      }],

      // 限流 (Redis 存储)
      ['@fastify/rate-limit', {
        global: true,
        max: 100,
        timeWindow: '1 minute',
        redis: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        },
        keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
        allowList: process.env.RATE_LIMIT_WHITELIST?.split(',') || []
      }],

      // 熔断
      ['@fastify/circuit-breaker', {
        threshold: 5,
        timeout: 10000,
        resetTimeout: 30000
      }],

      // 安全头
      ['@fastify/helmet', {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
          }
        }
      }],

      // 压缩
      ['@fastify/compress', {
        global: true,
        threshold: 1024
      }]
    ],

    gateway: {
      routing: {
        caseSensitive: false,
        ignoreTrailingSlash: true,
        maxParamLength: 100
      },

      proxy: {
        timeout: 30000,
        retries: 3,
        keepAlive: true,
        maxSockets: 256
      },

      cache: {
        enabled: true,
        ttl: 3600,
        maxSize: 10000,
        redis: {
          url: process.env.REDIS_URL,
          keyPrefix: 'gateway:prod:'
        }
      },

      discovery: {
        enabled: true,
        provider: 'consul',
        consul: {
          host: process.env.CONSUL_HOST || 'localhost',
          port: parseInt(process.env.CONSUL_PORT || '8500'),
          datacenter: process.env.CONSUL_DATACENTER || 'dc1'
        }
      },

      monitoring: {
        enabled: true,
        metricsPath: '/metrics',
        healthPath: '/health',
        prometheus: {
          enabled: true,
          prefix: 'gateway_'
        }
      }
    }
  };
}
```

## 10. 故障排查

### 10.1 常见配置问题

**问题 1: 服务启动失败**
```bash
# 检查配置文件语法
node -c stratix.config.ts

# 验证环境变量
env | grep -E "(WPS_|REDIS_|CONSUL_)"

# 检查端口占用
netstat -tlnp | grep :3000
```

**问题 2: OAuth2 认证失败**
```bash
# 检查 OAuth2 配置
curl -v "${WPS_AUTH_URL}?response_type=code&client_id=${WPS_CLIENT_ID}"

# 验证 JWKS 端点
curl -v "${WPS_JWKS_URL}"

# 检查回调地址配置
echo "Redirect URI: ${WPS_REDIRECT_URI}"
```

**问题 3: Redis 连接失败**
```bash
# 测试 Redis 连接
redis-cli -u "${REDIS_URL}" ping

# 检查 Redis 配置
redis-cli -u "${REDIS_URL}" config get "*"
```

### 10.2 配置调试

```typescript
// 配置调试工具
export function debugConfig(config: StratixConfig) {
  console.log('=== Configuration Debug ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Server:', {
    host: config.server?.host,
    port: config.server?.port,
    logger: config.server?.logger
  });

  console.log('Plugins:', config.plugins?.map(plugin =>
    Array.isArray(plugin) ? plugin[0] : plugin.name || 'unknown'
  ));

  console.log('Gateway Config:', config.gateway);
  console.log('========================');
}
```
