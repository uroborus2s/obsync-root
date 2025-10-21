// @wps/hltnlink 排除日期范围计算测试
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';

// 模拟 sleep 函数
vi.mock('@stratix/utils/async', () => ({
  sleep: vi.fn().mockResolvedValue(undefined)
}));

describe('CalendarSyncService 排除日期范围计算测试', () => {
  let calendarSyncService: CalendarSyncService;

  beforeEach(() => {
    // 创建模拟的logger
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // 创建服务实例
    calendarSyncService = new CalendarSyncService();
    (calendarSyncService as any).logger = mockLogger;
  });

  describe('generateExcludeDates 方法', () => {
    it('应该只在教学周范围内计算排除日期 - 示例：2,5,8,11,14,17', () => {
      const teachingWeeks = [2, 5, 8, 11, 14, 17];
      const weekday = 2; // 星期二
      const semesterStartDate = new Date('2025-09-01'); // 学期开始日期
      const startTime = '1940'; // 19:40

      // 调用私有方法
      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 验证排除日期数量
      // 在2-17周范围内，缺失的周次是：3,4,6,7,9,10,12,13,15,16 (共10周)
      expect(excludeDates).toHaveLength(10);

      // 验证排除日期格式
      excludeDates.forEach((excludeDate) => {
        expect(excludeDate).toHaveProperty('datetime');
        expect(excludeDate.datetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T19:40:00\+08:00$/
        );
      });

      // 验证具体的排除日期（第3周、第4周等）
      const expectedExcludeWeeks = [3, 4, 6, 7, 9, 10, 12, 13, 15, 16];
      expect(excludeDates).toHaveLength(expectedExcludeWeeks.length);
    });

    it('应该只在教学周范围内计算排除日期 - 示例：1,4,7,10,13,16', () => {
      const teachingWeeks = [1, 4, 7, 10, 13, 16];
      const weekday = 2; // 星期二
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '1940';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 在1-16周范围内，缺失的周次是：2,3,5,6,8,9,11,12,14,15 (共10周)
      expect(excludeDates).toHaveLength(10);

      excludeDates.forEach((excludeDate) => {
        expect(excludeDate).toHaveProperty('datetime');
        expect(excludeDate.datetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T19:40:00\+08:00$/
        );
      });
    });

    it('应该只在教学周范围内计算排除日期 - 示例：5,6,7,8', () => {
      const teachingWeeks = [5, 6, 7, 8];
      const weekday = 1; // 星期一
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '0800';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 在5-8周范围内，没有缺失的周次，所以排除日期为0
      expect(excludeDates).toHaveLength(0);
    });

    it('应该只在教学周范围内计算排除日期 - 示例：3,5,7,9,11', () => {
      const teachingWeeks = [3, 5, 7, 9, 11];
      const weekday = 3; // 星期三
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '1400';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 在3-11周范围内，缺失的周次是：4,6,8,10 (共4周)
      expect(excludeDates).toHaveLength(4);

      excludeDates.forEach((excludeDate) => {
        expect(excludeDate).toHaveProperty('datetime');
        expect(excludeDate.datetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T14:00:00\+08:00$/
        );
      });
    });

    it('应该处理不连续的教学周 - 示例：1,3,15,18', () => {
      const teachingWeeks = [1, 3, 15, 18];
      const weekday = 4; // 星期四
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '1000';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 在1-18周范围内，缺失的周次是：2,4,5,6,7,8,9,10,11,12,13,14,16,17 (共14周)
      expect(excludeDates).toHaveLength(14);

      excludeDates.forEach((excludeDate) => {
        expect(excludeDate).toHaveProperty('datetime');
        expect(excludeDate.datetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T10:00:00\+08:00$/
        );
      });
    });

    it('应该处理单个教学周', () => {
      const teachingWeeks = [10];
      const weekday = 5; // 星期五
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '1530';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 只有一个教学周，没有缺失的周次，所以排除日期为0
      expect(excludeDates).toHaveLength(0);
    });

    it('应该处理连续的教学周', () => {
      const teachingWeeks = [1, 2, 3, 4, 5];
      const weekday = 6; // 星期六
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '0900';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 连续的教学周，没有缺失的周次，所以排除日期为0
      expect(excludeDates).toHaveLength(0);
    });

    it('应该处理不提供开始时间的情况（兼容性）', () => {
      const teachingWeeks = [2, 5, 8];
      const weekday = 7; // 星期日
      const semesterStartDate = new Date('2025-09-01');

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate
        // 不提供 startTime
      );

      // 在2-8周范围内，缺失的周次是：3,4,6,7 (共4周)
      expect(excludeDates).toHaveLength(4);

      // 验证返回的是日期格式而不是日期时间格式
      excludeDates.forEach((excludeDate) => {
        expect(excludeDate).toHaveProperty('date');
        expect(excludeDate.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(excludeDate).not.toHaveProperty('datetime');
      });
    });
  });

  describe('实际课程数据转换测试', () => {
    it('应该正确处理课程数据中的教学周范围', () => {
      const courseData = {
        courseSequence: 'TEST101',
        courseName: '测试课程',
        teacherName: '测试教师',
        teacherCode: '0001',
        startTime: '1940',
        endTime: '2110',
        weekday: '2',
        weeks: '2,5,8,11,14,17', // DJZ字段
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'test'
      };

      const calendarId = 'test-calendar';
      const wpsSchedule = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        calendarId
      );

      // 验证重复规则中的排除日期
      expect(wpsSchedule.recurrence).toBeDefined();
      if (
        typeof wpsSchedule.recurrence === 'object' &&
        wpsSchedule.recurrence !== null
      ) {
        expect(wpsSchedule.recurrence.exdate).toBeDefined();
        // 在2-17周范围内，缺失的周次是：3,4,6,7,9,10,12,13,15,16 (共10周)
        expect(wpsSchedule.recurrence.exdate).toHaveLength(10);

        // 验证排除日期格式
        wpsSchedule.recurrence.exdate!.forEach((excludeDate) => {
          expect(excludeDate).toHaveProperty('datetime');
          expect(excludeDate.datetime).toMatch(
            /^\d{4}-\d{2}-\d{2}T19:40:00\+08:00$/
          );
        });
      }
    });

    it('应该正确处理连续教学周的课程数据', () => {
      const courseData = {
        courseSequence: 'TEST102',
        courseName: '连续课程',
        teacherName: '测试教师',
        teacherCode: '0002',
        startTime: '0800',
        endTime: '0940',
        weekday: '1',
        weeks: '1,2,3,4,5,6,7,8', // 连续教学周
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'test'
      };

      const calendarId = 'test-calendar';
      const wpsSchedule = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        calendarId
      );

      // 验证重复规则中的排除日期
      expect(wpsSchedule.recurrence).toBeDefined();
      if (
        typeof wpsSchedule.recurrence === 'object' &&
        wpsSchedule.recurrence !== null
      ) {
        // 连续教学周应该没有排除日期（exdate字段应该是undefined或空数组）
        expect(wpsSchedule.recurrence.exdate).toBeUndefined();
      }
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的教学周数组', () => {
      const teachingWeeks: number[] = [];
      const weekday = 1;
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '0800';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 空的教学周数组应该返回空的排除日期
      expect(excludeDates).toHaveLength(0);
    });

    it('应该处理乱序的教学周', () => {
      const teachingWeeks = [8, 2, 14, 5, 11]; // 乱序
      const weekday = 2;
      const semesterStartDate = new Date('2025-09-01');
      const startTime = '1940';

      const excludeDates = (calendarSyncService as any).generateExcludeDates(
        teachingWeeks,
        weekday,
        semesterStartDate,
        startTime
      );

      // 在2-14周范围内，缺失的周次是：3,4,6,7,9,10,12,13 (共8周)
      expect(excludeDates).toHaveLength(8);
    });
  });
});
