# Stratix 框架插件加载系统详细设计文档

## 1. 概述

Stratix 框架的插件加载系统是基于 Fastify 插件系统构建的配置驱动插件管理器。系统支持两种插件类型：函数式插件（标准 Fastify 插件）和声明式插件（通过配置对象定义的插件），并提供统一的加载、转换和注册机制。

### 1.1 设计目标

- **兼容性**：完全兼容 Fastify 插件生态系统
- **简化性**：通过声明式配置简化插件开发
- **灵活性**：支持函数式和声明式两种插件模式
- **可扩展性**：支持多级插件嵌套和依赖管理
- **类型安全**：提供完整的 TypeScript 类型支持
- **依赖管理**：利用 Fastify 内置的插件依赖系统

### 1.2 核心特性

- 🔌 **双模式支持**：函数式插件和声明式插件
- 🎯 **作用域控制**：Global 和 Scoped 两种作用域
- 🔄 **自动转换**：声明式插件自动转换为 Fastify 插件
- 📦 **依赖注入**：集成 Awilix DI 容器
- 🛡️ **错误处理**：完善的错误处理和验证机制
- 🔗 **嵌套支持**：支持多级插件嵌套注册
- ⚡ **依赖管理**：利用 Fastify 内置的插件依赖系统

## 2. 系统架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Stratix 插件加载系统                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   PluginLoader  │    │ PluginValidator │    │ PluginRegistry  │ │
│  │   (主加载器)     │    │   (验证器)       │    │  (注册管理器)    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│           │                       │                       │        │
│           ▼                       ▼                       ▼        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │            DeclarativePluginTransformer                        │ │
│  │                (声明式插件转换器)                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                        Fastify 插件系统                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  函数式插件   │ │  声明式插件   │ │   全局插件    │ │   作用域插件  │ │
│  │ (Function)   │ │(Declarative) │ │   (Global)   │ │  (Scoped)   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 PluginLoader（主插件加载器）
负责插件的整体加载流程管理和协调各个组件的工作。

#### 2.2.2 PluginValidator（插件验证器）
负责验证插件配置的正确性和插件类型的检测。

#### 2.2.3 DeclarativePluginTransformer（声明式插件转换器）
负责将声明式插件配置转换为标准的 Fastify 插件函数。

#### 2.2.4 PluginRegistry（插件注册管理器）
负责插件的注册、作用域管理和依赖关系处理。

## 3. 类型定义

### 3.1 基础类型

```typescript
/**
 * 插件作用域类型
 */
export type PluginScope = 'global' | 'scoped';

/**
 * 插件配置元组
 * [插件实例, 作用域, 选项]
 */
export type PluginConfig = [
  plugin: any,
  scope: PluginScope,
  options?: Record<string, any>
];

/**
 * 路由定义
 */
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  schema?: any;
  handler: (request: any, reply: any) => any;
  preHandler?: any[];
  config?: any;
}

/**
 * 钩子定义
 */
export interface HookDefinition {
  name: string;
  handler: Function;
}

/**
 * 声明式插件定义
 */
export interface DeclarativePlugin {
  name: string;
  version: string;
  type?: PluginScope;
  prefix?: string;
  services?: any[];
  repositorys?: any[];
  hooks?: HookDefinition[];
  options?: Record<string, any>;
  routes?: RouteDefinition[];
  plugins?: DeclarativePlugin[];
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  name: string;
  version: string;
  fastify?: string;
  dependencies?: string[];
}
```

### 3.2 配置类型

```typescript
/**
 * 插件加载器配置
 */
export interface PluginLoaderConfig {
  strict?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
  timeout?: number;
}

/**
 * 插件验证器配置
 */
export interface PluginValidatorConfig {
  strictMode?: boolean;
  allowUnknownProperties?: boolean;
  validateMetadata?: boolean;
}

/**
 * 插件注册器配置
 */
export interface PluginRegistryConfig {
  autoPrefix?: boolean;
  defaultScope?: PluginScope;
  enableMetrics?: boolean;
}
```

## 4. 核心组件详细设计

### 4.1 PluginLoader（主插件加载器）

```typescript
/**
 * 主插件加载器
 * 负责协调整个插件加载流程
 */
export class PluginLoader {
  private fastify: FastifyInstance;
  private validator: PluginValidator;
  private transformer: DeclarativePluginTransformer;
  private registry: PluginRegistry;
  private config: PluginLoaderConfig;
  private logger: Logger;

  constructor(
    fastify: FastifyInstance,
    config: PluginLoaderConfig = {},
    logger: Logger
  ) {
    this.fastify = fastify;
    this.config = {
      strict: true,
      parallel: false,
      maxConcurrency: 3,
      timeout: 30000,
      ...config
    };
    this.logger = logger;
    
    this.validator = new PluginValidator({
      strictMode: this.config.strict
    }, logger);
    
    this.transformer = new DeclarativePluginTransformer(fastify, logger);
    
    this.registry = new PluginRegistry(fastify, {
      defaultScope: 'scoped'
    }, logger);
  }

  /**
   * 从配置加载所有插件
   */
  async loadPluginsFromConfig(pluginConfigs: Record<string, PluginConfig>): Promise<void> {
    this.logger.info('开始加载插件配置');
    
    try {
      // 验证配置格式
      this.validatePluginConfigs(pluginConfigs);
      
      // 获取插件配置条目
      const configEntries = Object.entries(pluginConfigs);
      
      // 加载插件（让 Fastify 处理依赖关系）
      if (this.config.parallel) {
        await this.loadPluginsInParallel(configEntries);
      } else {
        await this.loadPluginsSequentially(configEntries);
      }
      
      this.logger.info(`成功加载 ${Object.keys(pluginConfigs).length} 个插件`);
    } catch (error) {
      this.logger.error('插件加载失败', error);
      throw new PluginLoadError('批量插件加载失败', error as Error);
    }
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(
    pluginName: string,
    pluginConfig: PluginConfig
  ): Promise<void> {
    const [plugin, scope, options = {}] = pluginConfig;
    
    this.logger.debug(`开始加载插件: ${pluginName}`);
    
    try {
      // 验证插件
      await this.validator.validatePlugin(plugin, pluginName);
      
      // 检测插件类型并处理
      let processedPlugin: any;
      
      if (this.validator.isFunctionPlugin(plugin)) {
        this.logger.debug(`检测到函数式插件: ${pluginName}`);
        processedPlugin = plugin;
      } else if (this.validator.isDeclarativePlugin(plugin)) {
        this.logger.debug(`检测到声明式插件: ${pluginName}`);
        processedPlugin = await this.transformer.transform(plugin, pluginName);
      } else {
        throw new PluginConfigError(
          pluginName,
          '未知的插件类型，必须是函数或声明式对象'
        );
      }
      
      // 注册插件
      await this.registry.registerPlugin(
        processedPlugin,
        scope,
        options,
        pluginName
      );
      
      this.logger.debug(`插件加载成功: ${pluginName}`);
    } catch (error) {
      this.logger.error(`插件加载失败: ${pluginName}`, error);
      throw new PluginLoadError(pluginName, error as Error);
    }
  }

  /**
   * 验证插件配置格式
   */
  private validatePluginConfigs(configs: Record<string, PluginConfig>): void {
    for (const [name, config] of Object.entries(configs)) {
      if (!Array.isArray(config) || config.length < 2 || config.length > 3) {
        throw new PluginConfigError(
          name,
          '插件配置必须是 [plugin, scope, options?] 格式的数组'
        );
      }
      
      const [, scope] = config;
      if (scope !== 'global' && scope !== 'scoped') {
        throw new PluginConfigError(
          name,
          `无效的插件作用域: ${scope}，必须是 'global' 或 'scoped'`
        );
      }
    }
  }

  /**
   * 顺序加载插件
   */
  private async loadPluginsSequentially(
    configEntries: Array<[string, PluginConfig]>
  ): Promise<void> {
    for (const [name, config] of configEntries) {
      await this.loadPlugin(name, config);
    }
  }

  /**
   * 并行加载插件
   */
  private async loadPluginsInParallel(
    configEntries: Array<[string, PluginConfig]>
  ): Promise<void> {
    const concurrency = this.config.maxConcurrency || 3;
    const chunks = this.chunkArray(configEntries, concurrency);
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(([name, config]) => this.loadPlugin(name, config))
      );
    }
  }

  /**
   * 数组分块工具方法
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

### 4.2 PluginValidator（插件验证器）

```typescript
/**
 * 插件验证器
 * 负责验证插件的有效性和类型检测
 */
export class PluginValidator {
  private config: PluginValidatorConfig;
  private logger: Logger;

  constructor(config: PluginValidatorConfig = {}, logger: Logger) {
    this.config = {
      strictMode: true,
      allowUnknownProperties: false,
      validateMetadata: true,
      ...config
    };
    this.logger = logger;
  }

  /**
   * 验证插件
   */
  async validatePlugin(plugin: any, pluginName: string): Promise<void> {
    if (!plugin) {
      throw new PluginValidationError(pluginName, '插件不能为空');
    }

    if (this.isFunctionPlugin(plugin)) {
      await this.validateFunctionPlugin(plugin, pluginName);
    } else if (this.isDeclarativePlugin(plugin)) {
      await this.validateDeclarativePlugin(plugin, pluginName);
    } else {
      throw new PluginValidationError(
        pluginName,
        '插件必须是函数或声明式对象'
      );
    }
  }

  /**
   * 检测是否为函数式插件
   */
  isFunctionPlugin(plugin: any): boolean {
    return typeof plugin === 'function';
  }

  /**
   * 检测是否为声明式插件
   */
  isDeclarativePlugin(plugin: any): boolean {
    return (
      typeof plugin === 'object' &&
      plugin !== null &&
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string'
    );
  }

  /**
   * 验证函数式插件
   */
  private async validateFunctionPlugin(
    plugin: Function,
    pluginName: string
  ): Promise<void> {
    // 检查函数参数数量
    if (plugin.length < 2 || plugin.length > 3) {
      throw new PluginValidationError(
        pluginName,
        'Fastify 插件函数必须接受 2-3 个参数: (fastify, options, done?)'
      );
    }

    // 验证插件元数据（如果存在）
    if (this.config.validateMetadata) {
      this.validatePluginMetadata(plugin, pluginName);
    }
  }

  /**
   * 验证声明式插件
   */
  private async validateDeclarativePlugin(
    plugin: DeclarativePlugin,
    pluginName: string
  ): Promise<void> {
    // 验证必需字段
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new PluginValidationError(pluginName, '缺少或无效的 name 字段');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new PluginValidationError(pluginName, '缺少或无效的 version 字段');
    }

    // 验证可选字段
    if (plugin.type && !['global', 'scoped'].includes(plugin.type)) {
      throw new PluginValidationError(
        pluginName,
        `无效的 type 字段: ${plugin.type}`
      );
    }

    if (plugin.prefix && typeof plugin.prefix !== 'string') {
      throw new PluginValidationError(pluginName, 'prefix 字段必须是字符串');
    }

    // 验证数组字段
    this.validateArrayField(plugin.services, 'services', pluginName);
    this.validateArrayField(plugin.repositorys, 'repositorys', pluginName);
    this.validateArrayField(plugin.hooks, 'hooks', pluginName);
    this.validateArrayField(plugin.routes, 'routes', pluginName);
    this.validateArrayField(plugin.plugins, 'plugins', pluginName);

    // 验证路由定义
    if (plugin.routes) {
      for (const route of plugin.routes) {
        this.validateRouteDefinition(route, pluginName);
      }
    }

    // 验证钩子定义
    if (plugin.hooks) {
      for (const hook of plugin.hooks) {
        this.validateHookDefinition(hook, pluginName);
      }
    }

    // 递归验证嵌套插件
    if (plugin.plugins) {
      for (const nestedPlugin of plugin.plugins) {
        await this.validateDeclarativePlugin(nestedPlugin, `${pluginName}.${nestedPlugin.name}`);
      }
    }
  }

  /**
   * 验证数组字段
   */
  private validateArrayField(
    field: any,
    fieldName: string,
    pluginName: string
  ): void {
    if (field !== undefined && !Array.isArray(field)) {
      throw new PluginValidationError(
        pluginName,
        `${fieldName} 字段必须是数组`
      );
    }
  }

  /**
   * 验证路由定义
   */
  private validateRouteDefinition(
    route: RouteDefinition,
    pluginName: string
  ): void {
    if (!route.method || typeof route.method !== 'string') {
      throw new PluginValidationError(pluginName, '路由缺少有效的 method 字段');
    }

    if (!route.url || typeof route.url !== 'string') {
      throw new PluginValidationError(pluginName, '路由缺少有效的 url 字段');
    }

    if (!route.handler || typeof route.handler !== 'function') {
      throw new PluginValidationError(pluginName, '路由缺少有效的 handler 字段');
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(route.method.toUpperCase())) {
      throw new PluginValidationError(
        pluginName,
        `无效的 HTTP 方法: ${route.method}`
      );
    }
  }

  /**
   * 验证钩子定义
   */
  private validateHookDefinition(
    hook: HookDefinition,
    pluginName: string
  ): void {
    if (!hook.name || typeof hook.name !== 'string') {
      throw new PluginValidationError(pluginName, '钩子缺少有效的 name 字段');
    }

    if (!hook.handler || typeof hook.handler !== 'function') {
      throw new PluginValidationError(pluginName, '钩子缺少有效的 handler 字段');
    }
  }

  /**
   * 验证插件元数据
   */
  private validatePluginMetadata(plugin: any, pluginName: string): void {
    const metaSymbol = Symbol.for('plugin-meta');
    const metadata = plugin[metaSymbol];

    if (metadata) {
      if (!metadata.name || typeof metadata.name !== 'string') {
        throw new PluginValidationError(
          pluginName,
          '插件元数据缺少有效的 name 字段'
        );
      }

      if (metadata.fastify && typeof metadata.fastify !== 'string') {
        throw new PluginValidationError(
          pluginName,
          '插件元数据的 fastify 字段必须是字符串'
        );
      }
    }
  }
}
```

### 4.3 DeclarativePluginTransformer（声明式插件转换器）

```typescript
/**
 * 声明式插件转换器
 * 负责将声明式插件转换为标准的 Fastify 插件函数
 */
export class DeclarativePluginTransformer {
  private fastify: FastifyInstance;
  private logger: Logger;

  constructor(fastify: FastifyInstance, logger: Logger) {
    this.fastify = fastify;
    this.logger = logger;
  }

  /**
   * 转换声明式插件为 Fastify 插件函数
   */
  async transform(
    declarativePlugin: DeclarativePlugin,
    pluginName: string
  ): Promise<FastifyPluginAsync> {
    this.logger.debug(`开始转换声明式插件: ${pluginName}`);

    const transformedPlugin: FastifyPluginAsync = async (
      fastify: FastifyInstance,
      options: any
    ) => {
      try {
        // 合并插件选项和传入选项
        const mergedOptions = {
          ...declarativePlugin.options,
          ...options
        };

        // 注册服务
        if (declarativePlugin.services) {
          await this.registerServices(fastify, declarativePlugin.services, pluginName);
        }

        // 注册仓储
        if (declarativePlugin.repositorys) {
          await this.registerRepositories(fastify, declarativePlugin.repositorys, pluginName);
        }

        // 注册钩子
        if (declarativePlugin.hooks) {
          await this.registerHooks(fastify, declarativePlugin.hooks, pluginName);
        }

        // 注册路由
        if (declarativePlugin.routes) {
          await this.registerRoutes(fastify, declarativePlugin.routes, pluginName);
        }

        // 注册嵌套插件
        if (declarativePlugin.plugins) {
          await this.registerNestedPlugins(fastify, declarativePlugin.plugins, pluginName);
        }

        this.logger.debug(`声明式插件转换完成: ${pluginName}`);
      } catch (error) {
        this.logger.error(`声明式插件转换失败: ${pluginName}`, error);
        throw new PluginTransformError(pluginName, error as Error);
      }
    };

    // 添加插件元数据
    Object.defineProperty(transformedPlugin, Symbol.for('plugin-meta'), {
      value: {
        name: declarativePlugin.name,
        version: declarativePlugin.version,
        fastify: '>=5.0.0'
      }
    });

    return transformedPlugin;
  }

  /**
   * 注册服务
   */
  private async registerServices(
    fastify: FastifyInstance,
    services: any[],
    pluginName: string
  ): Promise<void> {
    this.logger.debug(`注册服务: ${pluginName}`, { count: services.length });

    for (const ServiceClass of services) {
      try {
        if (typeof ServiceClass === 'function') {
          // 使用服务注册器注册服务
          const serviceRegistrar = (fastify as any).serviceRegistrar;
          if (serviceRegistrar) {
            serviceRegistrar.registerService(ServiceClass);
          } else {
            this.logger.warn(`服务注册器不可用，跳过服务注册: ${ServiceClass.name}`);
          }
        } else {
          this.logger.warn(`无效的服务类: ${ServiceClass}`);
        }
      } catch (error) {
        this.logger.error(`服务注册失败: ${ServiceClass.name}`, error);
        throw error;
      }
    }
  }

  /**
   * 注册仓储
   */
  private async registerRepositories(
    fastify: FastifyInstance,
    repositories: any[],
    pluginName: string
  ): Promise<void> {
    this.logger.debug(`注册仓储: ${pluginName}`, { count: repositories.length });

    for (const RepositoryClass of repositories) {
      try {
        if (typeof RepositoryClass === 'function') {
          // 使用服务注册器注册仓储
          const serviceRegistrar = (fastify as any).serviceRegistrar;
          if (serviceRegistrar) {
            serviceRegistrar.registerRepository(RepositoryClass);
          } else {
            this.logger.warn(`服务注册器不可用，跳过仓储注册: ${RepositoryClass.name}`);
          }
        } else {
          this.logger.warn(`无效的仓储类: ${RepositoryClass}`);
        }
      } catch (error) {
        this.logger.error(`仓储注册失败: ${RepositoryClass.name}`, error);
        throw error;
      }
    }
  }

  /**
   * 注册钩子
   */
  private async registerHooks(
    fastify: FastifyInstance,
    hooks: HookDefinition[],
    pluginName: string
  ): Promise<void> {
    this.logger.debug(`注册钩子: ${pluginName}`, { count: hooks.length });

    for (const hook of hooks) {
      try {
        fastify.addHook(hook.name as any, hook.handler);
        this.logger.debug(`钩子注册成功: ${hook.name}`);
      } catch (error) {
        this.logger.error(`钩子注册失败: ${hook.name}`, error);
        throw error;
      }
    }
  }

  /**
   * 注册路由
   */
  private async registerRoutes(
    fastify: FastifyInstance,
    routes: RouteDefinition[],
    pluginName: string
  ): Promise<void> {
    this.logger.debug(`注册路由: ${pluginName}`, { count: routes.length });

    for (const route of routes) {
      try {
        const routeOptions: any = {
          method: route.method,
          url: route.url,
          handler: route.handler
        };

        // 添加可选字段
        if (route.schema) {
          routeOptions.schema = route.schema;
        }

        if (route.preHandler) {
          routeOptions.preHandler = route.preHandler;
        }

        if (route.config) {
          routeOptions.config = route.config;
        }

        fastify.route(routeOptions);
        this.logger.debug(`路由注册成功: ${route.method} ${route.url}`);
      } catch (error) {
        this.logger.error(`路由注册失败: ${route.method} ${route.url}`, error);
        throw error;
      }
    }
  }

  /**
   * 注册嵌套插件
   */
  private async registerNestedPlugins(
    fastify: FastifyInstance,
    plugins: DeclarativePlugin[],
    pluginName: string
  ): Promise<void> {
    this.logger.debug(`注册嵌套插件: ${pluginName}`, { count: plugins.length });

    for (const nestedPlugin of plugins) {
      try {
        const nestedPluginName = `${pluginName}.${nestedPlugin.name}`;
        const transformedNestedPlugin = await this.transform(nestedPlugin, nestedPluginName);

        const registerOptions: any = {};
        if (nestedPlugin.prefix) {
          registerOptions.prefix = nestedPlugin.prefix;
        }

        // 根据嵌套插件的类型决定注册方式
        if (nestedPlugin.type === 'global') {
          const fp = require('fastify-plugin');
          await fastify.register(fp(transformedNestedPlugin), registerOptions);
        } else {
          await fastify.register(transformedNestedPlugin, registerOptions);
        }

        this.logger.debug(`嵌套插件注册成功: ${nestedPluginName}`);
      } catch (error) {
        this.logger.error(`嵌套插件注册失败: ${nestedPlugin.name}`, error);
        throw error;
      }
    }
  }
}
```

### 4.4 PluginRegistry（插件注册管理器）

```typescript
/**
 * 插件注册管理器
 * 负责插件的注册、作用域管理和依赖关系处理
 */
export class PluginRegistry {
  private fastify: FastifyInstance;
  private config: PluginRegistryConfig;
  private logger: Logger;
  private registeredPlugins: Map<string, PluginMetadata>;

  constructor(
    fastify: FastifyInstance,
    config: PluginRegistryConfig = {},
    logger: Logger
  ) {
    this.fastify = fastify;
    this.config = {
      autoPrefix: false,
      defaultScope: 'scoped',
      enableMetrics: false,
      ...config
    };
    this.logger = logger;
    this.registeredPlugins = new Map();
  }

  /**
   * 注册插件
   */
  async registerPlugin(
    plugin: any,
    scope: PluginScope,
    options: any = {},
    pluginName: string
  ): Promise<void> {
    this.logger.debug(`开始注册插件: ${pluginName}`, { scope });

    try {
      // 检查插件是否已注册
      if (this.registeredPlugins.has(pluginName)) {
        this.logger.warn(`插件已注册，跳过: ${pluginName}`);
        return;
      }

      // 准备注册选项
      const registerOptions = this.prepareRegisterOptions(options, pluginName);

      // 根据作用域注册插件
      if (scope === 'global') {
        await this.registerGlobalPlugin(plugin, registerOptions, pluginName);
      } else {
        await this.registerScopedPlugin(plugin, registerOptions, pluginName);
      }

      // 记录已注册的插件
      this.recordRegisteredPlugin(plugin, pluginName);

      this.logger.debug(`插件注册成功: ${pluginName}`);
    } catch (error) {
      this.logger.error(`插件注册失败: ${pluginName}`, error);
      throw new PluginRegistrationError(pluginName, error as Error);
    }
  }

  /**
   * 注册全局插件
   */
  private async registerGlobalPlugin(
    plugin: any,
    options: any,
    pluginName: string
  ): Promise<void> {
    const fp = require('fastify-plugin');
    
    // 获取插件元数据
    const metaSymbol = Symbol.for('plugin-meta');
    const metadata = plugin[metaSymbol] || {};
    
    // 准备 fastify-plugin 选项
    const fpOptions: any = {
      name: metadata.name || pluginName,
      fastify: metadata.fastify || '>=5.0.0'
    };
    
    // 如果插件有依赖，添加到 fastify-plugin 选项中
    if (metadata.dependencies && Array.isArray(metadata.dependencies)) {
      fpOptions.dependencies = metadata.dependencies;
    }
    
    // 使用 fastify-plugin 包装以跳过封装
    const wrappedPlugin = fp(plugin, fpOptions);

    await this.fastify.register(wrappedPlugin, options);
    this.logger.debug(`全局插件注册完成: ${pluginName}`, { 
      dependencies: metadata.dependencies 
    });
  }

  /**
   * 注册作用域插件
   */
  private async registerScopedPlugin(
    plugin: any,
    options: any,
    pluginName: string
  ): Promise<void> {
    // 直接注册，保持封装
    await this.fastify.register(plugin, options);
    this.logger.debug(`作用域插件注册完成: ${pluginName}`);
  }

  /**
   * 准备注册选项
   */
  private prepareRegisterOptions(options: any, pluginName: string): any {
    const registerOptions = { ...options };

    // 自动添加前缀
    if (this.config.autoPrefix && !registerOptions.prefix) {
      registerOptions.prefix = `/${pluginName.toLowerCase()}`;
    }

    return registerOptions;
  }

  /**
   * 记录已注册的插件
   */
  private recordRegisteredPlugin(plugin: any, pluginName: string): void {
    const metaSymbol = Symbol.for('plugin-meta');
    const metadata = plugin[metaSymbol] || {};

    this.registeredPlugins.set(pluginName, {
      name: metadata.name || pluginName,
      version: metadata.version || '1.0.0',
      fastify: metadata.fastify || '>=5.0.0',
      dependencies: metadata.dependencies || []
    });
  }

  /**
   * 检查插件是否已注册
   */
  isPluginRegistered(pluginName: string): boolean {
    return this.registeredPlugins.has(pluginName);
  }

  /**
   * 获取已注册的插件列表
   */
  getRegisteredPlugins(): PluginMetadata[] {
    return Array.from(this.registeredPlugins.values());
  }

  /**
   * 获取插件元数据
   */
  getPluginMetadata(pluginName: string): PluginMetadata | undefined {
    return this.registeredPlugins.get(pluginName);
  }
}
```

## 5. 错误处理

### 5.1 错误类定义

```typescript
/**
 * 插件加载错误基类
 */
export abstract class PluginError extends Error {
  public readonly pluginName: string;
  public readonly cause?: Error;

  constructor(pluginName: string, message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.pluginName = pluginName;
    this.cause = cause;
  }
}

/**
 * 插件加载错误
 */
export class PluginLoadError extends PluginError {
  constructor(pluginName: string, cause: Error) {
    super(
      pluginName,
      `Failed to load plugin '${pluginName}': ${cause.message}`,
      cause
    );
  }
}

/**
 * 插件配置错误
 */
export class PluginConfigError extends PluginError {
  constructor(pluginName: string, message: string) {
    super(
      pluginName,
      `Invalid plugin configuration for '${pluginName}': ${message}`
    );
  }
}

/**
 * 插件验证错误
 */
export class PluginValidationError extends PluginError {
  constructor(pluginName: string, message: string) {
    super(
      pluginName,
      `Plugin validation failed for '${pluginName}': ${message}`
    );
  }
}

/**
 * 插件转换错误
 */
export class PluginTransformError extends PluginError {
  constructor(pluginName: string, cause: Error) {
    super(
      pluginName,
      `Failed to transform declarative plugin '${pluginName}': ${cause.message}`,
      cause
    );
  }
}

/**
 * 插件注册错误
 */
export class PluginRegistrationError extends PluginError {
  constructor(pluginName: string, cause: Error) {
    super(
      pluginName,
      `Failed to register plugin '${pluginName}': ${cause.message}`,
      cause
    );
  }
}
```

### 5.2 错误处理策略

```typescript
/**
 * 插件错误处理器
 */
export class PluginErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理插件错误
   */
  handlePluginError(error: Error, context: string): void {
    if (error instanceof PluginError) {
      this.handleStratixPluginError(error, context);
    } else {
      this.handleGenericError(error, context);
    }
  }

  /**
   * 处理 Stratix 插件错误
   */
  private handleStratixPluginError(error: PluginError, context: string): void {
    this.logger.error(`${context} - ${error.constructor.name}`, {
      pluginName: error.pluginName,
      message: error.message,
      cause: error.cause?.message,
      stack: error.stack
    });

    // 根据错误类型执行不同的处理策略
    switch (error.constructor) {
      case PluginConfigError:
        this.handleConfigError(error as PluginConfigError);
        break;
      case PluginValidationError:
        this.handleValidationError(error as PluginValidationError);
        break;
      case PluginTransformError:
        this.handleTransformError(error as PluginTransformError);
        break;
      case PluginRegistrationError:
        this.handleRegistrationError(error as PluginRegistrationError);
        break;
      default:
        this.handleLoadError(error as PluginLoadError);
    }
  }

  /**
   * 处理通用错误
   */
  private handleGenericError(error: Error, context: string): void {
    this.logger.error(`${context} - Unexpected error`, {
      message: error.message,
      stack: error.stack
    });
  }

  /**
   * 处理配置错误
   */
  private handleConfigError(error: PluginConfigError): void {
    this.logger.warn(`插件配置错误，请检查配置格式: ${error.pluginName}`);
  }

  /**
   * 处理验证错误
   */
  private handleValidationError(error: PluginValidationError): void {
    this.logger.warn(`插件验证失败，请检查插件定义: ${error.pluginName}`);
  }

  /**
   * 处理转换错误
   */
  private handleTransformError(error: PluginTransformError): void {
    this.logger.warn(`声明式插件转换失败: ${error.pluginName}`);
  }

  /**
   * 处理注册错误
   */
  private handleRegistrationError(error: PluginRegistrationError): void {
    this.logger.warn(`插件注册失败: ${error.pluginName}`);
  }

  /**
   * 处理加载错误
   */
  private handleLoadError(error: PluginLoadError): void {
    this.logger.warn(`插件加载失败: ${error.pluginName}`);
  }
}
```

## 6. 插件加载流程

### 6.1 流程图

```
┌─────────────────┐
│   开始加载插件   │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   解析配置文件   │
│ stratix.config.ts│
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   验证配置格式   │
│ PluginValidator │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   遍历插件配置   │
│ 无需排序依赖关系  │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   检测插件类型   │
│ 函数式 or 声明式 │
└─────────────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌─────────┐ ┌─────────┐
│ 函数式   │ │ 声明式   │
│ 插件     │ │ 插件     │
└─────────┘ └─────────┘
    │           │
    │           ▼
    │     ┌─────────┐
    │     │ 转换为   │
    │     │Fastify  │
    │     │ 插件     │
    │     └─────────┘
    │           │
    └─────┬─────┘
          ▼
┌─────────────────┐
│   注册到Fastify  │
│ Global or Scoped│
│ 依赖由Fastify管理│
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   记录插件信息   │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   加载完成       │
└─────────────────┘
```

### 6.2 详细流程说明

1. **配置解析阶段**
   - 从 `stratix.config.ts` 读取插件配置
   - 验证配置格式：`[plugin, scope, options]`
   - 提取插件名称和配置信息

2. **插件处理阶段**
   - 检测插件类型（函数式/声明式）
   - 验证插件有效性
   - 声明式插件转换为 Fastify 插件

3. **插件注册阶段**
   - 根据作用域选择注册方式
   - Global: 使用 `fastify-plugin` 包装，传递依赖信息
   - Scoped: 直接注册保持封装
   - **依赖管理由 Fastify 自动处理**

4. **完成阶段**
   - 记录插件元数据
   - 更新插件注册表
   - 触发加载完成事件

**重要说明**：
- Fastify 内置的插件系统会自动处理插件依赖关系和加载顺序
- 使用 `fastify-plugin` 时，通过 `dependencies` 参数指定插件依赖
- 无需手动实现依赖排序和检查逻辑

## 7. 使用示例

### 7.1 配置文件示例

```typescript
// stratix.config.ts
import webPlugin from '@stratix/web';
import adminPlugin from './plugins/admin/plugin.js';
import apiPlugin from './plugins/api/apiPlugin.js';

export default (sensitiveInfo: any) => ({
  app: {
    name: 'stratix-example-app',
    version: '1.0.0',
    description: 'Stratix框架示例应用'
  },
  logger: {
    appType: 'web'
  },
  // 插件配置：[插件实例, 作用域, 选项]
  '@stratix/web': [webPlugin, 'global', {
    port: 3000,
    host: '0.0.0.0'
  }],
  adminPlugin: [adminPlugin, 'scoped', {
    prefix: '/admin'
  }],
  apiPlugin: [apiPlugin, 'scoped', {
    prefix: '/api'
  }]
});
```

### 7.2 函数式插件示例

```typescript
// plugins/api/apiPlugin.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const apiPlugin: FastifyPluginAsync = async (
  instance: FastifyInstance,
  opts: any
) => {
  // 注册路由
  instance.get('/users', async (request, reply) => {
    return { users: await getUsers() };
  });

  instance.get('/users/:id', async (request, reply) => {
    const { id } = request.params;
    return { user: await getUserById(id) };
  });

  instance.post('/users', async (request, reply) => {
    const userData = request.body;
    const newUser = await createUser(userData);
    return { user: newUser };
  });
};

// 添加插件元数据（包含依赖信息）
Object.defineProperty(apiPlugin, Symbol.for('plugin-meta'), {
  value: {
    name: '@stratix/api',
    fastify: '>=5.0.0',
    version: '1.0.0',
    dependencies: ['@stratix/web', '@stratix/database'] // 指定依赖的插件
  }
});

export default apiPlugin;
```

### 7.3 声明式插件示例

```typescript
// plugins/admin/plugin.ts
import { UserRepository } from './repository/userRepository.js';
import { UserService } from './service/userService.js';

const adminPlugin = {
  name: '@stratix/admin',
  version: '1.0.0',
  type: 'scoped',
  prefix: '/admin',
  
  // 注册服务
  services: [UserService],
  
  // 注册仓储
  repositorys: [UserRepository],
  
  // 注册钩子
  hooks: [
    {
      name: 'preHandler',
      handler: async (request: any, reply: any) => {
        // 权限检查逻辑
        if (!request.headers.authorization) {
          reply.code(401).send({ error: 'Unauthorized' });
        }
      }
    }
  ],
  
  // 注册路由
  routes: [
    {
      method: 'GET',
      url: '/users',
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              users: { type: 'array' }
            }
          }
        }
      },
      handler: async (request: any, reply: any) => {
        const userService = request.server.container.resolve('userService');
        const users = await userService.getAllUsers();
        return { users };
      }
    },
    {
      method: 'POST',
      url: '/users',
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' }
          }
        }
      },
      handler: async (request: any, reply: any) => {
        const userService = request.server.container.resolve('userService');
        const user = await userService.createUser(request.body);
        return { user };
      }
    }
  ],
  
  // 嵌套插件
  plugins: [
    {
      name: 'admin-reports',
      version: '1.0.0',
      type: 'scoped',
      prefix: '/reports',
      routes: [
        {
          method: 'GET',
          url: '/daily',
          handler: async (request: any, reply: any) => {
            return { report: 'daily report data' };
          }
        }
      ]
    }
  ]
};

// 添加插件元数据（包含依赖信息）
Object.defineProperty(adminPlugin, Symbol.for('plugin-meta'), {
  value: {
    name: '@stratix/admin',
    fastify: '>=5.0.0',
    version: '1.0.0',
    dependencies: ['@stratix/web', '@stratix/auth'] // 指定依赖的插件
  }
});

export default adminPlugin;
```

### 7.4 应用启动示例

```typescript
// index.ts
import { StratixApp } from '@stratix/core';

async function main() {
  try {
    // 一行代码启动应用
    const app = await StratixApp.run({
      config: './src/stratix.config.ts',
      hooks: {
        afterCreate: (app, logger) => {
          logger.info('应用创建完成');
        },
        afterInit: (app, logger) => {
          logger.info('插件加载完成');
        },
        afterStart: (app, logger) => {
          logger.info('应用启动完成');
        }
      }
    });

    // 应用已启动，插件已加载
    console.log('Stratix 应用启动成功！');
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}

main();
```

## 8. 最佳实践

### 8.1 插件开发最佳实践

1. **函数式插件**
   - 使用 TypeScript 提供类型安全
   - 添加插件元数据以便管理
   - 正确处理异步操作
   - 提供清晰的错误信息

2. **声明式插件**
   - 保持配置简洁明了
   - 合理组织服务和仓储
   - 使用有意义的路由和钩子名称
   - 避免过深的嵌套结构

3. **作用域选择**
   - Global: 基础设施插件（数据库、认证、日志等）
   - Scoped: 业务功能插件（API 模块、管理界面等）

### 8.2 性能优化建议

1. **并行加载**
   - 对于独立的插件，启用并行加载
   - 设置合理的并发数量限制
   - **依赖关系由 Fastify 自动管理，无需担心加载顺序**

2. **依赖管理**
   - 在插件元数据中正确声明依赖关系
   - 避免循环依赖
   - **利用 Fastify 的内置依赖系统**

3. **资源管理**
   - 及时释放不需要的资源
   - 使用连接池管理数据库连接

### 8.3 调试和监控

1. **日志记录**
   - 启用详细的插件加载日志
   - 记录插件注册和转换过程

2. **错误处理**
   - 提供详细的错误信息
   - 实现优雅的错误恢复

3. **性能监控**
   - 监控插件加载时间
   - 跟踪插件资源使用情况

## 9. 测试策略

### 9.1 单元测试

```typescript
// tests/plugin-loader.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginLoader } from '../src/plugin-loader';
import { createMockFastifyInstance } from './helpers/mock-fastify';

describe('PluginLoader', () => {
  let pluginLoader: PluginLoader;
  let mockFastify: any;

  beforeEach(() => {
    mockFastify = createMockFastifyInstance();
    pluginLoader = new PluginLoader(mockFastify, {}, console);
  });

  it('should load function plugin correctly', async () => {
    const mockPlugin = async (fastify: any, options: any) => {
      fastify.get('/test', () => ({ test: true }));
    };

    await pluginLoader.loadPlugin('testPlugin', [mockPlugin, 'scoped', {}]);

    expect(mockFastify.register).toHaveBeenCalledWith(mockPlugin, {});
  });

  it('should transform declarative plugin correctly', async () => {
    const declarativePlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      routes: [
        {
          method: 'GET',
          url: '/test',
          handler: () => ({ test: true })
        }
      ]
    };

    await pluginLoader.loadPlugin('testPlugin', [declarativePlugin, 'scoped', {}]);

    expect(mockFastify.register).toHaveBeenCalled();
  });

  it('should handle plugin loading errors', async () => {
    const invalidPlugin = null;

    await expect(
      pluginLoader.loadPlugin('invalidPlugin', [invalidPlugin, 'scoped', {}])
    ).rejects.toThrow('插件不能为空');
  });
});
```

### 9.2 集成测试

```typescript
// tests/integration/plugin-system.test.ts
import { describe, it, expect } from 'vitest';
import { StratixApp } from '@stratix/core';

describe('Plugin System Integration', () => {
  it('should load and register plugins from config', async () => {
    const config = {
      app: { name: 'test-app', version: '1.0.0' },
      testPlugin: [
        {
          name: 'test-plugin',
          version: '1.0.0',
          routes: [
            {
              method: 'GET',
              url: '/test',
              handler: () => ({ success: true })
            }
          ]
        },
        'scoped',
        {}
      ]
    };

    const app = await StratixApp.run({ config });

    const response = await app.server.inject({
      method: 'GET',
      url: '/test'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ success: true });

    await app.stop();
  });
});
```

## 10. 总结

Stratix 框架的插件加载系统提供了一个强大而灵活的插件管理解决方案，完全兼容 Fastify 生态系统的同时，通过声明式配置大大简化了插件开发和使用。

### 10.1 主要优势

- **简化开发**：声明式插件减少样板代码
- **类型安全**：完整的 TypeScript 支持
- **灵活配置**：支持多种插件类型和作用域
- **错误处理**：完善的错误处理和验证机制
- **性能优化**：支持并行加载和依赖管理

### 10.2 适用场景

- 微服务架构的 API 开发
- 企业级 Web 应用开发
- 插件化的应用系统
- 需要快速原型开发的项目

通过本设计文档，开发者可以完全理解 Stratix 插件系统的架构和实现细节，并能够直接按照文档进行开发和扩展。 