// 应用启动器
// 负责应用的完整启动流程，包括环境加载、配置解析、容器初始化等

import type { AwilixContainer } from 'awilix';
import fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyServerOptions
} from 'fastify';
import type { Logger } from 'pino';

import { get, getNodeEnv, isProduction } from '../utils/environment/index.js';
import { asValue, createContainer, InjectionMode } from 'awilix';
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { HttpError, StratixError } from '../errors/index.js';
import type {
  ConfigOptions,
  EnvOptions,
  StratixApplication,
  StratixConfig,
  StratixRunOptions
} from '../types/index.js';
import { decryptConfig } from '../utils/crypto.js';
import { ErrorUtils } from '../utils/error-utils.js';

/**
 * 启动阶段
 */
export enum BootstrapPhase {
  INITIALIZING = 'initializing',
  ENV_LOADING = 'env_loading',
  CONFIG_LOADING = 'config_loading',
  CONTAINER_SETUP = 'container_setup',
  FASTIFY_INIT = 'fastify_init',
  PLUGIN_LOADING = 'plugin_loading',
  STARTING = 'starting',
  SERVER_STARTING = 'server_starting',
  READY = 'ready',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * 启动状态
 */
export interface BootstrapStatus {
  phase: BootstrapPhase;
  startTime: Date;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

// 定义敏感配置环境变量名称
const SENSITIVE_CONFIG_ENV = 'STRATIX_SENSITIVE_CONFIG';

// const ENCRYPTION_KEY = 'STRATIX_ENCRYPTION_KEY'; // 暂时未使用

const STRATIX_CONFIG_PATH = 'STRATIX_CONFIG_PATH';

/**
 * 默认配置文件名
 */
const DEFAULT_CONFIG_FILENAME = 'stratix.config';

/**
 * 默认配置文件扩展名
 */
const CONFIG_FILE_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs'];

type FastifyHandledError = Partial<FastifyError> & {
  validation?: unknown;
  code?: string;
  statusCode?: number;
  message?: string;
  details?: unknown;
};

type EagerInitializable = {
  initialize?: () => unknown | Promise<unknown>;
};

/**
 * 应用启动器类
 * 负责协调整个应用的启动过程，采用函数式编程风格
 */
export class ApplicationBootstrap {
  private status: BootstrapStatus = {
    phase: BootstrapPhase.INITIALIZING,
    startTime: new Date()
  };

  private logger: Logger;
  private rootContainer?: AwilixContainer;
  private shutdownHandlers: Array<() => Promise<void>> = [];
  private isShuttingDown = false;
  private fastifyInstance: FastifyInstance | null = null;
  private wrapError: (error: unknown, additionalContext?: string) => Error;
  private safeExecute: <T>(
    operation: string,
    fn: () => T | Promise<T>,
    defaultValue: T
  ) => Promise<T>;

  constructor(logger: Logger) {
    this.logger = logger;
    // 创建错误处理工具
    this.wrapError = ErrorUtils.createErrorWrapper(
      'ApplicationBootstrap',
      logger
    );
    this.safeExecute = ErrorUtils.createSafeExecutor(
      'ApplicationBootstrap',
      logger
    );
  }

  /**
   * 启动应用 (传统版本 - 保持向后兼容)
   */
  async bootstrap(options?: StratixRunOptions): Promise<StratixApplication> {
    const startTime = Date.now();

    try {
      this.updateStatus(BootstrapPhase.INITIALIZING);

      // 1. 处理启动选项
      const processedOptions = this.processOptions(options);

      this.logger.info('🚀 Starting Stratix application bootstrap...');

      // 2. 检测应用类型
      const appType = this.detectApplicationType(processedOptions);
      this.logger.debug(`Application type detected: ${appType}`);

      // 3. 加载环境变量和敏感配置
      const sensitiveConfig = await this.loadEnvironment(
        processedOptions?.envOptions || processedOptions?.env
      );

      // 4. 加载配置（传入敏感配置参数）
      const config = await this.loadConfiguration(
        sensitiveConfig,
        processedOptions.configOptions
      );

      // 5. 设置容器
      const container = await this.setupContainer(config);

      // 6. 初始化 Fastify（所有应用类型都需要，用于插件系统）
      const fastifyInstance = await this.initializeFastify(config, container);

      // 8. 加载插件
      await this.loadPlugins(config, fastifyInstance);

      // 8.1 🎯 执行应用级自动依赖注入（包括路由注册）
      await this.performApplicationLevelAutoDI(
        config,
        container,
        fastifyInstance
      );

      // 9. 启动应用（根据应用类型选择启动方式）
      await this.startApplication(fastifyInstance, config, appType);

      // 10. 设置优雅关闭
      this.setupGracefulShutdown(processedOptions.shutdownTimeout || 10000);

      const duration = Date.now() - startTime;
      this.updateStatus(BootstrapPhase.READY, { duration, appType });

      this.logger.info(
        `✅ Stratix application bootstrapped successfully in ${duration}ms`
      );

      // 触发应用启动后的生命周期钩子
      if (config.hooks?.beforeClose) {
        this.addShutdownHandler(async () => {
          await config.hooks?.beforeClose?.(fastifyInstance);
        });
      }

      // 12. 创建应用实例 - 确保日志器统一性
      const application: StratixApplication = {
        fastify: fastifyInstance as any,
        diContainer: container,
        config,
        logger: this.logger, // 使用统一的日志器实例（与 Fastify 相同）
        status: this.status,
        type: appType,
        instanceId: processedOptions.instanceId || 'default',
        stop: async () => {
          // 正确的停止流程：先执行应用级停止逻辑，再关闭 Fastify
          await this.stop();
        },
        restart: async (options?: any) => {
          await this.restart({ ...processedOptions, ...options });
        },
        addShutdownHandler: (handler: () => Promise<void>) =>
          this.addShutdownHandler(handler),
        registerController: async (controllerClass: any) => {
          // TODO: 实现控制器注册逻辑
          return controllerClass;
        },
        inject: async (options: any) => {
          return await fastifyInstance.inject(options);
        },
        getAddress: () => {
          return fastifyInstance.server?.address();
        },
        isRunning: () => {
          return fastifyInstance.server?.listening || false;
        },
        close: async () => {
          await fastifyInstance.close();
        },
        getUptime: () => {
          return Date.now() - application.status.startTime.getTime();
        },
        getMemoryUsage: () => {
          return process.memoryUsage();
        },
        healthCheck: async () => {
          return {
            status: 'healthy' as const,
            uptime: application.getUptime(),
            memory: application.getMemoryUsage(),
            timestamp: new Date()
          };
        }
      };

      // 验证日志器统一性
      this.validateLoggerUnity(application);

      return application;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStatus(BootstrapPhase.ERROR, {
        duration,
        error: error as Error
      });

      // 清理已初始化的资源
      await this.safeExecute('cleanup', () => this.cleanup(), undefined);

      throw this.wrapError(error, 'bootstrap');
    }
  }

  /**
   * 处理启动参数和默认配置合并
   */
  private processOptions(options?: StratixRunOptions): StratixRunOptions {
    const defaultOptions: StratixRunOptions = {
      type: 'web',
      debug: !isProduction(),
      gracefulShutdown: true,
      shutdownTimeout: 10000,
      startupTimeout: 30000
    };

    return {
      ...defaultOptions,
      ...options,
      env: {
        ...options?.env
      }
    };
  }

  /**
   * 验证日志器统一性
   * 确保应用日志器与 Fastify 日志器是同一个实例
   */
  private validateLoggerUnity(application: StratixApplication): void {
    if (!application.fastify) {
      // 非 Web 应用，跳过验证
      return;
    }

    const appLogger = application.logger;
    const fastifyLogger = application.fastify.log;

    // 验证日志器实例是否相同
    if (appLogger === fastifyLogger) {
      this.logger?.debug(
        '✅ Logger unity verified: app.logger === app.fastify.log'
      );
    } else {
      this.logger?.warn(
        '⚠️ Logger unity check failed: app.logger !== app.fastify.log'
      );
      this.logger?.warn({ appLoggerType: typeof appLogger }, 'App logger');
      this.logger?.warn(
        { fastifyLoggerType: typeof fastifyLogger },
        'Fastify logger'
      );
    }

    // 验证日志器是否为同一个 Pino 实例
    if (
      appLogger &&
      'version' in appLogger &&
      fastifyLogger &&
      'version' in fastifyLogger
    ) {
      this.logger?.debug('✅ Both loggers are Pino instances');
    }
  }

  /**
   * 检测应用类型
   */
  private detectApplicationType(
    options?: StratixRunOptions
  ): 'web' | 'cli' | 'worker' | 'service' {
    // 优先使用显式指定的类型
    if (options?.type && options.type !== 'auto') {
      return options.type;
    }

    // 根据环境变量检测
    if (process.env.STRATIX_APP_TYPE) {
      return process.env.STRATIX_APP_TYPE as 'web' | 'cli' | 'worker' | 'service';
    }

    // 根据运行环境检测
    if (process.env.NODE_ENV === 'test') {
      return 'cli';
    }

    // 默认为 web 应用
    return 'web';
  }

  /**
   * 加载环境变量和敏感配置
   * @returns 解密后的敏感配置对象
   */
  private async loadEnvironment(
    envOptions?: EnvOptions
  ): Promise<Record<string, string>> {
    this.updateStatus(BootstrapPhase.ENV_LOADING);
    try {
      this.logger?.debug(
        '🌍 Loading environment variables and sensitive config...'
      );

      // 1. 首先检查敏感配置环境变量
      const sensitiveConfigRaw = get(SENSITIVE_CONFIG_ENV);
      if (sensitiveConfigRaw) {
        this.logger?.info(
          '🔐 Found sensitive configuration environment variable'
        );
      } else {
        const {
          rootDir = process.cwd(),
          override = false,
          strict = true,
          path
        } = envOptions || {};

        // 2. 如果没有敏感配置环境变量，使用 dotenv 获取
        this.logger?.debug(
          '📁 No sensitive config found, using dotenv files...'
        );

        const dotenv = await import('dotenv');
        const dotenvExpand = await import('dotenv-expand');
        const env = getNodeEnv();
        const isProd = isProduction();

        // 定义环境文件加载顺序（从低到高优先级）
        const envFiles =
          (typeof path === 'string' ? [path] : path) ||
          [
            '.env', // 基础配置
            `.env.${env}`, // 环境特定配置
            `.env.${env}.local`, // 本地环境特定配置
            '.env.local' // 本地通用配置（最高优先级）
          ].map((file) => resolve(rootDir, file));

        // 在生产环境中排除 .local 文件（安全考虑）
        const filesToLoad = isProd
          ? envFiles.filter((file) => !file.includes('.local'))
          : envFiles;

        this.logger?.debug(
          `📁 Environment files to load: ${filesToLoad.join(', ')}`
        );

        // 如果在严格模式下且特定的必需文件不存在，则抛出错误
        if (strict && !fs.existsSync(resolve(rootDir, `.env`))) {
          throw new Error(
            `必需的环境变量文件不存在: ${resolve(rootDir, `.env`)}`
          );
        }
        // 收集所有环境变量，实现正确的优先级覆盖
        const allEnvVars: Record<string, string> = {};

        // 按优先级顺序解析文件（从低到高优先级）
        // 后加载的文件中的配置项会覆盖先加载文件中的同名配置项
        for (const filePath of filesToLoad) {
          if (!fs.existsSync(filePath)) {
            this.logger.debug(`环境变量文件不存在: ${filePath}`);
            continue;
          }

          try {
            this.logger.debug(`解析环境变量文件: ${filePath}`);

            // 读取文件内容并解析
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parsed = dotenv.parse(fileContent);

            // 记录解析结果
            const parsedCount = Object.keys(parsed).length;
            this.logger.debug(`从 ${filePath} 解析到 ${parsedCount} 个变量`);

            // 合并到总配置中，后加载的覆盖先加载的
            // 这里实现了真正的优先级覆盖机制
            Object.assign(allEnvVars, parsed);
          } catch (error) {
            this.logger.warn({ err: error }, `解析环境变量文件失败: ${filePath}`);
            // 继续处理其他文件，不中断整个流程
          }
        }

        // 记录最终合并结果
        const totalVarsCount = Object.keys(allEnvVars).length;
        this.logger.debug(`环境变量合并完成，共 ${totalVarsCount} 个变量`);

        // 设置到 process.env，根据 override 参数决定是否覆盖系统环境变量
        for (const [key, value] of Object.entries(allEnvVars)) {
          if (override || !(key in process.env)) {
            process.env[key] = value;
          }
        }

        // 在所有文件解析完成后，统一进行变量扩展
        // 这样可以确保变量引用关系的正确性
        const expandResult = dotenvExpand.expand({ parsed: allEnvVars });

        if (expandResult.error) {
          this.logger.warn({ err: expandResult.error }, '变量扩展过程中出现错误');
        } else {
          this.logger.debug('变量扩展完成');
        }
      }

      const decryptedConfig = decryptConfig(
        get(SENSITIVE_CONFIG_ENV) as string
      );

      this.logger?.debug(
        `✅ Successfully decrypted ${Object.keys(decryptedConfig).length} sensitive config variables`
      );

      // 返回解密后的敏感配置，不直接设置到 process.env
      return decryptedConfig;
    } catch (error) {
      this.logger?.warn(
        `⚠️ Failed to decrypt sensitive config: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * 获取启动模块路径
   *
   * 尝试找到应用的入口模块所在路径，用于查找配置文件
   * 对于使用框架的应用（如从apps/template目录调用），
   * 此函数将返回应用的实际目录而非框架目录
   *
   * @returns 入口模块所在目录路径
   */
  private getEntryModulePath(): string | null {
    try {
      // 1. 通过process.argv[1]获取入口脚本路径（最可靠的方法之一）
      if (process.argv[1]) {
        const entryPath = resolve(process.argv[1]);
        if (fs.existsSync(entryPath)) {
          return dirname(entryPath);
        }
      }

      // 2. 在CommonJS环境中使用require.main
      try {
        // @ts-ignore - 在ESM环境中可能不存在
        if (typeof require !== 'undefined' && require.main?.filename) {
          return dirname(require.main.filename);
        }
      } catch (err) {
        // 忽略错误，继续尝试其他方法
      }

      // 3. 使用process.cwd()作为后备选项 - 当前工作目录
      return process.cwd();
    } catch (error) {
      console.warn('无法确定应用入口模块路径:', error);
      return process.cwd(); // 失败时返回当前工作目录
    }
  }

  /**
   * 加载配置
   * @param options 运行选项
   * @param sensitiveConfig 敏感配置参数
   */
  private async loadConfiguration(
    sensitiveConfig: Record<string, string> = {},
    configOptions?: string | ConfigOptions
  ): Promise<StratixConfig> {
    this.updateStatus(BootstrapPhase.CONFIG_LOADING);

    // 处理字符串选项（直接传入配置文件路径）
    const {
      configPath,
      configFilePrefix,
      // decryptionKey, // 暂时未使用
      appDir
    }: ConfigOptions =
      (typeof configOptions === 'string'
        ? { configPath: configOptions }
        : configOptions) || {};

    let conPath = configPath;
    // 如果直接提供了配置文件路径，则优先使用
    if (configPath) {
      conPath = resolve(configPath);
      if (!fs.existsSync(conPath)) {
        this.logger?.warn(`Config file not found: ${conPath}`);
        conPath = get(STRATIX_CONFIG_PATH);
        if (conPath && !fs.existsSync(conPath)) {
          this.logger?.warn(`Config file not found: ${conPath}`);
          conPath = undefined;
        }
      }
    }
    if (!conPath) {
      // 确定配置文件名前缀
      const configPrefix = configFilePrefix || DEFAULT_CONFIG_FILENAME;

      // 搜索位置优先级：
      // 1. 指定的应用目录 (appDir)
      // 2. 通过堆栈分析确定的入口模块路径
      // 3. 当前工作目录
      const searchPaths = [];

      // 1. 如果提供了应用目录，将其添加为第一搜索位置
      if (appDir && fs.existsSync(appDir)) {
        searchPaths.push(appDir);

        this.logger.debug(`将在应用目录搜索配置文件: ${appDir}`);
      }

      // 2. 尝试从堆栈中获取入口模块路径
      const entryPath = this.getEntryModulePath();
      if (entryPath && !searchPaths.includes(entryPath)) {
        searchPaths.push(entryPath);

        this.logger.debug(`将在入口模块路径搜索配置文件: ${entryPath}`);
      }

      // 3. 添加当前工作目录
      const currentDir = process.cwd();
      if (!searchPaths.includes(currentDir)) {
        searchPaths.push(currentDir);
        this.logger.debug(`将在当前工作目录搜索配置文件: ${currentDir}`);
      }

      // 在每个搜索路径中寻找配置文件
      for (const rootDir of searchPaths) {
        // 环境特定的配置文件
        for (const ext of CONFIG_FILE_EXTENSIONS) {
          const filePath = resolve(rootDir, `${configPrefix}${ext}`);
          if (fs.existsSync(filePath)) {
            this.logger.debug(`找到环境特定配置文件: ${filePath}`);
            conPath = filePath;
          }
        }
      }
    }

    if (!conPath) {
      this.logger?.error('未找到配置文件');
      throw new Error('Config file not found!');
    }

    try {
      // 1. 尝试加载 stratix.config.ts 模块
      this.logger?.debug('🔧 Loading stratix.config.ts module...');
      // const ext = extname(conPath); // 暂时未使用

      // 动态导入JS/TS模块
      // const fileUrl = pathToFileURL(conPath).href;
      const module = await import(conPath);
      const configExport = module.default || module;

      // 如果配置导出是函数，则传入敏感信息
      if (typeof configExport !== 'function') {
        throw new Error('stratix.config.ts must export a default function');
      }

      this.logger?.debug(
        '⚙️ Executing configuration function with sensitive config...'
      );
      this.logger?.debug('✅ Successfully loaded stratix.config.ts');

      const configFunction = configExport(sensitiveConfig);
      
      // 验证配置
      this.logger?.debug('🔍 Validating configuration...');
      const { StratixConfigSchema } = await import('../config/schema.js');
      const { ConfigurationError } = await import('../errors/configuration-error.js');
      
      const parseResult = StratixConfigSchema.safeParse(configFunction);
      
      if (!parseResult.success) {
        const errorMessages = parseResult.error.issues.map((err: any) => 
          `- ${err.path.join('.')}: ${err.message}`
        ).join('\n');
        
        this.logger?.error(`❌ Configuration validation failed:\n${errorMessages}`);
        throw new ConfigurationError(`Configuration validation failed:\n${errorMessages}`, parseResult.error.issues);
      }

      this.logger?.debug('✅ Configuration validated successfully');
      return parseResult.data as StratixConfig;
    } catch (error) {
      throw this.wrapError(error, 'loadConfiguration');
    }
  }

  /**
   * 设置容器
   */
  private async setupContainer(
    config: StratixConfig
  ): Promise<AwilixContainer> {
    this.updateStatus(BootstrapPhase.CONTAINER_SETUP);

    // 创建根容器
    this.rootContainer = createContainer({
      injectionMode: InjectionMode.CLASSIC,
      strict: false
    });

    // 注册核心服务
    this.rootContainer.register('logger', asValue(this.logger));

    this.logger?.debug('Container setup completed');
    return this.rootContainer;
  }

  /**
   * 执行应用级自动依赖注入
   */
  /**
   * 执行应用级自动依赖注入
   */
  private async performApplicationLevelAutoDI(
    config: StratixConfig,
    container: AwilixContainer,
    fastifyInstance: FastifyInstance
  ): Promise<void> {
    // 🎯 执行应用级自动依赖注入
    if (config.applicationAutoDI?.enabled !== false) {
      try {
        this.logger?.debug('🚀 Starting new module discovery pipeline...');
        
        // 1. Determine directories to scan
        let scanDirs: string[] = [];
        if (config.applicationAutoDI?.directories) {
          scanDirs = config.applicationAutoDI.directories;
        } else {
          // Auto-detect: usually src/controllers, src/services, etc.
          // For now, let's assume we scan the app root or specific subdirs if convention is followed.
          // To maintain backward compatibility with `performApplicationAutoDI` which likely scanned `src`,
          // we need to resolve the app root.
          const appRoot = this.getEntryModulePath() || process.cwd();
          scanDirs = [resolve(appRoot, 'src')]; // Default to src
        }

        // 2. Initialize Pipeline Components
        // Dynamic import to avoid circular dependencies if any, and to use the new module
        const { ModuleScanner, MetadataAnalyzer, StandardRegistrar } = await import('../discovery/index.js');
        
        const scanner = new ModuleScanner();
        const analyzer = new MetadataAnalyzer();
        const registrar = new StandardRegistrar();

        // 3. Execute Pipeline
        // Step 1: Scan
        const loadedModules = await scanner.scan(scanDirs);
        this.logger?.debug(`Pipeline: Scanned ${loadedModules.length} modules`);

        let registeredCount = 0;

        // Step 2 & 3: Analyze and Register
        for (const module of loadedModules) {
          const metadata = analyzer.analyze(module);
          if (metadata) {
            await registrar.register(metadata, container, fastifyInstance);
            registeredCount++;
          }
        }

        this.logger?.info(
          `✅ Application-level auto DI completed (New Pipeline): ${registeredCount} components registered`
        );

      } catch (error) {
        this.logger?.error({ err: error }, '❌ Application-level auto DI failed');
        // 抛出错误，不允许应用继续启动
        throw error;
      }
    }
  }

  /**
   * 初始化 Fastify
   */
  private async initializeFastify(
    config: StratixConfig,
    container: AwilixContainer
  ): Promise<FastifyInstance> {
    this.updateStatus(BootstrapPhase.FASTIFY_INIT);
    // 构建 Fastify 选项 - 确保使用统一的日志器
    const fastifyOptions: FastifyServerOptions = {
      ...config.server,
      loggerInstance: this.logger,
      pluginTimeout: 0 // 统一的日志器实例，确保 app.logger === app.fastify.log
    };

    // 创建 Fastify 实例
    const fastifyInstance = fastify(fastifyOptions);

    // 保存 Fastify 实例引用，用于后续清理
    this.fastifyInstance = fastifyInstance;

    // 🎯 注册应用级 Fastify 钩子
    fastifyInstance.decorate('diContainer', container);

    // 设置错误处理
    this.setupErrorHandling(fastifyInstance);

    // 设置请求上下文
    this.setupRequestContext(fastifyInstance, container);

    this.logger?.debug('Fastify initialization completed');
    if (config.hooks?.afterFastifyCreated) {
      await config.hooks.afterFastifyCreated(fastifyInstance);
    }
    return fastifyInstance;
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(fastify: FastifyInstance): void {
    // 全局错误处理器
    fastify.setErrorHandler(async (error, _request, reply) => {
      const handledError = error as FastifyHandledError;

      // 如果响应已经发送，则记录错误但不尝试再次发送
      if (reply.sent) {
        this.logger?.error(
          { err: error },
          'Response already sent, but an error occurred'
        );
        return;
      }

      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Internal Server Error';
      let details: unknown = undefined;

      // 1. 处理 Stratix 定义的 HttpError
      if (error instanceof HttpError) {
        statusCode = error.statusCode;
        errorCode = error.code;
        message = error.message;
        details = error.details;
      } 
      // 2. 处理其他 StratixError
      else if (error instanceof StratixError) {
        statusCode = 500; // 默认 500
        errorCode = error.code;
        message = error.message;
        details = error.details;
      }
      // 3. 处理 Fastify 验证错误
      else if (handledError.validation) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Validation Error';
        details = handledError.validation;
      }
      // 4. 处理 Fastify 自带的 HTTP 错误 (具有 statusCode 属性)
      else if (handledError.statusCode) {
        statusCode = handledError.statusCode;
        errorCode = handledError.code || 'HTTP_ERROR';
        message = handledError.message || message;
      }

      // 记录错误日志 (500及以上错误记录为 error，其他为 warn/info)
      if (statusCode >= 500) {
        this.logger?.error({ err: error }, 'Unhandled error');
      } else {
        this.logger?.warn(`Handled error (${statusCode}): ${message}`);
      }

      // 构造标准响应格式
      const response = {
        error: {
          code: errorCode,
          message: message,
          statusCode,
          details,
          timestamp: new Date().toISOString()
        }
      };

      reply.status(statusCode).send(response);
    });

    // 404 处理器
    fastify.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          statusCode: 404,
          path: request.url,
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  /**
   * 设置请求上下文
   */
  private setupRequestContext(
    fastify: FastifyInstance,
    container: AwilixContainer
  ): void {
    if (!container) return;

    // 为每个请求创建作用域
    fastify.addHook('onRequest', async (request, _reply) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 创建请求作用域
      const requestScope = container.createScope();

      // 将请求作用域附加到请求对象
      (request as any).diScope = requestScope;
      (request as any).requestId = requestId;
    });

    // 🔧 修复：在请求结束时清理作用域容器
    fastify.addHook('onResponse', async (request, _reply) => {
      try {
        const requestScope = (request as any).diScope;
        if (requestScope && typeof requestScope.dispose === 'function') {
          await requestScope.dispose();
          (request as any).diScope = null;
        }
      } catch (error) {
        this.logger?.error({ err: error }, 'Failed to dispose request scope container');
      }
    });
  }

  /**
   * 加载插件
   */
  private async loadPlugins(
    config: StratixConfig,
    fastify: FastifyInstance
  ): Promise<void> {
    this.updateStatus(BootstrapPhase.PLUGIN_LOADING);

    if (!config.plugins || config.plugins.length === 0) {
      this.logger?.debug('No plugins to load');
      return;
    }

    this.logger?.info(`Loading ${config.plugins.length} plugins...`);

    for (const pluginConfig of config.plugins) {
      try {
        // 注意：插件级生命周期现在由 withRegisterAutoDI 自动管理

        // 注意：插件作用域现在由 withRegisterAutoDI 自动管理
        // 不需要在这里手动创建作用域

        // 注册插件到 Fastify（所有应用类型都支持插件系统）
        if (pluginConfig.plugin) {
          await fastify.register(pluginConfig.plugin, {
            ...pluginConfig.options,
            prefix: pluginConfig.prefix
          });
        }

        // 注意：插件级生命周期现在由 withRegisterAutoDI 自动管理

        this.logger?.debug(`Plugin "${pluginConfig.name}" loaded successfully`);
      } catch (error) {
        this.logger?.error(
          { err: error, pluginName: pluginConfig.name },
          `Failed to load plugin "${pluginConfig.name}"`
        );
        throw new Error(`Plugin loading failed: ${pluginConfig.name}`);
      }
    }

    this.logger?.info('All plugins loaded successfully');

    // 执行立即初始化
    await this.executeEagerInitialization();
  }

  /**
   * 启动应用（根据应用类型选择启动方式）
   */
  private async startApplication(
    fastify: FastifyInstance,
    config: StratixConfig,
    appType: 'web' | 'cli' | 'worker' | 'service'
  ): Promise<void> {
    // 触发应用启动前的生命周期钩子
    if (config.hooks?.beforeStart) {
      await config.hooks.beforeStart(fastify);
    }
    this.updateStatus(BootstrapPhase.STARTING);

    if (appType === 'web') {
      // Web 应用：启动 HTTP 服务器
      await this.startWebServer(fastify, config);
    } else {
      // 非 Web 应用：只需要准备 Fastify 实例（用于插件系统）
      await this.startNonWebApplication(fastify, config);
    }

    // 触发应用启动后的生命周期钩子
    if (config.hooks?.afterStart) {
      await config.hooks.afterStart(fastify);
    }
    this.logger?.info(
      `🎯 ${appType.toUpperCase()} application started successfully`
    );
  }

  /**
   * 启动 Web 服务器
   */
  private async startWebServer(
    fastify: FastifyInstance,
    config: StratixConfig
  ): Promise<void> {
    this.updateStatus(BootstrapPhase.SERVER_STARTING);

    try {
      const { host, port } = config.server;

      await fastify.listen({
        host: host || '0.0.0.0',
        port: port || 3000
      });

      this.logger?.info(`🌐 Server listening on ${host}:${port}`);
    } catch (error) {
      this.logger?.error({ err: error }, 'Failed to start server');
      throw error;
    }
  }

  /**
   * 启动非 Web 应用（CLI、Worker、Service 等）
   */
  private async startNonWebApplication(
    fastify: FastifyInstance,
    config: StratixConfig
  ): Promise<void> {
    try {
      // 对于非 Web 应用，我们只需要准备 Fastify 实例
      // 这样插件系统就可以正常工作，但不会启动 HTTP 服务器
      await fastify.ready();

      this.logger?.info('🔧 Application ready (non-web mode)');
      this.logger?.debug('Fastify instance prepared for plugin system');
    } catch (error) {
      throw this.wrapError(error, 'startNonWebApplication');
    }
  }

  /**
   * 设置优雅关闭
   */
  private setupGracefulShutdown(shutdownTimeout?: number): void {
    const timeout = shutdownTimeout || 10000;

    const gracefulShutdown = async (signal: string) => {
      this.logger?.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        await Promise.race([
          this.stop(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Shutdown timeout')), timeout)
          )
        ]);

        process.exit(0);
      } catch (error) {
        this.logger?.error({ err: error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  /**
   * 停止应用
   */
  private async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.updateStatus(BootstrapPhase.STOPPING);

    const startTime = Date.now();
    this.logger?.info('🛑 Stopping Stratix application...');

    try {
      // 执行自定义关闭处理器
      await this.executeShutdownHandlers();

      // 清理资源
      await this.cleanup();

      const duration = Date.now() - startTime;
      this.updateStatus(BootstrapPhase.STOPPED, { duration });

      this.logger?.info(`✅ Application stopped gracefully in ${duration}ms`);
    } catch (error) {
      this.logger?.error({ err: error }, '❌ Error during shutdown');
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * 重启应用
   */
  private async restart(
    options?: StratixRunOptions
  ): Promise<StratixApplication> {
    this.logger?.info('🔄 Restarting Stratix application...');

    await this.stop();
    return await this.bootstrap(options);
  }

  /**
   * 执行关闭处理器
   */
  private async executeShutdownHandlers(): Promise<void> {
    if (this.shutdownHandlers.length === 0) {
      return;
    }

    this.logger?.debug(
      `Executing ${this.shutdownHandlers.length} shutdown handlers...`
    );

    const results = await Promise.allSettled(
      this.shutdownHandlers.map((handler) => handler())
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger?.error(
          { err: result.reason, handlerIndex: index + 1 },
          `Shutdown handler ${index + 1} failed`
        );
      }
    });
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    try {
      // 1. 关闭 Fastify 实例（如果存在）
      if (this.fastifyInstance) {
        this.logger?.debug('Closing Fastify instance...');
        await this.fastifyInstance.close();
        this.logger?.debug('Fastify instance closed');
      }

      // 2. 销毁容器
      if (this.rootContainer) {
        this.logger?.debug('Disposing root container...');
        await this.rootContainer.dispose();
        this.rootContainer = undefined;
        this.logger?.debug('Root container disposed');
      }

      // 3. 销毁应用级生命周期管理器
      this.logger?.debug('Disposing application lifecycle manager...');

      this.logger?.debug('Application lifecycle manager disposed');

      this.logger?.debug('✅ Cleanup completed successfully');
    } catch (error) {
      this.logger?.error({ err: error }, '❌ Error during cleanup');
      throw error; // 重新抛出错误，确保调用者知道清理失败
    }
  }

  /**
   * 执行立即初始化
   */
  private async executeEagerInitialization(): Promise<void> {
    try {
      this.logger?.debug('Starting eager initialization...');

      // 目前简化实现：直接从根容器中查找需要立即初始化的服务
      // 这是一个临时方案，后续会与插件系统完全集成
      if (this.rootContainer) {
        const registrations = this.rootContainer.registrations;
        const eagerInitServices: string[] = [];

        // 扫描所有注册的服务，查找标记为立即初始化的
        for (const [name, registration] of Object.entries(registrations)) {
          try {
            // 尝试获取服务的RESOLVER选项
            const resolver = (registration as any).resolver;
            if (resolver && resolver.eagerInit) {
              eagerInitServices.push(name);
            }
          } catch (error) {
            // 忽略获取resolver选项时的错误
          }
        }

        if (eagerInitServices.length > 0) {
          this.logger?.info(
            `Found ${eagerInitServices.length} services marked for eager initialization`
          );

          // 按优先级排序并立即创建实例
          for (const serviceName of eagerInitServices) {
            try {
              const startTime = Date.now();
              const instance = this.rootContainer.resolve(
                serviceName
              ) as EagerInitializable | undefined;

              // 如果实例有initialize方法，调用它
              if (instance && typeof instance.initialize === 'function') {
                await Promise.resolve(instance.initialize());
              }

              const duration = Date.now() - startTime;
              this.logger?.debug(
                `✅ Eager initialized: ${serviceName} in ${duration}ms`
              );
            } catch (error) {
              this.logger?.error(
                { err: error, serviceName },
                `❌ Failed to eager initialize: ${serviceName}`
              );
            }
          }
        } else {
          this.logger?.debug('No services marked for eager initialization');
        }
      }
    } catch (error) {
      this.logger?.error({ err: error }, 'Error during eager initialization');
      // 不抛出错误，避免影响应用启动
    }
  }

  /**
   * 更新状态
   */
  private updateStatus(
    phase: BootstrapPhase,
    metadata?: Record<string, any>
  ): void {
    this.status = {
      phase,
      startTime: this.status.startTime,
      duration: Date.now() - this.status.startTime.getTime(),
      metadata
    };
  }

  /**
   * 添加关闭处理器
   */
  private addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }
}
