// @stratix/core 插件工具函数
// 提供插件开发中常用的工具函数和类型定义

import { isDevelopment } from '../utils/environment/index.js';
import type {
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions
} from 'fastify';
import { dirname, isAbsolute, resolve } from 'node:path';
import { getLogger } from '../logger/index.js';

/**
 * 简化的自动依赖注入配置
 */
export interface AutoDIConfig {
  /** 模块发现配置 */
  discovery: {
    /** 扫描模式 */
    patterns: string[];
    /** 基础目录 */
    baseDir?: string;
  };

  /** 路由注册配置 */
  routing: {
    /** 是否启用路由注册 */
    enabled: boolean;
    /** 路由前缀 */
    prefix: string;
    /** 启用验证 */
    validation: boolean;
  };

  /** 服务适配器配置 */
  services: {
    /** 是否启用服务适配器注册 */
    enabled?: boolean;
    /** 扫描模式 */
    patterns: string[];
    /** 基础目录 */
    baseDir?: string;
  };

  /** 生命周期管理配置 */
  lifecycle?: {
    /** 是否启用生命周期管理 */
    enabled?: boolean;
    /** 错误处理策略 */
    errorHandling?: 'throw' | 'log' | 'ignore';
    /** 是否启用调试模式 */
    debug?: boolean;
  };

  /**
   * 参数处理函数
   * 用于自定义参数的转换、合并、默认值设置等逻辑
   */
  parameterProcessor?: <T>(options: T) => T;

  /**
   * 参数校验函数
   * 返回 true 表示校验通过，false 表示校验失败
   */
  parameterValidator?: <T>(options: T) => boolean;

  /** 调试模式 */
  debug?: boolean;
}

/**
 * 处理插件参数
 */
export function processPluginParameters<T>(
  options: T,
  config: AutoDIConfig,
  debugEnabled: boolean = false
): T {
  let processedOptions = options;

  if (debugEnabled) {
    const logger = getLogger();
    logger.debug('🔧 Processing plugin parameters...');
    logger.debug('  Original options:', options);
  }

  // 1. 参数处理（如果提供了处理函数）
  if (config.parameterProcessor) {
    try {
      processedOptions = config.parameterProcessor(processedOptions);

      if (debugEnabled) {
        const logger = getLogger();
        logger.debug('  After parameter processing:', processedOptions);
      }
    } catch (error) {
      const logger = getLogger();
      logger.error('❌ Parameter processing failed:', error);
      throw new Error(
        `Parameter processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // 2. 参数校验（如果提供了校验函数）
  if (config.parameterValidator) {
    try {
      const isValid = config.parameterValidator(processedOptions);

      if (!isValid) {
        const errorMessage = 'Parameter validation failed';
        if (debugEnabled) {
          const logger = getLogger();
          logger.error(
            '🚫 Parameter validation failed for options:',
            processedOptions
          );
        }
        throw new Error(errorMessage);
      }

      if (debugEnabled) {
        const logger = getLogger();
        logger.debug('  ✅ Parameter validation passed');
      }
    } catch (error) {
      const logger = getLogger();
      logger.error('❌ Parameter validation error:', error);

      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Parameter validation failed: ${error}`);
      }
    }
  }

  if (debugEnabled) {
    const logger = getLogger();
    logger.debug('  Final processed options:', processedOptions);
  }

  return processedOptions;
}

/**
 * 获取调用者的文件路径
 * 用于在 withRegisterAutoDI 包装时捕获原始插件的路径
 */
export function getCallerFilePath(): string | undefined {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  try {
    const stack = new Error().stack as unknown as NodeJS.CallSite[];

    // 跳过当前函数和 withRegisterAutoDI 函数，找到真正的调用者
    for (let i = 2; i < stack.length; i++) {
      const fileName = stack[i].getFileName();

      if (
        !fileName ||
        fileName.includes('utils') ||
        fileName.includes('auto-di-plugin') ||
        fileName.includes('node:') ||
        fileName.includes('internal/')
      ) {
        continue;
      }

      return fileName;
    }

    return undefined;
  } catch (error) {
    return undefined;
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}

/**
 * 智能解析基础路径
 * 支持明确指定、自动检测和降级方案
 */
export function resolveBasePath(
  configBaseDir?: string,
  pluginPath?: string
): string {
  // 1. 如果明确指定了基础路径，直接使用
  if (configBaseDir) {
    return isAbsolute(configBaseDir)
      ? configBaseDir
      : resolve(process.cwd(), configBaseDir);
  }

  // 2. 如果提供了插件路径，使用插件路径
  if (pluginPath) {
    const pluginDir = dirname(pluginPath);
    if (isDevelopment()) {
      console.log(`🎯 Using provided plugin path: ${pluginDir}`);
    }
    return pluginDir;
  }

  // 3. 自动检测插件模块文件的所在目录
  return detectPluginBasePath();
}

/**
 * 智能检测插件模块的基础路径
 * 通过分析调用栈获取插件文件的真实路径
 */
function detectPluginBasePath(): string {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  try {
    const stack = new Error().stack as unknown as NodeJS.CallSite[];

    if (isDevelopment()) {
      console.log('🔍 Analyzing call stack for plugin base path:');
    }

    // 遍历调用栈，寻找插件模块文件
    for (let i = 0; i < stack.length; i++) {
      const fileName = stack[i].getFileName();
      const functionName = stack[i].getFunctionName();

      if (isDevelopment()) {
        console.log(`  [${i}] ${fileName} (${functionName})`);
      }

      // 跳过无效文件名
      if (!fileName) {
        continue;
      }

      // 跳过框架内部文件
      if (
        fileName.includes('utils') ||
        fileName.includes('auto-di-plugin') ||
        fileName.includes('application-bootstrap') ||
        fileName.includes('node:') ||
        fileName.includes('internal/') ||
        fileName.includes('fastify') ||
        fileName.includes('awilix')
      ) {
        continue;
      }

      // 检查是否为第三方包
      if (fileName.includes('node_modules')) {
        const packageRoot = resolveToPackageRoot(fileName);
        if (isDevelopment()) {
          console.log(`✅ Found third-party plugin package: ${packageRoot}`);
        }
        return packageRoot;
      }

      // 本地文件：使用文件所在目录
      const pluginDir = dirname(fileName);
      if (isDevelopment()) {
        console.log(`✅ Found local plugin directory: ${pluginDir}`);
      }
      return pluginDir;
    }

    // 降级方案：使用当前工作目录
    const fallbackPath = process.cwd();
    if (isDevelopment()) {
      console.log(`⚠️ Using fallback path: ${fallbackPath}`);
    }
    return fallbackPath;
  } catch (error) {
    const fallbackPath = process.cwd();
    if (isDevelopment()) {
      console.error('❌ Error detecting plugin base path:', error);
      console.log(`⚠️ Using fallback path: ${fallbackPath}`);
    }
    return fallbackPath;
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}

/**
 * 解析到 npm 包的根目录
 */
function resolveToPackageRoot(modulePath: string): string {
  const nodeModulesIndex = modulePath.lastIndexOf('node_modules');
  if (nodeModulesIndex === -1) {
    return dirname(modulePath);
  }

  // 找到包名的结束位置
  const afterNodeModules = modulePath.substring(nodeModulesIndex + 13); // 'node_modules/'.length = 13
  const pathParts = afterNodeModules.split('/');

  // 处理 scoped packages (@scope/package)
  const packageParts = pathParts[0].startsWith('@')
    ? pathParts.slice(0, 2)
    : pathParts.slice(0, 1);

  return resolve(
    modulePath.substring(0, nodeModulesIndex + 13),
    ...packageParts
  );
}

/**
 * 获取插件名称
 */
export function getPluginName<T extends FastifyPluginOptions>(
  plugin: FastifyPluginAsync<T> | FastifyPluginCallback<T>
): string {
  // 优先使用函数的 name 属性
  if (plugin.name && plugin.name !== 'anonymous') {
    return plugin.name;
  }

  // 如果没有名称，尝试从函数字符串中提取
  const funcStr = plugin.toString();
  const nameMatch = funcStr.match(
    /(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/
  );

  if (nameMatch && nameMatch[1] && nameMatch[1] !== 'anonymous') {
    return nameMatch[1];
  }

  // 如果都没有，返回默认名称
  return 'unknownPlugin';
}

/**
 * 检查是否为异步插件
 */
export function isAsyncPlugin<T extends FastifyPluginOptions>(
  plugin: FastifyPluginAsync<T> | FastifyPluginCallback<T>
): plugin is FastifyPluginAsync<T> {
  return plugin.constructor.name === 'AsyncFunction' || plugin.length < 3;
}
