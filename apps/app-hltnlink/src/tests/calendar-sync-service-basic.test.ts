// @wps/hltnlink CalendarSyncService基础测试
// 验证服务的基本功能和类型安全

import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';
import type { CalendarSyncParams } from '../types/calendar-sync.js';

// Mock dependencies
const mockLogger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as any;

const mockCalendarRepository = {
  findAll: vi.fn(),
  findByBatchIdAndSemester: vi.fn()
} as any;

const mockSourceCourseRepository = {
  findSchedulesByKXH: vi.fn()
} as any;

const mockSourceCourseSelectionsRepository = {
  findPermissionByKXH: vi.fn()
} as any;

const mockWpsCalendarAdapter = {
  batchCreateCalendarPermissionsLimit: vi.fn()
} as any;

const mockWpsScheduleAdapter = {
  createSchedule: vi.fn(),
  batchCreateSchedules: vi.fn()
} as any;

const mockWpsUserAdapter = {
  getUsersByExUserIds: vi.fn()
} as any;

describe('CalendarSyncService 基础测试', () => {
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

  describe('服务实例化', () => {
    it('应该能够正确创建服务实例', () => {
      expect(calendarSyncService).toBeDefined();
      expect(calendarSyncService).toBeInstanceOf(CalendarSyncService);
    });

    it('应该包含所有必需的方法', () => {
      expect(typeof calendarSyncService.syncCalendarSchedules).toBe('function');
      expect(typeof calendarSyncService.getCalendarsForSync).toBe('function');
      expect(typeof calendarSyncService.getPermissionData).toBe('function');
      expect(typeof calendarSyncService.getScheduleData).toBe('function');
      expect(typeof calendarSyncService.addCalendarPermissions).toBe(
        'function'
      );
      expect(typeof calendarSyncService.createWpsSchedule).toBe('function');
      expect(typeof calendarSyncService.batchCreateWpsSchedules).toBe(
        'function'
      );
      expect(typeof calendarSyncService.convertCourseToWpsSchedule).toBe(
        'function'
      );
      expect(typeof calendarSyncService.validateSyncParams).toBe('function');
      expect(typeof calendarSyncService.getSyncStatistics).toBe('function');
      expect(typeof calendarSyncService.cleanupFailedSync).toBe('function');
    });
  });

  describe('参数验证', () => {
    it('应该验证必需的同步参数', async () => {
      const invalidParams = {} as CalendarSyncParams;

      const result =
        await calendarSyncService.syncCalendarSchedules(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('应该接受有效的同步参数', () => {
      const validParams: CalendarSyncParams = {
        batchId: '202509072151',
        semester: '2025-2026-1',
        courseBatchId: '202509072149',
        selectionBatchId: '202509072151'
      };

      const validationResult =
        calendarSyncService.validateSyncParams(validParams);
      expect(validationResult.success).toBe(true);
    });
  });

  describe('数据转换', () => {
    it('应该能够转换课程数据为WPS日程格式', () => {
      const courseData = {
        courseSequence: 'B20136309.01',
        courseName: '高等数学',
        teacherName: '张教授',
        startTime: '08:00',
        endTime: '09:40',
        weekday: '1',
        weeks: '1-16',
        classroom: '教学楼A101',
        semester: '2025-2026-1',
        batchId: '202509072149'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar-id'
      );

      expect(result).toBeDefined();
      expect(result.calendarId).toBe('test-calendar-id');
      expect(result.summary).toContain('高等数学');
      expect(result.description).toContain('张教授');
    });
  });

  describe('统计信息', () => {
    it('应该能够获取同步统计信息', async () => {
      const result = await calendarSyncService.getSyncStatistics(
        '202509072151',
        '2025-2026-1'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data.totalCalendars).toBe('number');
      expect(typeof result.data.syncedCalendars).toBe('number');
      expect(typeof result.data.totalPermissions).toBe('number');
      expect(typeof result.data.totalSchedules).toBe('number');
    });
  });

  describe('清理功能', () => {
    it('应该能够清理失败的同步数据', async () => {
      const result = await calendarSyncService.cleanupFailedSync(
        '202509072151',
        '2025-2026-1'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data.cleanedPermissions).toBe('number');
      expect(typeof result.data.cleanedSchedules).toBe('number');
    });
  });
});
