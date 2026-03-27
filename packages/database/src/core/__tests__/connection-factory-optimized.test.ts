// ConnectionFactory 优化后的测试
// 验证移除缓存后的功能正常性

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import ConnectionFactory from '../connection-factory.js';
import type { ConnectionConfig } from '../../types/configuration.js';

describe('ConnectionFactory - 优化后测试', () => {
  let connectionFactory: ConnectionFactory;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    connectionFactory = new ConnectionFactory({}, mockLogger);
  });

  describe('基础功能测试', () => {
    it('应该正确初始化，不包含缓存', () => {
      expect(connectionFactory).toBeDefined();
      expect(connectionFactory.getSupportedTypes()).toContain('sqlite');
      
      // 验证不再有缓存相关属性
      expect((connectionFactory as any).connectionCache).toBeUndefined();
    });

    it('应该支持基本的数据库类型', () => {
      const supportedTypes = connectionFactory.getSupportedTypes();
      
      expect(supportedTypes).toContain('postgresql');
      expect(supportedTypes).toContain('mysql');
      expect(supportedTypes).toContain('sqlite');
    });

    it('应该正确验证连接配置', () => {
      const validConfig: ConnectionConfig = {
        type: 'sqlite',
        database: ':memory:'
      };

      const result = connectionFactory.validateConfig(validConfig);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的连接配置', () => {
      const invalidConfig = {} as ConnectionConfig;

      const result = connectionFactory.validateConfig(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('连接创建测试', () => {
    it('应该能够创建 SQLite 连接（不使用缓存）', async () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: ':memory:'
      };

      // 第一次创建
      const result1 = await connectionFactory.createConnection(config);
      expect(result1.success).toBe(true);
      
      // 第二次创建（应该创建新的连接实例，不从缓存获取）
      const result2 = await connectionFactory.createConnection(config);
      expect(result2.success).toBe(true);
      
      // 验证是不同的连接实例（因为没有缓存）
      expect(result1.data).not.toBe(result2.data);
      
      // 清理连接
      await result1.data.destroy();
      await result2.data.destroy();
    });

    it('应该正确处理连接创建错误', async () => {
      const invalidConfig: ConnectionConfig = {
        type: 'postgresql',
        database: 'nonexistent',
        host: 'nonexistent-host',
        port: 99999
      };

      const result = await connectionFactory.createConnection(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('连接销毁测试', () => {
    it('应该能够正确销毁连接', async () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: ':memory:'
      };

      const createResult = await connectionFactory.createConnection(config);
      expect(createResult.success).toBe(true);

      const connection = createResult.data;
      
      // 销毁连接
      const destroyResult = await connectionFactory.destroyConnection(connection);
      expect(destroyResult.success).toBe(true);
    });
  });

  describe('批量操作测试', () => {
    it('应该能够批量创建连接', async () => {
      const configs: ConnectionConfig[] = [
        { type: 'sqlite', database: ':memory:' },
        { type: 'sqlite', database: ':memory:' }
      ];

      const result = await connectionFactory.createConnections(configs);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      // 清理连接
      for (const connection of result.data) {
        await connection.destroy();
      }
    });

    it('应该能够批量测试连接', async () => {
      const configs: ConnectionConfig[] = [
        { type: 'sqlite', database: ':memory:' },
        { type: 'sqlite', database: ':memory:' }
      ];

      const result = await connectionFactory.testConnections(configs);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(success => success)).toBe(true);
    });
  });

  describe('优化验证测试', () => {
    it('验证不再有缓存相关方法', () => {
      // 验证缓存相关方法已被移除
      expect((connectionFactory as any).clearCache).toBeUndefined();
      expect((connectionFactory as any).getCacheStats).toBeUndefined();
      expect((connectionFactory as any).generateCacheKey).toBeUndefined();
      expect((connectionFactory as any).connectionCache).toBeUndefined();
    });

    it('验证每次创建都是新的连接实例', async () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: ':memory:'
      };

      // 创建多个相同配置的连接
      const connections = await Promise.all([
        connectionFactory.createConnection(config),
        connectionFactory.createConnection(config),
        connectionFactory.createConnection(config)
      ]);

      // 验证所有连接都创建成功
      expect(connections.every(result => result.success)).toBe(true);

      // 验证每个连接都是不同的实例
      const connectionInstances = connections.map(result => result.data);
      expect(connectionInstances[0]).not.toBe(connectionInstances[1]);
      expect(connectionInstances[1]).not.toBe(connectionInstances[2]);
      expect(connectionInstances[0]).not.toBe(connectionInstances[2]);

      // 清理连接
      for (const connection of connectionInstances) {
        await connection.destroy();
      }
    });
  });

  describe('性能测试', () => {
    it('验证连接创建性能（无缓存开销）', async () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: ':memory:'
      };

      const startTime = Date.now();
      
      // 创建多个连接
      const connections = await Promise.all(
        Array.from({ length: 5 }, () => 
          connectionFactory.createConnection(config)
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证所有连接都创建成功
      expect(connections.every(result => result.success)).toBe(true);
      
      // 记录性能（用于对比）
      console.log(`创建 5 个连接耗时: ${duration}ms`);

      // 清理连接
      for (const result of connections) {
        await result.data.destroy();
      }
    });
  });
});
