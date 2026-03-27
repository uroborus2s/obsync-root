import { isLeft, type Either } from '@stratix/core/functional';
import type { CompiledQuery, Kysely, QueryResult, Transaction } from 'kysely';
import {
  type TransactionContextInfo,
  getCurrentTransaction,
  getCurrentTransactionId,
  isInTransaction,
  transactionContextManager
} from '../utils/transaction-context.js';
import {
  DatabaseErrorHandler,
  type DatabaseResult
} from '../utils/error-handler.js';

export type { TransactionContextInfo } from '../utils/transaction-context.js';

export interface TransactionOptions {
  connectionName?: string;
  timeout?: number;
  debug?: boolean;
  isolationLevel?:
    | 'read uncommitted'
    | 'read committed'
    | 'repeatable read'
    | 'serializable';
}

export interface BatchTransactionOptions extends TransactionOptions {
  batchSize: number;
  delayBetweenBatches?: number;
  stopOnError?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyTransactionOptions(
  connection: Kysely<any>,
  options: TransactionOptions
): {
  execute: <R>(callback: (trx: Transaction<any>) => Promise<R>) => Promise<R>;
} {
  const starter =
    typeof (connection as any).startTransaction === 'function'
      ? (connection as any).startTransaction()
      : connection.transaction();

  if (
    options.isolationLevel &&
    starter &&
    typeof starter.setIsolationLevel === 'function'
  ) {
    return starter.setIsolationLevel(options.isolationLevel);
  }

  return starter;
}

export async function executeInTransaction<R>(
  connection: Kysely<any>,
  operation: (trx: Transaction<any>) => Promise<R>,
  options: TransactionOptions = {}
): Promise<DatabaseResult<R>> {
  return await DatabaseErrorHandler.execute(async () => {
    const runner = applyTransactionOptions(connection, options);
    return await runner.execute(async (trx) => {
      return await transactionContextManager.runInTransaction(
        trx,
        () => operation(trx),
        options.connectionName
      );
    });
  }, 'repository-transaction');
}

export async function executeTransactionWithRetry<R>(
  connection: Kysely<any>,
  operation: (trx: Transaction<any>) => Promise<R>,
  maxRetries: number = 3,
  options: TransactionOptions = {}
): Promise<DatabaseResult<R>> {
  let lastFailure: DatabaseResult<R> | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await executeInTransaction(connection, operation, options);
    if (!isLeft(result)) {
      return result;
    }

    lastFailure = result;
    if (attempt === maxRetries) {
      break;
    }

    const backoffMs = Math.min(250 * 2 ** attempt, 2000);
    await sleep(backoffMs);
  }

  return lastFailure as DatabaseResult<R>;
}

export async function executeTransactionInBatches<T, R>(
  connection: Kysely<any>,
  items: T[],
  processor: (
    batch: T[],
    trx: Transaction<any>,
    batchIndex: number
  ) => Promise<R>,
  options: BatchTransactionOptions
): Promise<DatabaseResult<R[]>> {
  return await DatabaseErrorHandler.execute(async () => {
    const results: R[] = [];
    const {
      batchSize,
      delayBetweenBatches = 0,
      stopOnError = true,
      ...transactionOptions
    } = options;

    for (let offset = 0; offset < items.length; offset += batchSize) {
      const batchIndex = Math.floor(offset / batchSize);
      const batch = items.slice(offset, offset + batchSize);

      const result = await executeInTransaction(
        connection,
        (trx) => processor(batch, trx, batchIndex),
        transactionOptions
      );

      if (isLeft(result)) {
        throw result.left;
      }

      results.push(result.right);

      if (
        delayBetweenBatches > 0 &&
        offset + batchSize < items.length &&
        stopOnError
      ) {
        await sleep(delayBetweenBatches);
      }
    }

    return results;
  }, 'repository-batch-transaction');
}

export async function executeCompiledQuery<R>(
  connection: Kysely<any>,
  compiledQuery: CompiledQuery<R>
): Promise<QueryResult<R>> {
  return await connection.executeQuery(compiledQuery);
}

export {
  getCurrentTransaction,
  getCurrentTransactionId,
  isInTransaction,
  transactionContextManager
};
