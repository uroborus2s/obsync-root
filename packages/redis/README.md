# @stratix/redis

Redis 适配器插件，为 Stratix 框架提供标准化的 Redis 客户端接口。支持单实例和集群模式，遵循 Stratix 框架的 Adapter 层规范。

## ✨ 特性

- 🚀 **高性能**: 基于 ioredis，支持高并发 Redis 操作
- 🔄 **多模式**: 支持单实例和集群模式 Redis
- 🔌 **插件化**: 遵循 Stratix 框架的插件架构
- 🏗️ **依赖注入**: 自动注册到 Awilix 容器，支持跨插件共享
- 🛡️ **类型安全**: 完整的 TypeScript 类型定义
- 📊 **完整接口**: 支持所有常用 Redis 操作（字符串、哈希、列表、集合、有序集合等）
- 🔄 **发布订阅**: 支持 Redis 发布订阅模式
- 🔧 **事务支持**: 支持 Redis 事务和管道操作
- 📈 **健康检查**: 内置连接状态监控和健康检查
- 🔄 **自动重连**: 支持连接断开后自动重连
- 🔄 **优雅关闭**: 应用关闭时自动断开 Redis 连接

## 📦 安装

```bash
npm install @stratix/redis
# 或
pnpm add @stratix/redis
# 或
yarn add @stratix/redis
```

## 🚀 快速开始

### 1. 基础配置

在 Stratix 应用中注册 Redis 插件：

```typescript
// src/stratix.config.ts
import redisPlugin from '@stratix/redis';

export default function createConfig(): StratixConfig {
  return {
    plugins: [
      // 注册 Redis 插件
      {
        plugin: redisPlugin,
        options: {
          redis: {
            single: {
              host: 'localhost',
              port: 6379,
              password: 'your-password', // 可选
              db: 0 // 可选，默认为 0
            }
          }
        }
      }
    ]
  };
}
```

### 2. 在其他插件中使用

```typescript
// src/services/CacheService.ts
import { RESOLVER } from '@stratix/core/plugin';
import type { RedisAdapter } from '@stratix/redis';

export interface ICacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export default class CacheService implements ICacheService {
  private redisClient: RedisAdapter;

  constructor({ redisClient }: { redisClient: RedisAdapter }) {
    this.redisClient = redisClient;
  }

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.redisClient.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}

// 使用 RESOLVER 进行依赖注入
CacheService[RESOLVER] = {
  redisClient: 'redisClient'
};
```

### 3. 集群模式配置

```typescript
// src/stratix.config.ts
export default function createConfig(): StratixConfig {
  return {
    plugins: [
      {
        plugin: redisPlugin,
        options: {
          redis: {
            cluster: {
              nodes: [
                { host: 'redis-node-1', port: 6379 },
                { host: 'redis-node-2', port: 6379 },
                { host: 'redis-node-3', port: 6379 }
              ],
              options: {
                // 集群特定选项
                enableOfflineQueue: false,
                retryDelayOnFailover: 100
              }
            }
          }
        }
      }
    ]
  };
}
```

## 🔧 配置选项

### RedisPluginOptions

```typescript
interface RedisPluginOptions {
  redis?: {
    // 单实例配置
    single?: {
      host: string;
      port: number;
      password?: string;
      db?: number;
      options?: RedisOptions; // ioredis 选项
    };
    
    // 集群配置
    cluster?: {
      nodes: Array<{ host: string; port: number }>;
      options?: ClusterOptions; // ioredis 集群选项
    };
    
    // 连接池配置
    poolSize?: number; // 默认: 10
    retryAttempts?: number; // 默认: 3
    retryDelay?: number; // 默认: 1000ms
  };
}
```

### 环境变量配置

如果没有提供配置，插件会自动从环境变量读取：

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
```

## 📚 API 参考

### 基础操作

```typescript
// 字符串操作
await redisClient.get('key');
await redisClient.set('key', 'value', 3600); // TTL: 3600秒
await redisClient.del('key');
await redisClient.exists('key');
await redisClient.expire('key', 3600);
```

### 哈希操作

```typescript
await redisClient.hget('hash', 'field');
await redisClient.hset('hash', 'field', 'value');
await redisClient.hdel('hash', 'field');
await redisClient.hgetall('hash');
```

### 列表操作

```typescript
await redisClient.lpush('list', 'value1', 'value2');
await redisClient.rpush('list', 'value3');
await redisClient.lpop('list');
await redisClient.rpop('list');
await redisClient.llen('list');
```

### 集合操作

```typescript
await redisClient.sadd('set', 'member1', 'member2');
await redisClient.srem('set', 'member1');
await redisClient.smembers('set');
await redisClient.sismember('set', 'member1');
```

### 有序集合操作

```typescript
await redisClient.zadd('zset', 100, 'member1');
await redisClient.zrem('zset', 'member1');
await redisClient.zrange('zset', 0, -1);
await redisClient.zrank('zset', 'member1');
```

### 发布订阅

```typescript
// 发布消息
await redisClient.publish('channel', 'message');

// 订阅频道
await redisClient.subscribe('channel');

// 取消订阅
await redisClient.unsubscribe('channel');
```

### 事务和管道

```typescript
// 事务
const multi = redisClient.multi();
multi.set('key1', 'value1');
multi.set('key2', 'value2');
await multi.exec();

// 管道
const pipeline = redisClient.pipeline();
pipeline.get('key1');
pipeline.get('key2');
const results = await pipeline.exec();
```

### 健康检查

```typescript
// 检查连接状态
const isConnected = redisClient.isConnected();

// Ping 测试
const pong = await redisClient.ping(); // 返回 'PONG'

// 断开连接
await redisClient.disconnect();
```

## 🏗️ 架构设计

### Adapter 层规范

Redis 插件遵循 Stratix 框架的 Adapter 层规范：

1. **静态标识**: 使用 `static adapterName = 'redisClient'` 标识适配器
2. **容器注册**: 自动注册到应用级容器，生命周期为 SINGLETON
3. **跨插件共享**: 其他插件可通过依赖注入使用 Redis 客户端
4. **统一接口**: 提供标准化的 Redis 操作接口
5. **错误处理**: 完整的错误处理和日志记录

### 生命周期管理

- **应用级单例**: Redis 客户端在应用级别保持单例
- **自动连接**: 插件初始化时自动建立 Redis 连接
- **优雅关闭**: 应用关闭时自动断开 Redis 连接（通过 `onClose` 钩子）
- **健康监控**: 实时监控连接状态和健康状况

#### onClose 生命周期钩子

Redis 适配器实现了 `onClose` 生命周期钩子，确保在应用关闭时优雅地断开 Redis 连接：

```typescript
// 适配器会自动注册 onClose 钩子
export default class clientAdapter {
  static adapterName = 'redisClient';

  async onClose(): Promise<void> {
    // 优雅关闭 Redis 连接
    await this.adapter.disconnect();
  }
}
```

当应用关闭时，Stratix 框架会自动调用所有注册的 `onClose` 钩子，确保 Redis 连接被正确关闭。

## 🧪 测试

```bash
# 运行单元测试
pnpm test

# 运行集成测试
pnpm test:integration

# 运行测试覆盖率
pnpm test:coverage
```

## 📄 许可证

MIT License
