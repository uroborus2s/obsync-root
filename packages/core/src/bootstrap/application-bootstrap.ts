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
import {
  ConfigurationError,
  HttpError,
  PluginLoadError,
  StratixError
} from '../errors/index.js';
import { createErrorEnvelope } from '../contracts/error-envelope.js';
import { ApplicationDiscoveryPipeline } from '../discovery/application-pipeline.js';
import type { ApplicationDiscoveryConfig } from '../discovery/interfaces.js';
import {
  createProductionManifestRegistrationPlan,
  loadProductionManifest,
  type LoadedProductionManifest,
  type ProductionManifestRegistrationPlan
} from '../discovery/production-manifest.js';
import type {
  ConfigOptions,
  EnvOptions,
  SecurityConfig,
  StratixApplication,
  StratixConfig,
  StratixRunOptions
} from '../types/index.js';
import { decryptConfig } from '../utils/crypto.js';
import { ErrorUtils } from '../utils/error-utils.js';
import { registerControllerClassRoutes } from '../plugin/controller-registration.js';

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

function isDirectConfig(value: unknown): value is StratixConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'server' in value &&
    'plugins' in value
  );
}

type FastifyHandledError = Partial<FastifyError> & {
  validation?: unknown;
  code?: string;
  statusCode?: number;
  message?: string;
  details?: unknown;
};

interface StratixTraceEntry {
  requestId?: string;
  traceId?: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

interface StratixObservabilityState {
  requests: {
    total: number;
    byStatus: Record<string, number>;
  };
  traces: StratixTraceEntry[];
  getSnapshot(): {
    requests: {
      total: number;
      byStatus: Record<string, number>;
    };
    traces: StratixTraceEntry[];
    uptime: number;
  };
}

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
  private routesFrozen = false;
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
    this.safeExecute = ErrorUtils.createSafeRunner(
      'ApplicationBootstrap',
      logger
    );
  }

  /**
   * 启动应用
   */
  async bootstrap(options?: StratixRunOptions): Promise<StratixApplication> {
    const startTime = Date.now();
    this.routesFrozen = false;

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
      const loadedConfig = await this.loadConfiguration(
        sensitiveConfig,
        processedOptions.config ?? processedOptions.configOptions
      );
      const config = this.applyRuntimeOverrides(loadedConfig, processedOptions);
      const productionManifest = this.loadConfiguredProductionManifest(config);

      // 5. 设置容器
      const container = await this.setupContainer(config);

      // 6. 初始化 Fastify（所有应用类型都需要，用于插件系统）
      const fastifyInstance = await this.initializeFastify(
        config,
        container,
        productionManifest
      );

      // 8. 加载插件
      await this.loadPlugins(config, fastifyInstance);

      // 8.1 执行应用级发现与注册（包括控制器路由注册）
      await this.runApplicationDiscovery(
        config,
        container,
        fastifyInstance,
        productionManifest
      );

      // 9. 启动应用（根据应用类型选择启动方式）
      await this.startApplication(
        fastifyInstance,
        config,
        appType,
        processedOptions
      );
      this.routesFrozen = true;

      // 10. 设置优雅关闭
      if (processedOptions.gracefulShutdown !== false) {
        this.setupGracefulShutdown(processedOptions.shutdownTimeout || 10000);
      }

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
        productionManifest,
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
          if (this.routesFrozen) {
            throw new ConfigurationError(
              'Controller registration must happen before Fastify is ready. Use config.discovery or hooks.afterFastifyCreated for startup-time route registration.',
              {
                controllerName: controllerClass?.name
              }
            );
          }

          try {
            return await registerControllerClassRoutes(
              fastifyInstance,
              container,
              controllerClass,
              config.discovery?.routing
            );
          } catch (error) {
            throw new ConfigurationError(
              'Controller registration must happen before Fastify is ready. Use config.discovery or hooks.afterFastifyCreated for startup-time route registration.',
              {
                controllerName: controllerClass?.name,
                originalMessage:
                  error instanceof Error ? error.message : String(error)
              },
              error
            );
          }
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

      if (error instanceof StratixError) {
        throw error;
      }

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

  private applyRuntimeOverrides(
    config: StratixConfig,
    options: StratixRunOptions
  ): StratixConfig {
    if (!options.server) {
      return config;
    }

    const { listen: _listen, ...serverOptions } = options.server;

    return {
      ...config,
      server: {
        ...config.server,
        ...serverOptions
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
      return process.env.STRATIX_APP_TYPE as
        | 'web'
        | 'cli'
        | 'worker'
        | 'service';
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
        const decryptedConfig = decryptConfig(sensitiveConfigRaw);

        this.logger?.debug(
          `✅ Successfully decrypted ${Object.keys(decryptedConfig).length} sensitive config variables`
        );

        return decryptedConfig;
      } else {
        const {
          rootDir = process.cwd(),
          override = false,
          strict = false,
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
            this.logger.warn(
              { err: error },
              `解析环境变量文件失败: ${filePath}`
            );
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
          this.logger.warn(
            { err: expandResult.error },
            '变量扩展过程中出现错误'
          );
        } else {
          this.logger.debug('变量扩展完成');
        }
      }

      return {};
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
      } catch {
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
    configOptions?: string | ConfigOptions | StratixConfig
  ): Promise<StratixConfig> {
    this.updateStatus(BootstrapPhase.CONFIG_LOADING);

    if (isDirectConfig(configOptions)) {
      this.logger?.debug('🔧 Using direct Stratix configuration object...');
      return this.validateConfiguration(configOptions);
    }

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

      return this.validateConfiguration(configFunction);
    } catch (error) {
      if (error instanceof StratixError) {
        throw error;
      }
      throw this.wrapError(error, 'loadConfiguration');
    }
  }

  private async validateConfiguration(
    config: StratixConfig
  ): Promise<StratixConfig> {
    this.logger?.debug('🔍 Validating configuration...');
    const { StratixConfigSchema } = await import('../config/schema.js');

    const parseResult = StratixConfigSchema.safeParse(config);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.issues
        .map((err: any) => `- ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      this.logger?.error(
        `❌ Configuration validation failed:\n${errorMessages}`
      );
      throw new ConfigurationError(
        `Configuration validation failed:\n${errorMessages}`,
        parseResult.error.issues
      );
    }

    this.logger?.debug('✅ Configuration validated successfully');
    return parseResult.data as StratixConfig;
  }

  /**
   * 设置容器
   */
  private async setupContainer(
    _config: StratixConfig
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
   * 执行应用级发现管道
   */
  private async runApplicationDiscovery(
    config: StratixConfig,
    container: AwilixContainer,
    fastifyInstance: FastifyInstance,
    productionManifest?: LoadedProductionManifest
  ): Promise<void> {
    const discoveryConfig = config.discovery || {};
    if (discoveryConfig.enabled === false) {
      return;
    }

    if (
      productionManifest &&
      discoveryConfig.productionManifest?.skipRuntimeDiscovery === true
    ) {
      if (discoveryConfig.productionManifest.registerFromManifest === true) {
        const registrationPlan =
          createProductionManifestRegistrationPlan(productionManifest);
        this.assertProductionManifestRegistrationPlan(
          productionManifest,
          discoveryConfig.productionManifest,
          registrationPlan
        );
        const manifestRoot =
          discoveryConfig.rootDir ||
          resolve(
            dirname(productionManifest.sourceFile),
            productionManifest.discovery.rootDir || '.'
          );

        if (registrationPlan.sourceFiles.length > 0) {
          this.logger?.info(
            `✅ Registering application components from production manifest: ${productionManifest.sourceFile}`
          );
          const pipeline = new ApplicationDiscoveryPipeline();
          const pipelineConfig: ApplicationDiscoveryConfig & {
            container: AwilixContainer;
            fastify: FastifyInstance;
          } = {
            ...discoveryConfig,
            rootDir: manifestRoot,
            files: registrationPlan.sourceFiles,
            manifestRegistration: {
              tokens: registrationPlan.tokenEntries,
              routes: registrationPlan.routes
            },
            container,
            fastify: fastifyInstance
          };
          const result = await pipeline.discoverAndRegister(pipelineConfig);

          this.assertProductionManifestRegistrationResult(
            productionManifest,
            discoveryConfig.productionManifest,
            registrationPlan,
            result
          );

          this.logger?.info(
            `✅ Production manifest registration completed: ${result.registered.length} registrations, ${result.routesRegistered} routes`
          );
          return;
        }
      }

      this.logger?.info(
        `✅ Production manifest loaded, skipping runtime application discovery: ${productionManifest.sourceFile}`
      );
      return;
    }

    try {
      this.logger?.debug('🚀 Starting application discovery pipeline...');

      const appRoot = this.getEntryModulePath() || process.cwd();
      const sourceRoot = fs.existsSync(resolve(appRoot, 'src'))
        ? resolve(appRoot, 'src')
        : appRoot;
      const pipeline = new ApplicationDiscoveryPipeline();
      const result = await pipeline.discoverAndRegister({
        rootDir: sourceRoot,
        ...discoveryConfig,
        container,
        fastify: fastifyInstance
      });

      this.logger?.info(
        `✅ Application discovery completed: ${result.registered.length} registrations, ${result.routesRegistered} routes`
      );
    } catch (error) {
      this.logger?.error({ err: error }, '❌ Application discovery failed');
      throw error;
    }
  }

  private assertProductionManifestRegistrationPlan(
    productionManifest: LoadedProductionManifest,
    manifestConfig: NonNullable<
      NonNullable<StratixConfig['discovery']>['productionManifest']
    >,
    registrationPlan: ProductionManifestRegistrationPlan
  ): void {
    if (
      manifestConfig.strict === false ||
      registrationPlan.issues.length === 0
    ) {
      return;
    }

    throw new ConfigurationError(
      `Production manifest registration plan is incomplete: ${productionManifest.sourceFile}`,
      {
        sourceFile: productionManifest.sourceFile,
        issues: registrationPlan.issues
      }
    );
  }

  private assertProductionManifestRegistrationResult(
    productionManifest: LoadedProductionManifest,
    manifestConfig: NonNullable<
      NonNullable<StratixConfig['discovery']>['productionManifest']
    >,
    registrationPlan: ProductionManifestRegistrationPlan,
    result: Awaited<
      ReturnType<ApplicationDiscoveryPipeline['discoverAndRegister']>
    >
  ): void {
    if (manifestConfig.strict === false) {
      return;
    }

    const registeredTokens = new Set(result.registered);
    const missingTokens = registrationPlan.tokenEntries
      .map((token) => token.token)
      .filter((token) => !registeredTokens.has(token));
    const expectedRoutes =
      manifestConfig.registerFromManifest === true
        ? registrationPlan.routes.length
        : 0;
    const missingRouteCount = Math.max(
      0,
      expectedRoutes - result.routesRegistered
    );

    if (missingTokens.length === 0 && missingRouteCount === 0) {
      return;
    }

    throw new ConfigurationError(
      `Production manifest source mismatch: ${productionManifest.sourceFile}`,
      {
        sourceFile: productionManifest.sourceFile,
        missingTokens,
        expectedRoutes,
        routesRegistered: result.routesRegistered,
        missingRouteCount
      }
    );
  }

  private loadConfiguredProductionManifest(
    config: StratixConfig
  ): LoadedProductionManifest | undefined {
    const discoveryConfig = config.discovery || {};
    if (discoveryConfig.enabled === false) {
      return undefined;
    }

    const manifestConfig = discoveryConfig.productionManifest;
    if (manifestConfig?.enabled !== true) {
      return undefined;
    }

    const appRoot = this.getEntryModulePath() || process.cwd();
    const productionManifest = loadProductionManifest(appRoot, manifestConfig);

    if (productionManifest) {
      this.logger?.info(
        `✅ Production manifest loaded: ${productionManifest.sourceFile}`
      );
    }

    return productionManifest;
  }

  /**
   * 初始化 Fastify
   */
  private async initializeFastify(
    config: StratixConfig,
    container: AwilixContainer,
    productionManifest?: LoadedProductionManifest
  ): Promise<FastifyInstance> {
    this.updateStatus(BootstrapPhase.FASTIFY_INIT);
    // 构建 Fastify 选项 - 确保使用统一的日志器
    const fastifyOptions: FastifyServerOptions = {
      ...config.server,
      bodyLimit: config.security?.bodyLimit ?? config.server.bodyLimit,
      loggerInstance: this.logger,
      pluginTimeout: 0 // 统一的日志器实例，确保 app.logger === app.fastify.log
    };

    // 创建 Fastify 实例
    const fastifyInstance = fastify(fastifyOptions);

    // 保存 Fastify 实例引用，用于后续清理
    this.fastifyInstance = fastifyInstance;

    // 🎯 注册应用级 Fastify 钩子
    fastifyInstance.decorate('diContainer', container);
    fastifyInstance.decorate('stratixConfig', config);
    fastifyInstance.decorate('stratixProductionManifest', productionManifest);

    // 设置错误处理
    this.setupErrorHandling(fastifyInstance);

    // 设置请求上下文
    this.setupRequestContext(fastifyInstance, container);

    // 设置生产观测和安全基线
    this.setupObservability(fastifyInstance, config);
    this.setupSecurity(fastifyInstance, config);

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
    fastify.setErrorHandler(async (error, request, reply) => {
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
      // 3. 处理 Fastify 请求验证错误
      else if (handledError.validation) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Validation Error';
        details = handledError.validation;
      }
      // 4. 处理 Fastify 响应序列化/响应校验错误
      else if (this.isResponseValidationError(handledError)) {
        statusCode = 500;
        errorCode = 'RESPONSE_VALIDATION_ERROR';
        message = 'Response Validation Error';
        details = {
          code: handledError.code,
          message: handledError.message
        };
      }
      // 5. 处理 Fastify 自带的 HTTP 错误 (具有 statusCode 属性)
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

      const response = createErrorEnvelope({
        code: errorCode,
        message,
        statusCode,
        details,
        path: request.url,
        requestId: this.getRequestId(request)
      });

      return reply.status(statusCode).send(response);
    });

    // 404 处理器
    fastify.setNotFoundHandler(async (request, reply) => {
      return reply.status(404).send(
        createErrorEnvelope({
          code: 'NOT_FOUND',
          message: 'Route not found',
          statusCode: 404,
          path: request.url,
          requestId: this.getRequestId(request)
        })
      );
    });
  }

  private getRequestId(request: unknown): string | undefined {
    const candidate = (request as any)?.requestId ?? (request as any)?.id;

    return typeof candidate === 'string' ? candidate : undefined;
  }

  private isResponseValidationError(error: FastifyHandledError): boolean {
    if ((error as any).serialization) {
      return true;
    }

    if (
      error.code === 'FST_ERR_FAILED_ERROR_SERIALIZATION' ||
      error.code === 'FST_ERR_SCH_SERIALIZATION_BUILD'
    ) {
      return true;
    }

    return (
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('response') &&
      error.message.toLowerCase().includes('schema')
    );
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
    fastify.addHook('onRequest', async (request, reply) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 创建请求作用域
      const requestScope = container.createScope();
      requestScope.register({
        request: asValue(request),
        reply: asValue(reply),
        requestId: asValue(requestId),
        logger: asValue(request.log || this.logger),
        diScope: asValue(requestScope)
      });

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
        this.logger?.error(
          { err: error },
          'Failed to dispose request scope container'
        );
      }
    });
  }

  private setupObservability(
    fastify: FastifyInstance,
    config: StratixConfig
  ): void {
    const observabilityConfig = config.observability;
    if (observabilityConfig?.enabled !== true) {
      return;
    }

    const startedAt = Date.now();
    const requestIdHeader = (
      observabilityConfig.requestIdHeader || 'x-request-id'
    ).toLowerCase();
    const traceIdHeader = (
      observabilityConfig.traceIdHeader || 'x-trace-id'
    ).toLowerCase();
    const maxTraceEntries = observabilityConfig.traces?.maxEntries ?? 100;
    const state: StratixObservabilityState = {
      requests: {
        total: 0,
        byStatus: {}
      },
      traces: [],
      getSnapshot: () => ({
        requests: {
          total: state.requests.total,
          byStatus: { ...state.requests.byStatus }
        },
        traces: [...state.traces],
        uptime: Math.max(0, Date.now() - startedAt)
      })
    };

    fastify.decorate('stratixObservability', state);

    fastify.addHook('onRequest', async (request) => {
      const incomingRequestId = request.headers[requestIdHeader];
      const incomingTraceId = request.headers[traceIdHeader];
      const requestId = Array.isArray(incomingRequestId)
        ? incomingRequestId[0]
        : incomingRequestId;
      const traceId = Array.isArray(incomingTraceId)
        ? incomingTraceId[0]
        : incomingTraceId;

      if (typeof requestId === 'string' && requestId.length > 0) {
        (request as any).requestId = requestId;
      }
      (request as any).traceId =
        typeof traceId === 'string' && traceId.length > 0
          ? traceId
          : `trace_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      (request as any).stratixStartedAt = Date.now();
      state.requests.total += 1;
    });

    fastify.addHook('onSend', async (request, reply, payload) => {
      const requestId = this.getRequestId(request);
      const traceId = (request as any).traceId;
      if (requestId) {
        reply.header(requestIdHeader, requestId);
      }
      if (typeof traceId === 'string') {
        reply.header(traceIdHeader, traceId);
      }
      return payload;
    });

    fastify.addHook('onResponse', async (request, reply) => {
      const statusCode = reply.statusCode;
      const statusKey = String(statusCode);
      const started = (request as any).stratixStartedAt;
      const durationMs =
        typeof started === 'number' ? Math.max(0, Date.now() - started) : 0;

      state.requests.byStatus[statusKey] =
        (state.requests.byStatus[statusKey] || 0) + 1;

      if (observabilityConfig.traces?.enabled !== false) {
        state.traces.push({
          requestId: this.getRequestId(request),
          traceId: (request as any).traceId,
          method: request.method,
          url: request.url,
          statusCode,
          durationMs,
          timestamp: new Date().toISOString()
        });
        while (state.traces.length > maxTraceEntries) {
          state.traces.shift();
        }
      }
    });

    if (observabilityConfig.health?.enabled !== false) {
      const healthBasePath = observabilityConfig.health?.basePath || '/health';
      const healthPayload = () => ({
        status: 'healthy',
        uptime: Math.max(0, Date.now() - startedAt),
        timestamp: new Date().toISOString(),
        checks: {
          runtime: 'healthy'
        }
      });

      fastify.get(healthBasePath, async () => healthPayload());
      fastify.get(`${healthBasePath}/ready`, async () => healthPayload());
      fastify.get(`${healthBasePath}/live`, async () => healthPayload());
    }

    if (observabilityConfig.metrics?.enabled !== false) {
      const metricsPath = observabilityConfig.metrics?.path || '/metrics';
      fastify.get(metricsPath, async () => state.getSnapshot());
    }
  }

  private setupSecurity(fastify: FastifyInstance, config: StratixConfig): void {
    const securityConfig = config.security;
    if (securityConfig?.enabled !== true) {
      return;
    }

    const rateLimitStore = new Map<
      string,
      { count: number; resetAt: number }
    >();
    const observabilityPaths = this.observabilityPaths(config);

    fastify.addHook('onRequest', async (request, reply) => {
      if (this.isCorsPreflight(request.method, securityConfig.cors)) {
        this.applyCorsHeaders(request, reply, securityConfig.cors);
        reply.status(204).send();
        return reply;
      }

      const rateLimit = securityConfig.rateLimit;
      if (
        rateLimit?.enabled === true &&
        !this.isObservabilityPath(request.url, observabilityPaths)
      ) {
        const max = rateLimit.max ?? 100;
        const windowMs = rateLimit.windowMs ?? 60_000;
        const key = this.rateLimitKey(request);
        const now = Date.now();
        const current = rateLimitStore.get(key);
        const bucket =
          current && current.resetAt > now
            ? current
            : { count: 0, resetAt: now + windowMs };

        if (bucket.count >= max) {
          reply.header('retry-after', Math.ceil((bucket.resetAt - now) / 1000));
          reply.status(429).send(
            createErrorEnvelope({
              code: 'RATE_LIMITED',
              message: 'Too Many Requests',
              statusCode: 429,
              path: request.url,
              requestId: this.getRequestId(request)
            })
          );
          return reply;
        }

        bucket.count += 1;
        rateLimitStore.set(key, bucket);
      }
    });

    fastify.addHook('onSend', async (request, reply, payload) => {
      this.applySecurityHeaders(reply, securityConfig.headers);
      this.applyCorsHeaders(request, reply, securityConfig.cors);
      return payload;
    });
  }

  private observabilityPaths(config: StratixConfig): string[] {
    const paths: string[] = [];
    if (config.observability?.health?.enabled !== false) {
      const basePath = config.observability?.health?.basePath || '/health';
      paths.push(basePath, `${basePath}/ready`, `${basePath}/live`);
    }
    if (config.observability?.metrics?.enabled !== false) {
      paths.push(config.observability?.metrics?.path || '/metrics');
    }
    return paths;
  }

  private isObservabilityPath(url: string, paths: string[]): boolean {
    const pathname = url.split('?')[0];
    return paths.includes(pathname);
  }

  private rateLimitKey(request: any): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  private isCorsPreflight(
    method: string,
    cors: SecurityConfig['cors']
  ): boolean {
    return method === 'OPTIONS' && Boolean(cors?.enabled);
  }

  private applyCorsHeaders(
    request: any,
    reply: any,
    cors: SecurityConfig['cors']
  ): void {
    if (!cors?.enabled) {
      return;
    }

    const origin = request.headers.origin;
    const origins = cors.origins ?? '*';
    const allowedOrigins = Array.isArray(origins) ? origins : [origins];
    const allowAny = allowedOrigins.includes('*');

    if (
      typeof origin === 'string' &&
      (allowAny || allowedOrigins.includes(origin))
    ) {
      reply.header('access-control-allow-origin', allowAny ? '*' : origin);
    }
    if (cors.credentials === true) {
      reply.header('access-control-allow-credentials', 'true');
    }
    reply.header(
      'access-control-allow-methods',
      (
        cors.methods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
      ).join(', ')
    );
    reply.header('access-control-allow-headers', 'content-type, authorization');
  }

  private applySecurityHeaders(
    reply: any,
    headers: SecurityConfig['headers']
  ): void {
    if (
      headers === false ||
      (typeof headers === 'object' && headers.enabled === false)
    ) {
      return;
    }

    const headerOptions = typeof headers === 'object' ? headers : {};
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', headerOptions.frameOptions || 'DENY');
    reply.header(
      'referrer-policy',
      headerOptions.referrerPolicy || 'no-referrer'
    );

    if (headerOptions.contentSecurityPolicy !== false) {
      reply.header(
        'content-security-policy',
        typeof headerOptions.contentSecurityPolicy === 'string'
          ? headerOptions.contentSecurityPolicy
          : "default-src 'self'"
      );
    }
  }

  /**
   * 加载插件
   */
  private async loadPlugins(
    config: StratixConfig,
    fastify: FastifyInstance
  ): Promise<void> {
    this.updateStatus(BootstrapPhase.PLUGIN_LOADING);

    const pluginConfigs = this.resolvePluginLoadOrder(config.plugins || []);

    if (pluginConfigs.length === 0) {
      this.logger?.debug('No plugins to load');
      return;
    }

    this.logger?.info(`Loading ${pluginConfigs.length} plugins...`);

    for (const pluginConfig of pluginConfigs) {
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
        throw new PluginLoadError(
          `Plugin loading failed: ${pluginConfig.name}`,
          { pluginName: pluginConfig.name },
          error
        );
      }
    }

    this.logger?.info('All plugins loaded successfully');

    // 执行立即初始化
    await this.executeEagerInitialization();
  }

  private resolvePluginLoadOrder(
    pluginConfigs: StratixConfig['plugins']
  ): StratixConfig['plugins'] {
    const enabledPlugins = pluginConfigs.filter(
      (pluginConfig) => pluginConfig.enabled !== false
    );
    const pluginsByName = new Map<string, StratixConfig['plugins'][number]>();

    for (const pluginConfig of enabledPlugins) {
      if (pluginsByName.has(pluginConfig.name)) {
        throw new ConfigurationError(
          `Duplicate plugin name: ${pluginConfig.name}`,
          {
            pluginName: pluginConfig.name
          }
        );
      }
      pluginsByName.set(pluginConfig.name, pluginConfig);
    }

    for (const pluginConfig of enabledPlugins) {
      for (const dependency of pluginConfig.dependencies || []) {
        if (!pluginsByName.has(dependency)) {
          throw new ConfigurationError(
            `Plugin dependency not found: ${pluginConfig.name} -> ${dependency}`,
            {
              pluginName: pluginConfig.name,
              dependency
            }
          );
        }
      }
    }

    const ordered: StratixConfig['plugins'] = [];
    const loaded = new Set<string>();
    const remaining = new Map(pluginsByName);

    while (remaining.size > 0) {
      const ready = [...remaining.values()]
        .filter((pluginConfig) =>
          (pluginConfig.dependencies || []).every((dependency) =>
            loaded.has(dependency)
          )
        )
        .sort((left, right) => {
          const leftOrder = left.order ?? 0;
          const rightOrder = right.order ?? 0;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          return left.name.localeCompare(right.name);
        });

      if (ready.length === 0) {
        throw new ConfigurationError('Plugin dependency cycle detected', {
          remaining: [...remaining.keys()]
        });
      }

      for (const pluginConfig of ready) {
        ordered.push(pluginConfig);
        loaded.add(pluginConfig.name);
        remaining.delete(pluginConfig.name);
      }
    }

    return ordered;
  }

  /**
   * 启动应用（根据应用类型选择启动方式）
   */
  private async startApplication(
    fastify: FastifyInstance,
    config: StratixConfig,
    appType: 'web' | 'cli' | 'worker' | 'service',
    options?: StratixRunOptions
  ): Promise<void> {
    // 触发应用启动前的生命周期钩子
    if (config.hooks?.beforeStart) {
      await config.hooks.beforeStart(fastify);
    }
    this.updateStatus(BootstrapPhase.STARTING);

    if (appType === 'web' && options?.server?.listen !== false) {
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
    _config: StratixConfig
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
          } catch {
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
              const instance = this.rootContainer.resolve(serviceName) as
                | EagerInitializable
                | undefined;

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
