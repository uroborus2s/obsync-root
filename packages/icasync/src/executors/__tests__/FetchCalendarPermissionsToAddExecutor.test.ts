/**
 * FetchCalendarPermissionsToAddExecutor 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import type { ExecutionContext } from '@stratix/tasks';
import FetchCalendarPermissionsToAddExecutor from '../FetchCalendarPermissionsToAddExecutor.js';

describe('FetchCalendarPermissionsToAddExecutor', () => {
  let executor: FetchCalendarPermissionsToAddExecutor;
  let mockDatabaseApi: jest.Mocked<DatabaseAPI>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockDatabaseApi = {
      executeQuery: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    executor = new FetchCalendarPermissionsToAddExecutor(
      mockDatabaseApi,
      mockLogger
    );
  });

  describe('execute', () => {
    it('应该成功获取需要添加权限的用户信息并进行分组', async () => {
      const mockQueryResult = {
        success: true,
        data: [
          {
            kkh: 'TEST001',
            merged_user_list: Array.from({ length: 150 }, (_, i) => `user${i + 1}`).join(', ')
          },
          {
            kkh: 'TEST002',
            merged_user_list: '2021001, 2021002, T001'
          }
        ]
      };

      mockDatabaseApi.executeQuery.mockResolvedValue(mockQueryResult);

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1',
          includeParticipantInfo: true,
          maxRecords: 100,
          batchSize: 100
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.permissionsToAdd.length).toBeGreaterThan(2); // 应该有分组
      expect(result.data.processedCourses).toBe(2);
      expect(result.data.totalBatches).toBeGreaterThan(2); // TEST001应该被分成2个批次

      // 验证分组逻辑
      const test001Batches = result.data.permissionsToAdd.filter(p => p.kkh === 'TEST001');
      expect(test001Batches).toHaveLength(2); // 150个用户应该分成2个批次
      expect(test001Batches[0].batch_info.batchNumber).toBe(1);
      expect(test001Batches[0].batch_info.totalBatches).toBe(2);
      expect(test001Batches[0].batch_info.userCount).toBe(100);
      expect(test001Batches[1].batch_info.userCount).toBe(50);
    });

    it('应该处理小批次用户', async () => {
      const mockQueryResult = {
        success: true,
        data: [
          {
            kkh: 'TEST001',
            merged_user_list: '2021001, 2021002, T001'
          }
        ]
      };

      mockDatabaseApi.executeQuery.mockResolvedValue(mockQueryResult);

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1',
          batchSize: 100
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.permissionsToAdd).toHaveLength(1);
      expect(result.data.permissionsToAdd[0].batch_info.batchNumber).toBe(1);
      expect(result.data.permissionsToAdd[0].batch_info.totalBatches).toBe(1);
      expect(result.data.permissionsToAdd[0].batch_info.userCount).toBe(3);
    });

    it('应该处理空结果', async () => {
      const mockQueryResult = {
        success: true,
        data: []
      };

      mockDatabaseApi.executeQuery.mockResolvedValue(mockQueryResult);

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.permissionsToAdd).toHaveLength(0);
      expect(result.data.processedCourses).toBe(0);
      expect(result.data.totalUsers).toBe(0);
      expect(result.data.totalBatches).toBe(0);
    });

    it('应该处理数据库查询失败', async () => {
      const mockQueryResult = {
        success: false,
        error: { message: 'Database connection failed' }
      };

      mockDatabaseApi.executeQuery.mockResolvedValue(mockQueryResult);

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('查询需要添加权限的用户信息失败');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该使用自定义批次大小', async () => {
      const mockQueryResult = {
        success: true,
        data: [
          {
            kkh: 'TEST001',
            merged_user_list: Array.from({ length: 25 }, (_, i) => `user${i + 1}`).join(', ')
          }
        ]
      };

      mockDatabaseApi.executeQuery.mockResolvedValue(mockQueryResult);

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1',
          batchSize: 10
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.permissionsToAdd).toHaveLength(3); // 25个用户，每批10个，应该有3个批次
      expect(result.data.permissionsToAdd[0].batch_info.userCount).toBe(10);
      expect(result.data.permissionsToAdd[1].batch_info.userCount).toBe(10);
      expect(result.data.permissionsToAdd[2].batch_info.userCount).toBe(5);
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      const config = {
        xnxq: '2023-2024-1',
        includeParticipantInfo: true,
        maxRecords: 100,
        batchSize: 50
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('应该拒绝缺少xnxq的配置', () => {
      const config = {
        includeParticipantInfo: true
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('xnxq 参数是必需的且必须是字符串');
    });

    it('应该拒绝无效的batchSize', () => {
      const config = {
        xnxq: '2023-2024-1',
        batchSize: 150 // 超过100的限制
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('batchSize 参数必须是1-100之间的正整数');
    });

    it('应该拒绝无效的maxRecords', () => {
      const config = {
        xnxq: '2023-2024-1',
        maxRecords: -1
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxRecords 参数必须是正整数');
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: true,
        data: [{ test: 1 }]
      });

      const result = await executor.healthCheck();

      expect(result).toBe('healthy');
    });

    it('应该返回不健康状态当数据库连接失败', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: false,
        error: { message: 'Connection failed' }
      });

      const result = await executor.healthCheck();

      expect(result).toBe('unhealthy');
      expect(mockLogger.warn).toHaveBeenCalledWith('数据库连接检查失败');
    });

    it('应该处理健康检查异常', async () => {
      mockDatabaseApi.executeQuery.mockRejectedValue(new Error('Network error'));

      const result = await executor.healthCheck();

      expect(result).toBe('unhealthy');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('processBatchedPermissions', () => {
    it('应该正确处理空用户列表', () => {
      const rawData = [
        { kkh: 'TEST001', merged_user_list: '' },
        { kkh: 'TEST002', merged_user_list: null as any }
      ];

      const result = (executor as any).processBatchedPermissions(rawData, 100);

      expect(result).toHaveLength(0);
    });

    it('应该正确处理单个用户', () => {
      const rawData = [
        { kkh: 'TEST001', merged_user_list: 'user1' }
      ];

      const result = (executor as any).processBatchedPermissions(rawData, 100);

      expect(result).toHaveLength(1);
      expect(result[0].kkh).toBe('TEST001');
      expect(result[0].merged_user_list).toBe('user1');
      expect(result[0].batch_info.batchNumber).toBe(1);
      expect(result[0].batch_info.totalBatches).toBe(1);
      expect(result[0].batch_info.userCount).toBe(1);
    });
  });
});
