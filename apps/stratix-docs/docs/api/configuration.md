---
sidebar_position: 2
---

# API 参考：配置

本页详细介绍了 **思齐框架 (`@stratix/core`)** 的核心配置接口，这些接口用于在启动和运行应用时对其行为进行微调。

## `StratixRunOptions`

这是传递给 `Stratix.run()` 的主配置对象，用于控制应用的整体启动流程。

```typescript
interface StratixRunOptions {
  // 应用类型: 'web', 'cli', 或 'worker'
  type?: 'web' | 'cli' | 'worker';

  // 直接传入一个完整的配置对象
  config?: StratixConfig;

  // 或指定配置文件的加载选项
  configOptions?: string | ConfigOptions;

  // 环境变量加载选项
  envOptions?: EnvOptions;

  // 自定义日志记录器或其配置
  logger?: Logger | LoggerConfig;

  // 是否启用调试模式
  debug?: boolean;

  // 应用级的生命周期钩子
  lifecycleHooks?: LifecycleHooks;

  // ... 其他高级选项
}
```

## `StratixConfig`

这是从 `stratix.config.ts` 文件中导出的核心配置对象，定义了应用的所有主要部分。

```typescript
interface StratixConfig {
  // Fastify 服务器选项
  server: FastifyServerOptions & { port?: number; host?: string; };

  // 应用级自动依赖注入配置
  applicationAutoDI?: Partial<ApplicationAutoDIConfig>;

  // 插件配置列表
  plugins: PluginConfig[];

  // [已废弃] 旧版的自动加载配置
  autoLoad?: any;

  // 缓存配置
  cache?: any;

  // 日志配置
  logger?: LoggerConfig;

  // 应用级生命周期钩子
  hooks?: LifecycleHooks;
}
```

### `ApplicationAutoDIConfig`

用于配置主应用的自动模块发现和注册。

```typescript
interface ApplicationAutoDIConfig {
  // 是否启用
  enabled: boolean;

  // 扫描模式 (glob patterns)
  patterns: string[];

  // [可选] 应用根目录，默认为项目根目录
  appRootPath?: string;
}
```

### `PluginConfig`

在 `plugins` 数组中，每个对象都遵循此接口，用于定义如何加载一个插件。

```typescript
interface PluginConfig<T = any> {
  // 插件的唯一名称
  name: string;

  // 插件模块本身 (通过 import 导入)
  plugin: FastifyPluginAsync<T> | FastifyPluginCallback<T>;

  // 传递给插件的选项
  options?: T;

  // 是否启用此插件
  enabled?: boolean;
}
```

## `withRegisterAutoDI(plugin, config)`

这是用于包装插件的核心高阶函数，其第二个参数 `config` 用于配置插件自身的行为。

```typescript
interface AutoDIConfig {
  // 插件内部的模块发现配置
  discovery: {
    patterns: string[];
    baseDir?: string; // 相对于插件文件的路径
  };

  // 插件内部的路由注册配置
  routing?: {
    enabled?: boolean;
    prefix?: string; // 路由前缀
  };

  // 服务适配器配置，用于向外暴露服务
  services?: {
    enabled?: boolean;
    patterns: string[];
    baseDir?: string;
  };

  // 插件内部的生命周期管理配置
  lifecycle?: {
    enabled?: boolean;
    debug?: boolean;
  };

  // 是否为插件启用调试模式
  debug?: boolean;
}
```

通过理解并组合使用这些配置接口，您可以精确地控制思齐框架应用的每一个方面，从服务器行为到模块加载，再到插件的内部工作方式。
