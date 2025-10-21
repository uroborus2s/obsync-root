/**
 * FetchCalendarPermissionsToRemoveExecutor 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import type { ExecutionContext } from '@stratix/tasks';
import FetchCalendarPermissionsToRemoveExecutor from '../FetchCalendarPermissionsToRemoveExecutor.js';

describe('FetchCalendarPermissionsToRemoveExecutor', () => {
  let executor: FetchCalendarPermissionsToRemoveExecutor;
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

    executor = new FetchCalendarPermissionsToRemoveExecutor(
      mockDatabaseApi,
      mockLogger
    );
  });

  describe('execute', () => {
    it('应该成功获取需要删除权限的用户信息', async () => {
      const mockQueryResult = {
        success: true,
        data: [
          {
            kkh: 'TEST001',
            merged_user_list: '2021001, 2021002, T001, T002'
          },
          {
            kkh: 'TEST002', 
            merged_user_list: '2021003, T003'
          }
        ]
      };

      mockDatabaseApi.executeQuery.mockResolvedValue(mockQueryResult);

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1',
          includeParticipantInfo: true,
          maxRecords: 100
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.permissionsToRemove).toHaveLength(2);
      expect(result.data.processedCourses).toBe(2);
      expect(result.data.totalUsers).toBe(6); // 4 + 2 用户
      expect(mockLogger.info).toHaveBeenCalledWith(
        '开始获取需要删除权限的用户信息',
        expect.any(Object)
      );
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
      expect(result.data.permissionsToRemove).toHaveLength(0);
      expect(result.data.processedCourses).toBe(0);
      expect(result.data.totalUsers).toBe(0);
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
      expect(result.error).toContain('查询需要删除权限的用户信息失败');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该处理异常情况', async () => {
      mockDatabaseApi.executeQuery.mockRejectedValue(new Error('Network error'));

      const context: ExecutionContext = {
        config: {
          xnxq: '2023-2024-1'
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('获取需要删除权限的用户信息失败');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      const config = {
        xnxq: '2023-2024-1',
        includeParticipantInfo: true,
        maxRecords: 100
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
});
