/**
 * 配置加载器
 */
import { crypto, env } from '@stratix/utils';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Logger } from 'pino';
import { StratixConfig } from '../types/config.js';
import { version } from '../version.js';

// 直接在这里定义敏感配置环境变量名称
const SENSITIVE_CONFIG_ENV = 'STRATIX_SENSITIVE_CONFIG';

/**
 * 默认配置文件名
 */
const DEFAULT_CONFIG_FILENAME = 'stratix.config';

/**
 * 默认配置文件扩展名
 */
const CONFIG_FILE_EXTENSIONS = ['.ts', '.js', '.mjs', '.json'];

/**
 * 配置加载选项
 */
export interface ConfigLoaderOptions {
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
 * 加载并规范化配置
 *
 * @param options 配置加载选项
 * @returns 规范化后的配置
 */
export async function loadAndNormalizeConfig(
  logger: Logger,
  options?: ConfigLoaderOptions
): Promise<StratixConfig> {
  // 处理字符串选项（直接传入配置文件路径）
  const opts: ConfigLoaderOptions =
    typeof options === 'string' ? { configPath: options } : options || {};
  logger.debug('正在加载配置...');

  // 查找配置文件
  const configFilePath = await findConfigFile(logger, opts);

  // 加载配置
  let config: Partial<StratixConfig> = {};
  if (configFilePath) {
    logger.debug(`找到配置文件: ${configFilePath}`);
    config = await loadFromFile(
      configFilePath,
      loadSensitiveInfoFromEnv(options?.decryptionKey),
      logger
    );
  } else {
    logger.info('未找到配置文件，使用默认配置');
  }

  // 规范化配置
  const normalizedConfig = normalizeConfig(config, opts);

  logger.debug('配置规范化完成');

  return normalizedConfig;
}

/**
 * 规范化配置
 *
 * @param config 原始配置
 * @param options 选项
 * @returns 规范化后的配置
 */
export function normalizeConfig(
  config: Partial<StratixConfig> = {},
  options: ConfigLoaderOptions = {}
): StratixConfig {
  // 合并默认配置和用户配置
  const normalizedConfig: StratixConfig = {
    name: 'stratix-app',
    version: version,
    description: 'Stratix Application',
    ...config
  };

  return normalizedConfig;
}

/**
 * 查找配置文件
 *
 * @param options 查找选项
 * @returns 配置文件路径或null
 */
export async function findConfigFile(
  logger: Logger,
  options: ConfigLoaderOptions = {}
): Promise<string | null> {
  // 如果直接提供了配置文件路径，则优先使用
  if (options.configPath) {
    const configPath = path.resolve(options.configPath);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    throw new Error(`指定的配置文件路径不存在: ${configPath}`);
  }

  // 从环境变量获取配置文件路径
  const configPathFromEnv = env.get('STRATIX_CONFIG_PATH');
  if (configPathFromEnv) {
    const configPath = path.resolve(configPathFromEnv);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  // 确定配置文件名前缀
  const configPrefix = options.configFilePrefix || DEFAULT_CONFIG_FILENAME;

  // 搜索位置优先级：
  // 1. 指定的应用目录 (appDir)
  // 2. 通过堆栈分析确定的入口模块路径
  // 3. 当前工作目录
  const searchPaths = [];

  // 1. 如果提供了应用目录，将其添加为第一搜索位置
  if (options.appDir && fs.existsSync(options.appDir)) {
    searchPaths.push(options.appDir);

    logger.debug(`将在应用目录搜索配置文件: ${options.appDir}`);
  }

  // 2. 尝试从堆栈中获取入口模块路径
  const entryPath = getEntryModulePath();
  if (entryPath && !searchPaths.includes(entryPath)) {
    searchPaths.push(entryPath);

    logger.debug(`将在入口模块路径搜索配置文件: ${entryPath}`);
  }

  // 3. 添加当前工作目录
  const currentDir = process.cwd();
  if (!searchPaths.includes(currentDir)) {
    searchPaths.push(currentDir);
    logger.debug(`将在当前工作目录搜索配置文件: ${currentDir}`);
  }

  // 首先查找环境特定的配置文件
  const nodeEnv = env.getNodeEnv();

  // 在每个搜索路径中寻找配置文件
  for (const rootDir of searchPaths) {
    // 环境特定的配置文件
    if (nodeEnv) {
      for (const ext of CONFIG_FILE_EXTENSIONS) {
        const filePath = path.resolve(
          rootDir,
          `${configPrefix}.${nodeEnv}${ext}`
        );
        if (fs.existsSync(filePath)) {
          logger.debug(`找到环境特定配置文件: ${filePath}`);
          return filePath;
        }
      }
    }

    // 默认配置文件
    for (const ext of CONFIG_FILE_EXTENSIONS) {
      const filePath = path.resolve(rootDir, `${configPrefix}${ext}`);
      if (fs.existsSync(filePath)) {
        logger.debug(`找到默认配置文件: ${filePath}`);
        return filePath;
      }
    }
  }

  // 没有找到配置文件
  logger.debug(`在所有搜索路径中均未找到配置文件`);
  return null;
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
function getEntryModulePath(): string | null {
  try {
    // 1. 通过process.argv[1]获取入口脚本路径（最可靠的方法之一）
    if (process.argv[1]) {
      const entryPath = path.resolve(process.argv[1]);
      if (fs.existsSync(entryPath)) {
        return path.dirname(entryPath);
      }
    }

    // 2. 在CommonJS环境中使用require.main
    try {
      // @ts-ignore - 在ESM环境中可能不存在
      if (typeof require !== 'undefined' && require.main?.filename) {
        return path.dirname(require.main.filename);
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
 * 从环境变量加载敏感信息
 *
 * @param decryptionKey 解密密钥
 * @returns 敏感信息对象
 */
function loadSensitiveInfoFromEnv(decryptionKey?: string): any {
  const encryptedInfo = env.get(SENSITIVE_CONFIG_ENV);

  if (!encryptedInfo) {
    return {};
  }

  try {
    // 解密敏感信息
    return crypto.decryptConfig(encryptedInfo, {
      key: decryptionKey
    });
  } catch (error) {
    console.warn(
      `解析环境变量 ${SENSITIVE_CONFIG_ENV} 失败: ${error instanceof Error ? error.message : String(error)}`
    );
    return {};
  }
}

/**
 * 从文件加载配置
 *
 * @param basePath 基础路径
 * @param prefix 配置文件前缀
 * @param sensitiveInfo 敏感信息对象
 * @param logger 日志记录器
 * @returns 加载的配置对象
 */
async function loadFromFile(
  filePath: string,
  sensitiveInfo: any,
  logger: any = console
): Promise<StratixConfig> {
  try {
    logger.debug?.(`测试加载配置文件: ${filePath}`);
    const ext = path.extname(filePath);

    if (ext === '.json') {
      // 直接加载JSON文件
      logger.debug?.(`加载JSON配置文件: ${filePath}`);
      const configJson = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(configJson);
    } else {
      // 动态导入JS/TS模块
      logger.debug?.(`动态导入配置模块: ${filePath}`);
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      const configExport = module.default || module;

      // 如果配置导出是函数，则传入敏感信息
      if (typeof configExport === 'function') {
        logger.debug?.('配置导出是函数，正在执行...');
        return configExport(sensitiveInfo);
      }

      logger.debug?.('配置加载成功');
      return configExport;
    }
  } catch (error) {
    // 如果加载失败，记录错误并尝试下一个文件
    logger.error?.(
      `加载配置文件 ${filePath} 失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  throw new Error(`无法加载配置文件: ${filePath}`);
}
