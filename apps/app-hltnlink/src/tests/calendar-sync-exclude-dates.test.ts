// @wps/hltnlink 排除日期计算测试
import { beforeEach, describe, expect, it } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';
import type { CourseScheduleData } from '../types/calendar-sync.js';

describe('CalendarSyncService 排除日期计算测试', () => {
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

  describe('排除日期计算逻辑', () => {
    it('应该正确计算非教学周的排除日期', () => {
      const startDate = new Date('2025-09-01'); // 学期开始日期
      const weeks = [1, 4, 7, 10, 13, 16]; // 教学周：第1,4,7,10,13,16周
      const semester = '2025-2026-1';
      const startTime = '1940'; // 19:40开始
      const endTime = '2110';   // 21:10结束
      
      const result = calendarSyncService.generateRecurrenceRuleObject(
        2, // 星期二
        weeks,
        startDate,
        semester,
        endTime,
        startTime
      );

      expect(result.exdate).toBeDefined();
      expect(result.exdate!.length).toBeGreaterThan(0);
      
      // 验证排除日期包含正确的开始时间
      result.exdate!.forEach(exdate => {
        expect(exdate.datetime).toBeDefined();
        expect(exdate.datetime!).toContain('19:40:00'); // 应该包含课程开始时间
        expect(exdate.datetime!).toContain('+08:00');   // 应该包含正确时区
        
        // 验证RFC3339格式
        const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
        expect(exdate.datetime!).toMatch(rfc3339Regex);
      });
    });

    it('应该排除正确的非教学周日期', () => {
      const startDate = new Date('2025-09-01'); // 学期开始日期
      const weeks = [1, 3, 5]; // 只有第1,3,5周上课
      const semester = '2025-2026-1';
      const startTime = '0800'; // 08:00开始
      const endTime = '0940';   // 09:40结束
      
      const result = calendarSyncService.generateRecurrenceRuleObject(
        1, // 星期一
        weeks,
        startDate,
        semester,
        endTime,
        startTime
      );

      expect(result.exdate).toBeDefined();
      expect(result.exdate!.length).toBeGreaterThan(0);
      
      // 应该排除第2,4,6,7,8...周的星期一
      const excludedDates = result.exdate!.map(ed => ed.datetime!);
      
      // 验证排除日期包含正确的开始时间
      excludedDates.forEach(dateTime => {
        expect(dateTime).toContain('08:00:00'); // 应该是课程开始时间
        expect(dateTime).toContain('+08:00');
        
        // 解析日期，验证是星期一
        const date = new Date(dateTime);
        expect(date.getDay()).toBe(1); // 星期一
      });
    });

    it('应该支持不同的开始时间格式', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 2, 3];
      const semester = '2025-2026-1';
      
      // 测试HH:mm格式
      const result1 = calendarSyncService.generateRecurrenceRuleObject(
        3, weeks, startDate, semester, '15:30', '14:00'
      );
      if (result1.exdate && result1.exdate.length > 0) {
        expect(result1.exdate[0].datetime!).toContain('14:00:00');
      }
      
      // 测试HHmm格式
      const result2 = calendarSyncService.generateRecurrenceRuleObject(
        3, weeks, startDate, semester, '1530', '1400'
      );
      if (result2.exdate && result2.exdate.length > 0) {
        expect(result2.exdate[0].datetime!).toContain('14:00:00');
      }
      
      // 测试Hmm格式
      const result3 = calendarSyncService.generateRecurrenceRuleObject(
        3, weeks, startDate, semester, '1530', '800'
      );
      if (result3.exdate && result3.exdate.length > 0) {
        expect(result3.exdate[0].datetime!).toContain('08:00:00');
      }
    });

    it('应该正确处理没有排除日期的情况', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // 连续18周
      const semester = '2025-2026-1';
      const startTime = '1000';
      const endTime = '1140';
      
      const result = calendarSyncService.generateRecurrenceRuleObject(
        4, // 星期四
        weeks,
        startDate,
        semester,
        endTime,
        startTime
      );

      // 如果是连续的教学周，排除日期应该很少或没有
      if (result.exdate) {
        expect(result.exdate.length).toBeLessThanOrEqual(2); // 最多只有少量排除日期
      }
    });
  });

  describe('完整课程转换中的排除日期', () => {
    it('应该在课程转换中正确设置排除日期时间', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'EXCLUDE_TEST',
        courseName: '排除日期测试课程',
        teacherName: '测试教师',
        startTime: '1940', // 19:40开始
        endTime: '2110',   // 21:10结束
        weekday: '2',      // 星期二
        weeks: '1,4,7,10,13,16', // 教学周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'exclude-test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'exclude-test-calendar'
      );

      const recurrence = result.recurrence as any;
      expect(recurrence.exdate).toBeDefined();
      expect(recurrence.exdate.length).toBeGreaterThan(0);
      
      // 验证排除日期包含正确的课程开始时间
      recurrence.exdate.forEach((exdate: any) => {
        expect(exdate.datetime).toContain('19:40:00'); // 课程开始时间
        expect(exdate.datetime).toContain('+08:00');   // 正确时区
        
        // 验证RFC3339格式
        const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
        expect(exdate.datetime).toMatch(rfc3339Regex);
      });
    });

    it('应该正确处理早课时间的排除日期', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'EARLY_CLASS',
        courseName: '早课测试',
        teacherName: '测试教师',
        startTime: '0800', // 08:00开始
        endTime: '0940',   // 09:40结束
        weekday: '1',      // 星期一
        weeks: '2,4,6,8,10,12,14,16', // 偶数周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'early-test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'early-test-calendar'
      );

      const recurrence = result.recurrence as any;
      expect(recurrence.exdate).toBeDefined();
      
      // 验证排除日期包含正确的早课开始时间
      recurrence.exdate.forEach((exdate: any) => {
        expect(exdate.datetime).toContain('08:00:00'); // 早课开始时间
        expect(exdate.datetime).toContain('+08:00');
        
        // 解析日期，验证是星期一
        const date = new Date(exdate.datetime);
        expect(date.getDay()).toBe(1); // 星期一
      });
    });

    it('应该正确处理晚课时间的排除日期', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'NIGHT_CLASS',
        courseName: '晚课测试',
        teacherName: '测试教师',
        startTime: '1940', // 19:40开始
        endTime: '2110',   // 21:10结束
        weekday: '5',      // 星期五
        weeks: '1,3,5,7,9,11,13,15', // 奇数周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'night-test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'night-test-calendar'
      );

      const recurrence = result.recurrence as any;
      expect(recurrence.exdate).toBeDefined();
      
      // 验证排除日期包含正确的晚课开始时间
      recurrence.exdate.forEach((exdate: any) => {
        expect(exdate.datetime).toContain('19:40:00'); // 晚课开始时间
        expect(exdate.datetime).toContain('+08:00');
        
        // 解析日期，验证是星期五
        const date = new Date(exdate.datetime);
        expect(date.getDay()).toBe(5); // 星期五
      });
    });
  });

  describe('排除日期与开始时间的一致性', () => {
    it('排除日期的时间应该与课程开始时间完全一致', () => {
      const testCases = [
        { startTime: '0800', expectedTime: '08:00:00' },
        { startTime: '1000', expectedTime: '10:00:00' },
        { startTime: '1400', expectedTime: '14:00:00' },
        { startTime: '1940', expectedTime: '19:40:00' },
        { startTime: '08:00', expectedTime: '08:00:00' },
        { startTime: '19:40', expectedTime: '19:40:00' },
        { startTime: '940', expectedTime: '09:40:00' }
      ];

      testCases.forEach(testCase => {
        const courseData: CourseScheduleData = {
          courseSequence: 'TIME_CONSISTENCY',
          courseName: '时间一致性测试',
          teacherName: '测试教师',
          startTime: testCase.startTime,
          endTime: '1140',
          weekday: '3',
          weeks: '1,3,5,7,9', // 奇数周，会有排除日期
          classroom: '测试教室',
          semester: '2025-2026-1',
          batchId: 'consistency-test'
        };

        const result = calendarSyncService.convertCourseToWpsSchedule(
          courseData,
          'consistency-test-calendar'
        );

        const recurrence = result.recurrence as any;
        if (recurrence.exdate && recurrence.exdate.length > 0) {
          recurrence.exdate.forEach((exdate: any) => {
            expect(exdate.datetime).toContain(testCase.expectedTime);
          });
        }
      });
    });
  });
});
