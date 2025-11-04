/**
 * RemoveSingleCalendarPermissionProcessor 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import type { ExecutionContext } from '@stratix/tasks';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../../repositories/CalendarMapping.repository.js';
import RemoveSingleCalendarPermissionProcessor from '../RemoveSingleCalendarPermission.executor.js';

describe('RemoveSingleCalendarPermissionProcessor', () => {
  let executor: RemoveSingleCalendarPermissionProcessor;
  let mockCalendarMappingRepository: jest.Mocked<ICalendarMappingRepository>;
  let mockWpsCalendarAdapter: jest.Mocked<WpsCalendarAdapter>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockCalendarMappingRepository = {
      findByKkh: vi.fn()
    } as any;

    mockWpsCalendarAdapter = {
      getCalendarPermissionList: vi.fn(),
      deleteCalendarPermission: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    executor = new RemoveSingleCalendarPermissionProcessor(
      mockCalendarMappingRepository,
      mockWpsCalendarAdapter,
      mockLogger
    );
  });

  describe('execute', () => {
    it('应该成功删除日历权限', async () => {
      // Mock 日历映射查询
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'cal-123',
          xnxq: '2023-2024-1',
          calendar_name: 'Test Calendar',
          is_deleted: false,
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: null
        }
      });

      // Mock 权限列表查询
      mockWpsCalendarAdapter.getCalendarPermissionList.mockResolvedValue({
        items: [
          {
            id: 'perm-1',
            calendar_id: 'cal-123',
            user_id: '2021001',
            role: 'reader'
          },
          {
            id: 'perm-2',
            calendar_id: 'cal-123',
            user_id: 'T001',
            role: 'writer'
          }
        ],
        next_page_token: undefined,
        total_count: 2
      });

      // Mock 删除权限
      mockWpsCalendarAdapter.deleteCalendarPermission.mockResolvedValue();

      const context: ExecutionContext = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001, T001, 2021999', // 包含一个不存在的用户
          dryRun: false
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.kkh).toBe('TEST001');
      expect(result.data.calendarId).toBe('cal-123');
      expect(result.data.successCount).toBe(2);
      expect(result.data.failureCount).toBe(0);
      expect(result.data.removalResults).toHaveLength(2);
      expect(mockWpsCalendarAdapter.deleteCalendarPermission).toHaveBeenCalledTimes(2);
    });

    it('应该在DryRun模式下模拟删除', async () => {
      // Mock 日历映射查询
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'cal-123',
          xnxq: '2023-2024-1',
          calendar_name: 'Test Calendar',
          is_deleted: false,
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: null
        }
      });

      // Mock 权限列表查询
      mockWpsCalendarAdapter.getCalendarPermissionList.mockResolvedValue({
        items: [
          {
            id: 'perm-1',
            calendar_id: 'cal-123',
            user_id: '2021001',
            role: 'reader'
          }
        ],
        next_page_token: undefined,
        total_count: 1
      });

      const context: ExecutionContext = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001',
          dryRun: true
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.dryRun).toBe(true);
      expect(result.data.successCount).toBe(1);
      expect(mockWpsCalendarAdapter.deleteCalendarPermission).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'DryRun模式：模拟删除权限',
        expect.any(Object)
      );
    });

    it('应该处理日历映射不存在的情况', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: null
      });

      const context: ExecutionContext = {
        config: {
          kkh: 'NONEXISTENT',
          merged_user_list: '2021001',
          dryRun: false
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('未找到开课号 NONEXISTENT 对应的日历映射');
    });

    it('应该处理空用户列表', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'cal-123',
          xnxq: '2023-2024-1',
          calendar_name: 'Test Calendar',
          is_deleted: false,
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: null
        }
      });

      const context: ExecutionContext = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '',
          dryRun: false
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(0);
      expect(result.data.failureCount).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '没有需要删除权限的用户',
        expect.any(Object)
      );
    });

    it('应该处理权限删除失败', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'cal-123',
          xnxq: '2023-2024-1',
          calendar_name: 'Test Calendar',
          is_deleted: false,
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: null
        }
      });

      mockWpsCalendarAdapter.getCalendarPermissionList.mockResolvedValue({
        items: [
          {
            id: 'perm-1',
            calendar_id: 'cal-123',
            user_id: '2021001',
            role: 'reader'
          }
        ],
        next_page_token: undefined,
        total_count: 1
      });

      mockWpsCalendarAdapter.deleteCalendarPermission.mockRejectedValue(
        new Error('API Error')
      );

      const context: ExecutionContext = {
        config: {
          kkh: 'TEST001',
          merged_user_list: '2021001',
          dryRun: false
        }
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(0);
      expect(result.data.failureCount).toBe(1);
      expect(result.data.removalResults[0].success).toBe(false);
      expect(result.data.removalResults[0].error).toContain('API Error');
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      const config = {
        kkh: 'TEST001',
        merged_user_list: '2021001, T001',
        dryRun: false
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('应该拒绝缺少必需参数的配置', () => {
      const config = {
        kkh: 'TEST001'
        // 缺少 merged_user_list
      };

      const result = executor.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('merged_user_list 参数是必需的且必须是字符串');
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: false,
        error: { message: 'Course number cannot be empty' }
      });

      const result = await executor.healthCheck();

      expect(result).toBe('healthy');
    });

    it('应该检测到仓储问题', async () => {
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: false,
        error: { message: 'Database connection failed' }
      });

      const result = await executor.healthCheck();

      expect(result).toBe('unhealthy');
      expect(mockLogger.warn).toHaveBeenCalledWith('日历映射仓储检查失败');
    });
  });
});
