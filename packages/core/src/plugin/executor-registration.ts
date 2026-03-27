// @stratix/core 执行器注册模块
// 负责执行器的发现、验证和注册到 tasks 插件

import type { FastifyInstance } from 'fastify';
import { MetadataManager } from '../decorators/metadata.js';
import { getLogger } from '../logger/index.js';
import type { ModuleInfo } from './module-discovery.js';

/**
 * 执行器注册结果接口
 */
export interface ExecutorRegistrationResult {
  /** 注册成功的执行器数量 */
  registeredCount: number;
  /** 跳过的执行器数量 */
  skippedCount: number;
  /** 失败的执行器数量 */
  failedCount: number;
  /** 注册的执行器名称列表 */
  registeredExecutors: string[];
  /** 失败的执行器信息 */
  failedExecutors: Array<{ name: string; error: string }>;
}

/**
 * 处理执行器注册
 *
 * @param fastify - Fastify 实例
 * @param executorModules - 执行器模块列表
 * @param debugEnabled - 是否启用调试模式
 * @returns 执行器注册结果
 */
export async function processExecutorRegistration(
  fastify: FastifyInstance,
  executorModules: ModuleInfo[],
  debugEnabled: boolean = false
): Promise<ExecutorRegistrationResult> {
  const result: ExecutorRegistrationResult = {
    registeredCount: 0,
    skippedCount: 0,
    failedCount: 0,
    registeredExecutors: [],
    failedExecutors: []
  };

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `🎯 Starting executor registration for ${executorModules.length} executors...`
    );
  }

  // 检查 Fastify 实例是否已注册 tasks 插件的装饰器方法
  if (!fastify.hasDecorator('registerTaskExecutor')) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(
        '⚠️ Tasks plugin decorators not found, skipping executor registration'
      );
    }
    result.skippedCount = executorModules.length;
    return result;
  }

  // 处理每个执行器模块
  for (const moduleInfo of executorModules) {
    try {
      await registerSingleExecutor(fastify, moduleInfo, result, debugEnabled);
    } catch (error) {
      result.failedCount++;
      result.failedExecutors.push({
        name: moduleInfo.name,
        error: error instanceof Error ? error.message : String(error)
      });

      if (debugEnabled) {
        const logger = getLogger();
        logger.error(
          `❌ Failed to register executor: ${moduleInfo.name}`,
          error
        );
      }
    }
  }

  if (debugEnabled) {
    const logger = getLogger();
    logger.info('✅ Executor registration completed', {
      registered: result.registeredCount,
      skipped: result.skippedCount,
      failed: result.failedCount,
      executors: result.registeredExecutors
    });
  }

  return result;
}

/**
 * 注册单个执行器
 *
 * @param fastify - Fastify 实例
 * @param moduleInfo - 模块信息
 * @param result - 注册结果对象
 * @param debugEnabled - 是否启用调试模式
 */
async function registerSingleExecutor(
  fastify: FastifyInstance,
  moduleInfo: ModuleInfo,
  result: ExecutorRegistrationResult,
  debugEnabled: boolean = false
): Promise<void> {
  const { name, instance, constructor } = moduleInfo;

  if (!constructor) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(`⚠️ Executor ${name} has no constructor, skipping`);
    }
    result.skippedCount++;
    return;
  }

  // 获取执行器元数据
  const executorMetadata = MetadataManager.getExecutorMetadata(constructor);
  if (!executorMetadata) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(`⚠️ Executor ${name} has no metadata, skipping`);
    }
    result.skippedCount++;
    return;
  }

  // 验证执行器实例是否实现了必要的接口
  if (!validateExecutorInterface(instance)) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(
        `⚠️ Executor ${name} does not implement TaskExecutor interface, skipping`
      );
    }
    result.skippedCount++;
    return;
  }

  // 确定执行器名称
  const executorName = executorMetadata.name || name;

  // 注册执行器到 tasks 插件
  (fastify as any).registerTaskExecutor(executorName, instance);

  result.registeredCount++;
  result.registeredExecutors.push(executorName);

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(`📝 Executor registered: ${executorName}`, {
      originalName: name,
      description: executorMetadata.description,
      version: executorMetadata.version,
      tags: executorMetadata.tags
    });
  }
}

/**
 * 验证执行器接口
 *
 * @param instance - 执行器实例
 * @returns 是否实现了 TaskExecutor 接口
 */
function validateExecutorInterface(instance: any): boolean {
  // 检查必要的属性和方法
  return (
    instance &&
    typeof instance === 'object' &&
    typeof instance.name === 'string' &&
    typeof instance.execute === 'function'
  );
}

/**
 * 批量注册执行器域
 *
 * @param fastify - Fastify 实例
 * @param domain - 域名
 * @param executorModules - 执行器模块列表
 * @param debugEnabled - 是否启用调试模式
 * @returns 执行器注册结果
 */
export async function registerExecutorDomain(
  fastify: FastifyInstance,
  domain: string,
  executorModules: ModuleInfo[],
  debugEnabled: boolean = false
): Promise<ExecutorRegistrationResult> {
  if (!fastify.hasDecorator('registerExecutorDomain')) {
    // 如果没有域注册方法，回退到单个注册
    return processExecutorRegistration(fastify, executorModules, debugEnabled);
  }

  const result: ExecutorRegistrationResult = {
    registeredCount: 0,
    skippedCount: 0,
    failedCount: 0,
    registeredExecutors: [],
    failedExecutors: []
  };

  const executors: Record<string, any> = {};

  // 收集所有有效的执行器
  for (const moduleInfo of executorModules) {
    const { name, instance, constructor } = moduleInfo;

    if (!constructor || !validateExecutorInterface(instance)) {
      result.skippedCount++;
      continue;
    }

    const executorMetadata = MetadataManager.getExecutorMetadata(constructor);
    const executorName = executorMetadata?.name || name;

    executors[executorName] = instance;
    result.registeredExecutors.push(`${domain}.${executorName}`);
  }

  try {
    // 批量注册执行器域
    (fastify as any).registerExecutorDomain(domain, executors);
    result.registeredCount = Object.keys(executors).length;

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(`📝 Executor domain registered: ${domain}`, {
        executorCount: result.registeredCount,
        executors: Object.keys(executors)
      });
    }
  } catch (error) {
    result.failedCount = Object.keys(executors).length;
    result.failedExecutors.push({
      name: domain,
      error: error instanceof Error ? error.message : String(error)
    });

    if (debugEnabled) {
      const logger = getLogger();
      logger.error(`❌ Failed to register executor domain: ${domain}`, error);
    }
  }

  return result;
}
