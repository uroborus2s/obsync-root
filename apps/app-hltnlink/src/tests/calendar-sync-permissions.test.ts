// @wps/hltnlink CalendarSyncService权限添加功能测试
// 测试优化后的分批处理和用户存在性检查功能

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import CalendarSyncService from '../services/CalendarSyncService.js';

// Mock dependencies
const mockLogger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as any;

const mockCalendarRepository = {} as any;
const mockSourceCourseRepository = {} as any;
const mockSourceCourseSelectionsRepository = {} as any;

const mockWpsCalendarAdapter = {
  batchCreateCalendarPermissionsLimit: vi.fn()
} as any;

const mockWpsScheduleAdapter = {} as any;

const mockWpsUserAdapter = {
  getUsersByExUserIds: vi.fn()
} as any;

describe('CalendarSyncService 权限添加功能测试', () => {
  let calendarSyncService: CalendarSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    calendarSyncService = new CalendarSyncService(
      mockCalendarRepository,
      mockSourceCourseRepository,
      mockSourceCourseSelectionsRepository,
      mockWpsCalendarAdapter,
      mockWpsScheduleAdapter,
      mockWpsUserAdapter,
      mockLogger
    );
  });

  describe('addCalendarPermissions 方法', () => {
    it('应该处理空用户列表', async () => {
      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        []
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(0);
      expect(result.data?.failed).toBe(0);
      expect(result.data?.errors).toEqual([]);
    });

    it('应该正确处理小批量用户（少于100个）', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      
      // Mock WPS用户查询返回所有用户都存在
      mockWpsUserAdapter.getUsersByExUserIds.mockResolvedValue({
        items: [
          { ex_user_id: 'user1' },
          { ex_user_id: 'user2' },
          { ex_user_id: 'user3' }
        ]
      });

      // Mock WPS权限添加成功
      mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mockResolvedValue({
        items: [
          { user_id: 'user1', role: 'reader' },
          { user_id: 'user2', role: 'reader' },
          { user_id: 'user3', role: 'reader' }
        ]
      });

      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        userIds
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(3);
      expect(result.data?.failed).toBe(0);
      expect(result.data?.errors).toEqual([]);

      // 验证API调用
      expect(mockWpsUserAdapter.getUsersByExUserIds).toHaveBeenCalledWith({
        status: ['active', 'notactive', 'disabled'],
        ex_user_ids: userIds
      });

      expect(mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit).toHaveBeenCalledWith({
        calendar_id: 'test-calendar-id',
        permissions: [
          { user_id: 'user1', role: 'reader' },
          { user_id: 'user2', role: 'reader' },
          { user_id: 'user3', role: 'reader' }
        ]
      });
    });

    it('应该正确处理不存在的用户', async () => {
      const userIds = ['user1', 'user2', 'nonexistent1', 'user3', 'nonexistent2'];
      
      // Mock WPS用户查询返回部分用户存在
      mockWpsUserAdapter.getUsersByExUserIds.mockResolvedValue({
        items: [
          { ex_user_id: 'user1' },
          { ex_user_id: 'user2' },
          { ex_user_id: 'user3' }
        ]
      });

      // Mock WPS权限添加成功
      mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mockResolvedValue({
        items: [
          { user_id: 'user1', role: 'reader' },
          { user_id: 'user2', role: 'reader' },
          { user_id: 'user3', role: 'reader' }
        ]
      });

      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        userIds
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(3);
      expect(result.data?.failed).toBe(2); // 2个不存在的用户被算作失败
      expect(result.data?.errors).toContain('2 users not found in system');

      // 验证只为存在的用户添加权限
      expect(mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit).toHaveBeenCalledWith({
        calendar_id: 'test-calendar-id',
        permissions: [
          { user_id: 'user1', role: 'reader' },
          { user_id: 'user2', role: 'reader' },
          { user_id: 'user3', role: 'reader' }
        ]
      });
    });

    it('应该正确处理大批量用户（超过100个）', async () => {
      // 创建150个用户ID
      const userIds = Array.from({ length: 150 }, (_, i) => `user${i + 1}`);
      
      // Mock WPS用户查询返回所有用户都存在
      mockWpsUserAdapter.getUsersByExUserIds.mockImplementation(({ ex_user_ids }) => {
        return Promise.resolve({
          items: ex_user_ids.map((id: string) => ({ ex_user_id: id }))
        });
      });

      // Mock WPS权限添加成功
      mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mockImplementation(({ permissions }) => {
        return Promise.resolve({
          items: permissions.map((p: any) => ({ user_id: p.user_id, role: p.role }))
        });
      });

      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        userIds
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(150);
      expect(result.data?.failed).toBe(0);

      // 验证分批调用：150个用户应该分成2批（100 + 50）
      expect(mockWpsUserAdapter.getUsersByExUserIds).toHaveBeenCalledTimes(2);
      expect(mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit).toHaveBeenCalledTimes(2);

      // 验证第一批是100个用户
      const firstCall = mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mock.calls[0][0];
      expect(firstCall.permissions).toHaveLength(100);

      // 验证第二批是50个用户
      const secondCall = mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mock.calls[1][0];
      expect(secondCall.permissions).toHaveLength(50);
    });

    it('应该正确处理API错误', async () => {
      const userIds = ['user1', 'user2'];
      
      // Mock WPS用户查询返回用户存在
      mockWpsUserAdapter.getUsersByExUserIds.mockResolvedValue({
        items: [
          { ex_user_id: 'user1' },
          { ex_user_id: 'user2' }
        ]
      });

      // Mock WPS权限添加失败
      mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mockRejectedValue(
        new Error('API调用失败')
      );

      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        userIds
      );

      expect(result.success).toBe(true); // 整体仍然成功，但有错误
      expect(result.data?.successful).toBe(0);
      expect(result.data?.failed).toBe(2);
      expect(result.data?.errors).toContain('Batch 1: API调用失败');
    });

    it('应该正确处理全部用户都不存在的情况', async () => {
      const userIds = ['nonexistent1', 'nonexistent2'];
      
      // Mock WPS用户查询返回没有用户存在
      mockWpsUserAdapter.getUsersByExUserIds.mockResolvedValue({
        items: []
      });

      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        userIds
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(0);
      expect(result.data?.failed).toBe(2); // 2个不存在的用户
      expect(result.data?.errors).toContain('2 users not found in system');

      // 验证没有调用权限添加API
      expect(mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit).not.toHaveBeenCalled();
    });
  });
});
