// @wps/hltnlink CalendarSyncService教学周转换功能测试
// 测试教学周数据到WPS日程的转换功能

import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';
import type { CourseScheduleData } from '../types/calendar-sync.js';

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

describe('CalendarSyncService 教学周转换功能测试', () => {
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

  describe('parseWeeksString 方法', () => {
    it('应该正确解析逗号分隔的教学周', () => {
      const result = calendarSyncService.parseWeeksString('1,4,7,10,13,16');
      expect(result).toEqual([1, 4, 7, 10, 13, 16]);
    });

    it('应该正确解析范围格式的教学周', () => {
      const result = calendarSyncService.parseWeeksString('1-16周');
      expect(result).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
      ]);
    });

    it('应该正确解析混合格式的教学周', () => {
      const result = calendarSyncService.parseWeeksString('1,3,5-8,10');
      expect(result).toEqual([1, 3, 5, 6, 7, 8, 10]);
    });

    it('应该去重并排序教学周', () => {
      const result = calendarSyncService.parseWeeksString('3,1,5,3,7,1');
      expect(result).toEqual([1, 3, 5, 7]);
    });

    it('应该处理包含"周"字符的格式', () => {
      const result = calendarSyncService.parseWeeksString('1周,4周,7周');
      expect(result).toEqual([1, 4, 7]);
    });

    it('应该处理无效格式并返回空数组', () => {
      const result = calendarSyncService.parseWeeksString('invalid');
      expect(result).toEqual([]);
    });
  });

  describe('generateRecurrenceRuleObject 方法', () => {
    it('应该生成正确的周二重复规则对象', () => {
      const startDate = new Date('2025-09-01'); // 学期开始日期
      const weeks = [1, 4, 7, 10, 13, 16];
      const semester = '2025-2026-1';

      const result = calendarSyncService.generateRecurrenceRuleObject(
        2, // 星期二
        weeks,
        startDate,
        semester,
        '2110', // 结束时间
        '1940' // 开始时间
      );

      expect(result).toBeInstanceOf(Object);
      expect(result.freq).toBe('WEEKLY');
      expect(result.by_day).toEqual(['TU']);
      expect(result.interval).toBe(1);
      expect(result.until_date).toBeDefined();
      expect(result.exdate).toBeDefined();
      expect(result.exdate!.length).toBeGreaterThan(0);
    });

    it('应该为不同星期几生成正确的by_day', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 2, 3];
      const semester = '2025-2026-1';

      // 测试周一
      const mondayResult = calendarSyncService.generateRecurrenceRuleObject(
        1,
        weeks,
        startDate,
        semester,
        '1140',
        '1000'
      );
      expect(mondayResult.by_day).toEqual(['MO']);

      // 测试周三
      const wednesdayResult = calendarSyncService.generateRecurrenceRuleObject(
        3,
        weeks,
        startDate,
        semester,
        '1140',
        '1000'
      );
      expect(wednesdayResult.by_day).toEqual(['WE']);

      // 测试周日
      const sundayResult = calendarSyncService.generateRecurrenceRuleObject(
        7,
        weeks,
        startDate,
        semester,
        '1140',
        '1000'
      );
      expect(sundayResult.by_day).toEqual(['SU']);
    });

    it('应该生成排除日期', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 3, 5]; // 只有第1、3、5周上课
      const semester = '2025-2026-1';

      const result = calendarSyncService.generateRecurrenceRuleObject(
        2,
        weeks,
        startDate,
        semester,
        '2110',
        '1940'
      );

      // 应该有排除日期
      expect(result.exdate).toBeDefined();
      expect(result.exdate!.length).toBeGreaterThan(0);

      // 检查排除日期格式
      result.exdate!.forEach((exdate) => {
        expect(exdate.datetime || exdate.date).toBeDefined();
      });
    });
  });

  describe('generateRecurrenceRule 方法', () => {
    it('应该生成正确的周二重复规则', () => {
      const startDate = new Date('2025-09-01'); // 学期开始日期
      const weeks = [1, 4, 7, 10, 13, 16];
      const semester = '2025-2026-1';

      const result = calendarSyncService.generateRecurrenceRule(
        2, // 星期二
        weeks,
        startDate,
        semester
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      // 检查基础RRULE
      const rrule = result[0];
      expect(rrule).toContain('RRULE:FREQ=WEEKLY');
      expect(rrule).toContain('BYDAY=TU');
      expect(rrule).toContain('INTERVAL=1');
    });

    it('应该为不同星期几生成正确的BYDAY', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 2, 3];
      const semester = '2025-2026-1';

      // 测试周一
      const mondayResult = calendarSyncService.generateRecurrenceRule(
        1,
        weeks,
        startDate,
        semester
      );
      expect(mondayResult[0]).toContain('BYDAY=MO');

      // 测试周三
      const wednesdayResult = calendarSyncService.generateRecurrenceRule(
        3,
        weeks,
        startDate,
        semester
      );
      expect(wednesdayResult[0]).toContain('BYDAY=WE');

      // 测试周日
      const sundayResult = calendarSyncService.generateRecurrenceRule(
        7,
        weeks,
        startDate,
        semester
      );
      expect(sundayResult[0]).toContain('BYDAY=SU');
    });

    it('应该生成EXDATE规则排除非教学周', () => {
      const startDate = new Date('2025-09-01');
      const weeks = [1, 3, 5]; // 只有第1、3、5周上课
      const semester = '2025-2026-1';

      const result = calendarSyncService.generateRecurrenceRule(
        2,
        weeks,
        startDate,
        semester
      );

      // 应该有RRULE和EXDATE规则
      expect(result.length).toBeGreaterThan(1);

      // 检查是否有EXDATE规则
      const exdateRules = result.filter((rule) => rule.startsWith('EXDATE'));
      expect(exdateRules.length).toBeGreaterThan(0);
    });

    it('应该处理错误情况并返回降级规则', () => {
      // 使用更极端的错误情况来触发catch块
      const startDate = new Date('invalid');
      const weeks = null as any; // 故意传入null来触发错误
      const semester = 'invalid-semester';

      const result = calendarSyncService.generateRecurrenceRule(
        2,
        weeks,
        startDate,
        semester
      );

      // 应该返回简单的重复规则
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toContain('RRULE:FREQ=WEEKLY');
      expect(result[0]).toContain('BYDAY=TU');
    });
  });

  describe('convertCourseToWpsSchedule 方法', () => {
    it('应该正确转换教学周课程数据为WPS日程格式', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'CS101',
        courseName: '计算机科学导论',
        teacherName: '张教授',
        startTime: '19:40',
        endTime: '21:10',
        weekday: '2', // 星期二
        weeks: '1,4,7,10,13,16',
        classroom: '教学楼A101',
        semester: '2025-2026-1',
        batchId: 'batch-001'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'calendar-123'
      );

      expect(result).toMatchObject({
        calendarId: 'calendar-123',
        summary: '计算机科学导论 - 张教授',
        description: expect.stringContaining('计算机科学导论'),
        location: '教学楼A101'
      });

      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(result.recurrence).toBeInstanceOf(Object);
      expect((result.recurrence as any).freq).toBe('WEEKLY');
      expect((result.recurrence as any).by_day).toEqual(['TU']);
    });

    it('应该支持HHmm格式的时间（如1940）', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'CS102',
        courseName: '数据结构',
        teacherName: '李教授',
        startTime: '1940', // HHmm格式
        endTime: '2110', // HHmm格式
        weekday: '3', // 星期三
        weeks: '1,2,3',
        classroom: '教学楼B201',
        semester: '2025-2026-1',
        batchId: 'batch-002'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'calendar-456'
      );

      // 检查时间格式是否正确解析
      const startDate = new Date(result.startTime);
      const endDate = new Date(result.endTime);

      expect(startDate.getHours()).toBe(19);
      expect(startDate.getMinutes()).toBe(40);
      expect(endDate.getHours()).toBe(21);
      expect(endDate.getMinutes()).toBe(10);
    });

    it('应该支持Hmm格式的时间（如940）', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'CS103',
        courseName: '算法设计',
        teacherName: '王教授',
        startTime: '940', // Hmm格式（09:40）
        endTime: '1120', // HHmm格式（11:20）
        weekday: '4', // 星期四
        weeks: '1,2,3',
        classroom: '教学楼C301',
        semester: '2025-2026-1',
        batchId: 'batch-003'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'calendar-789'
      );

      // 检查时间格式是否正确解析
      const startDate = new Date(result.startTime);
      const endDate = new Date(result.endTime);

      expect(startDate.getHours()).toBe(9);
      expect(startDate.getMinutes()).toBe(40);
      expect(endDate.getHours()).toBe(11);
      expect(endDate.getMinutes()).toBe(20);
    });

    it('应该正确处理时间格式', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'CS101',
        courseName: '测试课程',
        teacherName: '测试教师',
        startTime: '08:00',
        endTime: '09:40',
        weekday: '1',
        weeks: '1-16',
        classroom: '测试教室',
        semester: '2025-2026-1',
        batchId: 'test-batch'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test-calendar'
      );

      // 检查时间格式是否为ISO字符串
      expect(result.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // 检查开始时间和结束时间的小时分钟
      const startDate = new Date(result.startTime);
      const endDate = new Date(result.endTime);

      expect(startDate.getHours()).toBe(8);
      expect(startDate.getMinutes()).toBe(0);
      expect(endDate.getHours()).toBe(9);
      expect(endDate.getMinutes()).toBe(40);
    });
  });

  describe('学期日期计算', () => {
    it('应该正确计算秋季学期开始日期', () => {
      // 这是一个私有方法，我们通过公共方法间接测试
      const courseData: CourseScheduleData = {
        courseSequence: 'TEST',
        courseName: '测试',
        teacherName: '测试',
        startTime: '10:00',
        endTime: '11:00',
        weekday: '1',
        weeks: '1',
        classroom: '测试',
        semester: '2025-2026-1', // 秋季学期
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test'
      );
      const startDate = new Date(result.startTime);

      // 秋季学期应该在9月开始
      expect(startDate.getMonth()).toBe(8); // 9月是索引8
      expect(startDate.getFullYear()).toBe(2025);
    });

    it('应该正确计算春季学期开始日期', () => {
      const courseData: CourseScheduleData = {
        courseSequence: 'TEST',
        courseName: '测试',
        teacherName: '测试',
        startTime: '10:00',
        endTime: '11:00',
        weekday: '1',
        weeks: '1',
        classroom: '测试',
        semester: '2025-2026-2', // 春季学期
        batchId: 'test'
      };

      const result = calendarSyncService.convertCourseToWpsSchedule(
        courseData,
        'test'
      );
      const startDate = new Date(result.startTime);

      // 春季学期应该在次年2月开始
      expect(startDate.getMonth()).toBe(1); // 2月是索引1
      expect(startDate.getFullYear()).toBe(2026);
    });
  });
});
