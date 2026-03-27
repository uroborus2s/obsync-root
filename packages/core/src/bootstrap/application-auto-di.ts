// @stratix/core 应用级自动依赖注入模块
// 负责在应用启动时自动扫描和加载应用级的模块到root container

import { isDevelopment } from '../utils/environment/index.js';
import { asValue, InjectionMode, type AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { resolve } from 'node:path';
import { getLogger } from '../logger/index.js';
import { discoverAndProcessApplicationModules } from './application-module-discovery.js';

/**
 * 应用级自动依赖注入配置
 */
export interface ApplicationAutoDIConfig {
  /** 是否启用应用级自动注入 */
  enabled: boolean;
  /** 应用根目录路径 */
  appRootPath?: string;
  /** 扫描的目录模式 */
  patterns: string[];
  /** 扫描的目录列表 (新发现管道使用) */
  directories?: string[];
  /** 路由注册配置 */
  routing?: {
    /** 是否启用路由注册 */
    enabled?: boolean;
    /** 路由前缀 */
    prefix?: string;
    /** 是否启用验证 */
    validation?: boolean;
  };
  /** 生命周期管理配置 */
  lifecycle?: {
    /** 是否启用生命周期管理 */
    enabled?: boolean;
    /** 错误处理策略 */
    errorHandling?: 'throw' | 'warn' | 'ignore';
  };
  /** 是否启用调试模式 */
  debug?: boolean;
  options?: Record<string, unknown>;
}

/**
 * 默认的应用级自动依赖注入配置
 */
export const DEFAULT_APPLICATION_AUTO_DI_CONFIG: ApplicationAutoDIConfig = {
  enabled: true,
  patterns: [
    'services/*.{ts,js}',
    'repositories/*.{ts,js}',
    'controllers/*.{ts,js}'
  ],
  routing: {
    enabled: true,
    prefix: '',
    validation: false
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'warn'
  },
  debug: isDevelopment()
};

/**
 * 应用级模块注册结果
 */
export interface ApplicationModuleRegistrationResult {
  /** 是否成功 */
  success: boolean;
  /** 注册的模块数量 */
  moduleCount: number;
  /** 注册的模块名称列表 */
  registeredModules: string[];
  /** 生命周期模块数量 */
  lifecycleModuleCount?: number;
  /** 生命周期执行结果 */
  lifecycleResults?: {
    onRegister?: any; // 生命周期执行结果
    onReady?: any; // 生命周期执行结果
  };
  /** 错误信息 */
  error?: string;
}

/**
 * 便捷函数：执行应用级自动依赖注入
 */
export async function performApplicationAutoDI(
  rootContainer: AwilixContainer,
  config: Partial<ApplicationAutoDIConfig> = {},
  appRootPath?: string,
  fastifyInstance?: FastifyInstance
): Promise<ApplicationModuleRegistrationResult> {
  const finalConfig = {
    ...DEFAULT_APPLICATION_AUTO_DI_CONFIG,
    ...config,
    patterns: config.patterns || DEFAULT_APPLICATION_AUTO_DI_CONFIG.patterns
  };

  const logger = getLogger();

  if (!finalConfig.enabled) {
    if (finalConfig.debug) {
      logger.info('🔧 Application-level auto DI is disabled');
    }
    return {
      success: true,
      moduleCount: 0,
      registeredModules: []
    };
  }

  rootContainer.register('options', asValue(finalConfig.options || {}));

  const resolvedAppRootPath = resolveAppRootPath(
    finalConfig.appRootPath || appRootPath
  );

  if (finalConfig.debug) {
    logger.info('🚀 Starting application-level auto dependency injection...');
    logger.info(`📁 App root path: ${resolvedAppRootPath}`);
    logger.info(`🔍 Patterns: ${finalConfig.patterns.join(', ')}`);
  }

  try {
    // 获取注册前的模块数量
    const modulesBefore = Object.keys(rootContainer.registrations).length;

    // 🎯 使用 loadModules 一次性加载所有应用级模块
    await rootContainer.loadModules(finalConfig.patterns, {
      cwd: resolvedAppRootPath,
      formatName: 'camelCase',
      resolverOptions: {
        lifetime: 'SINGLETON', // 应用级模块使用 SINGLETON 生命周期
        injectionMode: InjectionMode.CLASSIC
      },
      esModules: true
    });

    // 计算注册的模块数量
    const modulesAfter = Object.keys(rootContainer.registrations).length;
    const moduleCount = modulesAfter - modulesBefore;
    const registeredModules = Object.keys(rootContainer.registrations).slice(
      modulesBefore
    );

    if (finalConfig.debug) {
      logger.info(
        `✅ Application-level auto DI completed: ${moduleCount} modules registered`
      );
      logger.info(`📋 Registered modules: ${registeredModules.join(', ')}`);
    }

    // 🎯 使用统一循环处理架构处理生命周期和路由注册
    let processingResult: any = null;
    try {
      processingResult = await discoverAndProcessApplicationModules(
        rootContainer,
        fastifyInstance,
        {
          routingEnabled: finalConfig.routing?.enabled,
          routePrefix: finalConfig.routing?.prefix,
          routeValidation: finalConfig.routing?.validation,
          lifecycleEnabled: finalConfig.lifecycle?.enabled,
          lifecycleErrorHandling: finalConfig.lifecycle?.errorHandling,
          debug: finalConfig.debug
        }
      );

      if (finalConfig.debug) {
        logger.info('✅ Application-level unified processing completed', {
          lifecycleModules: processingResult.statistics.lifecycleModules,
          controllerModules: processingResult.statistics.controllerModules,
          routeRegistration: processingResult.routeRegistrationResult?.success,
          errors: processingResult.errors.length
        });
      }
    } catch (error) {
      if (finalConfig.debug) {
        logger.warn('⚠️ Application-level unified processing failed:', error);
      }
      // 不抛出错误，处理失败不应该影响应用启动
    }

    return {
      success: true,
      moduleCount,
      registeredModules,
      lifecycleModuleCount: processingResult?.statistics.lifecycleModules || 0,
      lifecycleResults: processingResult?.lifecycleResults
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (finalConfig.debug) {
      logger.error('❌ Application-level auto DI failed:', error);
    }

    return {
      success: false,
      moduleCount: 0,
      registeredModules: [],
      error: errorMessage
    };
  }
}

/**
 * 解析应用根目录路径
 */
function resolveAppRootPath(appRootPath?: string): string {
  // 1. 如果明确指定了路径，直接使用
  if (appRootPath) {
    return resolve(appRootPath);
  }

  // 2. 自动检测应用根目录
  return detectAppRootPath();
}

/**
 * 自动检测应用根目录路径
 */
function detectAppRootPath(): string {
  // 从当前工作目录开始查找
  let currentPath = process.cwd();
  const entryFilePath = process.argv[1];
  if (entryFilePath) {
    currentPath = resolve(entryFilePath, '..');
  }
  // 降级方案：使用当前工作目录
  return currentPath;
}
