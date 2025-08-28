// 配置相关类型定义
// 定义 Stratix 框架的配置接口和类型

import { AwilixContainer } from 'awilix';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import type { Logger } from 'pino';
import type { ApplicationAutoDIConfig } from '../bootstrap/application-auto-di.js';
import { BootstrapStatus } from '../bootstrap/index.js';
import type { AutoLoadConfig } from './auto-load.js';
import type { PluginConfig } from './plugin.js';

/**
 * Stratix 运行选项
 * 用于 Stratix.run() 方法的参数
 */
export interface StratixRunOptions {
  /** 应用类型 - 自动检测或手动指定 */
  type?: 'web' | 'cli' | 'worker' | 'auto';

  /** 配置文件路径 - 可选，支持零配置启动 */
  configOptions?: string | ConfigOptions;

  /** 环境变量配置 */
  envOptions?: EnvOptions;

  /** 环境变量配置 (别名) */
  env?: EnvOptions;

  /** 服务器配置覆盖 - 仅对web应用有效，会覆盖配置文件中的设置 */
  server?: {
    port?: number;
    host?: string;
    listen?: boolean; // 是否自动监听端口
  };

  /** 日志配置 */
  logger?:
    | Logger
    | {
        level?: LogLevel;
        pretty?: boolean;
      };

  /** 是否自动启动应用 */
  autoStart?: boolean;

  /** 调试模式 */
  debug?: boolean;

  /** 优雅关闭 */
  gracefulShutdown?: boolean;

  /** 关闭超时时间 */
  shutdownTimeout?: number;

  /** 启动超时时间 */
  startupTimeout?: number;

  /** 配置对象 */
  config?: StratixConfig;

  /** 实例ID */
  instanceId?: string;

  /** 应用级生命周期钩子 */
  lifecycleHooks?: LifecycleHooks;
}

/**
 * 配置加载选项
 */
export interface ConfigOptions {
  /**
   * 配置文件路径
   */
  configPath?: string;

  /**
   * 配置文件名前缀
   */
  configFilePrefix?: string;

  /**
   * 配置解密密钥
   */
  decryptionKey?: string;

  /**
   * 应用目录路径
   * 用于更准确地定位配置文件
   */
  appDir?: string;
}

/**
 * 环境变量选项
 */
export interface EnvOptions {
  rootDir?: string;
  path?: string | string[];
  override?: boolean;
  strict?: boolean;
}

/**
 * 日志级别
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志配置
 */
export interface LoggerConfig {
  level?: LogLevel;
  pretty?: boolean;
  file?: {
    enabled?: boolean;
    path?: string;
    maxSize?: string;
    maxFiles?: number;
  };
  /** 自定义传输配置 */
  transport?: any;
  /** 是否启用请求日志 */
  enableRequestLogging?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceLogging?: boolean;
  /** 是否启用错误追踪 */
  enableErrorTracking?: boolean;
  /** 是否启用审计日志 */
  enableAuditLogging?: boolean;
  /** 敏感字段列表 */
  sensitiveFields?: string[];
  /** 性能阈值（毫秒） */
  performanceThreshold?: number;
  /** 采样率（0-1） */
  sampleRate?: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  type?: 'memory' | 'redis';
  options?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    ttl?: number;
  };
}

/**
 * 应用级生命周期钩子
 * 与简化的生命周期阶段保持一致，管理整个应用 bootstrap 过程
 */
export interface LifecycleHooks {
  /** 应用启动前执行，在任何插件注册之前 */
  beforeStart?: () => Promise<void> | void;
  /** 应用启动后执行，在所有插件注册完成后，fastify.listen() 之前 */
  afterStart?: (fastify: FastifyInstance) => Promise<void> | void;
  /** 应用创建fastify实例后 */
  afterFastifyCreated?: (fastify: FastifyInstance) => Promise<void> | void;

  /** 应用关闭前执行，在fastify.close()之前 */
  beforeClose?: (fastify: FastifyInstance) => Promise<void> | void;
  /** 应用关闭后执行，在fastify.close()之后 */
  afterClose?: (fastify: FastifyInstance) => Promise<void> | void;
}

/**
 * Stratix 主配置接口
 */
export interface StratixConfig {
  /** 服务器配置 */
  server: Omit<FastifyServerOptions, 'logger'> & {
    port?: number;
    host?: string;
    prefix?: string;
  };

  /** 插件配置列表 */
  plugins: PluginConfig[];

  /** 自动加载配置 */
  autoLoad: AutoLoadConfig;

  /** 应用级自动依赖注入配置 */
  applicationAutoDI?: Partial<ApplicationAutoDIConfig>;

  /** 缓存配置 */
  cache?: CacheConfig;

  /** 日志配置 */
  logger?: LoggerConfig;

  /** 生命周期钩子 */
  hooks?: LifecycleHooks;
}

/**
 * Stratix 应用实例接口
 */
export interface StratixApplication {
  /** Fastify实例 (仅web应用) - 使用完整类型定义 */
  fastify: FastifyInstance;

  /** DI容器 */
  diContainer: AwilixContainer;

  /** 配置对象 */
  config: StratixConfig;

  /** 日志器 */
  logger: Logger;

  /** 启动状态 */
  status: BootstrapStatus;

  /** 应用类型 */
  type: 'web' | 'cli' | 'worker';

  /** 实例 ID */
  instanceId: string;

  /** 停止方法 */
  stop(): Promise<void>;

  /** 重启方法 */
  restart(options?: any): Promise<void>;

  /** 添加关闭处理器 */
  addShutdownHandler(handler: () => Promise<void>): void;

  /** 注册控制器 */
  registerController(controllerClass: any): Promise<any>;

  /** 注入请求 (测试用) */
  inject(options: any): Promise<any>;

  /** 获取地址 */
  getAddress(): any;

  /** 是否运行中 */
  isRunning(): boolean;

  /** 关闭应用 */
  close(): Promise<void>;

  /** 获取运行时间 */
  getUptime(): number;

  /** 获取内存使用情况 */
  getMemoryUsage(): NodeJS.MemoryUsage;

  /** 健康检查 */
  healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: Date;
  }>;
}
