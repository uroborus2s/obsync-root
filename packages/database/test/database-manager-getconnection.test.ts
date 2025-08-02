// @stratix/database DatabaseManager getConnection 方法重构测试
// 测试新的自动创建连接功能和函数式编程实现

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Kysely } from 'kysely';
import DatabaseManager from '../src/core/database-manager.js';
import ConnectionFactory from '../src/core/connection-factory.js';
import { ConnectionError } from '../src/utils/error-handler.js';
import type { DatabaseConfig, ConnectionConfig } from '../src/types/index.js';

// Mock Logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Mock ConnectionFactory
const mockConnectionFactory = {
  createConnection: vi.fn(),
  testConnection: vi.fn(),
  getSupportedTypes: vi.fn(),
  isSupported: vi.fn(),
  validateConfig: vi.fn(),
  checkDriverAvailability: vi.fn(),
  destroyConnection: vi.fn()
};

// Mock Kysely connection
const mockConnection = {
  destroy: vi.fn(),
  executeQuery: vi.fn(),
  sql: vi.fn()
} as unknown as Kysely<any>;

describe('DatabaseManager getConnection 重构测试', () => {
  let databaseManager: DatabaseManager;
  let testConfig: DatabaseConfig;

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks();
    
    // 设置测试配置
    testConfig = {
      connections: {
        default: {
          type: 'sqlite',
          database: ':memory:'
        },
        postgres: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass'
        },
        mysql: {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass'
        }
      },
      defaultConnection: 'default'
    };

    // 创建 DatabaseManager 实例
    databaseManager = new DatabaseManager(
      testConfig,
      mockConnectionFactory as unknown as ConnectionFactory
    );

    // 设置 ConnectionFactory mock 的默认行为
    mockConnectionFactory.createConnection.mockResolvedValue({
      success: true,
      data: mockConnection
    });
  });

  afterEach(async () => {
    // 清理资源
    if (databaseManager) {
      await databaseManager.onClose();
    }
  });

  describe('从缓存获取连接', () => {
    it('应该从缓存中成功获取已存在的连接', async () => {
      // 预先在缓存中设置连接
      const connectionName = 'default';
      
      // 首次调用会创建连接
      const connection1 = await databaseManager.getConnection(connectionName);
      expect(connection1).toBeDefined();
      expect(mockConnectionFactory.createConnection).toHaveBeenCalledTimes(1);

      // 第二次调用应该从缓存获取
      const connection2 = await databaseManager.getConnection(connectionName);
      expect(connection2).toBe(connection1);
      expect(mockConnectionFactory.createConnection).toHaveBeenCalledTimes(1); // 仍然只调用一次
    });

    it('应该正确更新连接使用统计', async () => {
      const connectionName = 'default';
      
      // 获取连接
      await databaseManager.getConnection(connectionName);
      
      // 检查统计信息
      const stats = databaseManager.getConnectionStats();
      const connectionStats = stats.get(connectionName);
      
      expect(connectionStats).toBeDefined();
      expect(connectionStats?.totalQueries).toBeGreaterThan(0);
      expect(connectionStats?.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('自动创建新连接', () => {
    it('应该为不存在的连接自动创建新连接', async () => {
      const connectionName = 'postgres';
      
      const connection = await databaseManager.getConnection(connectionName);
      
      expect(connection).toBeDefined();
      expect(mockConnectionFactory.createConnection).toHaveBeenCalledWith(
        testConfig.connections.postgres
      );
    });

    it('应该将新创建的连接保存到缓存', async () => {
      const connectionName = 'mysql';
      
      // 创建连接
      await databaseManager.getConnection(connectionName);
      
      // 验证连接已缓存
      expect(databaseManager.hasConnection(connectionName)).toBe(true);
    });

    it('应该正确初始化新连接的统计信息', async () => {
      const connectionName = 'postgres';
      
      await databaseManager.getConnection(connectionName);
      
      const stats = databaseManager.getConnectionStats();
      const connectionStats = stats.get(connectionName);
      
      expect(connectionStats).toBeDefined();
      expect(connectionStats?.name).toBe(connectionName);
      expect(connectionStats?.type).toBe('postgresql');
      expect(connectionStats?.status).toBe('connected');
      expect(connectionStats?.activeConnections).toBe(1);
    });
  });

  describe('配置验证和错误处理', () => {
    it('应该在连接配置不存在时抛出明确的错误', async () => {
      const invalidConnectionName = 'nonexistent';
      
      await expect(databaseManager.getConnection(invalidConnectionName))
        .rejects
        .toThrow(ConnectionError);
      
      await expect(databaseManager.getConnection(invalidConnectionName))
        .rejects
        .toThrow(/not found in configuration/);
    });

    it('错误信息应该包含可用连接列表', async () => {
      const invalidConnectionName = 'nonexistent';
      
      try {
        await databaseManager.getConnection(invalidConnectionName);
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error).toBeInstanceOf(ConnectionError);
        expect(error.message).toContain('default');
        expect(error.message).toContain('postgres');
        expect(error.message).toContain('mysql');
      }
    });

    it('应该在连接创建失败时抛出错误', async () => {
      // 模拟连接创建失败
      mockConnectionFactory.createConnection.mockResolvedValue({
        success: false,
        error: new Error('Connection failed')
      });

      await expect(databaseManager.getConnection('default'))
        .rejects
        .toThrow(ConnectionError);
    });
  });

  describe('并发安全性', () => {
    it('应该防止同时创建相同名称的连接', async () => {
      const connectionName = 'postgres';
      
      // 模拟慢速连接创建
      mockConnectionFactory.createConnection.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: mockConnection
          }), 100)
        )
      );

      // 并发请求相同连接
      const promises = [
        databaseManager.getConnection(connectionName),
        databaseManager.getConnection(connectionName),
        databaseManager.getConnection(connectionName)
      ];

      const connections = await Promise.all(promises);
      
      // 所有连接应该是同一个实例
      expect(connections[0]).toBe(connections[1]);
      expect(connections[1]).toBe(connections[2]);
      
      // 连接工厂应该只被调用一次
      expect(mockConnectionFactory.createConnection).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理并发创建过程中的错误', async () => {
      const connectionName = 'postgres';
      
      // 模拟连接创建失败
      mockConnectionFactory.createConnection.mockRejectedValue(
        new Error('Connection creation failed')
      );

      // 并发请求
      const promises = [
        databaseManager.getConnection(connectionName),
        databaseManager.getConnection(connectionName)
      ];

      // 所有请求都应该失败
      await expect(Promise.all(promises)).rejects.toThrow();
      
      // 确保没有连接被缓存
      expect(databaseManager.hasConnection(connectionName)).toBe(false);
    });
  });

  describe('读写分离支持', () => {
    beforeEach(() => {
      // 添加读写分离配置
      testConfig.connections['default-read'] = {
        type: 'postgresql',
        host: 'read-replica',
        port: 5432,
        database: 'test_db',
        username: 'read_user',
        password: 'read_pass'
      };
      
      testConfig.connections['default-write'] = {
        type: 'postgresql',
        host: 'write-master',
        port: 5432,
        database: 'test_db',
        username: 'write_user',
        password: 'write_pass'
      };
    });

    it('应该优先使用专用的读连接', async () => {
      const readConnection = await databaseManager.getReadConnection('default');
      
      expect(readConnection).toBeDefined();
      expect(mockConnectionFactory.createConnection).toHaveBeenCalledWith(
        testConfig.connections['default-read']
      );
    });

    it('应该优先使用专用的写连接', async () => {
      const writeConnection = await databaseManager.getWriteConnection('default');
      
      expect(writeConnection).toBeDefined();
      expect(mockConnectionFactory.createConnection).toHaveBeenCalledWith(
        testConfig.connections['default-write']
      );
    });

    it('在没有专用连接时应该回退到默认连接', async () => {
      const readConnection = await databaseManager.getReadConnection('postgres');
      
      expect(readConnection).toBeDefined();
      expect(mockConnectionFactory.createConnection).toHaveBeenCalledWith(
        testConfig.connections.postgres
      );
    });
  });
});
