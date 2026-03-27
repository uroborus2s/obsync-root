import type { DatabaseResult } from '../utils/error-handler.js';
import type { Kysely, Transaction } from 'kysely';

export interface DatabaseAPIQueryContext {
  readonly connectionName?: string;
  readonly readonly?: boolean;
  readonly timeout?: number;
  readonly retries?: number;
}

export interface DatabaseAPITransactionContext {
  readonly isolationLevel?:
    | 'read uncommitted'
    | 'read committed'
    | 'repeatable read'
    | 'serializable';
  readonly timeout?: number;
}

/**
 * Legacy compatibility contract retained for ecosystem packages that still
 * depend on the pre-1.1 repository helpers.
 */
export interface DatabaseAPI {
  executeQuery<T>(
    operation: (db: Kysely<any>) => Promise<T>,
    context?: DatabaseAPIQueryContext
  ): Promise<DatabaseResult<T>>;

  executeBatch?<T>(
    operations: Array<(db: Kysely<any>) => Promise<T>>,
    context?: DatabaseAPIQueryContext
  ): Promise<DatabaseResult<T[]>>;

  executeParallel?<T>(
    operations: Array<(db: Kysely<any>) => Promise<T>>,
    context?: DatabaseAPIQueryContext
  ): Promise<DatabaseResult<T[]>>;

  transaction<T>(
    operation: (trx: Transaction<any>) => Promise<T>,
    context?: DatabaseAPITransactionContext
  ): Promise<DatabaseResult<T>>;

  getConnection?(connectionName?: string): Promise<DatabaseResult<Kysely<any>>>;
  getReadConnection?(
    connectionName?: string
  ): Promise<DatabaseResult<Kysely<any>>>;
  getWriteConnection?(
    connectionName?: string
  ): Promise<DatabaseResult<Kysely<any>>>;
  healthCheck?(connectionName?: string): Promise<DatabaseResult<boolean>>;
}
