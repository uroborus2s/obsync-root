// @stratix/core 适配器注册模块
// 负责服务适配器的发现、验证和注册

import {
  asFunction,
  InjectionMode,
  isClass,
  isFunction,
  Lifetime,
  listModules,
  type AwilixContainer
} from 'awilix';
import { isAbsolute, resolve } from 'node:path';
import { getLogger } from '../logger/index.js';
import type { PluginContainerContext } from './service-discovery.js';

/**
 * 服务适配器接口
 * 用于自动发现和加载的标准化适配器定义
 * 注意：服务适配器只能是 SINGLETON 单例模式
 */
export interface ServiceAdapter {
  /** 适配器名称 */
  adapterName: string;
  /** 工厂函数 */
  factory(pluginContainer: AwilixContainer): any;
}

/**
 * 服务适配器类接口
 * 用于基于类的适配器定义
 * 注意：服务适配器只能是 SINGLETON 单例模式
 */
export interface ServiceAdapterClass {
  /** 静态属性：适配器名称 */
  adapterName: string;
  /** 构造函数 */
  new (pluginContainer: AwilixContainer): any;
}

/**
 * 服务适配器配置
 */
export interface ServiceConfig {
  enabled?: boolean;
  patterns: string[];
  baseDir?: string;
}

/**
 * 从类名提取适配器名称
 * 例如：UserAdapter -> userAdapter, DatabaseAPIAdapter -> databaseAPIAdapter
 */
function extractAdapterNameFromClassName(className: string): string {
  // 移除 'Adapter' 后缀（如果存在）
  let name = className.replace(/Adapter$/, '');

  // 转换为 camelCase
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * 从模块名称提取适配器名称
 * 例如：user-api.adapter -> userApi, database-adapter -> database
 */
function extractAdapterNameFromModuleName(moduleName: string): string {
  // 移除文件扩展名和常见的适配器后缀
  let name = moduleName
    .replace(/\.(ts|js)$/, '')
    .replace(/[-_]?adapter$/, '')
    .replace(/[-_]?api$/, '');

  // 转换 kebab-case 或 snake_case 为 camelCase
  return name.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 验证模块是否为有效的服务适配器
 *
 * 支持的适配器模式：
 * 1. 具名类导出：export class UserAdapter { static adapterName = 'user'; ... }
 * 2. 默认类导出：export default class UserAdapter { ... } (自动提取类名)
 * 3. 默认对象导出：export default { adapterName: 'user', factory: ... }
 * 4. 具名对象导出：export const userAdapter = { adapterName: 'user', ... }
 */
function isValidServiceAdapter(
  moduleExports: any,
  moduleName: string,
  debugEnabled: boolean = false
): { isValid: boolean; adapter?: ServiceAdapter } {
  try {
    // 检查默认导出
    const defaultExport = moduleExports.default;

    if (defaultExport) {
      // 检查是否为类（构造函数）
      if (isClass(defaultExport)) {
        const adapterClass = defaultExport as ServiceAdapterClass;

        // 优先使用静态 adapterName 属性，否则自动提取类名
        let adapterName = adapterClass.adapterName;
        if (!adapterName && defaultExport.name) {
          // 自动从类名提取适配器名称（转换为 camelCase）
          adapterName = extractAdapterNameFromClassName(defaultExport.name);
        }

        if (adapterName) {
          // 基于类的适配器（只支持 SINGLETON）
          const adapter: ServiceAdapter = {
            adapterName,
            factory: (pluginContainer: AwilixContainer) => {
              return new adapterClass(pluginContainer);
            }
          };

          if (debugEnabled) {
            const logger = getLogger();
            logger.info(
              `✅ Found default class-based adapter: ${adapter.adapterName} (from ${defaultExport.name || 'anonymous class'})`
            );
          }

          return { isValid: true, adapter };
        }
      }

      // 检查是否为对象适配器
      if (typeof defaultExport === 'object' && defaultExport.adapterName) {
        const adapterObj = defaultExport as ServiceAdapter;

        if (adapterObj.factory && typeof adapterObj.factory === 'function') {
          const adapter: ServiceAdapter = {
            adapterName: adapterObj.adapterName,
            factory: adapterObj.factory.bind(adapterObj)
          };

          if (debugEnabled) {
            const logger = getLogger();
            logger.info(
              `✅ Found default object-based adapter: ${adapter.adapterName}`
            );
          }

          return { isValid: true, adapter };
        }
      }

      // 检查是否为函数式适配器（函数本身就是工厂函数）
      if (isFunction(defaultExport)) {
        // 尝试从模块名称提取适配器名称
        const adapterName = extractAdapterNameFromModuleName(moduleName);

        const adapter: ServiceAdapter = {
          adapterName,
          factory: defaultExport
        };

        if (debugEnabled) {
          const logger = getLogger();
          logger.info(
            `✅ Found default function-based adapter: ${adapter.adapterName} (from module ${moduleName})`
          );
        }

        return { isValid: true, adapter };
      }
    }

    // 检查命名导出
    for (const [exportName, exportValue] of Object.entries(moduleExports)) {
      if (exportName === 'default') continue;

      // 检查命名导出的类
      if (typeof exportValue === 'function' && isClass(exportValue)) {
        const adapterClass = exportValue as ServiceAdapterClass;

        // 优先使用静态 adapterName 属性，否则自动提取类名或导出名
        let adapterName = adapterClass.adapterName;
        if (!adapterName) {
          // 尝试从类名提取
          if (exportValue.name) {
            adapterName = extractAdapterNameFromClassName(exportValue.name);
          } else {
            // 从导出名提取
            adapterName = extractAdapterNameFromModuleName(exportName);
          }
        }

        if (adapterName) {
          const adapter: ServiceAdapter = {
            adapterName,
            factory: (pluginContainer: AwilixContainer) => {
              return new adapterClass(pluginContainer);
            }
          };

          if (debugEnabled) {
            const logger = getLogger();
            logger.info(
              `✅ Found named export class adapter: ${adapter.adapterName} (export: ${exportName})`
            );
          }

          return { isValid: true, adapter };
        }
      }

      // 检查命名导出的对象适配器
      if (
        typeof exportValue === 'object' &&
        exportValue !== null &&
        'adapterName' in exportValue
      ) {
        const adapterObj = exportValue as ServiceAdapter;

        if (adapterObj.factory && typeof adapterObj.factory === 'function') {
          const adapter: ServiceAdapter = {
            adapterName: adapterObj.adapterName,
            factory: adapterObj.factory.bind(adapterObj)
          };

          if (debugEnabled) {
            const logger = getLogger();
            logger.info(
              `✅ Found named export object adapter: ${adapter.adapterName} (export: ${exportName})`
            );
          }

          return { isValid: true, adapter };
        }
      }

      // 检查命名导出的函数适配器
      if (isFunction(exportValue)) {
        // 从导出名提取适配器名称
        const adapterName = extractAdapterNameFromModuleName(exportName);

        const adapter: ServiceAdapter = {
          adapterName,
          factory: exportValue as (pluginContainer: AwilixContainer) => any
        };

        if (debugEnabled) {
          const logger = getLogger();
          logger.info(
            `✅ Found named export function adapter: ${adapter.adapterName} (export: ${exportName})`
          );
        }

        return { isValid: true, adapter };
      }
    }

    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(`⚠️ Module ${moduleName} is not a valid service adapter`);
    }

    return { isValid: false };
  } catch (error) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.error(`❌ Error validating adapter ${moduleName}:`, error);
    }
    return { isValid: false };
  }
}

/**
 * 自动发现服务适配器
 */
async function discoverServiceAdapters(
  patterns: string[],
  basePath: string,
  debugEnabled: boolean = false
): Promise<ServiceAdapter[]> {
  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `🔍 Starting service adapter discovery with patterns: ${patterns.join(', ')}`
    );
    logger.info(`📁 Discovery base path: ${basePath}`);
  }

  try {
    // 扫描模块
    const moduleDescriptors = listModules(patterns, {
      cwd: basePath
    });

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `📁 Found ${moduleDescriptors.length} potential adapter modules`
      );
    }

    const discoveredAdapters: ServiceAdapter[] = [];
    let validCount = 0;
    let skippedCount = 0;

    // 逐个验证和转换模块
    for (const descriptor of moduleDescriptors) {
      try {
        // 动态导入模块
        const moduleExports = await import(descriptor.path);

        const { isValid, adapter } = isValidServiceAdapter(
          moduleExports,
          descriptor.name,
          debugEnabled
        );

        if (isValid && adapter) {
          discoveredAdapters.push(adapter);
          validCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        skippedCount++;
        if (debugEnabled) {
          const logger = getLogger();
          logger.error(
            `❌ Failed to load adapter module ${descriptor.name}:`,
            error
          );
        }
      }
    }

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `🎉 Adapter discovery completed: ${validCount} valid, ${skippedCount} skipped`
      );
      logger.info(
        `📋 Discovered adapters: ${discoveredAdapters.map((a) => a.adapterName).join(', ')}`
      );
    }

    return discoveredAdapters;
  } catch (error) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.error('❌ Service adapter discovery failed:', error);
    }
    return [];
  }
}

/**
 * 注册单个服务适配器到根容器
 */
async function registerSingleServiceAdapter<T>(
  adapter: ServiceAdapter,
  pluginContext: PluginContainerContext<T>,
  pluginName?: string,
  debugEnabled: boolean = false
): Promise<boolean> {
  try {
    const { adapterName, factory } = adapter;
    const { internalContainer, rootContainer } = pluginContext;
    // 构建带命名空间的适配器名称：pluginNameAdapterName (camelCase)
    const namespacedAdapterName = pluginName
      ? `${pluginName}${adapterName.charAt(0).toUpperCase() + adapterName.slice(1)}`
      : adapterName;

    // 创建适配器工厂函数，传入插件内部容器
    const adapterFactory = () => factory(internalContainer);

    // 创建 resolver（固定为 SINGLETON）
    const resolver = asFunction(adapterFactory, {
      lifetime: Lifetime.SINGLETON,
      injectionMode: InjectionMode.CLASSIC
    });

    // 注册到根容器，使用带命名空间的名称
    rootContainer.register(namespacedAdapterName, resolver);

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `✅ Registered service adapter ${namespacedAdapterName} (SINGLETON) -> ROOT container`
      );
    }

    return true;
  } catch (error) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.error(
        `❌ Failed to register service adapter ${adapter.adapterName}:`,
        error
      );
    }
    return false;
  }
}

/**
 * 服务适配器注册方法
 * 自动发现并注册服务适配器
 */
export async function registerServiceAdapters<T>(
  pluginContext: PluginContainerContext<T>,
  serviceConfig: ServiceConfig,
  basePath?: string,
  pluginName?: string,
  debugEnabled: boolean = false
): Promise<void> {
  if (!serviceConfig?.enabled) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.info('🔧 Service adapters registration skipped (disabled)');
    }
    return;
  }

  const patterns = serviceConfig.patterns;
  const discoveryBasePath = serviceConfig.baseDir
    ? isAbsolute(serviceConfig.baseDir)
      ? serviceConfig.baseDir
      : resolve(basePath || process.cwd(), serviceConfig.baseDir)
    : basePath || process.cwd();

  if (debugEnabled) {
    const logger = getLogger();
    logger.info('🔍 Starting service adapter auto-discovery...');
  }

  try {
    // 自动发现服务适配器
    const discoveredAdapters = await discoverServiceAdapters(
      patterns,
      discoveryBasePath,
      debugEnabled
    );

    if (discoveredAdapters.length === 0) {
      if (debugEnabled) {
        const logger = getLogger();
        logger.info('🔧 No service adapters found');
      }
      return;
    }

    // 去重处理（基于适配器名称）
    const uniqueAdapters = new Map<string, ServiceAdapter>();
    for (const adapter of discoveredAdapters) {
      if (uniqueAdapters.has(adapter.adapterName)) {
        if (debugEnabled) {
          const logger = getLogger();
          logger.warn(
            `⚠️ Duplicate adapter name '${adapter.adapterName}' found, using the first one`
          );
        }
        continue;
      }
      uniqueAdapters.set(adapter.adapterName, adapter);
    }

    // 注册所有唯一的适配器
    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `🚀 Registering ${uniqueAdapters.size} unique service adapters...`
      );
    }

    let totalRegistered = 0;
    for (const adapter of uniqueAdapters.values()) {
      const success = await registerSingleServiceAdapter(
        adapter,
        pluginContext,
        pluginName,
        debugEnabled
      );

      if (success) {
        totalRegistered++;
      }
    }

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `🎉 Service adapters registration completed: ${totalRegistered}/${uniqueAdapters.size} registered successfully`
      );
    }
  } catch (error) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.error('❌ Service adapter registration failed:', error);
    }
  }
}
