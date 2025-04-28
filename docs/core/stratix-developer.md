# Stratix核心模块开发设计

## 1. 概述

Stratix是一个基于Fastify的纯配置Node.js框架，以函数式编程思想为核心，追求简洁、透明和组合性。本文档详细描述Stratix核心模块的代码结构和实现设计。

### 1.1 设计目标

- 实现纯配置驱动的应用框架
- 基于函数式编程思想，强调纯函数、不可变数据和组合性
- 提供插件化架构，支持功能扩展
- 支持类型安全的API设计
- 与Fastify无缝集成，保持高性能

### 1.2 主要功能

- 应用生命周期管理
- 插件系统和依赖管理
- 配置管理和校验
- 钩子系统
- 与Fastify集成
- 辅助工具函数

## 2. 目录结构

Stratix核心模块的代码目录结构如下：

```
stratix/
├── src/
│   ├── app/                 # 应用核心实现
│   │   ├── app.ts           # 应用类实现
│   │   ├── factory.ts       # 应用工厂函数
│   │   ├── interface.ts     # 应用接口定义
│   │   └── types.ts         # 应用相关类型
│   ├── config/              # 配置管理
│   │   ├── config.ts        # 配置管理类
│   │   ├── loader.ts        # 配置加载器
│   │   ├── validator.ts     # 配置验证器
│   │   └── types.ts         # 配置相关类型
│   ├── plugin/              # 插件系统
│   │   ├── plugin.ts        # 插件管理器
│   │   ├── resolver.ts      # 插件依赖解析器
│   │   ├── loader.ts        # 插件加载器
│   │   └── types.ts         # 插件相关类型
│   ├── hook/                # 钩子系统
│   │   ├── hook.ts          # 钩子管理器
│   │   └── types.ts         # 钩子相关类型
│   ├── fastify/             # Fastify集成
│   │   ├── integration.ts   # Fastify集成器
│   │   ├── decorators.ts    # Fastify装饰器
│   │   └── types.ts         # Fastify相关类型
│   ├── logger/              # 日志系统
│   │   ├── logger.ts        # 日志管理器
│   │   └── types.ts         # 日志相关类型
│   ├── errors/              # 错误处理
│   │   ├── errors.ts        # 自定义错误类
│   │   └── handler.ts       # 错误处理器
│   ├── types/               # 通用类型定义
│   │   ├── common.ts        # 通用类型
│   │   ├── schema.ts        # Schema相关类型
│   │   └── hook.ts          # 钩子相关类型
│   ├── index.ts             # 主入口文件
│   └── cli.ts               # CLI入口文件
├── tests/                   # 测试文件
├── package.json
└── tsconfig.json
```

## 3. 核心类型和接口设计

### 3.1 应用相关接口

```typescript
/**
 * Stratix应用实例接口
 */
export interface StratixApp {
  // 基础属性
  readonly name: string;
  readonly config: ConfigAPI;
  readonly fastify: FastifyInstance;
  readonly logger: LoggerInstance;
  
  // 插件管理
  register<T = any>(plugin: StratixPlugin<T>, options?: T): StratixApp;
  hasPlugin(pluginName: string): boolean;
  use<T = any>(pluginName: string): T;
  
  // 生命周期方法
  start(): Promise<StratixApp>;
  close(): Promise<void>;
  
  // 钩子系统
  hook(name: string, handler: HookHandler): StratixApp;
  
  // 装饰器
  decorate(name: string, value: any): StratixApp;
  hasDecorator(name: string): boolean;
}

/**
 * 应用创建配置
 */
export interface AppOptions {
  name: string;                       // 应用名称
  plugins?: Record<string, any>;      // 内置插件配置
  config?: Record<string, any>;       // 应用配置
  configPath?: string;                // 配置文件路径
  env?: boolean | EnvOptions;         // 环境变量配置
  logger?: LoggerOptions;             // 日志配置
}

/**
 * 环境变量配置选项
 */
export interface EnvOptions {
  dotenv?: boolean;                   // 是否加载.env文件
  required?: string[];                // 必需的环境变量
  prefix?: string;                    // 环境变量前缀
}
```

### 3.2 插件相关接口

```typescript
/**
 * Stratix插件接口
 */
export interface StratixPlugin<TOptions = any> {
  name: string;                             // 插件名称
  dependencies?: string[];                  // 依赖的其他插件
  optionalDependencies?: string[];          // 可选依赖
  register: PluginRegisterFn<TOptions>;     // 注册函数
  decorations?: Record<string, any>;        // 添加到应用实例的装饰器
  schema?: JSONSchema;                      // 配置验证schema
}

/**
 * 插件注册函数类型
 */
export type PluginRegisterFn<TOptions = any> = (
  app: StratixApp,                          // 应用实例
  options: TOptions                         // 插件配置
) => Promise<void> | void;

/**
 * 插件工厂函数类型
 */
export type PluginFactory<TOptions = any> = (
  factoryOptions?: any                      // 工厂配置
) => StratixPlugin<TOptions>;
```

### 3.3 配置相关接口

```typescript
/**
 * 配置API接口
 */
export interface ConfigAPI {
  get<T = any>(path: string, defaultValue?: T): T;
  has(path: string): boolean;
  set(path: string, value: any): void;
  validate(path: string, schema: JSONSchema): boolean;
}

/**
 * 配置加载器选项
 */
export interface ConfigLoaderOptions {
  config?: Record<string, any>;        // 内联配置
  configPath?: string;                 // 配置文件路径
  env?: boolean | EnvOptions;          // 环境变量配置
}
```

### 3.4 钩子相关接口

```typescript
/**
 * 钩子处理函数类型
 */
export type HookHandler = () => Promise<void> | void;

/**
 * 应用钩子名称枚举
 */
export enum HookName {
  OnRegister = 'onRegister',
  BeforeInit = 'beforeInit',
  AfterInit = 'afterInit',
  BeforeStart = 'beforeStart',
  AfterStart = 'afterStart',
  BeforeClose = 'beforeClose',
  AfterClose = 'afterClose'
}

/**
 * 钩子管理器接口
 */
export interface HookManager {
  register(name: string, handler: HookHandler): void;
  trigger(name: string): Promise<void>;
  hasHandlers(name: string): boolean;
}
```

### 3.5 日志相关接口

```typescript
/**
 * 日志级别类型
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  level?: LogLevel;
  prettyPrint?: boolean;
  redact?: string[];
  destination?: string | NodeJS.WritableStream;
  timestamp?: boolean | (() => string);
}

/**
 * 日志实例接口
 */
export interface LoggerInstance {
  trace(obj: unknown, msg?: string, ...args: any[]): void;
  debug(obj: unknown, msg?: string, ...args: any[]): void;
  info(obj: unknown, msg?: string, ...args: any[]): void;
  warn(obj: unknown, msg?: string, ...args: any[]): void;
  error(obj: unknown, msg?: string, ...args: any[]): void;
  fatal(obj: unknown, msg?: string, ...args: any[]): void;
  child(bindings: Record<string, any>): LoggerInstance;
}
```

## 4. 核心功能实现

### 4.1 应用实现

#### 4.1.1 应用类实现

```typescript
// src/app/app.ts
export class StratixAppImpl implements StratixApp {
  readonly name: string;
  readonly fastify: FastifyInstance;
  private readonly _plugins: Map<string, any> = new Map();
  private readonly _hooks: HookManager;
  private readonly _decorations: Map<string, any> = new Map();
  readonly config: ConfigAPI;
  readonly logger: LoggerInstance;
  
  constructor(options: StratixAppImplOptions) {
    this.name = options.name;
    this.fastify = options.fastify || fastify();
    this._hooks = new HookManagerImpl();
    this.config = options.config;
    this.logger = options.logger;
    
    // 初始化内部状态
    this._initializeDecorations();
  }
  
  /**
   * 注册插件
   */
  register<T = any>(plugin: StratixPlugin<T>, options?: T): StratixApp {
    if (!plugin || typeof plugin !== 'object') {
      throw new InvalidPluginError('插件必须是一个有效的对象');
    }
    
    if (!plugin.name) {
      throw new InvalidPluginError('插件必须有一个name属性');
    }
    
    if (this._plugins.has(plugin.name)) {
      throw new PluginAlreadyExistsError(`插件 ${plugin.name} 已经注册`);
    }
    
    // 验证插件配置
    if (plugin.schema && options) {
      const isValid = this.config.validate(plugin.name, plugin.schema, options);
      if (!isValid) {
        throw new InvalidPluginConfigError(`插件 ${plugin.name} 配置无效`);
      }
    }
    
    // 检查依赖是否已注册
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this._plugins.has(dep)) {
          throw new PluginDependencyError(
            `插件 ${plugin.name} 依赖 ${dep}，但它尚未注册`
          );
        }
      }
    }
    
    // 触发注册钩子
    this._hooks.trigger(HookName.OnRegister);
    
    // 执行插件注册函数
    try {
      const result = plugin.register(this, options || {} as T);
      
      // 如果返回Promise，等待其完成
      if (result instanceof Promise) {
        result.catch((err) => {
          throw new PluginRegistrationError(
            `插件 ${plugin.name} 注册失败: ${err.message}`,
            err
          );
        });
      }
      
      // 保存插件实例
      this._plugins.set(plugin.name, {
        plugin,
        options: options || {}
      });
      
      // 添加插件提供的装饰器
      if (plugin.decorations) {
        for (const [key, value] of Object.entries(plugin.decorations)) {
          this.decorate(key, value);
        }
      }
      
      return this;
    } catch (err) {
      throw new PluginRegistrationError(
        `插件 ${plugin.name} 注册失败: ${(err as Error).message}`,
        err as Error
      );
    }
  }
  
  /**
   * 检查插件是否已注册
   */
  hasPlugin(pluginName: string): boolean {
    return this._plugins.has(pluginName);
  }
  
  /**
   * 使用已注册的插件
   */
  use<T = any>(pluginName: string): T {
    if (!this._plugins.has(pluginName)) {
      throw new PluginNotFoundError(`插件 ${pluginName} 未注册`);
    }
    
    return this._plugins.get(pluginName) as T;
  }
  
  /**
   * 启动应用
   */
  async start(): Promise<StratixApp> {
    // 触发启动前钩子
    await this._hooks.trigger(HookName.BeforeStart);
    
    // 启动Fastify
    await this.fastify.ready();
    
    // 触发启动后钩子
    await this._hooks.trigger(HookName.AfterStart);
    
    return this;
  }
  
  /**
   * 关闭应用
   */
  async close(): Promise<void> {
    // 触发关闭前钩子
    await this._hooks.trigger(HookName.BeforeClose);
    
    // 关闭Fastify
    await this.fastify.close();
    
    // 触发关闭后钩子
    await this._hooks.trigger(HookName.AfterClose);
  }
  
  /**
   * 注册钩子
   */
  hook(name: string, handler: HookHandler): StratixApp {
    this._hooks.register(name, handler);
    return this;
  }
  
  /**
   * 添加装饰器
   */
  decorate(name: string, value: any): StratixApp {
    if (this.hasDecorator(name)) {
      throw new DecoratorAlreadyExistsError(`装饰器 ${name} 已存在`);
    }
    
    this._decorations.set(name, value);
    return this;
  }
  
  /**
   * 检查装饰器是否存在
   */
  hasDecorator(name: string): boolean {
    return this._decorations.has(name);
  }
  
  /**
   * 初始化内部装饰器
   */
  private _initializeDecorations(): void {
    // 添加常用装饰器
    this._decorations.set('name', this.name);
    this._decorations.set('fastify', this.fastify);
    this._decorations.set('config', this.config);
    this._decorations.set('logger', this.logger);
  }
}
```

#### 4.1.2 应用工厂函数

```typescript
// src/app/factory.ts
import { StratixApp, AppOptions } from './interface';
import { StratixAppImpl } from './app';
import { ConfigLoader } from '../config/loader';
import { ConfigImpl } from '../config/config';
import { createLogger } from '../logger/logger';
import fastify from 'fastify';

/**
 * 创建应用实例
 */
export function createApp(options: AppOptions): StratixApp {
  // 检查选项
  if (!options || typeof options !== 'object') {
    throw new Error('应用选项必须是一个对象');
  }
  
  if (!options.name) {
    throw new Error('应用必须有一个名称');
  }
  
  // 创建Fastify实例
  const fastifyInstance = fastify();
  
  // 加载配置
  const configLoader = new ConfigLoader({
    config: options.config,
    configPath: options.configPath,
    env: options.env
  });
  const config = new ConfigImpl(configLoader.load());
  
  // 创建日志实例
  const logger = createLogger(options.logger || config.get('logger', {}));
  
  // 创建应用实例
  const app = new StratixAppImpl({
    name: options.name,
    fastify: fastifyInstance,
    config,
    logger
  });
  
  // 注册内置插件
  if (options.plugins) {
    for (const [pluginName, pluginOptions] of Object.entries(options.plugins)) {
      // 根据名称加载内置插件
      const plugin = require(`../plugins/${pluginName}`);
      app.register(plugin, pluginOptions);
    }
  }
  
  return app;
}

/**
 * 从配置文件创建应用
 */
export async function createAppFromConfig(
  configPath: string,
  options: Partial<AppOptions> = {}
): Promise<StratixApp> {
  // 加载配置文件
  const configLoader = new ConfigLoader({
    configPath,
    env: options.env || true
  });
  const config = configLoader.load();
  
  // 合并选项
  const mergedOptions: AppOptions = {
    ...config,
    ...options,
    name: options.name || config.name
  };
  
  return createApp(mergedOptions);
}
```

### 4.2 配置系统实现

#### 4.2.1 配置管理类

```typescript
// src/config/config.ts
import { ConfigAPI } from './types';
import { JSONSchema } from '../types/schema';
import { resolvePath } from '@stratix/utils';
import { validateSchema } from './validator';

export class ConfigImpl implements ConfigAPI {
  private _config: Record<string, any>;
  
  constructor(config: Record<string, any> = {}) {
    this._config = config;
  }
  
  /**
   * 获取配置值
   */
  get<T = any>(path: string, defaultValue?: T): T {
    const value = resolvePath(this._config, path);
    return value === undefined ? (defaultValue as T) : value;
  }
  
  /**
   * 检查配置路径是否存在
   */
  has(path: string): boolean {
    return resolvePath(this._config, path) !== undefined;
  }
  
  /**
   * 设置配置值
   */
  set(path: string, value: any): void {
    const parts = path.split('.');
    let current = this._config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  /**
   * 验证配置是否符合schema
   */
  validate(path: string, schema: JSONSchema, config?: any): boolean {
    const targetConfig = config || this.get(path, {});
    return validateSchema(targetConfig, schema);
  }
}
```

#### 4.2.2 配置加载器

```typescript
// src/config/loader.ts
import { ConfigLoaderOptions, EnvOptions } from './types';
import { deepMerge } from '@stratix/utils';
import fs from 'fs';
import path from 'path';

export class ConfigLoader {
  private readonly _options: ConfigLoaderOptions;
  
  constructor(options: ConfigLoaderOptions = {}) {
    this._options = options;
  }
  
  /**
   * 加载配置
   */
  load(): Record<string, any> {
    // 基础配置
    let config: Record<string, any> = {};
    
    // 1. 加载配置文件
    if (this._options.configPath) {
      const fileConfig = this._loadConfigFile(this._options.configPath);
      config = deepMerge(config, fileConfig);
    }
    
    // 2. 合并内联配置
    if (this._options.config) {
      config = deepMerge(config, this._options.config);
    }
    
    // 3. 处理环境变量
    if (this._options.env) {
      const envConfig = this._loadEnvConfig(
        typeof this._options.env === 'object' ? this._options.env : {}
      );
      config = deepMerge(config, envConfig);
    }
    
    return config;
  }
  
  /**
   * 加载配置文件
   */
  private _loadConfigFile(filePath: string): Record<string, any> {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`配置文件不存在: ${resolvedPath}`);
    }
    
    const ext = path.extname(resolvedPath).toLowerCase();
    
    // 根据文件扩展名处理不同类型的配置文件
    switch (ext) {
      case '.js':
      case '.cjs':
        // 加载CommonJS模块
        return require(resolvedPath);
      case '.json':
        // 加载JSON文件
        return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      case '.yml':
      case '.yaml':
        // 加载YAML文件
        try {
          const yaml = require('js-yaml');
          return yaml.load(fs.readFileSync(resolvedPath, 'utf8'));
        } catch (err) {
          throw new Error(
            `无法加载YAML配置文件: ${resolvedPath}. 请安装js-yaml包.`
          );
        }
      default:
        throw new Error(`不支持的配置文件格式: ${ext}`);
    }
  }
  
  /**
   * 加载环境变量配置
   */
  private _loadEnvConfig(options: EnvOptions): Record<string, any> {
    // 支持dotenv
    if (options.dotenv) {
      try {
        require('dotenv').config();
      } catch (err) {
        console.warn('无法加载dotenv，请安装dotenv包');
      }
    }
    
    // 检查必需的环境变量
    if (options.required) {
      for (const key of options.required) {
        if (process.env[key] === undefined) {
          throw new Error(`缺少必需的环境变量: ${key}`);
        }
      }
    }
    
    // 提取匹配前缀的环境变量
    const prefix = options.prefix || '';
    const config: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }
      
      // 移除前缀并转换为嵌套结构
      const configKey = prefix ? key.slice(prefix.length) : key;
      const keyPath = configKey.split('__').join('.');
      
      // 设置值
      this._setNestedValue(config, keyPath, value);
    }
    
    return config;
  }
  
  /**
   * 设置嵌套值
   */
  private _setNestedValue(
    obj: Record<string, any>,
    path: string,
    value: any
  ): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!current[part]) {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    // 处理环境变量值类型
    const lastKey = parts[parts.length - 1];
    const processedValue = this._processEnvValue(value);
    
    current[lastKey] = processedValue;
  }
  
  /**
   * 处理环境变量值
   */
  private _processEnvValue(value: string): any {
    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // null值
    if (value === 'null') return null;
    
    // 数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    
    // 日期
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
      return new Date(value);
    }
    
    // 默认为字符串
    return value;
  }
}
```

#### 4.2.3 配置验证器

```typescript
// src/config/validator.ts
import { JSONSchema } from '../types/schema';

/**
 * 验证配置是否符合Schema
 */
export function validateSchema(config: any, schema: JSONSchema): boolean {
  try {
    const Ajv = require('ajv');
    const ajv = new Ajv({ allErrors: true, useDefaults: true });
    
    const validate = ajv.compile(schema);
    const isValid = validate(config);
    
    return isValid;
  } catch (err) {
    console.warn('Schema验证失败:', err);
    return false;
  }
}
```

### 4.3 钩子系统实现

```typescript
// src/hook/hook.ts
import { HookManager, HookHandler } from './types';

export class HookManagerImpl implements HookManager {
  private _hooks: Map<string, HookHandler[]> = new Map();
  
  /**
   * 注册钩子处理函数
   */
  register(name: string, handler: HookHandler): void {
    if (!this._hooks.has(name)) {
      this._hooks.set(name, []);
    }
    
    this._hooks.get(name)!.push(handler);
  }
  
  /**
   * 触发钩子
   */
  async trigger(name: string): Promise<void> {
    if (!this._hooks.has(name)) {
      return;
    }
    
    const handlers = this._hooks.get(name)!;
    
    for (const handler of handlers) {
      const result = handler();
      
      if (result instanceof Promise) {
        await result;
      }
    }
  }
  
  /**
   * 检查是否有钩子处理函数
   */
  hasHandlers(name: string): boolean {
    return this._hooks.has(name) && this._hooks.get(name)!.length > 0;
  }
}
```

### 4.4 日志系统实现

```typescript
// src/logger/logger.ts
import { LoggerOptions, LoggerInstance, LogLevel } from './types';
import fastify from 'fastify';

/**
 * 创建日志实例
 */
export function createLogger(options: LoggerOptions = {}): LoggerInstance {
  const {
    level = 'info',
    prettyPrint = false,
    destination,
    redact = [],
    timestamp = true
  } = options;
  
  // 使用Fastify的pino日志器
  const logger = fastify({
    logger: {
      level,
      prettyPrint,
      redact,
      serializers: {
        err: (err) => ({
          type: err.constructor.name,
          message: err.message,
          stack: err.stack
        })
      },
      timestamp
    }
  }).log;
  
  // 设置日志输出目标
  if (destination) {
    if (typeof destination === 'string') {
      const fs = require('fs');
      const stream = fs.createWriteStream(destination, { flags: 'a' });
      logger.stream = stream;
    } else {
      logger.stream = destination;
    }
  }
  
  return logger;
}
```

### 4.5 错误处理系统

```typescript
// src/errors/errors.ts
/**
 * 基础错误类
 */
export class StratixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 插件相关错误
 */
export class PluginError extends StratixError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidPluginError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

export class PluginAlreadyExistsError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

export class PluginNotFoundError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

export class PluginDependencyError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

export class PluginRegistrationError extends PluginError {
  public readonly cause: Error;
  
  constructor(message: string, cause: Error) {
    super(message);
    this.cause = cause;
  }
}

export class InvalidPluginConfigError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 配置相关错误
 */
export class ConfigError extends StratixError {
  constructor(message: string) {
    super(message);
  }
}

export class ConfigValidationError extends ConfigError {
  constructor(message: string) {
    super(message);
  }
}

export class ConfigFileError extends ConfigError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 装饰器相关错误
 */
export class DecoratorError extends StratixError {
  constructor(message: string) {
    super(message);
  }
}

export class DecoratorAlreadyExistsError extends DecoratorError {
  constructor(message: string) {
    super(message);
  }
}

export class DecoratorNotFoundError extends DecoratorError {
  constructor(message: string) {
    super(message);
  }
}
```

### 4.6 主入口文件

```typescript
// src/index.ts
// 导出工厂函数
export { createApp, createAppFromConfig } from './app/factory';

// 导出接口和类型
export {
  StratixApp,
  AppOptions,
  EnvOptions
} from './app/interface';

export {
  StratixPlugin,
  PluginRegisterFn,
  PluginFactory
} from './plugin/types';

export {
  ConfigAPI,
  ConfigLoaderOptions
} from './config/types';

export {
  HookHandler,
  HookName,
  HookManager
} from './hook/types';

export {
  LoggerInstance,
  LoggerOptions,
  LogLevel
} from './logger/types';

// 导出错误类
export * from './errors/errors';

// 导出工具函数
export { validateSchema } from './config/validator';
export { createLogger } from './logger/logger';
```

## 5. 使用示例

### 5.1 基本使用

```typescript
import { createApp } from 'stratix';

// 创建应用
const app = createApp({
  name: 'my-app',
  logger: {
    level: 'info',
    prettyPrint: true
  }
});

// 注册插件
app.register(require('@stratix/web'), {
  port: 3000,
  host: 'localhost'
});

// 启动应用
async function start() {
  try {
    await app.start();
    app.logger.info(`应用已启动`);
  } catch (err) {
    app.logger.error(err, '应用启动失败');
    process.exit(1);
  }
}

start();
```

### 5.2 使用配置文件

```typescript
import { createAppFromConfig } from 'stratix';

// 从配置文件创建应用
async function start() {
  try {
    const app = await createAppFromConfig('./stratix.config.js');
    await app.start();
  } catch (err) {
    console.error('应用启动失败:', err);
    process.exit(1);
  }
}

start();
```

### 5.3 开发自定义插件

```typescript
import { StratixPlugin } from 'stratix';

// 自定义插件
const myPlugin: StratixPlugin = {
  name: 'myPlugin',
  dependencies: ['web'],
  register: async (app, options) => {
    // 插件实现...
    app.logger.info('自定义插件已注册');
    
    // 添加装饰器
    app.decorate('myFeature', {
      doSomething: () => {
        return 'Hello from myPlugin';
      }
    });
    
    // 注册钩子
    app.hook('beforeClose', () => {
      app.logger.info('插件资源清理...');
    });
  }
};

// 使用插件
app.register(myPlugin, {
  // 插件选项...
});

// 使用插件功能
console.log(app.myFeature.doSomething());
```

## 6. 总结

Stratix核心模块提供了一个基于Fastify的函数式配置框架，包含以下核心功能：

1. **应用容器**：管理应用生命周期和插件
2. **插件系统**：处理插件注册、依赖和配置
3. **配置管理**：支持多种配置来源和验证
4. **钩子系统**：提供应用生命周期钩子
5. **日志系统**：集成Fastify日志功能

该核心模块设计遵循以下原则：

- **函数式编程思想**：强调不可变性和纯函数
- **模块化设计**：功能拆分为独立模块
- **类型安全**：全面的TypeScript类型定义
- **配置驱动**：通过配置而非代码定义应用行为
- **可扩展性**：通过插件系统支持功能扩展

Stratix框架的核心模块为构建高性能、可维护的Node.js应用提供了坚实的基础。

## 7. 日志系统详解

Stratix框架使用Fastify的日志系统作为默认的日志模块，该日志系统基于性能优异的Pino日志库。日志系统是框架的核心功能之一，可以在应用的任何部分使用，特别是在插件开发中发挥重要作用。

### 7.1 日志系统配置

#### 7.1.1 基础配置

在创建Stratix应用时，可以通过配置选项来定制日志行为：

```typescript
import { createApp } from 'stratix';

const app = createApp({
  name: 'my-app',
  logger: {
    level: 'info',           // 日志级别: trace, debug, info, warn, error, fatal
    prettyPrint: true,       // 开发环境下美化输出
    redact: ['password'],    // 需要隐藏的敏感字段
    destination: './logs/app.log', // 日志输出目标
    timestamp: true          // 是否添加时间戳
  }
});
```

#### 7.1.2 配置文件方式

也可以通过配置文件方式定义日志配置：

```javascript
// stratix.config.js
module.exports = {
  name: 'my-app',
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
    redact: ['password', 'token', 'secret'],
    destination: process.env.LOG_FILE || undefined
  }
};
```

然后通过配置文件创建应用：

```typescript
import { createAppFromConfig } from 'stratix';

const app = await createAppFromConfig('./stratix.config.js');
```

### 7.2 日志实例创建

Stratix内部通过`createLogger`函数创建日志实例：

```typescript
// src/logger/logger.ts
export function createLogger(options: LoggerOptions = {}): LoggerInstance {
  const {
    level = 'info',
    prettyPrint = false,
    destination,
    redact = [],
    timestamp = true
  } = options;
  
  // 使用Fastify的pino日志器
  const logger = fastify({
    logger: {
      level,
      prettyPrint,
      redact,
      serializers: {
        err: (err) => ({
          type: err.constructor.name,
          message: err.message,
          stack: err.stack
        })
      },
      timestamp
    }
  }).log;
  
  // 设置日志输出目标
  if (destination) {
    if (typeof destination === 'string') {
      const fs = require('fs');
      const stream = fs.createWriteStream(destination, { flags: 'a' });
      logger.stream = stream;
    } else {
      logger.stream = destination;
    }
  }
  
  return logger;
}
```

### 7.3 使用日志

#### 7.3.1 在应用中使用日志

创建应用后，可以直接通过`app.logger`访问日志实例：

```typescript
// 创建应用
const app = createApp({
  name: 'my-app',
  logger: { level: 'info' }
});

// 使用日志
app.logger.info('应用启动');
app.logger.debug({ userId: 123 }, '用户登录');
app.logger.error(new Error('数据库连接失败'), '服务异常');
```

#### 7.3.2 在插件中使用日志

在开发Stratix插件时，可以通过应用实例访问日志系统：

```typescript
// 自定义插件
const myPlugin: StratixPlugin = {
  name: 'myPlugin',
  register: async (app, options) => {
    // 使用应用的日志实例
    app.logger.info('插件初始化');
    
    // 创建子日志器，添加上下文信息
    const pluginLogger = app.logger.child({ plugin: 'myPlugin' });
    
    pluginLogger.info('插件特定日志');
    
    // 在错误处理中使用日志
    try {
      // 插件操作...
    } catch (err) {
      pluginLogger.error(err, '插件操作失败');
    }
    
    // 注册钩子，在钩子中使用日志
    app.hook('beforeClose', () => {
      pluginLogger.info('插件资源清理开始');
      // 清理资源...
      pluginLogger.info('插件资源清理完成');
    });
  }
};
```

#### 7.3.3 创建子日志器

对于大型应用或复杂插件，可以创建子日志器来添加上下文信息：

```typescript
// 为不同模块创建子日志器
const dbLogger = app.logger.child({ module: 'database' });
const authLogger = app.logger.child({ module: 'auth' });
const apiLogger = app.logger.child({ module: 'api' });

// 在各模块中使用对应的日志器
dbLogger.info('数据库连接成功');
authLogger.debug({ userId: '123' }, '用户认证');
apiLogger.warn('API速率限制接近阈值');
```

### 7.4 日志级别

Stratix支持以下日志级别，按严重性递增排序：

1. **trace**: 最详细的调试信息
2. **debug**: 调试信息
3. **info**: 常规操作信息（默认级别）
4. **warn**: 警告信息
5. **error**: 错误信息
6. **fatal**: 致命错误

日志级别控制输出的日志消息。例如，当日志级别设置为`info`时，只有`info`、`warn`、`error`和`fatal`级别的日志会被输出，而`trace`和`debug`级别的日志会被忽略。

```typescript
// 不同日志级别的使用
app.logger.trace({ detailedInfo: data }, '非常详细的跟踪信息');
app.logger.debug({ debugData: value }, '调试信息');
app.logger.info({ userId: 123 }, '用户登录成功');
app.logger.warn({ resourceUsage: 85 }, '资源使用率较高');
app.logger.error(error, '操作失败');
app.logger.fatal(criticalError, '系统崩溃');
```

### 7.5 常见日志场景

#### 7.5.1 应用启动和关闭

```typescript
// 应用启动
async function start() {
  try {
    await app.start();
    app.logger.info(`应用已在端口 ${port} 上启动`);
  } catch (err) {
    app.logger.error(err, '应用启动失败');
    process.exit(1);
  }
}

// 应用关闭
process.on('SIGTERM', async () => {
  app.logger.info('收到关闭信号');
  try {
    await app.close();
    app.logger.info('应用已优雅关闭');
  } catch (err) {
    app.logger.error(err, '应用关闭过程中发生错误');
  } finally {
    process.exit(0);
  }
});
```

#### 7.5.2 请求日志记录

在Web插件中记录请求日志：

```typescript
const webPlugin: StratixPlugin = {
  name: 'web',
  register: async (app, options) => {
    // 设置请求日志钩子
    app.fastify.addHook('onRequest', (request, reply, done) => {
      request.log.info({
        url: request.url,
        method: request.method,
        headers: request.headers,
        ip: request.ip
      }, '收到请求');
      done();
    });
    
    // 设置响应日志钩子
    app.fastify.addHook('onResponse', (request, reply, done) => {
      request.log.info({
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime()
      }, '请求完成');
      done();
    });
  }
};
```

#### 7.5.3 数据库操作日志

```typescript
const dbPlugin: StratixPlugin = {
  name: 'database',
  register: async (app, options) => {
    const dbLogger = app.logger.child({ module: 'database' });
    
    // 连接数据库
    dbLogger.info({ host: options.host, database: options.database }, '正在连接数据库');
    
    try {
      // 连接数据库的逻辑...
      dbLogger.info('数据库连接成功');
    } catch (err) {
      dbLogger.error(err, '数据库连接失败');
      throw err;
    }
    
    // 添加查询日志装饰器
    app.decorate('db', {
      query: async (sql, params) => {
        dbLogger.debug({ sql, params }, '执行查询');
        try {
          const result = await executeQuery(sql, params);
          dbLogger.debug({ rowCount: result.rowCount }, '查询成功');
          return result;
        } catch (err) {
          dbLogger.error({ sql, params, error: err }, '查询失败');
          throw err;
        }
      }
    });
  }
};
```

### 7.6 生产环境日志配置

在生产环境中，通常需要更严格的日志配置：

```javascript
// 生产环境日志配置
const prodLogConfig = {
  level: 'info',         // 生产环境通常不需要debug和trace级别
  prettyPrint: false,    // 生产环境使用JSON格式，便于日志聚合
  redact: [              // 敏感信息脱敏
    'req.headers.authorization',
    'req.headers.cookie',
    'body.password',
    'body.creditCard',
    '*.password',
    '*.secret'
  ],
  destination: '/var/log/app.log', // 日志文件路径
  timestamp: true
};
```

对于长期运行的应用，建议配置日志轮转以防止日志文件过大。可以使用系统工具如`logrotate`，或者通过流工具如`rotating-file-stream`：

```javascript
const rfs = require('rotating-file-stream');
const path = require('path');

// 创建轮转日志流
const logStream = rfs.createStream('app.log', {
  interval: '1d',            // 每天轮转
  path: path.join(__dirname, 'logs'),
  size: '10M',               // 或者达到10MB时轮转
  compress: 'gzip'           // 压缩旧日志
});

// 配置Stratix日志
const app = createApp({
  name: 'my-app',
  logger: {
    level: 'info',
    destination: logStream   // 使用轮转日志流
  }
});
``` 