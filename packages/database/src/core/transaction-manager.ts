import type { Transaction } from 'kysely';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getWriteConnection } from '../core/database-manager.js';
import {
  DatabaseErrorHandler,
  DatabaseResult
} from '../utils/error-handler.js';
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
 * 事务操作选项
 */
export interface TransactionOptions {
  /** 连接名称 */
  connectionName?: string;
  /** 事务超时时间（毫秒） */
  timeout?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * 批量操作选项
 */
export interface BatchTransactionOptions extends TransactionOptions {
  /** 每批的大小 */
  batchSize: number;
  /** 批次间的延迟（毫秒） */
  delayBetweenBatches?: number;
  /** 是否在出错时停止后续批次 */
  stopOnError?: boolean;
}

let transactionContextManager: TransactionContextManager;

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
export default class TransactionContextManager {
  private readonly storage = new AsyncLocalStorage<TransactionContextInfo>();

  constructor() {
    transactionContextManager = this;
  }

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

export const executeMultiOperation = async <T extends any[]>(
  operations: Array<() => Promise<T[number]>>,
  options: TransactionOptions = {}
): Promise<DatabaseResult<T>> => {
  const { connectionName = 'default', debug = false } = options;

  return await DatabaseErrorHandler.execute(async () => {
    if (debug) {
      console.log(
        `🔄 Starting multi-operation transaction with ${operations.length} operations`
      );
    }

    // 获取写连接（事务总是在写连接上开启）
    const connection = await getWriteConnection(connectionName);

    return await connection.transaction().execute(async (trx) => {
      // 在事务上下文中运行所有操作
      return await transactionContextManager.runInTransaction(
        trx,
        async () => {
          const results: T = [] as any;

          // 顺序执行所有操作
          for (let i = 0; i < operations.length; i++) {
            if (debug) {
              console.log(
                `🔄 Executing operation ${i + 1}/${operations.length}`
              );
            }

            const result = await operations[i]();
            results.push(result);
          }

          if (debug) {
            console.log(
              `✅ Multi-operation transaction completed successfully`
            );
          }

          return results;
        },
        connectionName
      );
    });
  }, 'multi-operation-transaction');
};

/**
 * 执行并行仓储操作的事务函数
 * 在同一个事务中并行执行多个操作
 *
 * @param operations 要并行执行的操作数组
 * @param options 事务选项
 * @returns 所有操作的结果数组
 *
 * @example
 * ```typescript
 * const results = await TransactionHelper.executeParallelOperation([
 *   () => userRepository.updateLastLogin(userId),
 *   () => logRepository.createLoginLog(userId),
 *   () => statsRepository.incrementLoginCount()
 * ]);
 * ```
 */
const executeParallelOperation = async <T extends any[]>(
  operations: Array<() => Promise<T[number]>>,
  options: TransactionOptions = {}
): Promise<DatabaseResult<T>> => {
  const { connectionName = 'default', debug = false } = options;

  return await DatabaseErrorHandler.execute(async () => {
    if (debug) {
      console.log(
        `🔄 Starting parallel-operation transaction with ${operations.length} operations`
      );
    }

    const connection = await getWriteConnection(connectionName);

    return await connection.transaction().execute(async (trx) => {
      return await transactionContextManager.runInTransaction(
        trx,
        async () => {
          // 并行执行所有操作
          const results = await Promise.all(
            operations.map((operation, index) => {
              if (debug) {
                console.log(`🔄 Starting parallel operation ${index + 1}`);
              }
              return operation();
            })
          );

          if (debug) {
            console.log(
              `✅ Parallel-operation transaction completed successfully`
            );
          }

          return results as T;
        },
        connectionName
      );
    });
  }, 'parallel-operation-transaction');
};

/**
 * 条件事务执行器
 * 根据条件决定是否在事务中执行操作
 *
 * @param condition 是否需要事务的条件
 * @param operation 要执行的操作
 * @param options 事务选项
 * @returns 操作结果
 *
 * @example
 * ```typescript
 * const result = await TransactionHelper.executeConditional(
 *   () => dataArray.length > 1, // 多条数据时才使用事务
 *   () => repository.bulkCreate(dataArray)
 * );
 * ```
 */
const executeConditional = async <R>(
  condition: boolean | (() => boolean | Promise<boolean>),
  operation: () => Promise<R>,
  options: TransactionOptions = {}
): Promise<DatabaseResult<R>> => {
  const { connectionName = 'default', debug = false } = options;

  return await DatabaseErrorHandler.execute(async () => {
    // 评估条件
    const needsTransaction =
      typeof condition === 'function' ? await condition() : condition;

    if (debug) {
      console.log(
        `🔄 Conditional transaction: ${needsTransaction ? 'Using transaction' : 'Direct execution'}`
      );
    }

    if (needsTransaction) {
      // 在事务中执行
      const connection = await getWriteConnection(connectionName);
      return await connection.transaction().execute(async (trx) => {
        return await transactionContextManager.runInTransaction(
          trx,
          operation,
          connectionName
        );
      });
    } else {
      // 直接执行，不使用事务
      return await operation();
    }
  }, 'conditional-transaction');
};

/**
 * 批量操作事务执行器
 * 将大量数据分批处理，每批在独立事务中执行
 *
 * @param items 要处理的数据数组
 * @param processor 处理每批数据的函数
 * @param options 批量操作选项
 * @returns 所有批次的处理结果
 *
 * @example
 * ```typescript
 * const results = await TransactionHelper.executeBatch(
 *   largeDataArray,
 *   (batch) => repository.bulkCreate(batch),
 *   { batchSize: 100, delayBetweenBatches: 10 }
 * );
 * ```
 */
const executeBatch = async <T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R>,
  options: BatchTransactionOptions
): Promise<DatabaseResult<R[]>> => {
  const {
    batchSize,
    connectionName = 'default',
    delayBetweenBatches = 0,
    stopOnError = true,
    debug = false
  } = options;

  return await DatabaseErrorHandler.execute(async () => {
    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    if (debug) {
      console.log(
        `🔄 Starting batch transaction: ${items.length} items in ${totalBatches} batches`
      );
    }

    // 分批处理
    for (let i = 0; i < items.length; i += batchSize) {
      const batchIndex = Math.floor(i / batchSize) + 1;
      const batch = items.slice(i, i + batchSize);

      try {
        if (debug) {
          console.log(
            `🔄 Processing batch ${batchIndex}/${totalBatches} (${batch.length} items)`
          );
        }

        // 每批在独立事务中执行
        const connection = await getWriteConnection(connectionName);
        const batchResult = await connection
          .transaction()
          .execute(async (trx) => {
            return await transactionContextManager.runInTransaction(
              trx,
              () => processor(batch),
              connectionName
            );
          });

        results.push(batchResult);

        // 批次间延迟
        if (delayBetweenBatches > 0 && i + batchSize < items.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenBatches)
          );
        }
      } catch (error) {
        if (debug) {
          console.error(`❌ Batch ${batchIndex} failed:`, error);
        }

        if (stopOnError) {
          throw error;
        } else {
          // 继续处理下一批，但记录错误
          console.warn(
            `⚠️ Batch ${batchIndex} failed, continuing with next batch`
          );
        }
      }
    }

    if (debug) {
      console.log(
        `✅ Batch transaction completed: ${results.length}/${totalBatches} batches successful`
      );
    }

    return results;
  }, 'batch-transaction');
};

/**
 * 重试事务执行器
 * 在事务失败时自动重试
 *
 * @param operation 要执行的操作
 * @param maxRetries 最大重试次数
 * @param options 事务选项
 * @returns 操作结果
 *
 * @example
 * ```typescript
 * const result = await TransactionHelper.executeWithRetry(
 *   () => repository.complexOperation(data),
 *   3, // 最多重试3次
 *   { connectionName: 'primary' }
 * );
 * ```
 */
export const executeWithRetry = async <R>(
  operation: () => Promise<R>,
  maxRetries: number = 3,
  options: TransactionOptions = {}
): Promise<DatabaseResult<R>> => {
  const { connectionName = 'default', debug = false } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (debug && attempt > 1) {
        console.log(
          `🔄 Transaction retry attempt ${attempt - 1}/${maxRetries}`
        );
      }

      return await DatabaseErrorHandler.execute(async () => {
        const connection = await getWriteConnection(connectionName);
        return await connection.transaction().execute(async (trx) => {
          return await transactionContextManager.runInTransaction(
            trx,
            operation,
            connectionName
          );
        });
      }, `retry-transaction-attempt-${attempt}`);
    } catch (error) {
      lastError = error as Error;

      if (attempt <= maxRetries) {
        if (debug) {
          console.warn(
            `⚠️ Transaction attempt ${attempt} failed, retrying...`,
            error
          );
        }

        // 指数退避延迟
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 所有重试都失败了
  throw lastError || new Error('Transaction failed after all retries');
};

/**
 * 便捷的事务执行函数
 * 简化常见的事务操作
 */

/**
 * 执行简单事务
 */
export const withTransaction = <R>(
  operation: () => Promise<R>,
  connectionName?: string
) => executeConditional(true, operation, { connectionName });

/**
 * 执行多操作事务
 */
export const withMultiTransaction = <T extends any[]>(
  operations: Array<() => Promise<T[number]>>,
  connectionName?: string
) => executeMultiOperation(operations, { connectionName });

/**
 * 执行并行事务
 */
export const withParallelTransaction = <T extends any[]>(
  operations: Array<() => Promise<T[number]>>,
  connectionName?: string
) => executeParallelOperation(operations, { connectionName });

/**
 * 执行批量事务
 */
export const withBatchTransaction = <T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R>,
  batchSize: number,
  connectionName?: string
) =>
  executeBatch(items, processor, {
    batchSize,
    connectionName
  });
