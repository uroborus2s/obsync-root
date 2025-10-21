// @wps/hltnlink CalendarCreationService 单元测试
// 测试日历创建服务的核心功能

import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type CalendarRepository from '../repositories/CalendarRepository.js';
import type SourceCourseRepository from '../repositories/SourceCourseRepository.js';
import CalendarCreationService from '../services/CalendarCreationService.js';

// 模拟依赖
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
} as any;

const mockCalendarRepository = {
  findByCourseId: vi.fn(),
  create: vi.fn(),
  countBySemester: vi.fn(),
  findBySemester: vi.fn(),
  delete: vi.fn(),
  getQueryConnection: vi.fn()
} as any as CalendarRepository;

const mockSourceCourseRepository = {
  getQueryConnection: vi.fn()
} as any as SourceCourseRepository;

// 模拟axios
const mockAxiosClient = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosClient)
  }
}));

describe('CalendarCreationService', () => {
  let service: CalendarCreationService;

  const mockWpsConfig: WpsApiConfig = {
    baseUrl: 'https://api.wps.test',
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    timeout: 30000,
    retries: 3
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new CalendarCreationService(
      mockWpsConfig,
      mockCalendarRepository,
      mockSourceCourseRepository,
      mockLogger
    );
  });

  describe('createCalendarsFromCourses', () => {
    it('should handle empty course sequences', async () => {
      // 模拟查询返回空结果
      const mockConnection = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        distinct: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([])
      };

      mockSourceCourseRepository.getQueryConnection.mockResolvedValue(
        mockConnection
      );

      const result = await service.createCalendarsFromCourses(
        'batch123',
        '2025-2026-1'
      );

      expect(result.success).toBe(true);
      expect(result.data.totalCourseSequences).toBe(0);
      expect(result.data.successfulCalendars).toBe(0);
      expect(result.data.failedCourseSequences).toHaveLength(0);
      expect(result.data.skippedCourseSequences).toHaveLength(0);
    });

    it('should process course sequences successfully', async () => {
      // 模拟课程序号查询结果
      const mockCourseSequences = [
        {
          KXH: '022311065.008',
          KCMC: '推拿学基础1',
          JSXM: '刘孝品',
          JSGH: '0218',
          KCH: '022311065',
          KKXQM: '2025-2026-1'
        }
      ];

      const mockConnection = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        distinct: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(mockCourseSequences)
      };

      mockSourceCourseRepository.getQueryConnection.mockResolvedValue(
        mockConnection
      );

      // 模拟日历不存在
      mockCalendarRepository.findByCourseId.mockResolvedValue({
        success: true,
        data: null
      });

      // 模拟WPS API成功响应
      mockAxiosClient.post
        .mockResolvedValueOnce({
          data: { accessToken: 'test-token', expiresIn: 3600 }
        })
        .mockResolvedValueOnce({
          data: { calendarId: 'wps-cal-123' }
        });

      // 模拟数据库保存成功
      mockCalendarRepository.create.mockResolvedValue({
        success: true,
        data: { calendar_id: 1 }
      });

      const result = await service.createCalendarsFromCourses(
        'batch123',
        '2025-2026-1'
      );

      expect(result.success).toBe(true);
      expect(result.data.totalCourseSequences).toBe(1);
      expect(result.data.successfulCalendars).toBe(1);
      expect(result.data.createdCalendars).toHaveLength(1);
      expect(result.data.createdCalendars[0]).toMatchObject({
        courseSequence: '022311065.008',
        courseName: '推拿学基础1',
        teacherName: '刘孝品',
        wpsCalendarId: 'wps-cal-123',
        calendarId: 1
      });
    });

    it('should skip existing calendars', async () => {
      const mockCourseSequences = [
        {
          KXH: '022311065.008',
          KCMC: '推拿学基础1',
          JSXM: '刘孝品',
          JSGH: '0218',
          KCH: '022311065',
          KKXQM: '2025-2026-1'
        }
      ];

      const mockConnection = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        distinct: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(mockCourseSequences)
      };

      mockSourceCourseRepository.getQueryConnection.mockResolvedValue(
        mockConnection
      );

      // 模拟日历已存在
      mockCalendarRepository.findByCourseId.mockResolvedValue({
        success: true,
        data: { calendar_id: 1, wps_calendar_id: 'existing-cal' }
      });

      // 模拟token刷新（即使跳过创建，也需要确保token有效）
      mockAxiosClient.post.mockResolvedValue({
        data: { accessToken: 'test-token', expiresIn: 3600 }
      });

      const result = await service.createCalendarsFromCourses(
        'batch123',
        '2025-2026-1'
      );

      expect(result.success).toBe(true);
      expect(result.data.totalCourseSequences).toBe(1);
      expect(result.data.successfulCalendars).toBe(0);
      expect(result.data.skippedCourseSequences).toHaveLength(1);
      expect(result.data.skippedCourseSequences[0]).toMatchObject({
        courseSequence: '022311065.008',
        courseName: '推拿学基础1',
        reason: 'Calendar already exists'
      });
    });

    it('should handle WPS API failures', async () => {
      const mockCourseSequences = [
        {
          KXH: '022311065.008',
          KCMC: '推拿学基础1',
          JSXM: '刘孝品',
          JSGH: '0218',
          KCH: '022311065',
          KKXQM: '2025-2026-1'
        }
      ];

      const mockConnection = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        distinct: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(mockCourseSequences)
      };

      mockSourceCourseRepository.getQueryConnection.mockResolvedValue(
        mockConnection
      );

      // 模拟日历不存在
      mockCalendarRepository.findByCourseId.mockResolvedValue({
        success: true,
        data: null
      });

      // 模拟WPS API失败
      mockAxiosClient.post
        .mockResolvedValueOnce({
          data: { accessToken: 'test-token', expiresIn: 3600 }
        })
        .mockRejectedValueOnce(new Error('WPS API Error'));

      const result = await service.createCalendarsFromCourses(
        'batch123',
        '2025-2026-1'
      );

      expect(result.success).toBe(true);
      expect(result.data.totalCourseSequences).toBe(1);
      expect(result.data.successfulCalendars).toBe(0);
      expect(result.data.failedCourseSequences).toHaveLength(1);
      expect(result.data.failedCourseSequences[0]).toMatchObject({
        courseSequence: '022311065.008',
        courseName: '推拿学基础1',
        teacherName: '刘孝品',
        error: 'WPS API Error'
      });
    });
  });

  describe('testWpsApiConnection', () => {
    it('should return true for successful connection', async () => {
      mockAxiosClient.post.mockResolvedValue({
        data: { accessToken: 'test-token', expiresIn: 3600 }
      });
      mockAxiosClient.get.mockResolvedValue({
        data: { calendars: [] }
      });

      const result = await service.testWpsApiConnection();

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'WPS API connection test successful'
      );
    });

    it('should return false for failed connection', async () => {
      mockAxiosClient.post.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testWpsApiConnection();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'WPS API connection test failed',
        expect.any(Error)
      );
    });
  });

  describe('getCreationStatistics', () => {
    it('should return statistics successfully', async () => {
      mockCalendarRepository.countBySemester
        .mockResolvedValueOnce({ success: true, data: 10 })
        .mockResolvedValueOnce({ success: true, data: 8 });

      const mockConnection = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ count: '2' }),
        fn: {
          count: vi
            .fn()
            .mockReturnValue({ as: vi.fn().mockReturnValue('count') })
        }
      };

      mockCalendarRepository.getQueryConnection.mockResolvedValue(
        mockConnection
      );

      const result = await service.getCreationStatistics('2025-2026-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalCalendars: 10,
        activeSemesterCalendars: 8,
        recentCreations: 2
      });
    });
  });

  describe('deleteCalendarsBySemester', () => {
    it('should perform dry run correctly', async () => {
      const mockCalendars = [
        { calendar_id: 1, wps_calendar_id: 'cal-1' },
        { calendar_id: 2, wps_calendar_id: 'cal-2' }
      ];

      mockCalendarRepository.findBySemester.mockResolvedValue({
        success: true,
        data: mockCalendars
      });

      const result = await service.deleteCalendarsBySemester(
        '2025-2026-1',
        true
      );

      expect(result.success).toBe(true);
      expect(result.data.totalFound).toBe(2);
      expect(result.data.deletedCount).toBe(0);
      expect(mockAxiosClient.delete).not.toHaveBeenCalled();
      expect(mockCalendarRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete calendars successfully', async () => {
      const mockCalendars = [{ calendar_id: 1, wps_calendar_id: 'cal-1' }];

      mockCalendarRepository.findBySemester.mockResolvedValue({
        success: true,
        data: mockCalendars
      });

      mockAxiosClient.post.mockResolvedValue({
        data: { accessToken: 'test-token', expiresIn: 3600 }
      });

      mockAxiosClient.delete.mockResolvedValue({ data: { success: true } });

      mockCalendarRepository.delete.mockResolvedValue({
        success: true,
        data: true
      });

      const result = await service.deleteCalendarsBySemester(
        '2025-2026-1',
        false
      );

      expect(result.success).toBe(true);
      expect(result.data.totalFound).toBe(1);
      expect(result.data.deletedCount).toBe(1);
      expect(result.data.failedDeletions).toHaveLength(0);
    });
  });
});
