/**
 * 执行器注册表服务
 *
 * 负责管理所有可用的任务执行器，支持动态注册和发现
 */

import type { Logger } from '@stratix/core';
import type {
  ExecutorInfo,
  HealthStatus,
  TaskExecutor
} from '../types/executor.js';

/**
 * 执行器注册表服务接口
 */
export interface IExecutorRegistryService {
  registerExecutor(name: string, executor: TaskExecutor): void;
  getExecutor(name: string): TaskExecutor;
  listExecutors(): ExecutorInfo[];
  unregisterExecutor(name: string): void;
  hasExecutor(name: string): boolean;
  healthCheck(name?: string): Promise<Record<string, HealthStatus>>;
  getStats(): {
    total: number;
    active: number;
    healthy: number;
    inactive: number;
    unhealthy: number;
  };
  registerExecutorDomain(
    domain: string,
    executors: Record<string, TaskExecutor>
  ): void;
  getExecutorsByDomain(domain: string): ExecutorInfo[];
  cleanup(): void;
}

/**
 * 执行器注册表服务实现
 */
export class ExecutorRegistryService implements IExecutorRegistryService {
  private readonly executors = new Map<string, TaskExecutor>();
  private readonly executorInfo = new Map<string, ExecutorInfo>();
  private readonly logger: Logger;

  /**
   * 构造函数 - 通过依赖注入获取依赖
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 注册执行器
   * @param name 执行器名称
   * @param executor 执行器实例
   */
  registerExecutor(name: string, executor: TaskExecutor): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Executor name must be a non-empty string');
    }

    if (!executor) {
      throw new Error('Executor instance is required');
    }

    if (typeof executor.execute !== 'function') {
      throw new Error('Executor must implement execute method');
    }

    // 验证执行器配置（如果提供了验证方法）
    if (executor.validateConfig) {
      try {
        const validation = executor.validateConfig({});
        if (!validation.valid) {
          this.logger.warn(
            `Executor ${name} configuration validation failed:`,
            validation.errors
          );
        }
      } catch (error) {
        this.logger.warn(
          `Executor ${name} configuration validation error:`,
          error
        );
      }
    }

    // 注册执行器到内存
    this.executors.set(name, executor);

    // 创建执行器信息
    const info: ExecutorInfo = {
      name,
      description: executor.description || '',
      pluginName: 'unknown', // 这里可以从调用栈中推断
      executorClass: executor.constructor.name,
      ...(executor.configSchema && { configSchema: executor.configSchema }),
      isActive: true,
      version: executor.version || '1.0.0',
      registeredAt: new Date(),
      updatedAt: new Date(),
      healthStatus: 'unknown'
    };

    this.executorInfo.set(name, info);

    this.logger.info(`📝 Executor registered: ${name}`, {
      description: executor.description,
      version: executor.version,
      tags: executor.tags
    });

    // 执行初始化（如果提供了初始化方法）
    if (executor.initialize) {
      executor.initialize().catch((error) => {
        this.logger.error(`Failed to initialize executor ${name}:`, error);
        info.isActive = false;
        info.healthStatus = 'unhealthy';
      });
    }
  }

  /**
   * 获取执行器
   * @param name 执行器名称
   * @returns 执行器实例
   */
  getExecutor(name: string): TaskExecutor {
    const executor = this.executors.get(name);
    if (!executor) {
      throw new Error(`Executor not found: ${name}`);
    }

    const info = this.executorInfo.get(name);
    if (info && !info.isActive) {
      throw new Error(`Executor is not active: ${name}`);
    }

    return executor;
  }

  /**
   * 列出所有执行器
   * @returns 执行器信息列表
   */
  listExecutors(): ExecutorInfo[] {
    return Array.from(this.executorInfo.values());
  }

  /**
   * 注销执行器
   * @param name 执行器名称
   */
  unregisterExecutor(name: string): void {
    const executor = this.executors.get(name);
    if (executor) {
      // 执行清理（如果提供了销毁方法）
      if (executor.destroy) {
        executor.destroy().catch((error) => {
          this.logger.error(`Failed to destroy executor ${name}:`, error);
        });
      }

      this.executors.delete(name);
      this.executorInfo.delete(name);

      this.logger.info(`🗑️ Executor unregistered: ${name}`);
    }
  }

  /**
   * 检查执行器是否存在
   * @param name 执行器名称
   * @returns 是否存在
   */
  hasExecutor(name: string): boolean {
    return this.executors.has(name);
  }

  /**
   * 执行健康检查
   * @param name 执行器名称（可选，不传则检查所有）
   * @returns 健康检查结果
   */
  async healthCheck(name?: string): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};

    if (name) {
      // 检查单个执行器
      const executor = this.executors.get(name);
      if (!executor) {
        results[name] = 'unknown';
        return results;
      }

      try {
        if (executor.healthCheck) {
          results[name] = await executor.healthCheck();
        } else {
          results[name] = 'healthy'; // 默认认为健康
        }

        // 更新执行器信息
        const info = this.executorInfo.get(name);
        if (info) {
          info.healthStatus = results[name];
          info.lastHealthCheck = new Date();
        }
      } catch (error) {
        this.logger.error(`Health check failed for executor ${name}:`, error);
        results[name] = 'unhealthy';

        // 更新执行器信息
        const info = this.executorInfo.get(name);
        if (info) {
          info.healthStatus = 'unhealthy';
          info.lastHealthCheck = new Date();
        }
      }
    } else {
      // 检查所有执行器
      const promises = Array.from(this.executors.keys()).map(
        async (executorName) => {
          const result = await this.healthCheck(executorName);
          return { name: executorName, status: result[executorName] };
        }
      );

      const healthResults = await Promise.allSettled(promises);
      healthResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results[result.value.name] = result.value.status;
        }
      });
    }

    return results;
  }

  /**
   * 获取执行器统计信息
   */
  getStats() {
    const total = this.executors.size;
    const active = Array.from(this.executorInfo.values()).filter(
      (info) => info.isActive
    ).length;
    const healthy = Array.from(this.executorInfo.values()).filter(
      (info) => info.healthStatus === 'healthy'
    ).length;

    return {
      total,
      active,
      healthy,
      inactive: total - active,
      unhealthy: total - healthy
    };
  }

  /**
   * 批量注册执行器域
   * @param domain 域名
   * @param executors 执行器映射
   */
  registerExecutorDomain(
    domain: string,
    executors: Record<string, TaskExecutor>
  ): void {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain name must be a non-empty string');
    }

    Object.entries(executors).forEach(([name, executor]) => {
      const fullName = `${domain}.${name}`;
      this.registerExecutor(fullName, executor);
    });

    this.logger.info(
      `📦 Executor domain registered: ${domain} (${Object.keys(executors).length} executors)`
    );
  }

  /**
   * 获取域内的所有执行器
   * @param domain 域名
   * @returns 执行器信息列表
   */
  getExecutorsByDomain(domain: string): ExecutorInfo[] {
    const prefix = `${domain}.`;
    return Array.from(this.executorInfo.values()).filter((info) =>
      info.name.startsWith(prefix)
    );
  }

  /**
   * 清理所有执行器
   */
  cleanup(): void {
    const executorNames = Array.from(this.executors.keys());

    for (const name of executorNames) {
      try {
        this.unregisterExecutor(name);
      } catch (error) {
        this.logger.error(`Failed to cleanup executor ${name}:`, error);
      }
    }

    this.logger.info('🧹 All executors cleaned up');
  }
}
