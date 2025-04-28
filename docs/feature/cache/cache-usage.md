# @stratix/cache 插件使用说明

## 1. 介绍

`@stratix/cache` 插件为 Stratix 框架提供了强大、灵活的缓存管理功能。它支持多种缓存驱动（内存、Redis等）和缓存策略，可以满足从简单到复杂的各种缓存需求。

### 1.1 主要特性

- 支持多种缓存驱动：内存（默认）、Redis 和自定义驱动
- 可配置的缓存策略：LRU（最近最少使用）、FIFO（先进先出）、LFU（最少使用）
- 自动类型序列化和反序列化
- 支持 TTL（存活时间）和自动过期
- 缓存命名空间和前缀
- 缓存标签和分组
- 分布式缓存锁
- 多级缓存支持
- 完整的类型定义
- 符合函数式编程理念的纯函数 API

## 2. 安装

### 2.1 基本安装

```bash
# 使用 npm
npm install @stratix/cache

# 使用 yarn
yarn add @stratix/cache

# 使用 pnpm
pnpm add @stratix/cache
```

### 2.3 MessagePack 支持（可选）

如果需要使用 MessagePack 序列化以提高性能：

```bash
# 使用 npm
npm install msgpackr

# 使用 yarn
yarn add msgpackr

# 使用 pnpm
pnpm add msgpackr
```

## 3. 基本配置

### 3.1 注册插件

在你的 Stratix 应用中注册缓存插件：

```typescript
import { createApp } from 'stratix';
import cachePlugin from '@stratix/cache';

const app = createApp();

// 注册缓存插件
app.register(cachePlugin, {
  driver: 'memory',
  ttl: 60000 // 默认缓存时间：1分钟
});

// 启动应用
await app.start();
```

### 3.2 通过配置文件注册

可以在 Stratix 配置文件中添加缓存插件配置：

```javascript
// stratix.config.js
module.exports = {
  name: 'my-app',
  plugins: {
    // 其他插件配置...
    cache: {
      driver: 'memory',
      prefix: 'my-app:',
      ttl: 300000, // 5分钟
      memory: {
        max: 1000, // 最多缓存 1000 个项目
        strategy: 'lru'
      }
    }
  }
}
```

### 3.3 配置选项详解

以下是缓存插件的完整配置选项说明：

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `driver` | `string` | `'memory'` | 缓存驱动类型，支持 `'memory'`、`'redis'`、`'null'` |
| `prefix` | `string` | 应用名称 + `:` | 缓存键前缀 |
| `ttl` | `number` | `60000` | 默认缓存过期时间（毫秒），0 表示永不过期 |
| `serializer` | `string` | `'json'` | 序列化方式，支持 `'json'` 和 `'msgpack'` |
| `memory.max` | `number` | `1000` | 内存缓存最大项数 |
| `memory.maxSize` | `number` | 无限制 | 最大内存使用量（字节） |
| `memory.strategy` | `string` | `'lru'` | 缓存替换策略，支持 `'lru'`、`'fifo'`、`'lfu'` |
| `memory.cleanupInterval` | `number` | `60000` | 过期项清理间隔（毫秒）|
| `redis.url` | `string` | - | Redis 连接 URL |
| `redis.host` | `string` | `'localhost'` | Redis 主机 |
| `redis.port` | `number` | `6379` | Redis 端口 |
| `redis.password` | `string` | - | Redis 密码 |
| `redis.db` | `number` | `0` | Redis 数据库索引 |
| `events.enabled` | `boolean` | `true` | 是否启用事件 |
| `advanced.stampedeLock` | `boolean` | `false` | 是否使用防缓存击穿锁 |

## 4. 使用方法

### 4.1 基本操作

一旦注册了缓存插件，你可以通过 `app.cache` 访问缓存 API：

```typescript
// 设置缓存
await app.cache.set('key', 'value', 60000); // 缓存 1 分钟

// 获取缓存
const value = await app.cache.get('key');

// 检查键是否存在
const exists = await app.cache.has('key');

// 删除缓存
await app.cache.delete('key');

// 清空所有缓存
await app.cache.clear();
```

### 4.2 缓存对象和复杂数据结构

缓存插件自动处理对象和复杂数据结构的序列化和反序列化：

```typescript
// 缓存对象
const user = { id: 1, name: 'John', roles: ['admin', 'user'] };
await app.cache.set('user:1', user);

// 获取并使用缓存的对象
const cachedUser = await app.cache.get('user:1');
console.log(cachedUser.name); // 'John'
```

### 4.3 类型安全的缓存操作

利用 TypeScript 泛型获得类型安全的缓存操作：

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// 类型安全的设置
await app.cache.set<User>('user:1', { id: 1, name: 'John', email: 'john@example.com' });

// 类型安全的获取
const user = await app.cache.get<User>('user:1');
console.log(user?.email); // TypeScript 知道 user 可能为 null
```

### 4.4 高级功能：获取或设置模式

使用 `getOrSet` 方法简化"缓存优先，缓存不存在则从源获取"的模式：

```typescript
async function getUserById(id) {
  return app.cache.getOrSet(
    `user:${id}`,
    async () => {
      // 只在缓存未命中时执行
      console.log('缓存未命中，从数据库获取用户');
      return await db.users.findOne({ id });
    },
    300000 // 缓存 5 分钟
  );
}

// 首次调用 - 从数据库获取并缓存
const user1 = await getUserById(1);

// 再次调用 - 直接从缓存返回
const user2 = await getUserById(1);
```

### 4.5 批量操作

使用批量操作减少网络往返并提高性能：

```typescript
// 批量获取多个键
const values = await app.cache.mget(['key1', 'key2', 'key3']);

// 批量设置多个键
await app.cache.mset({
  'key1': 'value1',
  'key2': 'value2',
  'key3': 'value3'
}, 60000);

// 批量删除多个键
await app.cache.mdelete(['key1', 'key2']);
```

### 4.6 标签和分组

使用标签可以将多个缓存键分组，便于批量管理：

```typescript
// 设置缓存并添加标签
await app.cache.set('product:1', { id: 1, name: 'Product 1' });
await app.cache.set('product:2', { id: 2, name: 'Product 2' });
await app.cache.tagKeys('products', ['product:1', 'product:2']);

// 添加新缓存并附加到现有标签
await app.cache.set('product:3', { id: 3, name: 'Product 3' });
await app.cache.tagKeys('products', ['product:3']);

// 使标签下的所有缓存失效
await app.cache.invalidateTag('products');
```

### 4.7 命名空间

使用命名空间隔离不同模块的缓存：

```typescript
// 创建命名空间缓存
const userCache = app.cache.namespace('users');
const productCache = app.cache.namespace('products');

// 在各自的命名空间中操作
await userCache.set('1', { id: 1, name: 'John' });     // 实际键为 'users:1'
await productCache.set('1', { id: 1, name: 'Phone' }); // 实际键为 'products:1'

// 清空特定命名空间
await app.cache.invalidateNamespace('users');
```

### 4.8 缓存锁

缓存锁可以用来防止缓存击穿（多个进程同时重建缓存）和竞态条件：

```typescript
// 获取锁
const lock = await app.cache.lock('lock:key', 10000); // 10秒锁

if (lock) {
  try {
    // 执行需要锁保护的操作
    await performCriticalOperation();
  } finally {
    // 释放锁
    await lock.unlock();
  }
}

// 更简单的方式：withLock 帮助函数
const result = await app.cache.withLock('lock:key', async () => {
  // 这个函数在获取锁后执行，执行完毕自动释放锁
  return await performCriticalOperation();
});
```

### 4.9 数值增减

直接在缓存中执行数值的增减操作：

```typescript
// 设置初始值
await app.cache.set('counter', 0);

// 增加计数
await app.cache.increment('counter'); // +1，返回 1
await app.cache.increment('counter', 5); // +5，返回 6

// 减少计数
await app.cache.decrement('counter', 2); // -2，返回 4
```

### 4.10 记住功能

"记住"模式是缓存常见用例的语法糖：

```typescript
// 记住结果一段时间
const users = await app.cache.remember(
  'users:list',
  60000, // 缓存 1 分钟
  async () => {
    return await db.users.find();
  }
);

// 永久记住（直到手动清除）
const config = await app.cache.rememberForever(
  'app:config',
  async () => {
    return await loadConfiguration();
  }
);
```

## 5. 缓存驱动配置示例

### 5.1 内存缓存（默认）

```typescript
app.register(require('@stratix/cache'), {
  driver: 'memory',
  memory: {
    max: 1000,            // 最多 1000 个缓存项
    maxSize: 1048576,     // 最大 1MB 内存占用
    strategy: 'lru',      // LRU 淘汰策略
    cleanupInterval: 300000 // 5 分钟清理一次过期项
  }
});
```

### 5.2 Redis 缓存

```typescript
app.register(require('@stratix/cache'), {
  driver: 'redis',
  prefix: 'myapp:',
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
    db: 0
  }
});
```

### 5.3 Redis 集群

```typescript
app.register(require('@stratix/cache'), {
  driver: 'redis',
  redis: {
    cluster: {
      nodes: [
        { host: 'redis-node-1', port: 6379 },
        { host: 'redis-node-2', port: 6379 },
        { host: 'redis-node-3', port: 6379 }
      ]
    },
    maxRetriesPerRequest: 3
  }
});
```

### 5.4 Redis Sentinel

```typescript
app.register(require('@stratix/cache'), {
  driver: 'redis',
  redis: {
    sentinels: [
      { host: 'sentinel-1', port: 26379 },
      { host: 'sentinel-2', port: 26379 },
      { host: 'sentinel-3', port: 26379 }
    ],
    name: 'mymaster'
  }
});
```

### 5.5 禁用缓存（空驱动）

```typescript
app.register(require('@stratix/cache'), {
  driver: 'null'
});
```

### 5.6 多级缓存

```typescript
app.register(require('@stratix/cache'), {
  driver: 'multi',
  levels: [
    { driver: 'memory', ttl: 60000 },   // 第一级：内存缓存（1分钟）
    { driver: 'redis', ttl: 3600000 }   // 第二级：Redis缓存（1小时）
  ]
});
```

## 6. 高级使用场景

### 6.1 防止缓存穿透

缓存穿透指查询一个不存在的数据，如果缓存和数据库都不存在这个数据，每次请求都会到数据库，可能导致数据库压力过大：

```typescript
async function getUserById(id) {
  return app.cache.getOrSet(
    `user:${id}`,
    async () => {
      const user = await db.users.findOne({ id });
      // 即使用户不存在也缓存 null 值，防止缓存穿透
      return user || null;
    },
    // 对于不存在的数据，使用较短的缓存时间
    user ? 300000 : 60000
  );
}
```

### 6.2 防止缓存击穿

缓存击穿指热点数据过期瞬间，大量请求同时重建缓存，导致数据库压力突然增大：

```typescript
async function getHotData(id) {
  const key = `hot:${id}`;
  
  // 使用锁防止同时重建缓存
  return app.cache.withLock(`lock:${key}`, async () => {
    // 在锁内再次检查缓存，避免重复工作
    const cached = await app.cache.get(key);
    if (cached) return cached;
    
    // 从数据源获取数据
    const data = await fetchExpensiveData(id);
    
    // 缓存结果
    await app.cache.set(key, data, 3600000);
    return data;
  });
}
```

### 6.3 防止缓存雪崩

缓存雪崩指大量缓存同时过期，系统重建缓存时压力过大：

```typescript
function getRandomTTL(base, jitter = 0.2) {
  // 添加随机抖动到 TTL，避免同时过期
  const min = base * (1 - jitter);
  const max = base * (1 + jitter);
  return Math.floor(min + Math.random() * (max - min));
}

async function cacheData(key, data) {
  // 基础 TTL 为 1 小时，添加最多 20% 的随机抖动
  const ttl = getRandomTTL(3600000);
  await app.cache.set(key, data, ttl);
}
```

### 6.4 使用事件监控缓存

```typescript
// 监控缓存命中和未命中
app.cache.on('hit', (key) => {
  console.log(`缓存命中: ${key}`);
  metrics.increment('cache.hit');
});

app.cache.on('miss', (key) => {
  console.log(`缓存未命中: ${key}`);
  metrics.increment('cache.miss');
});

// 监控缓存过期
app.cache.on('expired', (key) => {
  console.log(`缓存过期: ${key}`);
});

// 监控缓存错误
app.cache.on('error', (err, operation) => {
  console.error(`缓存操作 ${operation} 错误:`, err);
});
```

### 6.5 获取缓存统计

```typescript
// 获取缓存统计信息
const stats = await app.cache.stats();
console.log(`缓存大小: ${stats.size} 项`);
console.log(`缓存命中率: ${stats.hitRatio}%`);
console.log(`命中次数: ${stats.hits}`);
console.log(`未命中次数: ${stats.misses}`);
```

## 7. 最佳实践

### 7.1 选择合适的 TTL

- 经常变化的数据应使用较短的 TTL
- 相对静态的数据可以使用较长的 TTL
- 考虑数据一致性要求，确保 TTL 不会导致用户看到过时的数据
- 为不同类型的数据设置不同的 TTL

### 7.2 合理使用缓存键

- 在缓存键中包含足够的信息以唯一标识数据
- 使用冒号分隔键的不同部分，例如 `users:profile:1`
- 避免过长的键，会增加内存使用和降低性能

### 7.3 序列化选择

- 对于简单的数据，JSON 序列化已经足够
- 对于大型数据集或高性能要求的场景，考虑使用 MessagePack

### 7.4 缓存策略

- 在内存有限的环境中，使用 LRU 策略避免内存溢出
- 对于访问模式固定的数据，考虑 FIFO 策略
- 对于热点数据明显的场景，LFU 策略可能更合适

### 7.5 多环境配置

针对不同环境使用不同的缓存配置：

```typescript
// 根据环境选择缓存配置
const cacheConfig = {
  // 通用配置
  prefix: `${app.name}:${process.env.NODE_ENV}:`,
  
  // 环境特定配置
  ...(process.env.NODE_ENV === 'production'
    ? {
        driver: 'redis',
        redis: {
          host: process.env.REDIS_HOST,
          password: process.env.REDIS_PASSWORD,
        }
      }
    : {
        driver: 'memory',
        memory: {
          max: 1000
        }
      }
  )
};

app.register(require('@stratix/cache'), cacheConfig);
```

## 8. 故障排除

### 8.1 常见问题

**问题：缓存不生效**

可能的原因：
- 缓存键生成不一致
- TTL 设置过短
- 缓存驱动配置错误

解决方案：
- 检查缓存键的生成逻辑
- 增加 TTL 值
- 验证缓存驱动配置

**问题：内存使用过高**

可能的原因：
- 未设置内存缓存上限
- 缓存了过大的对象
- TTL 设置过长或未设置

解决方案：
- 配置 `memory.max` 和 `memory.maxSize`
- 只缓存必要的数据
- 设置合理的 TTL

**问题：Redis 连接问题**

可能的原因：
- 连接配置错误
- Redis 服务不可用
- 网络问题

解决方案：
- 检查 Redis 配置
- 确认 Redis 服务状态
- 配置正确的重试参数

### 8.2 调试技巧

- 启用详细日志记录缓存操作
- 使用事件监听器捕获缓存操作
- 定期检查缓存统计信息

```typescript
// 启用详细日志
app.register(require('@stratix/cache'), {
  events: {
    enabled: true,
    emitHitMiss: true,
    emitExpire: true,
    emitError: true,
    cacheStats: true
  }
});

// 监听所有缓存事件进行调试
app.cache.on('*', (event, ...args) => {
  console.log(`缓存事件 ${event}:`, args);
});
```

## 9. 源码参考

```typescript
// 基本用法示例
import { createApp } from 'stratix';
import cachePlugin from '@stratix/cache';

// 创建应用
const app = createApp({
  name: 'my-app'
});

// 注册缓存插件
app.register(cachePlugin, {
  driver: 'memory',
  ttl: 60000, // 1分钟
  prefix: 'myapp:',
  memory: {
    max: 1000
  }
});

// 使用缓存
app.hook('afterStart', async () => {
  // 设置缓存
  await app.cache.set('greeting', 'Hello World', 300000);
  
  // 获取缓存
  const greeting = await app.cache.get('greeting');
  console.log(greeting); // 'Hello World'
  
  // 使用高级 API
  const data = await app.cache.getOrSet('api:data', async () => {
    // 从 API 获取数据
    return { message: 'Data from API' };
  }, 60000);
  
  console.log(data.message); // 'Data from API'
});

// 启动应用
app.start().catch(console.error);
```

```typescript
</rewritten_file> 