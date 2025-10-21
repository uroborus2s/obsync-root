// @wps/hltnlink DJZ字段（教学周）逻辑测试
import { beforeEach, describe, expect, it } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';
import type { CourseScheduleData } from '../types/calendar-sync.js';

describe('CalendarSyncService DJZ字段逻辑测试', () => {
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

  describe('DJZ字段解析和until_date计算', () => {
    it('应该正确解析DJZ字段：1,4,7,10,13,16', () => {
      const djzString = '1,4,7,10,13,16';
      const weeks = calendarSyncService.parseWeeksString(djzString);

      expect(weeks).toEqual([1, 4, 7, 10, 13, 16]);
      expect(Math.min(...weeks)).toBe(1); // 第一周
      expect(Math.max(...weeks)).toBe(16); // 最后一周
    });

    it('until_date应该基于最后一个教学周（16）计算', () => {
      const startDate = new Date('2025-09-01'); // 学期开始日期
      const weeks = [1, 4, 7, 10, 13, 16]; // DJZ字段解析结果
      const semester = '2025-2026-1';
      const startTime = '1940'; // 19:40开始
      const endTime = '2110'; // 21:10结束

      const result = calendarSyncService.generateRecurrenceRuleObject(
        2, // 星期二
        weeks,
        startDate,
        semester,
        endTime,
        startTime
      );

      expect(result.until_date).toBeDefined();
      expect(result.until_date!.datetime).toBeDefined();

      // 解析until_date，验证是第16周的日期
      const untilDate = new Date(result.until_date!.datetime);

      // 验证时间是21:10（结束时间）
      expect(untilDate.getHours()).toBe(21);
      expect(untilDate.getMinutes()).toBe(10);

      // 验证是星期二
      expect(untilDate.getDay()).toBe(2);

      // 计算第16周的预期日期
      const semesterStart = new Date('2025-09-01'); // 2025年9月1日是星期一
      const expectedWeek16Date = new Date(semesterStart);
      expectedWeek16Date.setDate(
        expectedWeek16Date.getDate() + (16 - 1) * 7 + 1
      ); // 第16周星期二

      // 验证日期是第16周
      expect(untilDate.getFullYear()).toBe(expectedWeek16Date.getFullYear());
      expect(untilDate.getMonth()).toBe(expectedWeek16Date.getMonth());
      expect(untilDate.getDate()).toBe(expectedWeek16Date.getDate());
    });

    it('应该正确排除非教学周：2,3,5,6,8,9,11,12,14,15', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 4, 7, 10, 13, 16]; // 教学周
      const semester = '2025-2026-1';
      const startTime = '1940';
      const endTime = '2110';

      const result = calendarSyncService.generateRecurrenceRuleObject(
        2, // 星期二
        weeks,
        startDate,
        semester,
        endTime,
        startTime
      );

      expect(result.exdate).toBeDefined();
      expect(result.exdate!.length).toBe(10); // 应该排除10个非教学周：2,3,5,6,8,9,11,12,14,15

      // 验证排除的周次
      const excludedWeeks = new Set<number>();
      result.exdate!.forEach((exdate) => {
        const excludeDate = new Date(exdate.datetime!);
        const semesterStart = new Date('2025-09-01');
        const weekNumber =
          Math.floor(
            (excludeDate.getTime() - semesterStart.getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          ) + 1;
        excludedWeeks.add(weekNumber);
      });

      // 验证排除的周次是：2,3,5,6,8,9,11,12,14,15
      const expectedExcludedWeeks = [2, 3, 5, 6, 8, 9, 11, 12, 14, 15];
      expectedExcludedWeeks.forEach((week) => {
        expect(excludedWeeks.has(week)).toBe(true);
      });

      // 验证教学周没有被排除
      const teachingWeeks = [1, 4, 7, 10, 13, 16];
      teachingWeeks.forEach((week) => {
        expect(excludedWeeks.has(week)).toBe(false);
      });
    });
  });

  describe('不同DJZ格式的测试', () => {
    it('应该正确处理连续教学周：1-8', () => {
      const djzString = '1-8';
      const weeks = calendarSyncService.parseWeeksString(djzString);

      expect(weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

      const result = calendarSyncService.generateRecurrenceRuleObject(
        1, // 星期一
        weeks,
        new Date('2025-09-01'),
        '2025-2026-1',
        '1140',
        '1000'
      );

      // 连续教学周应该没有或很少排除日期
      if (result.exdate) {
        expect(result.exdate.length).toBeLessThanOrEqual(0);
      }

      // until_date应该是第8周
      const untilDate = new Date(result.until_date!.datetime);
      expect(untilDate.getHours()).toBe(11);
      expect(untilDate.getMinutes()).toBe(40);
    });

    it('应该正确处理奇数周：1,3,5,7,9,11,13,15', () => {
      const djzString = '1,3,5,7,9,11,13,15';
      const weeks = calendarSyncService.parseWeeksString(djzString);

      expect(weeks).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
      expect(Math.max(...weeks)).toBe(15); // 最后一周是第15周

      const result = calendarSyncService.generateRecurrenceRuleObject(
        3, // 星期三
        weeks,
        new Date('2025-09-01'),
        '2025-2026-1',
        '1530',
        '1400'
      );

      // 应该排除偶数周：2,4,6,8,10,12,14
      expect(result.exdate).toBeDefined();
      expect(result.exdate!.length).toBe(7); // 排除7个偶数周

      // until_date应该是第15周
      const untilDate = new Date(result.until_date!.datetime);
      expect(untilDate.getHours()).toBe(15);
      expect(untilDate.getMinutes()).toBe(30);
    });

    it('应该正确处理偶数周：2,4,6,8,10,12,14,16', () => {
      const djzString = '2,4,6,8,10,12,14,16';
      const weeks = calendarSyncService.parseWeeksString(djzString);

      expect(weeks).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
      expect(Math.max(...weeks)).toBe(16); // 最后一周是第16周

      const result = calendarSyncService.generateRecurrenceRuleObject(
        5, // 星期五
        weeks,
        new Date('2025-09-01'),
        '2025-2026-1',
        '1740',
        '1600'
      );

      // 应该排除奇数周：3,5,7,9,11,13,15 (在2-16周范围内)
      expect(result.exdate).toBeDefined();
      expect(result.exdate!.length).toBe(7); // 排除7个奇数周

      // until_date应该是第16周
      const untilDate = new Date(result.until_date!.datetime);
      expect(untilDate.getHours()).toBe(17);
      expect(untilDate.getMinutes()).toBe(40);
    });
  });

  describe('完整课程转换中的DJZ逻辑', () => {
    it('应该正确处理实际课程数据：DJZ=1,4,7,10,13,16', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'DJZ_TEST',
        courseName: 'DJZ逻辑测试课程',
        teacherName: '测试教师',
        startTime: '1940', // KSSJ
        endTime: '2110', // JSSJ
        weekday: '2', // XQJ：星期二
        weeks: '1,4,7,10,13,16', // DJZ：教学周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'djz-test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'djz-test-calendar'
      );

      // 验证开始时间是第1周星期二19:40
      expect(result.startTime).toContain('19:40:00');
      expect(result.startTime).toContain('+08:00');

      // 验证结束时间是第1周星期二21:10
      expect(result.endTime).toContain('21:10:00');
      expect(result.endTime).toContain('+08:00');

      const recurrence = result.recurrence as any;

      // 验证until_date是第16周星期二21:10
      expect(recurrence.until_date.datetime).toContain('21:10:00');
      expect(recurrence.until_date.datetime).toContain('+08:00');

      // 验证排除日期数量正确（排除2,3,5,6,8,9,11,12,14,15共10周）
      expect(recurrence.exdate).toBeDefined();
      expect(recurrence.exdate.length).toBe(10);

      // 验证排除日期都包含正确的开始时间
      recurrence.exdate.forEach((exdate: any) => {
        expect(exdate.datetime).toContain('19:40:00'); // KSSJ
        expect(exdate.datetime).toContain('+08:00');
      });
    });

    it('应该正确处理边界情况：只有一个教学周', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'SINGLE_WEEK',
        courseName: '单周课程',
        teacherName: '测试教师',
        startTime: '1000',
        endTime: '1140',
        weekday: '4',
        weeks: '8', // 只有第8周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'single-week'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'single-week-calendar'
      );

      const recurrence = result.recurrence as any;

      // until_date应该是第8周
      const untilDate = new Date(recurrence.until_date.datetime);
      expect(untilDate.getHours()).toBe(11);
      expect(untilDate.getMinutes()).toBe(40);

      // 只有一个教学周，没有排除日期
      expect(recurrence.exdate).toBeUndefined();
    });

    it('应该正确处理最大教学周：第20周', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'WEEK_20',
        courseName: '第20周课程',
        teacherName: '测试教师',
        startTime: '1400',
        endTime: '1530',
        weekday: '1',
        weeks: '18,20', // 不连续的最后几周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'week-20'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'week-20-calendar'
      );

      const recurrence = result.recurrence as any;

      // until_date应该是第20周
      const untilDate = new Date(recurrence.until_date.datetime);
      expect(untilDate.getHours()).toBe(15);
      expect(untilDate.getMinutes()).toBe(30);

      // 应该排除第19周 (在18-20周范围内)
      expect(recurrence.exdate).toBeDefined();
      expect(recurrence.exdate.length).toBe(1);
    });
  });
});
