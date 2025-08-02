// @stratix/database 连接注入机制测试
// 验证新的依赖注入和连接管理功能

import type { Kysely } from 'kysely';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseAPI } from '../src/adapters/database-api.adapter.js';
import {
  BaseRepository,
  ConnectionConfigResolver,
  RepositoryFactory,
  type RepositoryConnectionConfig
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
const createMockDatabaseAPI = (
  readConnection?: any,
  writeConnection?: any
): DatabaseAPI => ({
  executeQuery: vi.fn(),
  executeBatch: vi.fn(),
  executeParallel: vi.fn(),
  transaction: vi.fn(),
  getConnection: vi.fn(),
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn(),
  getReadConnectionSync: vi
    .fn()
    .mockReturnValue(readConnection || createMockConnection()),
  getWriteConnectionSync: vi
    .fn()
    .mockReturnValue(writeConnection || createMockConnection()),
  healthCheck: vi.fn()
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

describe('连接配置解析器测试', () => {
  describe('ConnectionConfigResolver.resolve', () => {
    it('应该返回默认配置当没有提供选项时', () => {
      const config = ConnectionConfigResolver.resolve();

      expect(config.readConnectionName).toBe('default');
      expect(config.writeConnectionName).toBe('default');
      expect(config.enableReadWriteSeparation).toBe(false);
    });

    it('应该正确解析字符串连接名称', () => {
      const config = ConnectionConfigResolver.resolve('custom');

      expect(config.readConnectionName).toBe('custom');
      expect(config.writeConnectionName).toBe('custom');
      expect(config.enableReadWriteSeparation).toBe(false);
    });

    it('应该正确解析详细连接配置', () => {
      const options: RepositoryConnectionConfig = {
        readConnection: 'read-db',
        writeConnection: 'write-db',
        enableReadWriteSeparation: true
      };

      const config = ConnectionConfigResolver.resolve(options);

      expect(config.readConnectionName).toBe('read-db');
      expect(config.writeConnectionName).toBe('write-db');
      expect(config.enableReadWriteSeparation).toBe(true);
    });

    it('应该使用defaultConnection作为回退值', () => {
      const options: RepositoryConnectionConfig = {
        defaultConnection: 'fallback',
        enableReadWriteSeparation: false
      };

      const config = ConnectionConfigResolver.resolve(options);

      expect(config.readConnectionName).toBe('fallback');
      expect(config.writeConnectionName).toBe('fallback');
      expect(config.enableReadWriteSeparation).toBe(false);
    });
  });

  describe('ConnectionConfigResolver.validate', () => {
    it('应该验证有效的配置', () => {
      const config = {
        readConnectionName: 'read',
        writeConnectionName: 'write',
        enableReadWriteSeparation: true
      };

      expect(ConnectionConfigResolver.validate(config)).toBe(true);
    });

    it('应该拒绝无效的配置', () => {
      const config = {
        readConnectionName: '',
        writeConnectionName: 'write',
        enableReadWriteSeparation: true
      };

      expect(ConnectionConfigResolver.validate(config)).toBe(false);
    });
  });
});

describe('BaseRepository 连接注入机制', () => {
  let readConnection: Kysely<TestDatabase>;
  let writeConnection: Kysely<TestDatabase>;
  let databaseAPI: DatabaseAPI;

  beforeEach(() => {
    readConnection = createMockConnection();
    writeConnection = createMockConnection();

    databaseAPI = createMockDatabaseAPI(readConnection, writeConnection);
  });

  describe('默认连接配置', () => {
    it('应该使用默认连接配置创建仓储', () => {
      const repository = new TestUserRepository(databaseAPI);

      expect(repository['connectionConfig'].readConnectionName).toBe('default');
      expect(repository['connectionConfig'].writeConnectionName).toBe(
        'default'
      );
      expect(repository['readConnection']).toBe(readConnection);
      expect(repository['writeConnection']).toBe(writeConnection);
    });
  });

  describe('自定义连接配置', () => {
    it('应该支持字符串连接名称', () => {
      const repository = new TestUserRepository(databaseAPI, 'custom');

      expect(repository['connectionConfig'].readConnectionName).toBe('custom');
      expect(repository['connectionConfig'].writeConnectionName).toBe('custom');
      expect(databaseAPI.getReadConnectionSync).toHaveBeenCalledWith('custom');
      expect(databaseAPI.getWriteConnectionSync).toHaveBeenCalledWith('custom');
    });

    it('应该支持读写分离配置', () => {
      const connectionConfig: RepositoryConnectionConfig = {
        readConnection: 'read-replica',
        writeConnection: 'write-master',
        enableReadWriteSeparation: true
      };

      const repository = new TestUserRepository(databaseAPI, connectionConfig);

      expect(repository['connectionConfig'].readConnectionName).toBe(
        'read-replica'
      );
      expect(repository['connectionConfig'].writeConnectionName).toBe(
        'write-master'
      );
      expect(repository['connectionConfig'].enableReadWriteSeparation).toBe(
        true
      );
      expect(databaseAPI.getReadConnectionSync).toHaveBeenCalledWith(
        'read-replica'
      );
      expect(databaseAPI.getWriteConnectionSync).toHaveBeenCalledWith(
        'write-master'
      );
    });
  });

  describe('错误处理', () => {
    it('应该在连接获取失败时抛出错误', () => {
      const failingAPI = createMockDatabaseAPI();
      (failingAPI.getReadConnectionSync as any).mockImplementation(() => {
        throw new Error('Connection not found');
      });

      expect(() => {
        new TestUserRepository(failingAPI);
      }).toThrow('Failed to initialize repository connections');
    });

    it('应该在写连接获取失败时抛出错误', () => {
      const failingAPI = createMockDatabaseAPI();
      (failingAPI.getWriteConnectionSync as any).mockImplementation(() => {
        throw new Error('Write connection not found');
      });

      expect(() => {
        new TestUserRepository(failingAPI);
      }).toThrow('Failed to initialize repository connections');
    });
  });
});

describe('RepositoryFactory 连接注入', () => {
  let databaseAPI: DatabaseAPI;

  beforeEach(() => {
    databaseAPI = createMockDatabaseAPI(
      createMockConnection(),
      createMockConnection()
    );
  });

  describe('新的create方法', () => {
    it('应该创建带有默认连接的仓储', () => {
      const repository = RepositoryFactory.create<TestDatabase, 'users'>(
        'users',
        databaseAPI
      );

      expect(repository).toBeInstanceOf(BaseRepository);
      expect(repository['tableName']).toBe('users');
      expect(repository['connectionConfig'].readConnectionName).toBe('default');
    });

    it('应该创建带有自定义连接的仓储', () => {
      const repository = RepositoryFactory.create<TestDatabase, 'users'>(
        'users',
        databaseAPI,
        'custom-connection'
      );

      expect(repository['connectionConfig'].readConnectionName).toBe(
        'custom-connection'
      );
      expect(repository['connectionConfig'].writeConnectionName).toBe(
        'custom-connection'
      );
    });

    it('应该支持自定义主键', () => {
      const repository = RepositoryFactory.create<TestDatabase, 'users'>(
        'users',
        databaseAPI,
        undefined,
        'uuid'
      );

      expect(repository['primaryKey']).toBe('uuid');
    });
  });

  describe('向后兼容的createLegacy方法', () => {
    it('应该创建兼容旧接口的仓储', () => {
      const readConnection = createMockConnection();
      const writeConnection = createMockConnection();

      const repository = RepositoryFactory.createLegacy<TestDatabase, 'users'>(
        'users',
        readConnection,
        writeConnection,
        databaseAPI
      );

      expect(repository).toBeInstanceOf(BaseRepository);
      expect(repository['tableName']).toBe('users');
      expect(repository['readConnection']).toBe(readConnection);
      expect(repository['writeConnection']).toBe(writeConnection);
    });
  });
});
