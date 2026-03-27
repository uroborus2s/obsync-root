import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isLeft, isNone } from '@stratix/core/functional';
import type { Transaction } from 'kysely';

vi.mock('../core/database-manager.js', () => ({
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn()
}));

import { BaseRepository } from '../config/base-repository.js';
import {
  getCurrentTransaction,
  getCurrentTransactionId
} from '../core/transaction-manager.js';
import {
  getReadConnection,
  getWriteConnection
} from '../core/database-manager.js';

interface TestDatabase {
  users: {
    id: number;
    name: string;
  };
  audit_logs: {
    id: number;
    user_id: number;
    action: string;
  };
}

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

class TestUserRepository extends BaseRepository<
  TestDatabase,
  'users',
  { id: number; name: string },
  { name: string },
  { name?: string }
> {
  protected readonly tableName = 'users' as const;
  protected readonly logger = mockLogger as any;
}

function createSelectChain(result: unknown) {
  return {
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(result),
    executeTakeFirstOrThrow: vi.fn().mockResolvedValue(result)
  };
}

function createInsertChain(insertId: number) {
  return {
    values: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    outputAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId })
  };
}

function createTransactionDb(id: string) {
  const selectedUser = { id: 1, name: 'Alice' };

  return {
    id,
    getExecutor: vi.fn(() => ({
      adapter: {
        constructor: {
          name: 'MysqlAdapter'
        }
      }
    })),
    selectFrom: vi.fn(() => createSelectChain(selectedUser)),
    insertInto: vi.fn(() => createInsertChain(1)),
    updateTable: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
    })),
    deleteFrom: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({ numDeletedRows: 1 })
    })),
    executeQuery: vi.fn().mockResolvedValue({ rows: [selectedUser] })
  } as unknown as Transaction<TestDatabase>;
}

describe('BaseRepository 1.1.0 transaction integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the same transaction context for repository operations', async () => {
    const transactionDb = createTransactionDb('trx-shared');
    const readDb = {
      selectFrom: vi.fn(() => createSelectChain({ id: 2, name: 'Outside' })),
      executeQuery: vi.fn()
    };
    const writeDb = {
      transaction: vi.fn(() => ({
        execute: async (
          callback: (trx: Transaction<TestDatabase>) => Promise<unknown>
        ) => await callback(transactionDb)
      }))
    };

    vi.mocked(getReadConnection).mockResolvedValue(readDb as any);
    vi.mocked(getWriteConnection).mockResolvedValue(writeDb as any);

    const repository = new TestUserRepository();
    const result = await repository.tx(async (repo, trx) => {
      expect(getCurrentTransaction()).toBe(trx);

      const found = await repo.findById(1);
      expect(isNone(found)).toBe(false);

      const created = await repo.create({ name: 'Alice' });
      expect(isLeft(created)).toBe(false);

      return {
        found,
        created
      };
    });

    expect(isLeft(result)).toBe(false);
    expect(writeDb.transaction).toHaveBeenCalledTimes(1);
    expect((transactionDb as any).selectFrom).toHaveBeenCalledWith('users');
    expect((transactionDb as any).insertInto).toHaveBeenCalledWith('users');
    expect(readDb.selectFrom).not.toHaveBeenCalled();
  });

  it('supports raw SQL execution through BaseRepository', async () => {
    const readDb = {
      executeQuery: vi.fn().mockResolvedValue({
        rows: [{ id: 1, name: 'Raw Alice' }]
      })
    };

    vi.mocked(getReadConnection).mockResolvedValue(readDb as any);
    vi.mocked(getWriteConnection).mockResolvedValue({} as any);

    const repository = new TestUserRepository();
    const result = await (repository as any).rawQuery(
      'select * from users where id = ?',
      [1],
      { readonly: true }
    );

    expect(isLeft(result)).toBe(false);
    expect(readDb.executeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: 'select * from users where id = ?',
        parameters: [1]
      })
    );
    expect((result as any).right).toEqual([{ id: 1, name: 'Raw Alice' }]);
  });

  it('runs batched units in isolated transactions', async () => {
    let transactionCounter = 0;
    const seenTransactionIds: string[] = [];

    const writeDb = {
      transaction: vi.fn(() => ({
        execute: async (
          callback: (trx: Transaction<TestDatabase>) => Promise<unknown>
        ) => {
          transactionCounter += 1;
          return await callback(
            createTransactionDb(`trx-batch-${transactionCounter}`)
          );
        }
      }))
    };

    vi.mocked(getReadConnection).mockResolvedValue({} as any);
    vi.mocked(getWriteConnection).mockResolvedValue(writeDb as any);

    const repository = new TestUserRepository();
    const result = await repository.txBatch(
      [1, 2, 3, 4, 5],
      async (batch, _repo, trx, batchIndex) => {
        expect(getCurrentTransaction()).toBe(trx);
        seenTransactionIds.push(getCurrentTransactionId() || `missing-${batchIndex}`);
        return batch.reduce((sum, value) => sum + value, 0);
      },
      {
        batchSize: 2
      }
    );

    expect(isLeft(result)).toBe(false);
    expect(writeDb.transaction).toHaveBeenCalledTimes(3);
    expect(new Set(seenTransactionIds).size).toBe(3);
    expect((result as any).right).toEqual([3, 7, 5]);
  });
});
