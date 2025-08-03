import type { Logger } from '@stratix/core';
import type { TaskExecutor } from './types/executor.js';

/**
 * 全局执行器注册表
 * 注意：在生产环境中，这应该使用依赖注入容器管理
 */
const executorRegistry = new Map<string, TaskExecutor>();

/**
 * 注册任务执行器
 * @param logger 日志器
 * @returns 注册函数
 */
export const registerTaskExecutor =
  (logger: Logger) => (name: string, executor: TaskExecutor) => {
    // 验证执行器名称
    if (!name || typeof name !== 'string') {
      throw new Error('Executor name must be a non-empty string');
    }

    // 验证执行器对象
    if (!executor || typeof executor.execute !== 'function') {
      throw new Error('Executor must have an execute method');
    }

    // 验证执行器基本属性
    if (!executor.name || !executor.description || !executor.version) {
      throw new Error(
        'Executor must have name, description, and version properties'
      );
    }

    executorRegistry.set(name, executor);
    logger.info(
      `📝 Task executor registered: ${name} (${executor.description} v${executor.version})`
    );
  };

/**
 * 获取已注册的执行器
 * @param name 执行器名称
 * @returns 执行器实例或undefined
 */
export const getExecutor = (name: string): TaskExecutor | undefined => {
  return executorRegistry.get(name);
};

/**
 * 获取所有已注册的执行器名称
 * @returns 执行器名称列表
 */
export const getRegisteredExecutorNames = (): string[] => {
  return Array.from(executorRegistry.keys());
};

/**
 * 检查执行器是否已注册
 * @param name 执行器名称
 * @returns 是否已注册
 */
export const isExecutorRegistered = (name: string): boolean => {
  return executorRegistry.has(name);
};

/**
 * 清空执行器注册表（主要用于测试）
 */
export const clearExecutorRegistry = (): void => {
  executorRegistry.clear();
};
