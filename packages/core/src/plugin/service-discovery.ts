// @stratix/core 服务发现和自动注册模块
// 负责扫描、发现和注册服务到Awilix容器

import { asValue, InjectionMode, Lifetime, type AwilixContainer } from 'awilix';
import { getLogger } from '../logger/index.js';
import type { RegistrationPlan } from '../registration/index.js';
import { ConventionBasedLifecycleManager } from './lifecycle-manager.js';
import { AutoDIConfig } from './utils.js';

/**
 * 插件容器上下文
 */
export interface PluginContainerContext<T> {
  /** 插件域内部容器 */
  internalContainer: AwilixContainer;
  /** 根容器引用 */
  rootContainer: AwilixContainer;
  /** 插件选项 */
  options: T;
  /** 生命周期管理器（可选，仅在启用生命周期管理时存在） */
  lifecycleManager?: ConventionBasedLifecycleManager;
  /** 模块扫描模式 */
  patterns: string[];
  basePath: string;
  autoDIConfig: AutoDIConfig;
  debugEnabled: boolean;
  pluginName: string;
  registrationPlan?: RegistrationPlan;
}

/**
 * 执行精细化的自动模块注册
 * 基于 Awilix listModules() 实现 per-module local injections
 * 返回插件容器上下文，包含内部容器和根容器的引用
 */
export async function performAutoRegistration<T>({
  internalContainer,
  options,
  patterns,
  basePath,
  debugEnabled
}: PluginContainerContext<T>): Promise<void> {
  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `🎯 Starting enhanced auto registration with patterns: ${patterns.join(', ')}`
    );
  }

  try {
    // 注册插件配置到内部容器
    internalContainer.register('config', asValue(options));

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `🎯 Starting loadModules auto registration with patterns: ${patterns.join(', ')}`
      );
      logger.info(`📁 Base path: ${basePath}`);
    }
    // 使用 loadModules 直接加载所有模块到插件内部容器
    await internalContainer.loadModules(patterns, {
      cwd: basePath,
      formatName: 'camelCase', // 使用驼峰命名
      resolverOptions: {
        // 默认生命周期为 SCOPED（插件内部对象不使用 SINGLETON）
        lifetime: Lifetime.SCOPED,
        injectionMode: InjectionMode.CLASSIC
      },
      esModules: true
    });

    if (debugEnabled) {
      // 获取注册的模块数量
      const registrations = Object.keys(internalContainer.registrations);

      const logger = getLogger();
      logger.info(
        `🎉 LoadModules registration completed: ${registrations.length} modules loaded`
      );
      logger.info(`📋 Registered modules: ${registrations.join(', ')}`);
    }
  } catch (error) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.error('❌ LoadModules registration failed:', error);
    }
    throw error;
  }
}

/**
 * 确保 @fastify/awilix 插件已注册
 */
export async function ensureAwilixPlugin(
  fastify: any
): Promise<AwilixContainer> {
  if (!fastify.hasDecorator('diContainer')) {
    throw new Error(
      '@fastify/awilix plugin is not registered. Please register it before using withAutoDI.'
    );
  }
  return fastify.diContainer;
}
