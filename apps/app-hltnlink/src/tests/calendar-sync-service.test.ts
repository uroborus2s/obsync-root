// @wps/hltnlink CalendarSyncService 单元测试
// 基于vitest的测试实现

import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';
import type { CalendarSyncParams } from '../types/calendar-sync.js';

// Mock依赖
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

const mockCalendarRepository = {
  findBySemester: vi.fn()
};

const mockSourceCourseRepository = {
  getQueryConnection: vi.fn()
};

const mockSourceCourseSelectionsRepository = {
  getQueryConnection: vi.fn()
};

const mockWpsCalendarAdapter = {
  getPrimaryCalendar: vi.fn(),
  batchCreateCalendarPermissionsLimit: vi.fn()
};

const mockWpsScheduleAdapter = {
  createSchedule: vi.fn()
};

describe('CalendarSyncService', () => {
  let calendarSyncService: CalendarSyncService;

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks();

    // 创建服务实例
    calendarSyncService = new CalendarSyncService(
      mockCalendarRepository as any,
      mockSourceCourseRepository as any,
      mockSourceCourseSelectionsRepository as any,
      mockWpsCalendarAdapter as any,
      mockWpsScheduleAdapter as any,
      { getUsersByExUserIds: vi.fn() } as any, // mockWpsUserAdapter
      mockLogger
    );
  });

  describe('validateSyncParams', () => {
    it('应该验证有效的同步参数', () => {
      const validParams: CalendarSyncParams = {
        batchId: '202509072151',
        semester: '2025-2026-1'
      };

      const result = calendarSyncService.validateSyncParams(validParams);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('应该拒绝无效的同步参数', () => {
      const invalidParams: CalendarSyncParams = {
        batchId: '',
        semester: ''
      };

      const result = calendarSyncService.validateSyncParams(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });
  });

  describe('parseWeeksString', () => {
    it('应该正确解析周次范围', () => {
      const weeks = calendarSyncService.parseWeeksString('1-16周');
      expect(weeks).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
      ]);
    });

    it('应该正确解析单独的周次', () => {
      const weeks = calendarSyncService.parseWeeksString('1,3,5周');
      expect(weeks).toEqual([1, 3, 5]);
    });

    it('应该处理无效的周次字符串', () => {
      const weeks = calendarSyncService.parseWeeksString('无效格式');
      expect(weeks).toEqual([]);
    });
  });

  describe('convertCourseToWpsSchedule', () => {
    it('应该正确转换课程数据为WPS日程格式', () => {
      const courseData = {
        courseSequence: 'B20136309.01',
        courseName: '高等数学',
        teacherName: '张教授',
        startTime: '08:00',
        endTime: '09:40',
        weekday: '1',
        weeks: '1-16周',
        classroom: '教学楼A101',
        semester: '2025-2026-1',
        batchId: '202509072149'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar-id'
      );

      expect(result.calendarId).toBe('test-calendar-id');
      expect(result.summary).toBe('高等数学 - 张教授');
      expect(result.location).toBe('教学楼A101');
      expect(result.recurrence).toHaveLength(1);
    });
  });

  describe('testWpsApiConnection', () => {
    it('应该在API连接成功时返回true', async () => {
      mockWpsCalendarAdapter.getPrimaryCalendar.mockResolvedValue({
        id: 'test-calendar',
        summary: 'Test Calendar'
      });

      const result = await calendarSyncService.testWpsApiConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockWpsCalendarAdapter.getPrimaryCalendar).toHaveBeenCalled();
    });

    it('应该在API连接失败时返回false', async () => {
      mockWpsCalendarAdapter.getPrimaryCalendar.mockRejectedValue(
        new Error('API连接失败')
      );

      const result = await calendarSyncService.testWpsApiConnection();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('API_CONNECTION_FAILED');
    });
  });

  describe('getCalendarsForSync', () => {
    it('应该正确获取日历数据', async () => {
      const mockCalendars = [
        {
          calendar_id: 1,
          wps_calendar_id: 'wps-cal-1',
          course_id: 'B20136309.01',
          course_name: '高等数学',
          teacher_id: 'T001',
          teacher_name: '张教授',
          semester: '2025-2026-1'
        }
      ];

      mockCalendarRepository.findBySemester.mockResolvedValue({
        success: true,
        data: mockCalendars
      });

      const result = await calendarSyncService.getCalendarsForSync(
        '202509072151',
        '2025-2026-1'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].courseId).toBe('B20136309.01');
      expect(result.data?.[0].courseName).toBe('高等数学');
    });

    it('应该处理数据库错误', async () => {
      mockCalendarRepository.findBySemester.mockResolvedValue({
        success: false,
        error: new Error('数据库连接失败')
      });

      const result = await calendarSyncService.getCalendarsForSync(
        '202509072151',
        '2025-2026-1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });
  });

  describe('addCalendarPermissions', () => {
    it('应该正确添加日历权限', async () => {
      const studentIds = ['S001', 'S002', 'S003'];

      mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mockResolvedValue(
        {
          success_count: 3,
          failed_items: []
        }
      );

      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        studentIds
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(3);
      expect(result.data?.failed).toBe(0);
      expect(result.data?.errors).toEqual([]);
    });

    it('应该处理部分失败的权限添加', async () => {
      const studentIds = ['S001', 'S002', 'S003'];

      mockWpsCalendarAdapter.batchCreateCalendarPermissionsLimit.mockResolvedValue(
        {
          success_count: 2,
          failed_items: [{ id: 'S003', error: '用户不存在' }]
        }
      );

      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        studentIds
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(2);
      expect(result.data?.failed).toBe(1);
      expect(result.data?.errors).toEqual(['S003: 用户不存在']);
    });

    it('应该处理空的学生ID列表', async () => {
      const result = await calendarSyncService.addCalendarPermissions(
        'test-calendar-id',
        []
      );

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(0);
      expect(result.data?.failed).toBe(0);
      expect(result.data?.errors).toEqual([]);
    });
  });

  describe('retryOperation', () => {
    it('应该在第一次尝试成功时返回结果', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await calendarSyncService.retryOperation(
        operation,
        3,
        100
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('应该在重试后成功时返回结果', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('第一次失败'))
        .mockRejectedValueOnce(new Error('第二次失败'))
        .mockResolvedValue('第三次成功');

      const result = await calendarSyncService.retryOperation(operation, 3, 10);

      expect(result).toBe('第三次成功');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('应该在所有重试都失败时抛出错误', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('始终失败'));

      await expect(
        calendarSyncService.retryOperation(operation, 3, 10)
      ).rejects.toThrow('始终失败');

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
