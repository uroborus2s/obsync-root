// @stratix/database 事务上下文管理
// 使用AsyncLocalStorage实现无感事务支持

import type { Transaction } from 'kysely';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * 事务上下文信息
 */
export interface TransactionContextInfo {
  /** Kysely事务对象 */
  transaction: Transaction<any>;
  /** 连接名称 */
  connectionName?: string;
  /** 事务开始时间 */
  startTime: Date;
  /** 事务ID（用于调试） */
  transactionId: string;
}

/**
 * 事务上下文存储
 * 使用AsyncLocalStorage在异步调用链中传递事务上下文
 *
 * 🎯 并发事务支持说明：
 * - AsyncLocalStorage 为每个异步执行上下文创建独立的存储空间
 * - 不同的 HTTP 请求、不同的事务调用都有完全隔离的上下文
 * - 支持同时运行数千个并发事务而不会相互干扰
 * - 每个事务都有独立的事务ID和上下文信息
 */
class TransactionContextManager {
  private readonly storage = new AsyncLocalStorage<TransactionContextInfo>();

  /**
   * 在事务上下文中运行操作
   * @param transaction Kysely事务对象
   * @param operation 要执行的操作
   * @param connectionName 连接名称
   * @returns 操作结果
   */
  async runInTransaction<T>(
    transaction: Transaction<any>,
    operation: () => Promise<T>,
    connectionName?: string
  ): Promise<T> {
    const contextInfo: TransactionContextInfo = {
      transaction,
      connectionName,
      startTime: new Date(),
      transactionId: `trx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    };

    return await this.storage.run(contextInfo, operation);
  }

  /**
   * 获取当前事务上下文
   * @returns 当前事务上下文信息，如果不在事务中则返回undefined
   */
  getCurrentTransactionContext(): TransactionContextInfo | undefined {
    return this.storage.getStore();
  }

  /**
   * 获取当前事务对象
   * @returns 当前事务对象，如果不在事务中则返回undefined
   */
  getCurrentTransaction(): Transaction<any> | undefined {
    const context = this.storage.getStore();
    return context?.transaction;
  }

  /**
   * 检查当前是否在事务中
   * @returns 如果在事务中返回true，否则返回false
   */
  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }

  /**
   * 获取当前事务ID（用于调试和日志）
   * @returns 事务ID，如果不在事务中则返回undefined
   */
  getCurrentTransactionId(): string | undefined {
    const context = this.storage.getStore();
    return context?.transactionId;
  }
}

/**
 * 全局事务上下文管理器实例
 */
export const transactionContextManager = new TransactionContextManager();

/**
 * 便捷函数：获取当前事务
 */
export const getCurrentTransaction = () =>
  transactionContextManager.getCurrentTransaction();

/**
 * 便捷函数：检查是否在事务中
 */
export const isInTransaction = () =>
  transactionContextManager.isInTransaction();

/**
 * 便捷函数：获取当前事务ID
 */
export const getCurrentTransactionId = () =>
  transactionContextManager.getCurrentTransactionId();
