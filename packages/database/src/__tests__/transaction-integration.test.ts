/**
 * 无感事务支持集成测试
 * 验证BaseRepository在事务中的自动行为
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Transaction } from 'kysely';
import { transactionContextManager, getCurrentTransaction, isInTransaction } from '../utils/transaction-context.js';
import { BaseRepository } from '../config/base-repository.js';
import type { DatabaseAPI } from '../adapters/database-api.adapter.js';

// Mock数据库类型
interface TestDatabase {
  users: {
    id: number;
    name: string;
    email: string;
  };
}

// Mock Repository实现
class TestUserRepository extends BaseRepository<TestDatabase, 'users'> {
  protected readonly tableName = 'users' as const;
  
  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: any
  ) {
    super();
  }
}

// Mock DatabaseAPI
const mockDatabaseAPI: DatabaseAPI = {
  executeQuery: vi.fn(),
  executeBatch: vi.fn(),
  executeParallel: vi.fn(),
  transaction: vi.fn(),
  getConnection: vi.fn(),
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn(),
  healthCheck: vi.fn()
};

// Mock Logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Mock Transaction
const mockTransaction = {
  selectFrom: vi.fn().mockReturnThis(),
  insertInto: vi.fn().mockReturnThis(),
  updateTable: vi.fn().mockReturnThis(),
  deleteFrom: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  executeTakeFirst: vi.fn(),
  executeTakeFirstOrThrow: vi.fn()
} as unknown as Transaction<TestDatabase>;

describe('无感事务支持集成测试', () => {
  let repository: TestUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new TestUserRepository(mockDatabaseAPI, mockLogger);
    
    // Mock连接初始化
    (repository as any).readConnection = {
      selectFrom: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({ id: 1, name: 'Test', email: 'test@example.com' })
    };
    
    (repository as any).writeConnection = {
      insertInto: vi.fn().mockReturnThis(),
      updateTable: vi.fn().mockReturnThis(),
      deleteFrom: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ numInsertedOrUpdatedRows: 1 }),
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ id: 1, name: 'Test', email: 'test@example.com' })
    };
  });

  describe('事务上下文管理', () => {
    it('应该能检测到不在事务中的状态', () => {
      expect(isInTransaction()).toBe(false);
      expect(getCurrentTransaction()).toBeUndefined();
    });

    it('应该能在事务上下文中运行操作', async () => {
      const result = await transactionContextManager.runInTransaction(
        mockTransaction,
        async () => {
          expect(isInTransaction()).toBe(true);
          expect(getCurrentTransaction()).toBe(mockTransaction);
          return 'success';
        }
      );

      expect(result).toBe('success');
      // 事务结束后应该恢复原状态
      expect(isInTransaction()).toBe(false);
      expect(getCurrentTransaction()).toBeUndefined();
    });
  });

  describe('Repository事务感知', () => {
    it('非事务环境下应该使用普通连接', async () => {
      // 测试读操作
      const queryConnection = (repository as any).getQueryConnection();
      expect(queryConnection).toBe((repository as any).readConnection);

      // 测试写操作
      const writeConnection = (repository as any).getWriteConnection();
      expect(writeConnection).toBe((repository as any).writeConnection);
    });

    it('事务环境下应该使用事务连接', async () => {
      await transactionContextManager.runInTransaction(
        mockTransaction,
        async () => {
          // 测试读操作
          const queryConnection = (repository as any).getQueryConnection();
          expect(queryConnection).toBe(mockTransaction);

          // 测试写操作
          const writeConnection = (repository as any).getWriteConnection();
          expect(writeConnection).toBe(mockTransaction);
        }
      );
    });

    it('Repository的CRUD操作应该自动使用事务', async () => {
      // Mock事务的查询方法
      const mockSelectFrom = vi.fn().mockReturnThis();
      const mockInsertInto = vi.fn().mockReturnThis();
      const mockUpdateTable = vi.fn().mockReturnThis();
      const mockDeleteFrom = vi.fn().mockReturnThis();
      
      const transactionWithMocks = {
        ...mockTransaction,
        selectFrom: mockSelectFrom,
        insertInto: mockInsertInto,
        updateTable: mockUpdateTable,
        deleteFrom: mockDeleteFrom,
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ id: 1, name: 'Test', email: 'test@example.com' }),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ id: 1, name: 'Test', email: 'test@example.com' }),
        execute: vi.fn().mockResolvedValue({ numInsertedOrUpdatedRows: 1 })
      } as unknown as Transaction<TestDatabase>;

      await transactionContextManager.runInTransaction(
        transactionWithMocks,
        async () => {
          // 测试findById - 应该使用事务连接
          await repository.findById(1);
          expect(mockSelectFrom).toHaveBeenCalledWith('users');

          // 测试create - 应该使用事务连接
          await repository.create({ name: 'New User', email: 'new@example.com' });
          expect(mockInsertInto).toHaveBeenCalledWith('users');

          // 测试update - 应该使用事务连接
          await repository.update(1, { name: 'Updated User' });
          expect(mockUpdateTable).toHaveBeenCalledWith('users');

          // 测试delete - 应该使用事务连接
          await repository.delete(1);
          expect(mockDeleteFrom).toHaveBeenCalledWith('users');
        }
      );
    });
  });

  describe('DatabaseAPI事务集成', () => {
    it('DatabaseAPI.transaction应该设置事务上下文', async () => {
      // Mock DatabaseAPI的transaction方法实现
      (mockDatabaseAPI.transaction as any).mockImplementation(async (operation: any) => {
        return await transactionContextManager.runInTransaction(
          mockTransaction,
          () => operation(mockTransaction)
        );
      });

      let transactionDetected = false;
      
      await mockDatabaseAPI.transaction(async (trx) => {
        transactionDetected = isInTransaction();
        expect(getCurrentTransaction()).toBe(mockTransaction);
        return 'success';
      });

      expect(transactionDetected).toBe(true);
    });
  });

  describe('日志记录', () => {
    it('应该记录事务使用情况', async () => {
      await transactionContextManager.runInTransaction(
        mockTransaction,
        async () => {
          // 调用Repository方法，应该记录事务使用
          (repository as any).getQueryConnection();
          (repository as any).getWriteConnection();

          expect(mockLogger.debug).toHaveBeenCalledWith(
            'Using transaction for read query',
            expect.objectContaining({
              tableName: 'users',
              inTransaction: true
            })
          );

          expect(mockLogger.debug).toHaveBeenCalledWith(
            'Using transaction for write query',
            expect.objectContaining({
              tableName: 'users',
              inTransaction: true
            })
          );
        }
      );
    });
  });
});
