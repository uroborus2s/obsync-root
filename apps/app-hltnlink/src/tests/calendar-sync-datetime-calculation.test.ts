// @wps/hltnlink 日期时间计算测试
import { beforeEach, describe, expect, it } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';
import type { CourseScheduleData } from '../types/calendar-sync.js';

describe('CalendarSyncService 日期时间计算测试', () => {
  let calendarSyncService: CalendarSyncService;

  beforeEach(() => {
    // 创建模拟的logger
    const mockLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

    // 使用模拟的依赖创建服务实例
    calendarSyncService = new CalendarSyncService();
    (calendarSyncService as any).logger = mockLogger;
  });

  describe('until_date 计算', () => {
    it('应该正确计算最后一个教学周的结束时间', () => {
      const startDate = new Date('2025-09-01'); // 学期开始日期
      const weeks = [1, 4, 7, 10, 13, 16]; // 教学周
      const semester = '2025-2026-1';
      const endTime = '2110'; // 21:10结束

      const result = calendarSyncService.generateRecurrenceRuleObject(
        2, // 星期二
        weeks,
        startDate,
        semester,
        endTime,
        '1940' // 开始时间
      );

      expect(result.until_date).toBeDefined();
      expect(result.until_date!.datetime).toBeDefined();

      // 验证时间格式符合RFC3339
      const untilDateTime = result.until_date!.datetime;
      expect(untilDateTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
      );

      // 验证时间是21:10
      expect(untilDateTime).toContain('21:10:00');

      // 验证时区是+08:00
      expect(untilDateTime).toContain('+08:00');
    });

    it('应该使用最后一个教学周的日期', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 3, 5, 7, 9]; // 最后一周是第9周
      const semester = '2025-2026-1';
      const endTime = '1540'; // 15:40结束

      const result = calendarSyncService.generateRecurrenceRuleObject(
        5, // 星期五
        weeks,
        startDate,
        semester,
        endTime,
        '1400' // 开始时间
      );

      const untilDateTime = result.until_date!.datetime;

      // 验证时间是15:40
      expect(untilDateTime).toContain('15:40:00');

      // 计算第9周星期五的日期应该是2025-10-31
      // (学期开始2025-09-01是星期一，第9周是2025-10-27-2025-11-02，星期五是2025-10-31)
      expect(untilDateTime).toContain('2025-10-31');
    });

    it('应该支持不同的时间格式', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 2, 3];
      const semester = '2025-2026-1';

      // 测试HH:mm格式
      const result1 = calendarSyncService.generateRecurrenceRuleObject(
        1,
        weeks,
        startDate,
        semester,
        '14:30',
        '08:00'
      );
      expect(result1.until_date!.datetime).toContain('14:30:00');

      // 测试HHmm格式
      const result2 = calendarSyncService.generateRecurrenceRuleObject(
        1,
        weeks,
        startDate,
        semester,
        '1430',
        '0800'
      );
      expect(result2.until_date!.datetime).toContain('14:30:00');

      // 测试Hmm格式
      const result3 = calendarSyncService.generateRecurrenceRuleObject(
        1,
        weeks,
        startDate,
        semester,
        '930',
        '800'
      );
      expect(result3.until_date!.datetime).toContain('09:30:00');
    });
  });

  describe('开始时间和结束时间计算', () => {
    it('应该使用第一个教学周的日期和时间', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'TEST',
        courseName: '测试课程',
        teacherName: '测试教师',
        startTime: '1940', // 19:40开始
        endTime: '2110', // 21:10结束
        weekday: '2', // 星期二
        weeks: '4,7,10,13,16', // 第一个教学周是第4周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar'
      );

      // 验证开始时间格式
      expect(result.startTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
      );
      expect(result.endTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
      );

      // 验证时间
      expect(result.startTime).toContain('19:40:00');
      expect(result.endTime).toContain('21:10:00');

      // 验证时区
      expect(result.startTime).toContain('+08:00');
      expect(result.endTime).toContain('+08:00');

      // 验证是同一天
      const startDate = result.startTime.split('T')[0];
      const endDate = result.endTime.split('T')[0];
      expect(startDate).toBe(endDate);

      // 计算第4周星期二的日期应该是2025-09-23
      // (学期开始2025-09-01是星期一，第4周是2025-09-22-2025-09-28，星期二是2025-09-23)
      expect(result.startTime).toContain('2025-09-23');
      expect(result.endTime).toContain('2025-09-23');
    });

    it('应该正确处理不同的教学周起始', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'TEST',
        courseName: '测试课程',
        teacherName: '测试教师',
        startTime: '0800',
        endTime: '0940',
        weekday: '1', // 星期一
        weeks: '1,2,3', // 第一个教学周是第1周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar'
      );

      // 第1周星期一应该是学期开始日期2025-09-01
      expect(result.startTime).toContain('2025-09-01');
      expect(result.startTime).toContain('08:00:00');
      expect(result.endTime).toContain('09:40:00');
    });

    it('应该正确处理春季学期', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'TEST',
        courseName: '春季课程',
        teacherName: '测试教师',
        startTime: '1400',
        endTime: '1530',
        weekday: '3', // 星期三
        weeks: '1,2,3',
        classroom: '测试教室',
        semester: '2024-2025-2', // 春季学期
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar'
      );

      // 春季学期通常从2月开始
      expect(result.startTime).toContain('2025-02');
      expect(result.startTime).toContain('14:00:00');
      expect(result.endTime).toContain('15:30:00');
    });
  });

  describe('RFC3339格式验证', () => {
    it('所有日期时间字段都应该符合RFC3339格式', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'TEST',
        courseName: '格式测试课程',
        teacherName: '测试教师',
        startTime: '1000',
        endTime: '1140',
        weekday: '4', // 星期四
        weeks: '1,4,7,10',
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar'
      );

      // RFC3339格式正则表达式
      const rfc3339Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

      // 验证开始时间
      expect(result.startTime).toMatch(rfc3339Regex);

      // 验证结束时间
      expect(result.endTime).toMatch(rfc3339Regex);

      // 验证重复规则中的until_date
      const recurrence = result.recurrence as any;
      expect(recurrence.until_date.datetime).toMatch(rfc3339Regex);

      // 验证排除日期
      if (recurrence.exdate && recurrence.exdate.length > 0) {
        recurrence.exdate.forEach((exdate: any) => {
          if (exdate.datetime) {
            expect(exdate.datetime).toMatch(rfc3339Regex);
          }
        });
      }
    });

    it('应该使用正确的时区+08:00', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'TEST',
        courseName: '时区测试课程',
        teacherName: '测试教师',
        startTime: '1500',
        endTime: '1630',
        weekday: '5',
        weeks: '1,2,3,4,5',
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar'
      );

      // 验证所有时间都使用+08:00时区
      expect(result.startTime).toContain('+08:00');
      expect(result.endTime).toContain('+08:00');

      const recurrence = result.recurrence as any;
      expect(recurrence.until_date.datetime).toContain('+08:00');

      if (recurrence.exdate && recurrence.exdate.length > 0) {
        recurrence.exdate.forEach((exdate: any) => {
          if (exdate.datetime) {
            expect(exdate.datetime).toContain('+08:00');
          }
        });
      }
    });
  });
});
