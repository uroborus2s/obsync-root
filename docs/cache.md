# Stratix 缓存插件详细设计文档 (@stratix/cache)

## 目录
- [Stratix 缓存插件详细设计文档 (@stratix/cache)](#stratix-缓存插件详细设计文档-stratixcache)
  - [目录](#目录)
  - [1. 插件概述](#1-插件概述)
  - [2. 设计原则](#2-设计原则)
  - [3. 功能特性](#3-功能特性)
  - [4. 架构设计](#4-架构设计)
  - [5. 核心API](#5-核心api)
  - [6. 缓存驱动](#6-缓存驱动)
  - [7. 高级特性](#7-高级特性)
  - [8. 与框架集成](#8-与框架集成)
  - [9. 测试策略](#9-测试策略)
  - [10. 使用示例](#10-使用示例)

## 1. 插件概述

`@stratix/cache`是Stratix框架的官方缓存插件，提供统一、灵活的缓存接口，支持多种缓存存储后端。该插件遵循Stratix框架的插件设计原则，通过依赖倒置原则和抽象接口，实现了缓存逻辑与存储实现的解耦，为应用开发提供简单而强大的缓存解决方案。

### 1.1 核心设计思想

缓存插件的核心设计思想是提供一个统一的缓存抽象层，使应用代码不依赖于特定的缓存技术，同时确保高性能、高可用性和可扩展性。主要体现在以下几个方面：

1. **统一接口**：无论底层使用何种缓存技术，都提供一致的API
2. **灵活配置**：支持多种缓存驱动和策略，可根据需求灵活切换
3. **多级缓存**：支持分层缓存架构，优化性能和资源利用
4. **分布式支持**：原生支持分布式环境中的缓存一致性和同步
5. **类型安全**：完整的TypeScript类型定义，提供良好的开发体验

### 1.2 解决的问题

缓存插件主要解决以下问题：

1. **性能优化**：减少重复计算和数据库查询，提高应用响应速度
2. **资源利用**：降低后端服务负载，提高系统整体吞吐量
3. **一致性管理**：提供缓存失效和更新策略，保持数据一致性
4. **横切关注点**：将缓存逻辑从业务代码中分离，提高代码可维护性
5. **技术选型灵活性**：允许在不修改应用代码的情况下切换缓存技术

## 2. 设计原则

缓存插件的设计遵循以下核心原则：

### 2.1 依赖倒置原则

通过定义抽象接口而非依赖具体实现，实现高层业务逻辑和底层缓存实现的解耦。这使得:

- 应用代码可以通过通用接口与缓存交互，不需要关心底层实现
- 可以轻松替换缓存驱动，而不需要修改业务代码
- 可以添加新的缓存驱动实现，而不影响现有功能

### 2.2 单一职责原则

插件内部各组件有明确的职责划分：

- **缓存管理器**：负责管理缓存实例和提供全局配置
- **缓存存储**：提供统一的缓存操作接口
- **存储适配器**：负责适配不同的缓存技术
- **序列化器**：处理对象的序列化和反序列化
- **锁管理器**：提供分布式锁功能

### 2.3 开闭原则

插件设计上对扩展开放，对修改关闭：

- 通过适配器模式支持添加新的缓存驱动
- 提供钩子点允许扩展现有行为
- 配置系统允许调整行为而无需修改代码

### 2.4 接口隔离原则

提供粒度合适的接口，避免强制实现不需要的方法：

- 基础缓存接口仅包含必要的操作
- 高级功能（如锁、事件等）通过扩展接口提供
- 存储适配器可以选择性实现高级特性

### 2.5 松耦合设计

组件之间通过接口和事件通信，降低耦合度：

- 使用依赖注入而非直接引用
- 通过事件系统实现组件间通信
- 使用中介者模式管理复杂交互

## 3. 功能特性

缓存插件提供以下核心功能特性：

### 3.1 多驱动支持

内置支持多种缓存驱动，包括：

- **内存缓存**：基于LRU算法的进程内内存缓存
- **Redis缓存**：支持单节点、集群和哨兵模式
- **文件缓存**：将缓存数据持久化到文件系统
- **多级缓存**：组合多种缓存驱动，实现分层缓存策略

同时提供扩展点，支持自定义缓存驱动的实现。

### 3.2 缓存操作

提供丰富的缓存操作API：

- **基本操作**：get、set、del、has、clear等
- **批量操作**：mget、mset、mdel等批量处理函数
- **原子操作**：increment、decrement、setIfNotExists等
- **高级获取**：getOrSet、wrap等简化常见模式的函数

### 3.3 缓存策略

支持多种缓存策略：

- **TTL过期**：基于时间的自动过期策略
- **LRU淘汰**：基于最近最少使用的淘汰策略
- **多级缓存策略**：write-through、write-back、write-around等
- **自定义策略**：支持通过钩子和事件系统实现自定义策略

### 3.4 分布式功能

为分布式环境提供专门支持：

- **分布式锁**：提供基于缓存的分布式锁机制
- **原子操作**：确保在分布式环境中的操作原子性
- **一致性保证**：通过适当的策略确保多节点缓存一致性
- **集群支持**：支持Redis集群等分布式缓存架构

### 3.5 高级特性

包含多种高级功能：

- **命名空间**：通过前缀分隔不同应用域的缓存
- **标签/分组**：对缓存项进行分组并批量管理
- **事件系统**：提供缓存操作的事件通知
- **缓存统计**：收集缓存使用的统计信息
- **自动序列化**：对复杂对象进行自动序列化/反序列化

## 4. 架构设计

### 4.1 整体架构

缓存插件采用分层架构设计，各层次之间通过接口通信，确保松耦合和可扩展性。整体架构如下：

```
┌─────────────────────────────────────────────────────────────┐
│                     应用代码/业务逻辑                         │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                         缓存插件API                          │
│                                                             │
│   ┌─────────────────┐    ┌──────────────────────────────┐   │
│   │   缓存管理器    │───>│          缓存存储            │   │
│   └─────────────────┘    └──────────────┬───────────────┘   │
│                                         │                   │
│   ┌─────────────────┐    ┌──────────────▼───────────────┐   │
│   │   序列化器      │<──>│        存储适配器            │   │
│   └─────────────────┘    └──────────────┬───────────────┘   │
│                                         │                   │
│   ┌─────────────────┐    ┌──────────────▼───────────────┐   │
│   │   事件系统      │<──>│          驱动实现            │   │
│   └─────────────────┘    └──────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                       缓存后端存储                           │
│                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
│   │   内存缓存  │   │  Redis缓存  │   │   文件缓存      │   │
│   └─────────────┘   └─────────────┘   └─────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心组件

#### 4.2.1 缓存管理器 (CacheManager)

缓存管理器负责管理所有缓存实例，提供全局配置和访问点。主要职责包括：

- 管理多个缓存实例（默认实例和命名实例）
- 提供创建、获取和删除缓存实例的方法
- 处理全局配置和默认值
- 管理缓存资源和生命周期

#### 4.2.2 缓存存储 (CacheStore)

缓存存储是应用代码直接交互的接口，提供统一的缓存操作方法。主要职责包括：

- 提供基本的缓存操作（get、set、del等）
- 提供批量操作和高级操作方法
- 管理缓存键的命名空间和前缀
- 封装底层适配器的差异

#### 4.2.3 存储适配器 (CacheAdapter)

存储适配器负责桥接通用缓存接口和特定缓存技术实现。主要职责包括：

- 将缓存操作转换为特定技术的调用
- 适配不同缓存技术的特性和限制
- 处理连接管理和错误处理
- 实现特定缓存驱动的高级功能

#### 4.2.4 序列化器 (Serializer)

序列化器负责处理复杂对象的序列化和反序列化。主要职责包括：

- 将JavaScript对象转换为可存储的格式
- 将存储的数据转换回JavaScript对象
- 支持自定义序列化策略
- 处理特殊类型（如Date、Map、Set等）

#### 4.2.5 事件系统 (EventSystem)

事件系统提供缓存操作的事件通知机制。主要职责包括：

- 发布缓存操作事件（如set、get、del等）
- 允许监听缓存操作事件
- 支持事件过滤和处理
- 提供调试和监控能力

### 4.3 组件关系

组件之间的交互流程：

1. **应用代码**通过依赖注入或应用实例访问**缓存管理器**或直接访问默认**缓存存储**
2. **缓存存储**接收缓存操作请求，处理键命名空间和前缀
3. **缓存存储**调用**存储适配器**执行实际缓存操作
4. **存储适配器**根据需要使用**序列化器**处理数据
5. **存储适配器**与具体的**缓存驱动实现**交互
6. 操作完成后，通过**事件系统**通知相关事件

### 4.4 缓存键设计

缓存键设计遵循以下原则：

1. **命名空间隔离**：使用前缀区分不同功能域
2. **分层结构**：使用分隔符组织有层次的键结构
3. **唯一性保证**：确保在应用范围内的键唯一性
4. **可读性**：键名应具有可读性和自描述性

典型的键结构：`{前缀}:{命名空间}:{实体类型}:{标识符}:{属性}`

例如：`app:users:profile:123:avatar`

### 4.5 缓存一致性设计

为确保缓存一致性，插件采用以下策略：

1. **过期时间控制**：为所有缓存项设置适当的过期时间
2. **主动失效**：在数据变更时主动使相关缓存失效
3. **更新策略**：根据需求选择适当的缓存更新策略（如Cache-Aside、Read-Through等）
4. **锁机制**：使用分布式锁避免缓存更新的竞态条件
5. **版本标记**：使用版本号或时间戳标记缓存数据版本

## 5. 核心API

缓存插件提供了一组清晰、一致的API，用于管理和操作缓存。下面详细介绍各个核心API。

### 5.1 插件API

插件API定义了如何注册和配置缓存插件：

```typescript
// 插件定义
const cachePlugin: StratixPlugin = {
  name: 'cache',
  dependencies: ['config', 'logger'],
  register: async (app, options: CacheOptions) => {
    // 插件注册实现
  }
};

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
  type: 'memory' | 'redis' | 'file' | 'multi' | 'custom' | string;
  
  // 自定义适配器
  adapter?: CacheAdapter;
  
  // 配置选项
  options?: any;
}
```

### 5.2 缓存管理器API

缓存管理器API用于管理多个缓存实例：

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

### 5.3 缓存存储API

缓存存储API是应用代码最常使用的接口，提供了缓存操作的核心方法：

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
  getOrSet<T = any>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T>;
  
  getWithMetadata<T = any>(
    key: string
  ): Promise<{ value: T, metadata: CacheMetadata } | null>;
  
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

### 5.4 存储适配器API

存储适配器API定义了特定缓存技术的实现接口：

```typescript
// 缓存适配器接口
interface CacheAdapter {
  // 基本操作
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  
  // 其他操作（可选实现）
  mget?(keys: string[]): Promise<(string | null)[]>;
  mset?(entries: Record<string, string>, ttl?: number): Promise<boolean>;
  mdel?(keys: string[]): Promise<boolean>;
  increment?(key: string, value?: number): Promise<number>;
  decrement?(key: string, value?: number): Promise<number>;
  getKeysByPattern?(pattern: string): Promise<string[]>;
  getTtl?(key: string): Promise<number | null>;
  setTtl?(key: string, ttl: number): Promise<boolean>;
  acquireLock?(key: string, options?: LockOptions): Promise<boolean>;
  releaseLock?(key: string): Promise<boolean>;
  
  // 生命周期
  close(): Promise<void>;
}
```

### 5.5 序列化器API

序列化器API处理数据的序列化和反序列化：

```typescript
// 序列化器接口
interface Serializer {
  stringify(value: any): string;
  parse<T = any>(text: string): T;
}

// 默认JSON序列化器
const jsonSerializer: Serializer = {
  stringify: (value: any) => JSON.stringify(value),
  parse: <T = any>(text: string) => JSON.parse(text) as T
};
```

### 5.6 事件API

事件API用于监听缓存操作事件：

```typescript
// 事件类型
type CacheEventType = 
  | 'get' 
  | 'set' 
  | 'del' 
  | 'clear'
  | 'hit'
  | 'miss'
  | 'error';

// 事件数据
interface CacheEvent {
  type: CacheEventType;
  store: string;
  key?: string;
  value?: any;
  ttl?: number;
  error?: Error;
  timestamp: number;
  duration?: number;
}

// 事件监听器
type CacheEventListener = (event: CacheEvent) => void;

// 事件API
interface CacheEvents {
  on(event: CacheEventType | '*', listener: CacheEventListener): void;
  off(event: CacheEventType | '*', listener: CacheEventListener): void;
  once(event: CacheEventType | '*', listener: CacheEventListener): void;
  emit(event: CacheEvent): void;
}
```

## 6. 缓存驱动

缓存插件支持多种缓存驱动，每种驱动都有其特点和适用场景。本节详细介绍内置的缓存驱动实现。

### 6.1 内存缓存驱动

内存缓存驱动基于LRU (Least Recently Used) 算法实现，提供高速但非持久化的缓存存储。

#### 6.1.1 特点

- **高性能**：直接在进程内存中存储数据，提供最快的访问速度
- **无持久化**：应用重启后缓存数据会丢失
- **进程隔离**：多实例/集群环境下各进程缓存互相独立
- **内存管理**：支持LRU策略和最大缓存项限制，防止内存溢出

#### 6.1.2 配置选项

```typescript
interface MemoryCacheOptions {
  max?: number;         // 最大项目数(默认1000)
  ttl?: number;         // 默认过期时间(秒)，0表示不过期
  maxSize?: number;     // 最大内存占用(bytes)，0表示不限制
  updateAgeOnGet?: boolean; // 访问时更新过期时间(默认false)
  sizeCalculation?: (value: any, key: string) => number; // 自定义大小计算
}
```

#### 6.1.3 使用场景

- 高频访问、低价值数据的临时存储
- 单实例应用中的本地缓存
- 缓存计算结果、查询结果等瞬态数据
- 作为多级缓存的第一级（L1缓存）

#### 6.1.4 实现说明

内存缓存驱动基于高性能的LRU-Cache库实现，使用Map作为底层存储，提供O(1)复杂度的访问性能。为提升性能，驱动实现中使用了以下优化：

- 延迟初始化：仅在首次使用时创建缓存实例
- 原子操作优化：针对increment/decrement等操作进行了原子性保证
- 扁平化键存储：避免深层对象查找开销
- 弱引用支持：可选配置使用WeakMap防止内存泄漏

### 6.2 Redis缓存驱动

Redis缓存驱动基于ioredis客户端实现，提供持久化、分布式支持的高性能缓存解决方案。

#### 6.2.1 特点

- **持久化**：支持数据持久化，应用重启后缓存仍可用
- **分布式支持**：适用于多实例/集群环境，提供共享缓存
- **丰富的数据结构**：支持字符串、哈希、列表、集合等多种数据类型
- **原子操作**：提供多种原子操作支持
- **高级特性**：支持发布/订阅、Lua脚本、流等功能

#### 6.2.2 配置选项

```typescript
interface RedisCacheOptions {
  // 连接信息
  host?: string;        // Redis服务器地址(默认localhost)
  port?: number;        // Redis端口(默认6379)
  password?: string;    // Redis密码
  db?: number;          // 数据库索引(默认0)
  url?: string;         // Redis连接URL，覆盖上述选项
  
  // 集群配置
  cluster?: Array<{ host: string, port: number }>; // Redis集群节点
  sentinels?: Array<{ host: string, port: number }>; // Redis哨兵节点
  name?: string;        // Redis哨兵主节点名称
  
  // 键配置
  keyPrefix?: string;   // 键前缀
  ttl?: number;         // 默认过期时间(秒)
  
  // 分布式锁配置
  enableLock?: boolean; // 是否启用分布式锁(默认true)
  lockTTL?: number;     // 锁默认过期时间(秒)(默认30)
  lockRetry?: number;   // 获取锁重试次数(默认3)
  lockRetryDelay?: number; // 重试间隔(毫秒)(默认200)
  
  // 连接池配置
  maxClientsCount?: number; // 最大客户端连接数
  connectionTimeout?: number; // 连接超时(毫秒)
  
  // 高级选项
  enableOfflineQueue?: boolean; // 离线队列
  reconnectOnError?: (err: Error) => boolean; // 错误重连策略
}
```

#### 6.2.3 使用场景

- 多实例/集群环境中的共享缓存
- 需要持久化的缓存数据
- 需要原子操作支持的场景
- 分布式锁实现
- 大规模缓存系统

#### 6.2.4 实现说明

Redis缓存驱动使用ioredis客户端与Redis服务器通信，支持单节点、集群和哨兵模式。驱动内部使用连接池管理Redis连接，并实现了健壮的错误处理和重试机制。

关键优化包括：
- 管道批处理：mget/mset等批量操作使用pipeline提升性能
- 连接复用：使用连接池减少连接开销
- 自动重连：网络异常时自动重连
- 命令优化：使用Redis原生命令而非Lua脚本，提升兼容性

### 6.3 文件缓存驱动

文件缓存驱动将缓存数据持久化到文件系统，提供低成本、简单的持久化缓存解决方案。

#### 6.3.1 特点

- **持久化**：数据持久化到文件系统，应用重启后缓存仍可用
- **无外部依赖**：不需要额外的缓存服务器
- **直观可查**：缓存数据可直接查看和编辑
- **低内存占用**：适合大容量但访问频率较低的数据

#### 6.3.2 配置选项

```typescript
interface FileCacheOptions {
  path?: string;        // 缓存文件存储路径(默认.cache)
  ttl?: number;         // 默认过期时间(秒)
  extension?: string;   // 缓存文件扩展名(默认.json)
  directoryMode?: number; // 目录权限(默认0o777)
  fileMode?: number;    // 文件权限(默认0o666)
  cleanInterval?: number; // 过期清理间隔(秒)(默认60)
  encoding?: string;    // 文件编码(默认utf8)
  flattenBy?: number;   // 键分片层级(默认2)
}
```

#### 6.3.3 使用场景

- 开发和测试环境
- 简单应用不想依赖外部缓存服务
- 需要持久化但访问频率不高的数据
- 离线应用或边缘计算场景

#### 6.3.4 实现说明

文件缓存驱动使用文件系统API将缓存数据保存为JSON文件。为提高性能和避免文件系统限制，驱动实现了以下优化：

- 分层存储：使用分片目录结构避免单目录文件过多
- 异步操作：文件读写使用异步API避免阻塞
- 内存索引：维护内存中的键索引，减少文件访问
- 定期清理：后台任务定期清理过期缓存文件

### 6.4 多级缓存驱动

多级缓存驱动将多个缓存驱动组合为分层架构，优化读写性能和资源利用。

#### 6.4.1 特点

- **层级化**：支持多层缓存，每层具有不同特性
- **缓存策略**：支持多种缓存更新策略
- **自动同步**：层间数据自动同步
- **性能优化**：综合利用各层缓存的优势

#### 6.4.2 配置选项

```typescript
interface MultiLevelCacheOptions {
  // 缓存层级定义
  layers: CacheStoreConfig[];
  
  // 多级缓存策略
  strategy?: 'write-through' | 'write-back' | 'write-around';
  
  // 回填配置
  refillL1?: boolean;     // 是否回填上层缓存
  refillAsync?: boolean;  // 异步回填(不阻塞响应)
  refillTtlFactor?: number; // 上层缓存TTL系数(相对于原缓存)
  
  // 写回配置 (仅write-back策略)
  writeBackDelay?: number; // 延迟写入时间(毫秒)
  batchWrites?: boolean;   // 批量写入
  retryWrites?: number;    // 写入失败重试次数
}
```

#### 6.4.3 使用场景

- 需要兼顾性能和持久性的场景
- 高流量应用需要减轻后端缓存服务负担
- 需要平衡本地缓存和分布式缓存的优缺点
- 构建弹性缓存系统，容忍某一层故障

#### 6.4.4 实现说明

多级缓存驱动管理多个缓存驱动实例，并根据配置的策略协调它们之间的数据同步。主要实现了以下三种策略：

- **write-through**：同时写入所有层级，读取时按层级顺序查找
- **write-back**：立即写入最上层，延迟写入下层，读取时按层级顺序查找
- **write-around**：直接写入最下层，跳过上层，读取时优先查找上层

## 7. 高级特性

本节详细介绍缓存插件提供的高级特性，这些特性可以帮助开发者构建更复杂、更健壮的缓存解决方案。

### 7.1 分布式锁

分布式锁功能允许在分布式环境中进行资源协调和并发控制，确保在多实例环境中同一时间只有一个进程能够访问共享资源。

#### 7.1.1 基本使用

```typescript
// 获取锁
const locked = await cache.acquireLock('process:daily', { ttl: 60 });
if (locked) {
  try {
    // 执行需要加锁的操作
    await processData();
  } finally {
    // 释放锁
    await cache.releaseLock('process:daily');
  }
}

// 使用withLock简化加锁操作
const result = await cache.withLock('process:daily', async () => {
  // 获取锁后执行的代码
  await processData();
  return { success: true };
}, {
  ttl: 60,        // 锁60秒过期
  retry: 5,       // 最多重试5次
  retryDelay: 500 // 每次重试间隔500毫秒
});
```

#### 7.1.2 锁实现机制

分布式锁基于Redis的SETNX命令实现，具有以下特性：

- **原子性**：获取和释放锁操作具有原子性保证
- **过期时间**：自动过期机制防止死锁
- **锁所有者标识**：确保只有获取锁的实例才能释放锁
- **可重入**：支持同一进程重入锁
- **延长锁时间**：支持为长时间运行的任务延长锁时间

#### 7.1.3 高级配置

```typescript
interface LockOptions {
  ttl?: number;       // 锁过期时间(秒)
  retry?: number;     // 获取锁重试次数
  retryDelay?: number; // 重试间隔(毫秒)
  owner?: string;     // 锁所有者标识
  extend?: boolean;   // 是否自动延长锁时间
  extendThreshold?: number; // 剩余多少时间开始延长(默认ttl的1/2)
  extendInterval?: number;  // 延长检查间隔(毫秒)
}
```

### 7.2 缓存标签与分组

缓存标签功能允许将相关的缓存项组织在一起，并提供批量管理和失效的能力。

#### 7.2.1 基本使用

```typescript
// 创建标签管理器
const taggedCache = cache.tags(['users', `user:${userId}`]);

// 使用标签缓存数据
await taggedCache.set('profile', userProfile, 3600);
await taggedCache.set('permissions', userPermissions, 3600);

// 获取带标签的缓存
const profile = await taggedCache.get('profile');

// 使标签下所有缓存失效
await cache.tags(['users']).flush(); // 使所有用户相关缓存失效
await cache.tags([`user:${userId}`]).flush(); // 只使特定用户缓存失效
```

#### 7.2.2 实现机制

标签系统基于反向索引实现，主要包含两部分：

1. **标签到键的映射**：每个标签维护一个它关联的所有缓存键的集合
2. **键到标签的映射**：每个缓存键维护它关联的所有标签的列表

当使用标签存储数据时，系统会自动维护这些映射关系。当刷新标签时，系统会查找该标签关联的所有键并使其失效。

### 7.3 缓存预热与数据填充

缓存预热功能允许在应用启动时或特定时间点主动填充缓存，避免冷启动性能问题。

#### 7.3.1 基本使用

```typescript
// 定义预热器
const warmer = {
  key: 'global-config',  // 缓存键
  ttl: 3600,             // 缓存时间
  async load() {         // 数据加载函数
    return await db.configs.getAll();
  },
  interval: 1800         // 自动刷新间隔(秒)
};

// 注册预热器
cache.registerWarmer(warmer);

// 手动触发预热
await cache.warmup('global-config');

// 预热多个缓存
await cache.warmupAll();
```

#### 7.3.2 自动刷新机制

对于配置了interval的预热器，缓存系统将自动按指定间隔刷新数据，确保缓存始终包含最新数据。刷新策略包括：

- **后台刷新**：在后台进行刷新，不影响当前请求
- **错误容忍**：刷新失败不会使现有缓存失效
- **防重入**：同一时间只有一个刷新操作
- **资源控制**：可限制并发刷新数量

### 7.4 缓存统计与监控

缓存插件提供全面的统计和监控功能，帮助开发者了解缓存性能和使用情况。

#### 7.4.1 可用统计指标

```typescript
interface CacheStats {
  // 基本计数器
  hits: number;         // 缓存命中次数
  misses: number;       // 缓存未命中次数
  sets: number;         // 设置操作次数
  gets: number;         // 获取操作次数
  dels: number;         // 删除操作次数
  
  // 性能指标
  avgGetTime: number;   // 平均获取时间(毫秒)
  avgSetTime: number;   // 平均设置时间(毫秒)
  
  // 资源指标
  size: number;         // 缓存项数量
  memoryUsage?: number; // 内存使用量(bytes)
  
  // 命中率
  hitRate: number;      // 命中率(0-1)
  
  // 错误统计
  errors: number;       // 错误次数
  errorRate: number;    // 错误率(0-1)
}
```

#### 7.4.2 获取统计信息

```typescript
// 获取统计信息
const stats = await cache.getStats();
console.log(`缓存命中率: ${stats.hitRate * 100}%`);

// 重置统计信息
await cache.resetStats();

// 获取特定实例统计
const redisStats = await app.caches.redis.getStats();
```

#### 7.4.3 监控集成

缓存插件支持与流行的监控系统集成，包括：

- **Prometheus**：通过内置的metrics端点暴露缓存指标
- **StatsD**：定期发送缓存指标到StatsD服务器
- **应用性能监控**：与APM工具集成，提供缓存操作跟踪

### 7.5 缓存一致性保证

缓存插件提供多种机制确保缓存与源数据的一致性。

#### 7.5.1 版本化缓存

```typescript
// 存储带版本的数据
await cache.setVersioned('user:1', userData, {
  version: userData.version,
  ttl: 3600
});

// 条件获取数据(仅当版本匹配时)
const result = await cache.getVersioned('user:1', {
  minVersion: 5,  // 最小版本要求
  maxVersion: 10  // 最大版本要求
});

// 条件更新(乐观锁)
const updated = await cache.setVersionedIfMatch('user:1', newData, {
  expectedVersion: currentVersion,
  newVersion: newVersion,
  ttl: 3600
});
```

#### 7.5.2 事件驱动的缓存失效

缓存插件可以监听数据变更事件，自动使相关缓存失效：

```typescript
// 配置监听器
cache.invalidateOn('user:updated', (event) => {
  // 使用户相关的所有缓存失效
  return [
    `user:${event.id}:profile`,
    `user:${event.id}:permissions`
  ];
});

// 发布事件
eventBus.publish('user:updated', { id: 123 });
```

## 8. 与框架集成

缓存插件与Stratix框架紧密集成，提供无缝的使用体验。本节详细介绍缓存插件如何与框架的其他组件协同工作。

### 8.1 插件注册与生命周期

缓存插件遵循Stratix框架的标准插件生命周期，通过依赖注入系统提供服务：

```typescript
// 创建应用
import { createApp } from 'stratix';
import cachePlugin from '@stratix/cache';

const app = createApp();

// 注册缓存插件
app.register(cachePlugin, {
  default: {
    type: 'memory',
    options: {
      max: 1000,
      ttl: 3600
    }
  }
});

// 启动应用
await app.start();

// 框架关闭时自动清理缓存资源
await app.close(); // 会自动调用缓存的close方法
```

### 8.2 与依赖注入系统集成

缓存插件向依赖注入容器注册以下服务：

- **cache**: 默认缓存存储实例
- **cacheManager**: 缓存管理器实例
- **cacheFactory**: 创建新缓存实例的工厂函数

这些服务可以通过依赖注入在其他服务中使用：

```typescript
// 注册用户服务，依赖缓存服务
app.inject('userService', async (container) => {
  // 获取缓存服务
  const cache = await container.resolve('cache');
  const db = await container.resolve('database');
  
  return {
    async getUserById(id) {
      const cacheKey = `user:${id}`;
      
      // 尝试从缓存获取
      let user = await cache.get(cacheKey);
      if (user) return user;
      
      // 缓存未命中，从数据库获取
      user = await db.users.findById(id);
      if (user) {
        await cache.set(cacheKey, user, 1800); // 缓存30分钟
      }
      
      return user;
    }
  };
});
```

### 8.3 与配置系统集成

缓存插件与框架的配置系统集成，支持以下特性：

- **配置文件支持**：可以通过配置文件定义缓存配置
- **环境变量覆盖**：支持通过环境变量覆盖配置选项
- **动态配置更新**：支持在运行时更新部分配置

配置示例：

```typescript
// config/cache.js
export default {
  default: {
    type: process.env.CACHE_TYPE || 'memory',
    options: {
      // Memory缓存选项
      max: parseInt(process.env.CACHE_MAX_ITEMS || '1000'),
      ttl: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
      
      // Redis缓存选项(当type为redis时使用)
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  },
  instances: {
    // 会话缓存使用Redis
    session: {
      type: 'redis',
      options: {
        keyPrefix: 'session:',
        ttl: 86400 // 1天
      }
    }
  }
};
```

### 8.4 与日志系统集成

缓存插件与框架的日志系统集成，提供详细的操作日志：

```typescript
// 日志配置
app.register(cachePlugin, {
  default: {
    type: 'memory'
  },
  // 日志配置
  logging: {
    level: 'info', // 日志级别: debug, info, warn, error
    events: ['hit', 'miss', 'error'], // 记录的事件类型
    // 采样率(0-1)，用于高流量环境减少日志量
    sampleRate: 0.1 // 只记录10%的操作
  }
});
```

日志输出示例：

```
[2023-03-15T10:24:15.342Z] INFO (cache): Cache hit - key: "user:123", store: "default", time: 3ms
[2023-03-15T10:24:16.105Z] INFO (cache): Cache miss - key: "user:456", store: "default"
[2023-03-15T10:24:17.221Z] ERROR (cache): Cache error - operation: "set", key: "invalid~key", error: "Invalid character in key"
```

### 8.5 与健康检查系统集成

缓存插件与框架的健康检查系统集成，提供缓存服务的健康状态：

```typescript
// 健康检查路由
app.get('/health', async (req, reply) => {
  const cacheManager = await app.resolve('cacheManager');
  const healthChecks = {
    cache: {
      default: await checkCacheHealth(cacheManager.default),
      // 检查其他缓存实例
      redis: await checkCacheHealth(cacheManager.instance('redis'))
    }
  };
  
  return healthChecks;
});

// 缓存健康检查函数
async function checkCacheHealth(cache) {
  try {
    const testKey = `health_check_${Date.now()}`;
    await cache.set(testKey, 'test', 10);
    const value = await cache.get(testKey);
    await cache.del(testKey);
    
    return {
      status: 'ok',
      latency: `${performance.now() - start}ms` 
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}
```

## 9. 测试策略

本节描述缓存插件的测试策略，帮助开发者理解如何测试使用缓存的代码，以及如何在测试环境中处理缓存。

### 9.1 单元测试

单元测试缓存相关代码的关键是使用模拟缓存：

```typescript
// 创建缓存模拟
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  // 其他需要的方法...
};

// 测试依赖缓存的服务
describe('UserService', () => {
  let userService;
  
  beforeEach(() => {
    // 重置模拟
    mockCache.get.mockReset();
    mockCache.set.mockReset();
    
    // 创建服务实例，注入模拟缓存
    userService = createUserService({
      cache: mockCache,
      db: mockDb
    });
  });
  
  test('getUserById should return cached user when available', async () => {
    // 设置模拟返回值
    const mockUser = { id: 123, name: 'Test User' };
    mockCache.get.mockResolvedValue(mockUser);
    
    // 执行测试
    const result = await userService.getUserById(123);
    
    // 验证结果和交互
    expect(result).toEqual(mockUser);
    expect(mockCache.get).toHaveBeenCalledWith('user:123');
    expect(mockDb.users.findById).not.toHaveBeenCalled();
  });
  
  test('getUserById should fetch from DB and cache when not in cache', async () => {
    // 设置模拟返回值
    mockCache.get.mockResolvedValue(null); // 缓存未命中
    const mockUser = { id: 123, name: 'Test User' };
    mockDb.users.findById.mockResolvedValue(mockUser);
    
    // 执行测试
    const result = await userService.getUserById(123);
    
    // 验证结果和交互
    expect(result).toEqual(mockUser);
    expect(mockCache.get).toHaveBeenCalledWith('user:123');
    expect(mockDb.users.findById).toHaveBeenCalledWith(123);
    expect(mockCache.set).toHaveBeenCalledWith('user:123', mockUser, 1800);
  });
});
```

### 9.2 集成测试

集成测试需要使用真实的缓存实例，但通常使用内存缓存或测试专用的Redis实例：

```typescript
// 设置测试专用缓存
beforeAll(async () => {
  app = createApp();
  
  // 注册测试专用缓存配置
  app.register(cachePlugin, {
    default: {
      type: 'memory', // 使用内存缓存以避免外部依赖
      options: {
        ttl: 10 // 使用较短的TTL便于测试
      }
    }
  });
  
  await app.start();
});

afterAll(async () => {
  // 清理资源
  await app.close();
});

beforeEach(async () => {
  // 每个测试前清空缓存
  const cache = await app.resolve('cache');
  await cache.clear();
});

test('caching works in the integrated environment', async () => {
  const cache = await app.resolve('cache');
  
  // 设置缓存
  await cache.set('test-key', { value: 'test-data' }, 30);
  
  // 获取缓存
  const cachedValue = await cache.get('test-key');
  expect(cachedValue).toEqual({ value: 'test-data' });
});
```

### 9.3 性能测试

性能测试评估缓存的效率和可靠性：

```typescript
// 缓存性能测试
test('should handle high throughput', async () => {
  const cache = await app.resolve('cache');
  const iterations = 10000;
  const startTime = Date.now();
  
  // 批量写入
  const writePromises = [];
  for (let i = 0; i < iterations; i++) {
    writePromises.push(cache.set(`bench:${i}`, { value: i }, 60));
  }
  await Promise.all(writePromises);
  const writeTime = Date.now() - startTime;
  
  // 批量读取
  const readStart = Date.now();
  const readPromises = [];
  for (let i = 0; i < iterations; i++) {
    readPromises.push(cache.get(`bench:${i}`));
  }
  const results = await Promise.all(readPromises);
  const readTime = Date.now() - readStart;
  
  // 验证和记录性能指标
  expect(results.length).toBe(iterations);
  expect(results.every(r => r !== null)).toBe(true);
  
  console.log(`Write throughput: ${iterations / (writeTime / 1000)} ops/sec`);
  console.log(`Read throughput: ${iterations / (readTime / 1000)} ops/sec`);
});
```

### 9.4 模拟缓存适配器

提供专用的测试缓存适配器简化测试：

```typescript
// TestCacheAdapter.ts
export class TestCacheAdapter implements CacheAdapter {
  private store = new Map<string, { value: string, expires?: number }>();
  
  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expires && item.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.store.set(key, { value, expires });
    return true;
  }
  
  // 其他方法实现...
  
  // 测试辅助方法
  getSize(): number {
    return this.store.size;
  }
  
  // 模拟延迟
  setLatency(ms: number) {
    this.latency = ms;
  }
  
  // 模拟错误
  setErrorRate(rate: number) {
    this.errorRate = rate;
  }
}
```

## 10. 使用示例

本节提供完整的使用示例，展示如何在实际应用中使用缓存插件。

### 10.1 基础使用示例

以下是使用缓存插件的基本示例：

```typescript
// 引入依赖
import { createApp } from 'stratix';
import cachePlugin from '@stratix/cache';
import webPlugin from '@stratix/web';
import dbPlugin from '@stratix/database';

// 创建应用
const app = createApp();

// 注册插件
app.register(cachePlugin, {
  default: {
    type: 'memory',
    options: {
      max: 1000,
      ttl: 3600
    }
  }
});
app.register(dbPlugin, { /* 数据库配置 */ });
app.register(webPlugin, { /* Web服务配置 */ });

// 注册用户服务
app.inject('userService', async (container) => {
  const cache = await container.resolve('cache');
  const db = await container.resolve('database');
  const logger = await container.resolve('logger');
  
  return {
    async getUserById(id) {
      const cacheKey = `user:${id}`;
      
      try {
        // 尝试从缓存获取
        const user = await cache.get(cacheKey);
        if (user) {
          logger.debug(`Cache hit for user ${id}`);
          return user;
        }
        
        // 缓存未命中，从数据库获取
        logger.debug(`Cache miss for user ${id}, fetching from database`);
        const user = await db.users.findById(id);
        
        if (user) {
          // 存入缓存
          await cache.set(cacheKey, user, 1800); // 缓存30分钟
        }
        
        return user;
      } catch (error) {
        logger.error(`Error getting user ${id}: ${error.message}`);
        throw error;
      }
    },
    
    async updateUser(id, data) {
      try {
        // 更新数据库
        const updatedUser = await db.users.update(id, data);
        
        // 更新缓存
        await cache.set(`user:${id}`, updatedUser, 1800);
        
        // 删除可能包含该用户的列表缓存
        await cache.del(['users:recent', 'users:active']);
        
        return updatedUser;
      } catch (error) {
        logger.error(`Error updating user ${id}: ${error.message}`);
        throw error;
      }
    }
  };
});

// 注册API路由
app.register(async (app) => {
  const userService = await app.resolve('userService');
  
  app.get('/api/users/:id', async (req, reply) => {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return user;
  });
  
  app.put('/api/users/:id', async (req, reply) => {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    return updatedUser;
  });
});

// 启动应用
app.start().then(() => {
  console.log('Application started');
}).catch(err => {
  console.error('Error starting application:', err);
  process.exit(1);
});
```

### 10.2 高级使用示例

以下示例展示了高级缓存功能的使用：

```typescript
// 使用多实例和多级缓存
app.register(cachePlugin, {
  default: {
    type: 'multi',
    options: {
      layers: [
        {
          type: 'memory',
          options: { max: 500, ttl: 300 }
        },
        {
          type: 'redis',
          options: {
            host: 'localhost',
            port: 6379,
            ttl: 3600
          }
        }
      ],
      strategy: 'write-through',
      refillL1: true
    }
  },
  instances: {
    persistent: {
      type: 'redis',
      options: {
        host: 'localhost',
        port: 6379,
        db: 1,
        keyPrefix: 'persist:'
      }
    }
  }
});

// 使用缓存标签与分组
app.register(async (app) => {
  const cache = await app.resolve('cache');
  const db = await app.resolve('database');
  
  // 按分类缓存产品
  app.get('/api/products/category/:category', async (req, reply) => {
    const category = req.params.category;
    
    // 使用标签
    const taggedCache = cache.tags(['products', `category:${category}`]);
    
    // 尝试获取缓存
    let products = await taggedCache.get(`products:${category}`);
    if (!products) {
      // 缓存未命中，从数据库获取
      products = await db.products.findByCategory(category);
      
      // 存入缓存
      await taggedCache.set(`products:${category}`, products, 1800);
    }
    
    return products;
  });
  
  // 更新产品后使相关缓存失效
  app.post('/api/products', async (req, reply) => {
    const product = req.body;
    const savedProduct = await db.products.create(product);
    
    // 使特定分类的产品缓存失效
    await cache.tags([`category:${product.category}`]).flush();
    
    return savedProduct;
  });
});

// 使用分布式锁实现限流
app.register(async (app) => {
  const cache = await app.resolve('cache');
  
  app.addHook('preHandler', async (req, reply) => {
    const clientIp = req.ip;
    const rateLimitKey = `ratelimit:${clientIp}`;
    
    // 尝试获取锁
    const canProceed = await cache.withLock(`lock:${rateLimitKey}`, async () => {
      // 获取当前请求计数
      let count = parseInt(await cache.get(rateLimitKey) || '0');
      
      // 检查是否超过限制
      if (count >= 100) {  // 限制每IP每分钟100请求
        return false;
      }
      
      // 增加计数
      await cache.increment(rateLimitKey);
      
      // 如果是第一个请求，设置过期时间
      if (count === 0) {
        await cache.setTtl(rateLimitKey, 60);  // 60秒后重置
      }
      
      return true;
    }, { ttl: 5, retry: 3 });
    
    if (!canProceed) {
      reply.code(429).send({ error: 'Too Many Requests' });
      return reply;
    }
  });
});
```