// @wps/hltnlink 时间格式解析功能测试
// 测试parseDateTime方法对不同时间格式的支持

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
const mockWpsCalendarAdapter = {} as any;
const mockWpsScheduleAdapter = {} as any;
const mockWpsUserAdapter = {} as any;

describe('CalendarSyncService 时间格式解析测试', () => {
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

  describe('parseDateTime 时间格式支持', () => {
    const semester = '2025-2026-1';
    const weekday = '2'; // 星期二

    it('应该正确解析HH:mm格式的时间', () => {
      const testCases = [
        { input: '08:00', expectedHour: 8, expectedMinute: 0 },
        { input: '09:30', expectedHour: 9, expectedMinute: 30 },
        { input: '19:40', expectedHour: 19, expectedMinute: 40 },
        { input: '21:10', expectedHour: 21, expectedMinute: 10 },
        { input: '23:59', expectedHour: 23, expectedMinute: 59 },
        { input: '00:00', expectedHour: 0, expectedMinute: 0 }
      ];

      testCases.forEach(({ input, expectedHour, expectedMinute }) => {
        // 通过convertCourseToWpsSchedule间接测试parseDateTime
        const courseData = {
          courseSequence: 'TEST',
          courseName: '测试课程',
          teacherName: '测试教师',
          startTime: input,
          endTime: input,
          weekday,
          weeks: '1',
          classroom: '测试教室',
          semester,
          batchId: 'test'
        };

        const result = calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
        const startDate = new Date(result.startTime);
        
        expect(startDate.getHours()).toBe(expectedHour);
        expect(startDate.getMinutes()).toBe(expectedMinute);
      });
    });

    it('应该正确解析HHmm格式的时间（4位数字）', () => {
      const testCases = [
        { input: '0800', expectedHour: 8, expectedMinute: 0 },
        { input: '0930', expectedHour: 9, expectedMinute: 30 },
        { input: '1940', expectedHour: 19, expectedMinute: 40 },
        { input: '2110', expectedHour: 21, expectedMinute: 10 },
        { input: '2359', expectedHour: 23, expectedMinute: 59 },
        { input: '0000', expectedHour: 0, expectedMinute: 0 }
      ];

      testCases.forEach(({ input, expectedHour, expectedMinute }) => {
        const courseData = {
          courseSequence: 'TEST',
          courseName: '测试课程',
          teacherName: '测试教师',
          startTime: input,
          endTime: input,
          weekday,
          weeks: '1',
          classroom: '测试教室',
          semester,
          batchId: 'test'
        };

        const result = calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
        const startDate = new Date(result.startTime);
        
        expect(startDate.getHours()).toBe(expectedHour);
        expect(startDate.getMinutes()).toBe(expectedMinute);
      });
    });

    it('应该正确解析Hmm格式的时间（3位数字）', () => {
      const testCases = [
        { input: '800', expectedHour: 8, expectedMinute: 0 },
        { input: '930', expectedHour: 9, expectedMinute: 30 },
        { input: '940', expectedHour: 9, expectedMinute: 40 },
        { input: '100', expectedHour: 1, expectedMinute: 0 },
        { input: '159', expectedHour: 1, expectedMinute: 59 }
      ];

      testCases.forEach(({ input, expectedHour, expectedMinute }) => {
        const courseData = {
          courseSequence: 'TEST',
          courseName: '测试课程',
          teacherName: '测试教师',
          startTime: input,
          endTime: input,
          weekday,
          weeks: '1',
          classroom: '测试教室',
          semester,
          batchId: 'test'
        };

        const result = calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
        const startDate = new Date(result.startTime);
        
        expect(startDate.getHours()).toBe(expectedHour);
        expect(startDate.getMinutes()).toBe(expectedMinute);
      });
    });

    it('应该处理边界情况', () => {
      const validCases = [
        { input: '00:00', expectedHour: 0, expectedMinute: 0 },
        { input: '23:59', expectedHour: 23, expectedMinute: 59 },
        { input: '0000', expectedHour: 0, expectedMinute: 0 },
        { input: '2359', expectedHour: 23, expectedMinute: 59 }
      ];

      validCases.forEach(({ input, expectedHour, expectedMinute }) => {
        const courseData = {
          courseSequence: 'TEST',
          courseName: '测试课程',
          teacherName: '测试教师',
          startTime: input,
          endTime: input,
          weekday,
          weeks: '1',
          classroom: '测试教室',
          semester,
          batchId: 'test'
        };

        const result = calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
        const startDate = new Date(result.startTime);
        
        expect(startDate.getHours()).toBe(expectedHour);
        expect(startDate.getMinutes()).toBe(expectedMinute);
      });
    });

    it('应该处理无效时间格式并使用降级处理', () => {
      const invalidCases = [
        'invalid',
        '25:00', // 无效小时
        '12:60', // 无效分钟
        '2500', // 无效小时（HHmm格式）
        '1260', // 无效分钟（HHmm格式）
        '12345', // 太长
        '12', // 太短
        '', // 空字符串
        'abc', // 非数字
        '12:ab' // 部分非数字
      ];

      invalidCases.forEach((input) => {
        const courseData = {
          courseSequence: 'TEST',
          courseName: '测试课程',
          teacherName: '测试教师',
          startTime: input,
          endTime: '10:00', // 使用有效的结束时间
          weekday,
          weeks: '1',
          classroom: '测试教室',
          semester,
          batchId: 'test'
        };

        // 应该不抛出异常，而是使用降级处理
        expect(() => {
          calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
        }).not.toThrow();
      });
    });

    it('应该正确处理常见的课程时间', () => {
      const commonCourseTimes = [
        // 上午课程
        { start: '0800', end: '0940', desc: '第1-2节课' },
        { start: '1000', end: '1140', desc: '第3-4节课' },
        
        // 下午课程
        { start: '1400', end: '1540', desc: '第5-6节课' },
        { start: '1600', end: '1740', desc: '第7-8节课' },
        
        // 晚上课程
        { start: '1940', end: '2110', desc: '第9-10节课' },
        { start: '2120', end: '2250', desc: '第11-12节课' }
      ];

      commonCourseTimes.forEach(({ start, end, desc }) => {
        const courseData = {
          courseSequence: 'TEST',
          courseName: desc,
          teacherName: '测试教师',
          startTime: start,
          endTime: end,
          weekday,
          weeks: '1',
          classroom: '测试教室',
          semester,
          batchId: 'test'
        };

        const result = calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
        const startDate = new Date(result.startTime);
        const endDate = new Date(result.endTime);
        
        // 验证开始时间
        const expectedStartHour = parseInt(start.substring(0, 2));
        const expectedStartMinute = parseInt(start.substring(2, 4));
        expect(startDate.getHours()).toBe(expectedStartHour);
        expect(startDate.getMinutes()).toBe(expectedStartMinute);
        
        // 验证结束时间
        const expectedEndHour = parseInt(end.substring(0, 2));
        const expectedEndMinute = parseInt(end.substring(2, 4));
        expect(endDate.getHours()).toBe(expectedEndHour);
        expect(endDate.getMinutes()).toBe(expectedEndMinute);
        
        // 验证结束时间晚于开始时间
        expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
      });
    });

    it('应该支持混合格式的时间输入', () => {
      const courseData = {
        courseSequence: 'TEST',
        courseName: '混合格式测试',
        teacherName: '测试教师',
        startTime: '1940', // HHmm格式
        endTime: '21:10', // HH:mm格式
        weekday,
        weeks: '1',
        classroom: '测试教室',
        semester,
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(courseData, 'test');
      const startDate = new Date(result.startTime);
      const endDate = new Date(result.endTime);
      
      expect(startDate.getHours()).toBe(19);
      expect(startDate.getMinutes()).toBe(40);
      expect(endDate.getHours()).toBe(21);
      expect(endDate.getMinutes()).toBe(10);
    });
  });
});
