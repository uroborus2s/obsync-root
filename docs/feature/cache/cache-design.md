# @stratix/cache 插件设计文档

## 1. 插件概述

@stratix/cache 是 Stratix 框架的缓存管理插件，提供高性能、灵活的缓存解决方案。该插件遵循 Stratix 的纯配置和函数式编程理念，支持多种缓存策略和存储后端。

### 1.1 设计目标

- **高性能**：提供低延迟、高吞吐量的缓存操作
- **灵活性**：支持多种缓存存储后端和缓存策略
- **类型安全**：完整的 TypeScript 类型定义
- **可扩展**：允许自定义缓存驱动和策略
- **纯函数式 API**：遵循函数式编程原则，提供纯函数 API
- **声明式配置**：通过配置定义缓存行为

### 1.2 核心特性

- 支持内存缓存、Redis 和自定义缓存后端
- 可配置的缓存策略：LRU、FIFO、LFU 等
- 自动类型序列化和反序列化
- 支持 TTL（存活时间）和自动过期
- 缓存命名空间和前缀
- 缓存标签和缓存项分组
- 缓存统计和监控
- 缓存预热和灵活的缓存失效策略
- 支持不同级别的缓存（多级缓存）
- 缓存锁避免缓存雪崩

## 2. 插件架构

### 2.1 整体架构

@stratix/cache 插件采用分层架构设计：

1. **API 层**：向应用提供统一的缓存操作接口
2. **策略层**：实现不同的缓存策略和行为
3. **存储层**：封装不同的缓存存储后端
4. **序列化层**：处理数据的序列化和反序列化
5. **事件层**：提供缓存事件和生命周期钩子

### 2.2 组件结构

```
@stratix/cache/
├── api/                 // API 接口层
│   ├── cache.ts         // 主缓存 API
│   └── decorators.ts    // 缓存装饰器
├── drivers/             // 缓存驱动实现
│   ├── memory.ts        // 内存缓存驱动
│   ├── redis.ts         // Redis 缓存驱动
│   └── null.ts          // 空缓存驱动
├── strategies/          // 缓存策略实现
│   ├── lru.ts           // LRU 缓存策略
│   ├── fifo.ts          // FIFO 缓存策略
│   └── lfu.ts           // LFU 缓存策略
├── serializers/         // 序列化器
│   ├── json.ts          // JSON 序列化器
│   └── msgpack.ts       // MessagePack 序列化器
├── utils/               // 工具函数
│   ├── key-builder.ts   // 缓存键生成器
│   └── lock.ts          // 缓存锁实现
├── types/               // 类型定义
│   ├── cache.ts         // 缓存类型
│   ├── driver.ts        // 驱动类型
│   └── strategy.ts      // 策略类型
├── index.ts             // 插件入口
└── plugin.ts            // 插件定义
```

## 3. 接口设计

### 3.1 缓存插件配置

```typescript
interface CachePluginOptions {
  // 缓存驱动配置
  driver?: 'memory' | 'redis' | 'null' | string;  // 缓存驱动类型，默认为 'memory'
  
  // 通用配置
  prefix?: string;                   // 缓存键前缀
  ttl?: number;                      // 默认过期时间（毫秒），0 表示永不过期
  serializer?: 'json' | 'msgpack';   // 序列化方式，默认为 'json'
  
  // 内存缓存配置
  memory?: {
    max?: number;                    // 最大缓存项数量
    maxSize?: number;                // 最大内存使用量（字节）
    strategy?: 'lru' | 'fifo' | 'lfu'; // 缓存替换策略
    cleanupInterval?: number;        // 过期项清理间隔（毫秒）
  };
  
  // Redis 缓存配置
  redis?: {
    url?: string;                    // Redis 连接 URL
    host?: string;                   // Redis 主机
    port?: number;                   // Redis 端口
    password?: string;               // Redis 密码
    db?: number;                     // Redis 数据库索引
    keyPrefix?: string;              // Redis 键前缀
    cluster?: {                      // Redis 集群配置
      nodes: Array<{ host: string; port: number; }>;
    };
    sentinels?: Array<{ host: string; port: number; }>; // Redis Sentinel 配置
    maxRetriesPerRequest?: number;   // 每个请求的最大重试次数
    connectTimeout?: number;         // 连接超时（毫秒）
  };
  
  // 事件与监控配置
  events?: {
    enabled?: boolean;               // 是否启用事件
    emitHitMiss?: boolean;           // 是否触发命中/未命中事件
    emitExpire?: boolean;            // 是否触发过期事件
    emitError?: boolean;             // 是否触发错误事件
    cacheStats?: boolean;            // 是否收集缓存统计信息
  };
  
  // 高级特性配置
  advanced?: {
    lockTimeout?: number;            // 缓存锁超时时间（毫秒）
    lockRetryCount?: number;         // 锁重试次数
    lockRetryDelay?: number;         // 锁重试延迟（毫秒）
    staleWhileRevalidate?: boolean;  // 返回过期数据并在后台更新
    staleIfError?: boolean;          // 出错时返回过期数据
    stampedeLock?: boolean;          // 是否使用防击穿锁
  };
}
```

### 3.2 缓存 API

缓存插件向应用实例添加以下 API:

```typescript
interface CacheAPI {
  // 基本操作
  get<T = any>(key: string): Promise<T | null>;               // 获取缓存项
  set<T = any>(key: string, value: T, ttl?: number): Promise<boolean>; // 设置缓存项
  has(key: string): Promise<boolean>;                         // 检查缓存项是否存在
  delete(key: string): Promise<boolean>;                      // 删除缓存项
  clear(): Promise<boolean>;                                  // 清空缓存
  
  // 批量操作
  mget<T = any>(keys: string[]): Promise<Array<T | null>>;    // 批量获取缓存项
  mset(entries: Record<string, any>, ttl?: number): Promise<boolean>; // 批量设置缓存项
  mdelete(keys: string[]): Promise<number>;                   // 批量删除缓存项
  
  // 高级操作
  getOrSet<T = any>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttl?: number
  ): Promise<T>;                                             // 获取或设置缓存项
  
  increment(key: string, value?: number): Promise<number>;    // 增加数值
  decrement(key: string, value?: number): Promise<number>;    // 减少数值
  
  // 标签与分组
  tagKeys(tag: string, keys: string[]): Promise<boolean>;     // 为缓存项添加标签
  invalidateTag(tag: string): Promise<boolean>;               // 使标签下的所有缓存项失效
  getKeysByTag(tag: string): Promise<string[]>;               // 获取标签下的所有缓存键
  
  // 命名空间操作
  namespace(namespace: string): CacheAPI;                     // 创建命名空间缓存
  invalidateNamespace(namespace: string): Promise<boolean>;   // 使命名空间下的所有缓存项失效
  
  // 锁操作
  lock(key: string, ttl?: number): Promise<{ unlock: () => Promise<boolean> } | null>; // 获取锁
  withLock<T>(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T>;   // 在锁内执行函数
  
  // 统计信息
  stats(): Promise<CacheStats>;                               // 获取缓存统计信息
  
  // 事件监听
  on(event: string, handler: (...args: any[]) => void): void; // 监听缓存事件
  off(event: string, handler: (...args: any[]) => void): void; // 移除事件监听器
  
  // 实用工具
  remember<T>(
    key: string,
    ttl: number,
    factory: () => Promise<T> | T
  ): Promise<T>;                                            // 记住（缓存）工厂函数的结果
  
  rememberForever<T>(
    key: string,
    factory: () => Promise<T> | T
  ): Promise<T>;                                            // 永久记住工厂函数的结果
}
```

### 3.3 缓存装饰器

插件还提供了装饰器用于简化函数结果的缓存：

```typescript
// 缓存函数结果
function Cached(options: {
  key?: string | ((args: any[]) => string);  // 缓存键或键生成函数
  ttl?: number;                              // 缓存过期时间
  namespace?: string;                        // 缓存命名空间
  cond?: (args: any[]) => boolean;           // 是否缓存的条件函数
  invalidateTags?: string[];                 // 调用后使哪些标签失效
  errorTtl?: number;                         // 错误结果的缓存时间
}): MethodDecorator;

// 缓存清除装饰器
function InvalidateCache(options: {
  keys?: string[];                           // 要清除的缓存键
  tags?: string[];                           // 要清除的缓存标签
  namespaces?: string[];                     // 要清除的缓存命名空间
  all?: boolean;                             // 是否清除所有缓存
}): MethodDecorator;
```

## 4. 缓存驱动详细设计

### 4.1 内存缓存驱动

内存缓存驱动基于 LRU-Cache 包实现，提供高性能的内存缓存功能：

```typescript
class MemoryCacheDriver implements CacheDriver {
  private cache: LRUCache<string, CacheEntry>;
  
  constructor(options: MemoryCacheOptions) {
    // 初始化缓存配置
  }
  
  async get<T>(key: string): Promise<T | null> {
    // 获取缓存项并检查过期
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    // 存储值并设置过期时间
  }
  
  // 其他方法实现...
}
```

### 4.2 Redis 缓存驱动

Redis 缓存驱动基于 ioredis 包实现，提供分布式缓存功能：

```typescript
class RedisCacheDriver implements CacheDriver {
  private client: Redis | Cluster;
  private serializer: Serializer;
  
  constructor(options: RedisCacheOptions) {
    // 初始化 Redis 客户端
  }
  
  async get<T>(key: string): Promise<T | null> {
    // 从 Redis 获取并反序列化
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    // 序列化并存储到 Redis
  }
  
  // 其他方法实现...
}
```

### 4.3 空缓存驱动

用于禁用缓存但保持 API 兼容性：

```typescript
class NullCacheDriver implements CacheDriver {
  async get<T>(key: string): Promise<T | null> {
    return null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    return true;
  }
  
  // 其他方法返回相应的空值...
}
```

## 5. 缓存策略详细设计

### 5.1 LRU 策略

最近最少使用策略，优先淘汰最长时间未访问的缓存项：

```typescript
class LRUStrategy implements CacheStrategy {
  applyToDriver(driver: CacheDriver, options: any): CacheDriver {
    // 配置 LRU 行为
    return enhancedDriver;
  }
}
```

### 5.2 FIFO 策略

先进先出策略，按照缓存项的添加顺序淘汰：

```typescript
class FIFOStrategy implements CacheStrategy {
  applyToDriver(driver: CacheDriver, options: any): CacheDriver {
    // 配置 FIFO 行为
    return enhancedDriver;
  }
}
```

### 5.3 LFU 策略

最少使用策略，优先淘汰访问次数最少的缓存项：

```typescript
class LFUStrategy implements CacheStrategy {
  applyToDriver(driver: CacheDriver, options: any): CacheDriver {
    // 配置 LFU 行为
    return enhancedDriver;
  }
}
```

## 6. 实现细节

### 6.1 序列化层

缓存插件提供两种序列化方式：

```typescript
interface Serializer {
  serialize(value: any): string | Buffer;
  deserialize<T>(data: string | Buffer): T;
}

class JsonSerializer implements Serializer {
  serialize(value: any): string {
    return JSON.stringify(value);
  }
  
  deserialize<T>(data: string | Buffer): T {
    return JSON.parse(data.toString());
  }
}

class MsgPackSerializer implements Serializer {
  serialize(value: any): Buffer {
    // 使用 MessagePack 序列化
  }
  
  deserialize<T>(data: Buffer): T {
    // 使用 MessagePack 反序列化
  }
}
```

### 6.2 缓存键生成

```typescript
class KeyBuilder {
  private prefix: string;
  private namespace: string;
  
  constructor(prefix: string = '', namespace: string = '') {
    this.prefix = prefix;
    this.namespace = namespace;
  }
  
  build(key: string): string {
    // 构建完整的缓存键，包括前缀和命名空间
    return `${this.prefix}${this.namespace ? `${this.namespace}:` : ''}${key}`;
  }
  
  buildForTag(tag: string): string {
    // 构建标签的存储键
    return this.build(`tags:${tag}`);
  }
}
```

### 6.3 缓存锁实现

```typescript
class CacheLock {
  private cache: CacheDriver;
  private keyBuilder: KeyBuilder;
  private lockTimeout: number;
  private retryCount: number;
  private retryDelay: number;
  
  constructor(options: CacheLockOptions) {
    // 初始化锁配置
  }
  
  async acquire(key: string, ttl: number = this.lockTimeout): Promise<LockHandle | null> {
    // 尝试获取锁
    // 如果成功，返回锁句柄，包含解锁方法
    // 失败返回 null
  }
  
  async release(key: string, token: string): Promise<boolean> {
    // 安全释放锁（验证令牌）
  }
  
  async withLock<T>(key: string, callback: () => Promise<T> | T, ttl?: number): Promise<T> {
    // 在锁内执行回调函数，自动释放锁
  }
}
```

### 6.4 多级缓存

```typescript
class MultiLevelCache implements CacheDriver {
  private caches: Array<{ driver: CacheDriver; ttl?: number }>;
  
  constructor(caches: Array<{ driver: CacheDriver; ttl?: number }>) {
    this.caches = caches;
  }
  
  async get<T>(key: string): Promise<T | null> {
    // 从第一级开始查询，找到则填充上层缓存
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    // 写入所有级别的缓存，可能使用不同的 TTL
  }
  
  // 其他方法实现...
}
```

## 7. 插件注册与初始化

```typescript
import { StratixPlugin } from 'stratix';
import type { CachePluginOptions } from './types';

const cachePlugin: StratixPlugin<CachePluginOptions> = {
  name: 'cache',
  optionalDependencies: ['redis'],
  register: async (app, options) => {
    // 默认配置
    const config = {
      driver: 'memory',
      prefix: app.name ? `${app.name}:` : '',
      ttl: 60000, // 默认 1 分钟
      serializer: 'json',
      ...options
    };
    
    // 创建缓存驱动
    const driver = createCacheDriver(config, app);
    
    // 创建缓存 API
    const cacheAPI = createCacheAPI(driver, config);
    
    // 注册装饰器
    app.decorate('cache', cacheAPI);
    
    // 注册关闭钩子
    app.hook('beforeClose', async () => {
      await driver.close();
    });
  },
  schema: {
    type: 'object',
    properties: {
      driver: { type: 'string', enum: ['memory', 'redis', 'null'] },
      prefix: { type: 'string' },
      ttl: { type: 'number', minimum: 0 },
      serializer: { type: 'string', enum: ['json', 'msgpack'] },
      memory: { type: 'object' },
      redis: { type: 'object' },
      events: { type: 'object' },
      advanced: { type: 'object' }
    }
  }
};

export default cachePlugin;
```

## 8. 使用场景与示例

### 8.1 基本用法

```typescript
// 注册缓存插件
app.register(require('@stratix/cache'), {
  driver: 'memory',
  ttl: 60000 // 1 分钟
});

// 使用缓存
const userService = {
  async getUser(id) {
    // 尝试从缓存获取用户
    const cacheKey = `user:${id}`;
    
    // 获取缓存或设置
    return app.cache.getOrSet(cacheKey, async () => {
      // 如果缓存中没有，从数据库获取
      const user = await db('users').where('id', id).first();
      return user;
    }, 300000); // 缓存 5 分钟
  }
};
```

### 8.2 使用 Redis 缓存

```typescript
// 注册带 Redis 的缓存插件
app.register(require('@stratix/cache'), {
  driver: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  prefix: 'myapp:',
  ttl: 3600000 // 1 小时
});
```

### 8.3 使用缓存装饰器

```typescript
import { Cached, InvalidateCache } from '@stratix/cache/decorators';

class ProductService {
  @Cached({ ttl: 300000 }) // 缓存 5 分钟
  async getProduct(id: string) {
    // 从数据库获取产品
    return db('products').where('id', id).first();
  }
  
  @InvalidateCache({ keys: ['products:list'], tags: ['products'] })
  async updateProduct(id: string, data: any) {
    // 更新产品并自动使相关缓存失效
    return db('products').where('id', id).update(data);
  }
}
```

### 8.4 防止缓存击穿

```typescript
async function getPopularData(id) {
  const key = `popular:${id}`;
  
  // 使用带锁的方式获取或设置缓存
  return app.cache.withLock(`lock:${key}`, async () => {
    // 在锁内检查缓存
    const cached = await app.cache.get(key);
    if (cached) return cached;
    
    // 执行昂贵的计算
    const data = await computeExpensiveData(id);
    
    // 存入缓存
    await app.cache.set(key, data, 3600000);
    return data;
  });
}
```

### 8.5 多级缓存

```typescript
// 配置多级缓存
app.register(require('@stratix/cache'), {
  driver: 'multi',
  levels: [
    { driver: 'memory', ttl: 60000 },  // 一级缓存：内存，1 分钟
    { driver: 'redis', ttl: 3600000 }  // 二级缓存：Redis，1 小时
  ]
});
```

## 9. 性能与安全考虑

### 9.1 性能优化策略

- 使用高效的序列化方式（如 MessagePack）减少数据大小和序列化时间
- 批量操作减少网络往返时间
- 内存缓存作为一级缓存提高读取性能
- 定期清理过期项减少内存占用
- 使用缓存锁防止缓存雪崩和缓存击穿

### 9.2 安全考虑

- 避免在缓存中存储敏感数据
- Redis 缓存配置身份验证和 TLS 加密
- 安全的键生成策略避免键冲突和注入
- 实现缓存数据最大大小限制防止 DOS 攻击

## 10. 监控与调试

插件提供以下监控和调试功能：

- 缓存统计信息：命中率、缓存大小、操作计数等
- 事件系统：缓存命中、未命中、过期、错误等事件
- 日志与追踪：支持详细日志记录缓存操作

```typescript
// 监控缓存使用情况
const stats = await app.cache.stats();
console.log(`缓存命中率: ${stats.hitRatio}%`);
console.log(`缓存项数量: ${stats.size}`);

// 监听缓存事件
app.cache.on('hit', (key) => {
  console.log(`缓存命中: ${key}`);
});

app.cache.on('miss', (key) => {
  console.log(`缓存未命中: ${key}`);
});

app.cache.on('expired', (key) => {
  console.log(`缓存过期: ${key}`);
});
``` 