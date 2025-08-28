// 描述格式优化测试
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FetchSchedulesExecutor from '../FetchSchedulesExecutor.js';

// Mock 依赖
const mockJuheRenwuRepository = {
  findByKkh: vi.fn()
};

const mockAttendanceCoursesRepository = {
  createBatch: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('FetchSchedulesExecutor - 描述格式优化', () => {
  let executor: FetchSchedulesExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new FetchSchedulesExecutor(
      mockJuheRenwuRepository as any,
      mockAttendanceCoursesRepository as any,
      mockLogger as any
    );
  });

  describe('描述格式测试', () => {
    it('应该生成优化的课程描述格式', () => {
      // 模拟课程数据
      const mockCourseItem = {
        id: 1,
        kkh: 'CS101-001',
        kcmc: '计算机科学导论',
        jxz: 14, // 教学周
        rq: '2025-06-05', // 日期
        jc_s: '7/8', // 节次
        sj_f: '13:30:00', // 开始时间
        sj_t: '15:10:00', // 结束时间
        xm_s: '孙永锐', // 教师姓名
        lq: '实验楼', // 楼群
        room_s: '3405/3405', // 教室
        sfdk: '1' // 需要签到
      };

      // 使用反射访问私有方法进行测试
      const description = (executor as any).buildDescriptionFromAggregated(mockCourseItem);

      // 验证描述格式
      expect(description).toContain('📚 教学周: 14');
      expect(description).toContain('🕐 时间: 2025年06月05日 第7-8节 (13:30-15:10)');
      expect(description).toContain('📍 地点: 实验楼3405/3405');
      expect(description).toContain('👨‍🏫 授课教师: 孙永锐');
      expect(description).toContain('📋 开课号: CS101-001');
      expect(description).toContain('📋 本节课需要签到');

      console.log('优化后的描述格式:');
      console.log(description);
    });

    it('应该处理不需要签到的课程', () => {
      const mockCourseItem = {
        id: 2,
        kkh: 'MATH101-001',
        kcmc: '高等数学',
        jxz: 15,
        rq: '2025-06-06',
        jc_s: '1-2',
        sj_f: '08:00:00',
        sj_t: '09:40:00',
        xm_s: '李教授',
        lq: '教学楼A',
        room_s: '201',
        sfdk: '0' // 不需要签到
      };

      const description = (executor as any).buildDescriptionFromAggregated(mockCourseItem);

      expect(description).toContain('📚 教学周: 15');
      expect(description).toContain('🕐 时间: 2025年06月06日 第1-2节 (08:00-09:40)');
      expect(description).toContain('📍 地点: 教学楼A201');
      expect(description).toContain('👨‍🏫 授课教师: 李教授');
      expect(description).not.toContain('签到');

      console.log('不需要签到的课程描述:');
      console.log(description);
    });

    it('应该处理缺失字段的情况', () => {
      const mockCourseItem = {
        id: 3,
        kkh: 'PHY101-001',
        kcmc: '大学物理',
        rq: '2025/06/07', // 不同的日期格式
        jc_s: '3,4', // 不同的节次格式
        sj_f: '10:00:00',
        sj_t: '11:40:00'
        // 缺少教师、地点等信息
      };

      const description = (executor as any).buildDescriptionFromAggregated(mockCourseItem);

      expect(description).toContain('🕐 时间: 2025年06月07日 第3-4节 (10:00-11:40)');
      expect(description).toContain('📍 地点: 未知地点');
      expect(description).toContain('📋 开课号: PHY101-001');
      expect(description).not.toContain('教学周'); // 因为jxz缺失
      expect(description).not.toContain('授课教师'); // 因为xm_s缺失

      console.log('缺失字段的课程描述:');
      console.log(description);
    });

    it('应该正确格式化不同的节次格式', () => {
      const testCases = [
        { input: '7/8', expected: '第7-8节' },
        { input: '1-2', expected: '第1-2节' },
        { input: '3,4', expected: '第3-4节' },
        { input: '5', expected: '第5节' },
        { input: '', expected: '第未知节次节' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (executor as any).formatPeriods(input);
        expect(result).toBe(expected);
      });
    });

    it('应该正确格式化中文日期', () => {
      const testCases = [
        { input: '2025-06-05', expected: '2025年06月05日' },
        { input: '2025/06/05', expected: '2025年06月05日' },
        { input: '2025-01-01', expected: '2025年01月01日' },
        { input: '', expected: '未知日期' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (executor as any).formatChineseDate(input);
        expect(result).toBe(expected);
      });
    });

    it('应该正确格式化时间段', () => {
      const testCases = [
        { start: '08:00:00', end: '09:40:00', expected: ' (08:00-09:40)' },
        { start: '13:30:00', end: '15:10:00', expected: ' (13:30-15:10)' },
        { start: '', end: '09:40:00', expected: '' },
        { start: '08:00:00', end: '', expected: '' }
      ];

      testCases.forEach(({ start, end, expected }) => {
        const result = (executor as any).formatTimeRange(start, end);
        expect(result).toBe(expected);
      });
    });
  });
});
