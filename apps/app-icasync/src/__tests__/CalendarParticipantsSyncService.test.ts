// @wps/app-icasync 日历参与者同步服务测试

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarParticipantsSyncService from '../services/CalendarParticipantsSyncService.js';

// Mock Logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(() => mockLogger),
  level: 'info'
};

describe('CalendarParticipantsSyncService', () => {
  let service: CalendarParticipantsSyncService;
  let mockDatabaseApi: DatabaseAPI;
  let mockWpsCalendar: WpsCalendarAdapter;

  beforeEach(() => {
    // 创建 mock database API
    mockDatabaseApi = {
      getConnection: vi.fn().mockResolvedValue({
        query: vi.fn()
      })
    } as any;

    // 创建 mock WPS Calendar adapter
    mockWpsCalendar = {
      getAllCalendarPermissions: vi.fn(),
      batchCreateCalendarPermissionsLimit: vi.fn(),
      getCalendarPermissionList: vi.fn(),
      deleteCalendarPermission: vi.fn()
    } as any;

    // 创建服务实例
    service = new CalendarParticipantsSyncService(
      mockDatabaseApi,
      mockWpsCalendar,
      mockLogger
    );
  });

  describe('getValidCalendarMappings', () => {
    it('应该成功获取有效的课程映射', async () => {
      const mockMappings = [
        { kkh: 'COURSE001', calendar_id: 'cal-001' },
        { kkh: 'COURSE002', calendar_id: 'cal-002' }
      ];

      const mockConnection = {
        query: vi.fn().mockResolvedValue(mockMappings)
      };

      vi.mocked(mockDatabaseApi.getConnection).mockResolvedValue(
        mockConnection as any
      );

      // 执行
      const result = await service.getValidCalendarMappings();

      // 验证
      expect(result).toEqual(mockMappings);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('应该处理数据库查询失败', async () => {
      const mockConnection = {
        query: vi.fn().mockRejectedValue(new Error('数据库连接失败'))
      };

      vi.mocked(mockDatabaseApi.getConnection).mockResolvedValue(
        mockConnection as any
      );

      // 执行并验证异常
      await expect(service.getValidCalendarMappings()).rejects.toThrow(
        '数据库连接失败'
      );
    });
  });

  describe('getCourseParticipants', () => {
    it('应该成功获取课程参与者', async () => {
      const kkh = 'COURSE001';
      const mockTeachers = [{ userId: 'teacher1', userName: '张三' }];
      const mockStudents = [
        { userId: 'student1', userName: '李四' },
        { userId: 'student2', userName: '王五' }
      ];

      const mockConnection = {
        query: vi
          .fn()
          .mockResolvedValueOnce(mockTeachers)
          .mockResolvedValueOnce(mockStudents)
      };

      vi.mocked(mockDatabaseApi.getConnection).mockResolvedValue(
        mockConnection as any
      );

      // 执行
      const result = await service.getCourseParticipants(kkh);

      // 验证
      expect(result).toHaveLength(3);
      expect(result[0].userType).toBe('teacher');
      expect(result[1].userType).toBe('student');
      expect(result[2].userType).toBe('student');
    });

    it('应该处理空的开课号', async () => {
      // 执行并验证异常
      await expect(service.getCourseParticipants('')).rejects.toThrow(
        '开课号不能为空'
      );
    });
  });

  describe('syncCourseParticipants', () => {
    it('应该成功同步课程参与者', async () => {
      const kkh = 'COURSE001';
      const calendarId = 'cal-001';

      // Mock WPS 参与者
      vi.mocked(mockWpsCalendar.getAllCalendarPermissions).mockResolvedValue([
        {
          user_id: 'teacher1',
          role: 'writer',
          display_name: '张三'
        }
      ] as any);

      // Mock 数据库参与者
      const mockConnection = {
        query: vi
          .fn()
          .mockResolvedValueOnce([{ userId: 'teacher1', userName: '张三' }])
          .mockResolvedValueOnce([{ userId: 'student1', userName: '李四' }])
      };

      vi.mocked(mockDatabaseApi.getConnection).mockResolvedValue(
        mockConnection as any
      );

      // Mock 批量添加
      vi.mocked(
        mockWpsCalendar.batchCreateCalendarPermissionsLimit
      ).mockResolvedValue({
        items: [{ user_id: 'student1', role: 'reader' }]
      } as any);

      // 执行
      const result = await service.syncCourseParticipants(kkh, calendarId);

      // 验证
      expect(result.success).toBe(true);
      expect(result.kkh).toBe(kkh);
      expect(result.calendarId).toBe(calendarId);
      expect(result.failedCount).toBe(0);
    });

    it('应该处理同步失败的情况', async () => {
      const kkh = 'COURSE001';
      const calendarId = 'cal-001';

      // Mock WPS 参与者获取失败
      vi.mocked(mockWpsCalendar.getAllCalendarPermissions).mockRejectedValue(
        new Error('WPS API 错误')
      );

      // Mock 数据库连接失败
      const mockConnection = {
        query: vi.fn().mockRejectedValue(new Error('数据库错误'))
      };

      vi.mocked(mockDatabaseApi.getConnection).mockResolvedValue(
        mockConnection as any
      );

      // 执行
      const result = await service.syncCourseParticipants(kkh, calendarId);

      // 验证
      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toBeDefined();
    });
  });

  describe('syncMultipleCourses', () => {
    it('应该批量同步多个课程', async () => {
      const mappings = [
        { kkh: 'COURSE001', calendar_id: 'cal-001' },
        { kkh: 'COURSE002', calendar_id: 'cal-002' }
      ];

      // Mock WPS 参与者
      vi.mocked(mockWpsCalendar.getAllCalendarPermissions).mockResolvedValue(
        [] as any
      );

      // Mock 数据库参与者
      const mockConnection = {
        query: vi
          .fn()
          .mockResolvedValue([{ userId: 'teacher1', userName: '张三' }])
      };

      vi.mocked(mockDatabaseApi.getConnection).mockResolvedValue(
        mockConnection as any
      );

      // Mock 批量添加
      vi.mocked(
        mockWpsCalendar.batchCreateCalendarPermissionsLimit
      ).mockResolvedValue({
        items: [{ user_id: 'teacher1', role: 'writer' }]
      } as any);

      // 执行
      const results = await service.syncMultipleCourses(mappings);

      // 验证
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });
});
