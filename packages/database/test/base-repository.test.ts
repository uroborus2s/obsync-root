// @stratix/database BaseRepository 连接注入机制测试
// 验证新的依赖注入和连接管理功能

import type { Kysely } from 'kysely';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseAPI } from '../src/adapters/database-api.adapter.js';
import {
  BaseRepository,
  RepositoryFactory
} from '../src/config/base-repository.js';

// 模拟数据库类型
interface TestDatabase {
  users: {
    id: number;
    name: string;
    email: string;
    created_at: Date;
  };
}

type User = TestDatabase['users'];
type CreateUser = Omit<User, 'id' | 'created_at'>;
type UpdateUser = Partial<Pick<User, 'name' | 'email'>>;

// 模拟Kysely连接
const createMockConnection = () => {
  const mockConnection = {
    selectFrom: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn(),
    insertInto: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn(),
    updateTable: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    deleteFrom: vi.fn().mockReturnThis(),
    execute: vi.fn()
  };

  return mockConnection as any as Kysely<TestDatabase>;
};

// 模拟DatabaseManager
const createMockDatabaseManager = () => ({
  getConnection: vi.fn(),
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn(),
  hasConnection: vi.fn().mockReturnValue(true)
});

// 模拟DatabaseAPI
const createMockDatabaseAPI = (manager?: any): DatabaseAPI => ({
  executeQuery: vi.fn(),
  executeBatch: vi.fn(),
  executeParallel: vi.fn(),
  transaction: vi.fn(),
  getConnection: vi.fn(),
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn(),
  healthCheck: vi.fn(),
  databaseManager: manager || createMockDatabaseManager()
});

// 测试用的UserRepository
class TestUserRepository extends BaseRepository<
  TestDatabase,
  'users',
  User,
  CreateUser,
  UpdateUser
> {
  protected readonly tableName = 'users' as const;
}

describe('BaseRepository 重构测试', () => {
  let readConnection: Kysely<TestDatabase>;
  let writeConnection: Kysely<TestDatabase>;
  let databaseAPI: DatabaseAPI;
  let userRepository: TestUserRepository;

  beforeEach(() => {
    readConnection = createMockConnection();
    writeConnection = createMockConnection();
    databaseAPI = createMockDatabaseAPI();

    userRepository = new TestUserRepository(
      readConnection,
      writeConnection,
      databaseAPI
    );
  });

  describe('构造函数和连接管理', () => {
    it('应该正确初始化连接', () => {
      expect(userRepository['readConnection']).toBe(readConnection);
      expect(userRepository['writeConnection']).toBe(writeConnection);
      expect(userRepository['databaseAPI']).toBe(databaseAPI);
    });

    it('应该设置默认的primaryKey', () => {
      expect(userRepository['primaryKey']).toBe('id');
    });
  });

  describe('查询操作', () => {
    it('findById 应该使用 readConnection', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date()
      };

      // 模拟查询链
      const mockQuery = {
        selectFrom: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(mockUser)
      };

      (readConnection as any).selectFrom.mockReturnValue(mockQuery);

      const result = await userRepository.findById(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isSome()).toBe(true);
        if (result.data.isSome()) {
          expect(result.data.value).toEqual(mockUser);
        }
      }

      expect(readConnection.selectFrom).toHaveBeenCalledWith('users');
    });

    it('findOne 应该使用 readConnection', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date()
      };

      const mockQuery = {
        selectFrom: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(mockUser)
      };

      (readConnection as any).selectFrom.mockReturnValue(mockQuery);

      const criteria = (qb: any) => qb.where('email', '=', 'test@example.com');
      const result = await userRepository.findOne(criteria);

      expect(result.success).toBe(true);
      expect(readConnection.selectFrom).toHaveBeenCalledWith('users');
    });
  });

  describe('写入操作', () => {
    it('create 应该使用 writeConnection', async () => {
      const newUser = { name: 'New User', email: 'new@example.com' };
      const createdUser = { id: 1, ...newUser, created_at: new Date() };

      const mockQuery = {
        insertInto: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue(createdUser)
      };

      (writeConnection as any).insertInto.mockReturnValue(mockQuery);

      const result = await userRepository.create(newUser);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(createdUser);
      }

      expect(writeConnection.insertInto).toHaveBeenCalledWith('users');
    });

    it('update 应该使用 writeConnection', async () => {
      const updateData = { name: 'Updated User' };
      const updatedUser = {
        id: 1,
        name: 'Updated User',
        email: 'test@example.com',
        created_at: new Date()
      };

      const mockQuery = {
        updateTable: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(updatedUser)
      };

      (writeConnection as any).updateTable.mockReturnValue(mockQuery);

      const result = await userRepository.update(1, updateData);

      expect(result.success).toBe(true);
      if (result.success && result.data.isSome()) {
        expect(result.data.value).toEqual(updatedUser);
      }

      expect(writeConnection.updateTable).toHaveBeenCalledWith('users');
    });

    it('delete 应该使用 writeConnection', async () => {
      const mockQuery = {
        deleteFrom: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ numDeletedRows: 1 })
      };

      (writeConnection as any).deleteFrom.mockReturnValue(mockQuery);

      const result = await userRepository.delete(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }

      expect(writeConnection.deleteFrom).toHaveBeenCalledWith('users');
    });
  });

  describe('错误处理', () => {
    it('应该正确处理查询错误', async () => {
      const mockQuery = {
        selectFrom: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (readConnection as any).selectFrom.mockReturnValue(mockQuery);

      const result = await userRepository.findById(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Database error');
      }
    });
  });
});

describe('RepositoryFactory 重构测试', () => {
  it('应该正确创建Repository实例', () => {
    const readConnection = createMockConnection();
    const writeConnection = createMockConnection();
    const databaseAPI = createMockDatabaseAPI();

    const repository = RepositoryFactory.create<TestDatabase, 'users'>(
      'users',
      readConnection,
      writeConnection,
      databaseAPI
    );

    expect(repository).toBeInstanceOf(BaseRepository);
    expect(repository['tableName']).toBe('users');
    expect(repository['readConnection']).toBe(readConnection);
    expect(repository['writeConnection']).toBe(writeConnection);
    expect(repository['databaseAPI']).toBe(databaseAPI);
  });
});
