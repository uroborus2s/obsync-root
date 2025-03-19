# Stratix缓存插件设计文档 (@stratix/cache)

## 目录
1. [插件概述](#1-插件概述)
2. [使用方式](#2-使用方式)
   - [基本使用](#21-基本使用)
   - [高级配置](#22-高级配置)
   - [缓存模式与策略](#23-缓存模式与策略)
   - [多级缓存](#24-多级缓存)
   - [分布式缓存](#25-分布式缓存)
3. [API设计](#3-api设计)
   - [插件API](#31-插件api)
   - [缓存管理器API](#32-缓存管理器api)
   - [缓存存储API](#33-缓存存储api)
   - [配置选项](#34-配置选项)
4. [实现细节](#4-实现细节)
   - [核心实现](#41-核心实现)
   - [存储适配器](#42-存储适配器)
   - [缓存策略](#43-缓存策略)
   - [与框架集成](#44-与框架集成)

## 1. 插件概述

`@stratix/cache` 是Stratix框架的官方缓存插件，提供统一、灵活的缓存接口，支持多种缓存存储后端。插件设计遵循依赖倒置原则，通过抽象接口将缓存逻辑与具体存储实现分离，使应用代码不依赖特定的缓存技术。

核心特点：
- **多后端支持**：内置支持内存缓存、Redis、Memcached等多种缓存存储
- **统一接口**：提供简洁一致的API，易于使用和切换存储方式
- **缓存策略**：支持TTL过期、LRU淘汰、分层缓存等多种缓存策略
- **类型安全**：使用TypeScript提供完整类型定义
- **分布式支持**：内置分布式锁和原子操作，支持集群环境
- **可扩展**：易于扩展自定义存储适配器和缓存策略

## 2. 使用方式

### 2.1 基本使用

```typescript
// 引入Stratix框架和缓存插件
import { createApp } from 'stratix';
import cachePlugin from '@stratix/cache';

// 创建应用实例并注册缓存插件
const app = createApp();
app.register(cachePlugin, {
  // 默认使用内存缓存
  default: {
    type: 'memory',
    options: {
      max: 1000,  // 最大缓存项数
      ttl: 3600   // 默认过期时间(秒)
    }
  }
});

// 启动应用后使用缓存
await app.start();

// 方式1: 直接通过框架访问
const cache = app.cache;

// 基本操作
await cache.set('key1', 'value1', 60);  // 缓存60秒
const value = await cache.get('key1');   // 获取值
await cache.del('key1');                // 删除键
await cache.clear();                    // 清空缓存

// 方式2: 通过依赖注入使用
app.inject('userService', async (container) => {
  const cache = await container.resolve('cache');
  
  return {
    getUserById: async (id) => {
      // 尝试从缓存获取
      const cacheKey = `user:${id}`;
      let user = await cache.get(cacheKey);
      
      if (!user) {
        // 缓存未命中，从数据库查询
        user = await db.users.findById(id);
        
        // 存入缓存，设置30分钟过期
        if (user) {
          await cache.set(cacheKey, user, 1800);
        }
      }
      
      return user;
    }
  };
});
```

### 2.2 高级配置

```typescript
// 高级配置示例
app.register(cachePlugin, {
  // 默认缓存配置
  default: {
    type: 'redis',
    options: {
      host: 'localhost',
      port: 6379,
      password: 'secret',
      db: 0,
      keyPrefix: 'app:',
      ttl: 3600
    }
  },
  
  // 多缓存实例配置
  instances: {
    // 会话缓存 - 使用Redis
    session: {
      type: 'redis',
      options: {
        host: 'redis.example.com',
        port: 6379,
        password: 'session_secret',
        db: 1,
        keyPrefix: 'session:',
        ttl: 86400  // 1天过期
      }
    },
    
    // 本地缓存 - 使用内存
    local: {
      type: 'memory',
      options: {
        max: 500,
        ttl: 300,  // 5分钟过期
        updateAgeOnGet: true  // 访问时更新过期时间
      }
    },
    
    // 自定义存储适配器
    custom: {
      type: 'custom',
      adapter: new MyCustomCacheAdapter(),
      options: {
        // 适配器特定选项
      }
    }
  },
  
  // 全局配置
  serializer: {
    parse: (text) => JSON.parse(text),
    stringify: (data) => JSON.stringify(data)
  },
  
  // 错误处理
  onError: (err, operation, key) => {
    console.error(`Cache error during ${operation} for key ${key}:`, err);
  }
});

// 使用特定缓存实例
await app.caches.session.set('userId', '12345');
await app.caches.local.set('config', { theme: 'dark' });
```

### 2.3 缓存模式与策略

```typescript
// 使用不同的缓存模式和策略
app.register(async (app) => {
  const cache = await app.resolve('cache');
  
  // 1. 基本缓存模式
  const value = await cache.get('key');
  
  // 2. 获取或设置模式 
  const user = await cache.getOrSet('user:1', async () => {
    // 仅在缓存未命中时执行
    return await db.users.findById(1);
  }, 1800);  // 30分钟过期
  
  // 3. 缓存装饰器模式
  const userService = {
    // 使用缓存装饰方法
    getUserById: cache.wrap(
      async (id) => await db.users.findById(id),  // 原始函数
      {
        keyFn: (id) => `user:${id}`,  // 键生成函数
        ttl: 1800,                     // 过期时间
        condition: (id) => !!id        // 条件函数
      }
    )
  };
  
  // 4. 批量操作模式
  const keys = ['user:1', 'user:2', 'user:3'];
  const users = await cache.mget(keys);  // 批量获取
  await cache.mset({                     // 批量设置
    'user:4': { id: 4, name: 'Alice' },
    'user:5': { id: 5, name: 'Bob' }
  }, 1800);
  
  // 5. 原子操作模式
  await cache.increment('counter');                 // 递增
  await cache.decrement('counter', 5);              // 递减5
  await cache.setIfNotExists('lock:task1', 'lock'); // 仅当不存在时设置
  
  // 6. 标签/分组缓存
  const userCache = cache.namespace('users');
  await userCache.set('profile:1', { name: 'John' });  // 实际键为'users:profile:1'
  await userCache.clear();  // 清除所有users命名空间的缓存
});
```

### 2.4 多级缓存

```typescript
// 配置多级缓存
app.register(cachePlugin, {
  default: {
    // 配置多级缓存
    type: 'multi',
    options: {
      // 缓存层级定义，按顺序检查和更新
      layers: [
        // L1: 本地内存缓存 (快速但有限)
        {
          type: 'memory',
          options: {
            max: 100,   // 只缓存100个项目
            ttl: 60     // 60秒
          }
        },
        
        // L2: Redis缓存 (较慢但容量大)
        {
          type: 'redis',
          options: {
            host: 'localhost',
            port: 6379,
            ttl: 3600   // 1小时
          }
        }
      ],
      
      // 多级缓存策略
      strategy: 'write-through',  // 穿透写入(同时更新所有层)
      // 其他策略: 'write-back' (延迟写入), 'write-around' (跳过L1直接写L2)
      
      // 配置L1缓存失效后的重填充行为
      refillL1: true
    }
  }
});

// 多级缓存使用方式与普通缓存相同
await app.cache.set('key', 'value');  // 自动写入所有层级
const value = await app.cache.get('key');  // 按层级顺序查询
```

### 2.5 分布式缓存

```typescript
// 配置分布式缓存支持
app.register(cachePlugin, {
  default: {
    type: 'redis',
    options: {
      // Redis集群配置
      cluster: [
        { host: 'redis-node1', port: 6379 },
        { host: 'redis-node2', port: 6379 },
        { host: 'redis-node3', port: 6379 }
      ],
      
      // 或Redis Sentinel配置
      sentinels: [
        { host: 'sentinel-1', port: 26379 },
        { host: 'sentinel-2', port: 26379 }
      ],
      name: 'mymaster',
      
      // 分布式锁配置
      enableLock: true,
      lockTTL: 30,       // 锁过期时间(秒)
      lockRetry: 3,      // 获取锁重试次数
      lockRetryDelay: 200 // 重试间隔(毫秒)
    }
  }
});

// 使用分布式锁
const cache = app.cache;

// 分布式锁模式
const result = await cache.withLock('process:daily', async () => {
  // 获取锁后执行的代码
  await processData();
  return { success: true };
}, {
  ttl: 60,        // 锁60秒过期
  retry: 5,       // 最多重试5次
  retryDelay: 500 // 每次重试间隔500毫秒
});

// 手动锁操作
const lockAcquired = await cache.acquireLock('task:import');
if (lockAcquired) {
  try {
    // 执行需要加锁的操作
    await importData();
  } finally {
    // 释放锁
    await cache.releaseLock('task:import');
  }
}
```

## 3. API设计

### 3.1 插件API

```typescript
// 插件定义
interface CachePlugin {
  name: string;
  dependencies: string[];
  register: (app: StratixApp, options: CacheOptions) => Promise<void>;
}

// 默认导出
export default CachePlugin;
```

### 3.2 缓存管理器API

```typescript
// 缓存管理器接口
interface CacheManager {
  // 获取默认缓存实例
  default: CacheStore;
  
  // 获取指定缓存实例
  instance(name: string): CacheStore;
  
  // 所有缓存实例映射
  instances: Record<string, CacheStore>;
  
  // 添加新缓存实例
  addInstance(name: string, config: CacheStoreConfig): CacheStore;
  
  // 移除缓存实例
  removeInstance(name: string): boolean;
  
  // 清空所有缓存
  clearAll(): Promise<void>;
  
  // 创建命名空间
  namespace(prefix: string): CacheStore;
  
  // 关闭所有连接
  close(): Promise<void>;
}
```

### 3.3 缓存存储API

```typescript
// 缓存存储接口
interface CacheStore {
  // 基本操作
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<boolean>;
  del(key: string | string[]): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  
  // 批量操作
  mget<T = any>(keys: string[]): Promise<(T | null)[]>;
  mset(entries: Record<string, any>, ttl?: number): Promise<boolean>;
  mdel(keys: string[]): Promise<boolean>;
  
  // 高级获取
  getOrSet<T = any>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
  getWithMetadata<T = any>(key: string): Promise<{ value: T, metadata: CacheMetadata } | null>;
  
  // 计数器操作
  increment(key: string, value?: number): Promise<number>;
  decrement(key: string, value?: number): Promise<number>;
  
  // 原子操作
  setIfNotExists(key: string, value: any, ttl?: number): Promise<boolean>;
  setIfExists(key: string, value: any, ttl?: number): Promise<boolean>;
  
  // 工具方法
  getKeysByPattern(pattern: string): Promise<string[]>;
  getTtl(key: string): Promise<number | null>;
  setTtl(key: string, ttl: number): Promise<boolean>;
  touch(key: string): Promise<boolean>;
  
  // 装饰器
  wrap<T = any, A extends any[] = any[]>(
    fn: (...args: A) => Promise<T>, 
    options: WrapOptions<A>
  ): (...args: A) => Promise<T>;
  
  // 锁操作
  acquireLock(key: string, options?: LockOptions): Promise<boolean>;
  releaseLock(key: string): Promise<boolean>;
  withLock<T = any>(
    key: string, 
    fn: () => Promise<T>, 
    options?: LockOptions
  ): Promise<T | null>;
  
  // 命名空间操作
  namespace(prefix: string): CacheStore;
  
  // 关闭连接
  close(): Promise<void>;
}

// 缓存包装选项
interface WrapOptions<A extends any[] = any[]> {
  keyFn: (...args: A) => string;
  ttl?: number;
  condition?: (...args: A) => boolean;
  cacheErrors?: boolean;
}

// 锁选项
interface LockOptions {
  ttl?: number;
  retry?: number;
  retryDelay?: number;
  owner?: string;
}

// 缓存元数据
interface CacheMetadata {
  createdAt: number;
  expiresAt?: number;
  hits: number;
  lastAccessedAt: number;
}
```

### 3.4 配置选项

```typescript
// 插件配置选项
interface CacheOptions {
  // 默认缓存配置
  default: CacheStoreConfig;
  
  // 多实例配置
  instances?: Record<string, CacheStoreConfig>;
  
  // 全局序列化器
  serializer?: {
    stringify: (data: any) => string;
    parse: (text: string) => any;
  };
  
  // 错误处理
  onError?: (error: Error, operation: string, key?: string) => void;
}

// 缓存存储配置
interface CacheStoreConfig {
  // 存储类型
  type: 'memory' | 'redis' | 'memcached' | 'multi' | 'custom' | string;
  
  // 自定义适配器
  adapter?: CacheAdapter;
  
  // 配置选项
  options?: any;
}

// 内存缓存选项
interface MemoryCacheOptions {
  max?: number;         // 最大项目数
  ttl?: number;         // 默认过期时间(秒)
  updateAgeOnGet?: boolean; // 访问时更新过期时间
  sizeCalculation?: (value: any, key: string) => number; // 自定义大小计算
}

// Redis缓存选项
interface RedisCacheOptions {
  // 连接信息
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
  
  // 集群配置
  cluster?: Array<{ host: string, port: number }>;
  sentinels?: Array<{ host: string, port: number }>;
  name?: string;
  
  // 键配置
  keyPrefix?: string;
  ttl?: number;
  
  // 分布式锁配置
  enableLock?: boolean;
  lockTTL?: number;
  lockRetry?: number;
  lockRetryDelay?: number;
  
  // 连接池配置
  maxClientsCount?: number;
  connectionTimeout?: number;
  
  // 高级选项
  enableOfflineQueue?: boolean;
  reconnectOnError?: (err: Error) => boolean;
}
```

## 4. 实现细节

### 4.1 核心实现

```typescript
// 缓存管理器实现
class CacheManagerImpl implements CacheManager {
  private _instances: Map<string, CacheStore> = new Map();
  
  constructor(options: CacheOptions) {
    // 创建默认缓存实例
    const defaultStore = this.createStore(options.default, options);
    this._instances.set('default', defaultStore);
    
    // 创建其他配置的缓存实例
    if (options.instances) {
      for (const [name, config] of Object.entries(options.instances)) {
        const store = this.createStore(config, options);
        this._instances.set(name, store);
      }
    }
  }
  
  get default(): CacheStore {
    return this._instances.get('default')!;
  }
  
  instance(name: string): CacheStore {
    const store = this._instances.get(name);
    if (!store) {
      throw new Error(`Cache instance '${name}' not found`);
    }
    return store;
  }
  
  get instances(): Record<string, CacheStore> {
    return Object.fromEntries(this._instances.entries());
  }
  
  addInstance(name: string, config: CacheStoreConfig): CacheStore {
    // 确保名称不重复
    if (this._instances.has(name)) {
      throw new Error(`Cache instance '${name}' already exists`);
    }
    
    // 创建新实例
    const store = this.createStore(config);
    this._instances.set(name, store);
    return store;
  }
  
  removeInstance(name: string): boolean {
    if (name === 'default') {
      throw new Error("Cannot remove the default cache instance");
    }
    
    const instance = this._instances.get(name);
    if (instance) {
      // 关闭连接
      instance.close().catch(err => {
        console.error(`Error closing cache instance '${name}':`, err);
      });
      return this._instances.delete(name);
    }
    return false;
  }
  
  async clearAll(): Promise<void> {
    // 清空所有缓存实例
    const promises = Array.from(this._instances.values()).map(store => 
      store.clear().catch(err => {
        console.error('Error clearing cache:', err);
      })
    );
    await Promise.all(promises);
  }
  
  namespace(prefix: string): CacheStore {
    // 创建命名空间包装器
    return this.default.namespace(prefix);
  }
  
  async close(): Promise<void> {
    // 关闭所有连接
    const promises = Array.from(this._instances.values()).map(store => 
      store.close().catch(err => {
        console.error('Error closing cache connection:', err);
      })
    );
    await Promise.all(promises);
    this._instances.clear();
  }
  
  private createStore(config: CacheStoreConfig, globalOptions?: CacheOptions): CacheStore {
    const { type, adapter, options = {} } = config;
    
    // 使用自定义适配器
    if (adapter) {
      return adapter;
    }
    
    // 根据类型创建适配器
    switch (type) {
      case 'memory':
        return new MemoryCacheAdapter(options);
      
      case 'redis':
        return new RedisCacheAdapter(options);
      
      case 'multi':
        return new MultiLevelCacheAdapter(options);
      
      // 其他适配器...
      
      default:
        throw new Error(`Unsupported cache type: ${type}`);
    }
  }
}

// 缓存插件注册
async function register(app: StratixApp, options: CacheOptions): Promise<void> {
  // 创建缓存管理器
  const cacheManager = new CacheManagerImpl(options);
  
  // 装饰应用实例
  app.decorate('cache', cacheManager.default);
  app.decorate('caches', cacheManager.instances);
  app.decorate('cacheManager', cacheManager);
  
  // 注册到容器
  app.inject('cache', () => cacheManager.default);
  app.inject('cacheManager', () => cacheManager);
  
  // 优雅关闭
  app.addHook('onClose', async () => {
    await cacheManager.close();
  });
}
```

### 4.2 存储适配器

```typescript
// 内存缓存适配器实现
import LRUCache from 'lru-cache';

class MemoryCacheAdapter implements CacheStore {
  private cache: LRUCache<string, any>;
  
  constructor(options: MemoryCacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.max || 1000,
      ttl: (options.ttl || 0) * 1000, // 转换为毫秒
      updateAgeOnGet: options.updateAgeOnGet,
      sizeCalculation: options.sizeCalculation
    });
  }
  
  async get<T = any>(key: string): Promise<T | null> {
    const value = this.cache.get(key);
    return value !== undefined ? value : null;
  }
  
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    const options = ttl ? { ttl: ttl * 1000 } : undefined;
    this.cache.set(key, value, options);
    return true;
  }
  
  async del(key: string | string[]): Promise<boolean> {
    if (Array.isArray(key)) {
      for (const k of key) {
        this.cache.delete(k);
      }
    } else {
      this.cache.delete(key);
    }
    return true;
  }
  
  // 其他方法实现...
}

// Redis缓存适配器实现
import Redis from 'ioredis';

class RedisCacheAdapter implements CacheStore {
  private client: Redis.Redis;
  private prefix: string;
  private defaultTtl: number;
  
  constructor(options: RedisCacheOptions = {}) {
    // 创建Redis客户端
    if (options.cluster) {
      this.client = new Redis.Cluster(options.cluster, options);
    } else if (options.sentinels) {
      this.client = new Redis({
        sentinels: options.sentinels,
        name: options.name,
        ...options
      });
    } else if (options.url) {
      this.client = new Redis(options.url, options);
    } else {
      this.client = new Redis({
        host: options.host || 'localhost',
        port: options.port || 6379,
        password: options.password,
        db: options.db || 0,
        ...options
      });
    }
    
    this.prefix = options.keyPrefix || '';
    this.defaultTtl = options.ttl || 0;
  }
  
  private getKey(key: string): string {
    return this.prefix + key;
  }
  
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(this.getKey(key));
    if (value === null) return null;
    
    try {
      return JSON.parse(value);
    } catch (e) {
      return value as unknown as T;
    }
  }
  
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const actualTtl = ttl ?? this.defaultTtl;
    
    if (actualTtl > 0) {
      await this.client.set(this.getKey(key), serialized, 'EX', actualTtl);
    } else {
      await this.client.set(this.getKey(key), serialized);
    }
    
    return true;
  }
  
  // 其他方法实现...
}
```

### 4.3 缓存策略

```typescript
// 多级缓存适配器实现
class MultiLevelCacheAdapter implements CacheStore {
  private layers: CacheStore[];
  private strategy: 'write-through' | 'write-back' | 'write-around';
  private refillL1: boolean;
  
  constructor(options: MultiLevelCacheOptions) {
    // 初始化缓存层
    this.layers = options.layers.map(layerConfig => {
      // 创建层级适配器
      return createCacheAdapter(layerConfig);
    });
    
    this.strategy = options.strategy || 'write-through';
    this.refillL1 = options.refillL1 !== false;
  }
  
  async get<T = any>(key: string): Promise<T | null> {
    // 按顺序查询每一层
    for (let i = 0; i < this.layers.length; i++) {
      const value = await this.layers[i].get<T>(key);
      
      if (value !== null) {
        // 找到值，填充前面的层
        if (this.refillL1 && i > 0) {
          // 异步填充上层缓存
          this.fillUpperLayers(key, value, i).catch(err => {
            console.error(`Error filling upper cache layers for key ${key}:`, err);
          });
        }
        
        return value;
      }
    }
    
    return null;
  }
  
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    switch (this.strategy) {
      case 'write-through':
        // 写入所有层
        await Promise.all(this.layers.map(layer => 
          layer.set(key, value, ttl)
        ));
        break;
        
      case 'write-back':
        // 只写入第一层，后续异步写入
        await this.layers[0].set(key, value, ttl);
        setTimeout(() => {
          // 异步写入其他层
          this.layers.slice(1).forEach(layer => 
            layer.set(key, value, ttl).catch(err => {
              console.error(`Error in write-back for key ${key}:`, err);
            })
          );
        }, 0);
        break;
        
      case 'write-around':
        // 跳过第一层，直接写入后端存储
        if (this.layers.length > 1) {
          await this.layers.slice(1).reduce((promise, layer) => 
            promise.then(() => layer.set(key, value, ttl)),
            Promise.resolve()
          );
        }
        break;
    }
    
    return true;
  }
  
  private async fillUpperLayers<T = any>(key: string, value: T, foundAtIndex: number): Promise<void> {
    // 填充上层缓存
    for (let i = 0; i < foundAtIndex; i++) {
      await this.layers[i].set(key, value);
    }
  }
  
  // 其他方法实现...
}
```

### 4.4 与框架集成

```typescript
// 缓存装饰器实现
function wrapFunction<T = any, A extends any[] = any[]>(
  fn: (...args: A) => Promise<T>,
  options: WrapOptions<A>,
  cache: CacheStore
): (...args: A) => Promise<T> {
  return async function(...args: A): Promise<T> {
    // 检查条件
    if (options.condition && !options.condition(...args)) {
      return fn(...args);
    }
    
    // 生成缓存键
    const key = options.keyFn(...args);
    
    try {
      // 尝试从缓存获取
      const cachedResult = await cache.get<T>(key);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // 执行原始函数
      const result = await fn(...args);
      
      // 存入缓存
      await cache.set(key, result, options.ttl);
      
      return result;
    } catch (error) {
      // 处理错误
      if (options.cacheErrors) {
        // 缓存错误结果
        await cache.set(key, { __error: error }, options.ttl);
      }
      throw error;
    }
  };
}

// 分布式锁实现
async function withLock<T = any>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {},
  redis: Redis.Redis
): Promise<T | null> {
  const lockKey = `lock:${key}`;
  const owner = options.owner || uuidv4();
  const ttl = options.ttl || 30;
  const retry = options.retry || 0;
  const retryDelay = options.retryDelay || 200;
  
  // 尝试获取锁
  const acquireLock = async (): Promise<boolean> => {
    return await redis.set(lockKey, owner, 'NX', 'EX', ttl) === 'OK';
  };
  
  // 释放锁
  const releaseLock = async (): Promise<void> => {
    // 使用Lua脚本确保仅释放自己的锁
    const script = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    
    await redis.eval(script, 1, lockKey, owner);
  };
  
  // 尝试获取锁
  let acquired = await acquireLock();
  let attempts = 0;
  
  while (!acquired && attempts < retry) {
    // 等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    acquired = await acquireLock();
    attempts++;
  }
  
  if (!acquired) {
    return null; // 未能获取锁
  }
  
  try {
    // 执行受保护的函数
    return await fn();
  } finally {
    // 确保释放锁
    await releaseLock();
  }
}
``` 