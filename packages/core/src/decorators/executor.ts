// Executor 装饰器
// 提供 Executor 类装饰器支持，用于标识任务执行器

import 'reflect-metadata';
import {
  type ExecutorMetadata,
  type ExecutorOptions,
  MetadataManager
} from './metadata.js';

/**
 * Executor 装饰器
 * 用于标记和配置 Executor 类
 *
 * @example
 * ```typescript
 * @Executor({
 *   name: 'userCreator',
 *   description: '用户创建执行器',
 *   version: '1.0.0',
 *   tags: ['user', 'creation'],
 *   category: 'business'
 * })
 * class UserCreatorExecutor implements TaskExecutor {
 *   // 执行器实现
 * }
 * ```
 */
export function Executor(options?: ExecutorOptions): ClassDecorator;
export function Executor(
  name: string,
  options?: ExecutorOptions
): ClassDecorator;
export function Executor(
  nameOrOptions?: string | ExecutorOptions,
  options?: ExecutorOptions
): ClassDecorator {
  return function (constructor: any) {
    let executorName: string | undefined;
    let executorOptions: ExecutorOptions = {};

    // 处理重载参数
    if (typeof nameOrOptions === 'string') {
      executorName = nameOrOptions;
      executorOptions = options || {};
    } else if (nameOrOptions && typeof nameOrOptions === 'object') {
      executorOptions = nameOrOptions;
      executorName = nameOrOptions.name;
    }

    // 如果没有指定名称，使用类名（去掉 Executor 后缀）
    if (!executorName) {
      executorName = constructor.name.replace(/Executor$/, '').toLowerCase();
    }

    const metadata: ExecutorMetadata = {
      name: executorName,
      description: executorOptions.description,
      version: executorOptions.version,
      tags: executorOptions.tags,
      category: executorOptions.category,
      configSchema: executorOptions.configSchema,
      options: executorOptions
    };

    // 设置执行器元数据
    MetadataManager.setExecutorMetadata(constructor, metadata);

    return constructor;
  };
}

/**
 * 获取执行器元数据的便捷函数
 */
export function getExecutorMetadata(target: any): ExecutorMetadata | undefined {
  return MetadataManager.getExecutorMetadata(target);
}

/**
 * 检查是否为执行器的便捷函数
 */
export function isExecutor(target: any): boolean {
  return MetadataManager.isExecutor(target);
}

/**
 * 获取执行器名称的便捷函数
 */
export function getExecutorName(target: any): string | undefined {
  return MetadataManager.getExecutorName(target);
}
