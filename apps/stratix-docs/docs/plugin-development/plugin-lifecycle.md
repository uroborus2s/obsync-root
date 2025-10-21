---
sidebar_position: 4
---

# 插件的生命周期

与主应用一样，插件内的服务也可以参与到应用的生命周期中。这使得插件能够独立地管理自己的资源，例如建立数据库连接、启动后台任务或在应用关闭时进行清理。

思齐框架 (`@stratix/core`) 的 `withRegisterAutoDI` 增强器会自动为插件内的所有服务启用生命周期管理。

## 工作原理

其工作原理与[核心概念中的生命周期管理](./../core-concepts/lifecycle-management.md)完全相同，都基于**方法名约定**。

1.  **自动发现**: 当 `withRegisterAutoDI` 扫描插件的服务时，它会通过反射检查每个服务实例是否包含 `onReady`, `onClose` 等特定的生命周期方法。
2.  **注册到钩子**: 如果发现了这些方法，它们会被自动收集，并注册到 Fastify 相应的全局钩子中。

这意味着，您在一个插件中定义的 `onReady` 方法会和主应用以及其他所有插件的 `onReady` 方法一起，在应用准备就绪时被调用。

## 示例：一个带有资源管理的缓存插件

让我们创建一个 `CachePlugin`，它在应用启动时连接到 Redis，并在应用关闭时断开连接。

```typescript title="src/plugins/cache/cache.service.ts"
import { Lifetime, RESOLVER } from 'awilix';
import { createClient, type RedisClientType } from 'redis';

export class CacheService {
  static [RESOLVER] = { lifetime: Lifetime.SINGLETON };

  private client: RedisClientType;
  private isConnected = false;

  constructor(private readonly pluginConfig: { url?: string }) {
    this.client = createClient({
      url: pluginConfig.url || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  // 在应用准备就绪时连接 Redis
  public async onReady() {
    if (this.isConnected) return;
    console.log('Connecting to Redis...');
    await this.client.connect();
    this.isConnected = true;
    console.log('✅ Redis connection established.');
  }

  // 在应用关闭时断开 Redis 连接
  public async onClose() {
    if (this.isConnected) {
      console.log('Closing Redis connection...');
      await this.client.quit();
      this.isConnected = false;
      console.log('✅ Redis connection closed.');
    }
  }

  // 插件提供的公共方法
  public async set(key: string, value: string, ttl?: number) {
    if (!this.isConnected) await this.onReady(); // 确保已连接
    await this.client.set(key, value, { EX: ttl || 3600 });
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConnected) await this.onReady();
    return this.client.get(key);
  }
}
```

**插件入口文件**:

```typescript title="src/plugins/cache/index.ts"
import { withRegisterAutoDI } from '@stratix/core';

async function cachePlugin(fastify, options) {
  fastify.log.info('Cache plugin registered.');
}

export default withRegisterAutoDI(cachePlugin, {
  discovery: {
    patterns: ['**/*.service.ts'],
  },
});
```

## 插件生命周期的执行顺序

当应用中有多个插件都定义了生命周期方法时，它们的执行顺序是怎样的？

- **`onReady`**: 所有插件的 `onReady` 方法会**并发**执行（通过 `Promise.all`）。这可以加快应用的启动速度，但也意味着您不应该假设一个插件的 `onReady` 会在另一个插件的 `onReady` 之前或之后完成。
- **`onClose`**: 同样，所有插件的 `onClose` 方法也会并发执行。

如果您的插件之间存在严格的初始化依赖关系（例如，`LoggerPlugin` 必须在所有其他插件之前完成初始化），您应该在主应用的 `plugins` 数组中调整它们的注册顺序，并考虑使用更明确的依赖关系管理策略，而不是依赖于生命周期钩子的执行顺序。

通过这种自动化的生命周期管理，每个插件都成为了一个能够自我管理资源的独立单元，这使得整个应用系统更加健壮和易于推理。
