// @stratix/icasync CourseAggregationService 测试
// 测试课程聚合服务的核心功能

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CourseAggregationService } from '../services/CourseAggregation.service.js';
import type { ICourseRawRepository } from '../repositories/CourseRaw.repository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwu.repository.js';

describe('CourseAggregationService', () => {
  let courseAggregationService: CourseAggregationService;
  let mockCourseRawRepository: ICourseRawRepository;
  let mockJuheRenwuRepository: IJuheRenwuRepository;

  beforeEach(() => {
    // 创建模拟对象
    mockCourseRawRepository = {
      findDistinctKkh: vi.fn(),
      findByKkhAndSemester: vi.fn(),
      findByKkhAndDate: vi.fn(),
      countByKkhAndSemester: vi.fn()
    } as any;

    mockJuheRenwuRepository = {
      clearAllTasks: vi.fn(),
      createTasksBatch: vi.fn(),
      countByKkh: vi.fn(),
      softDeleteByKkhAndDate: vi.fn()
    } as any;

    // 创建服务实例
    courseAggregationService = new CourseAggregationService(
      mockCourseRawRepository,
      mockJuheRenwuRepository
    );
  });

  describe('fullAggregationWithClear', () => {
    it('应该先清空juhe_renwu表然后重新聚合数据', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        batchSize: 10
      };

      // 模拟清空表成功
      mockJuheRenwuRepository.clearAllTasks = vi.fn().mockResolvedValue({
        success: true,
        data: 150 // 删除了150条记录
      });

      // 模拟获取开课号成功
      mockCourseRawRepository.findDistinctKkh = vi.fn().mockResolvedValue({
        success: true,
        data: ['TEST001', 'TEST002']
      });

      // 模拟聚合单个课程成功
      vi.spyOn(courseAggregationService, 'aggregateSingleCourse')
        .mockResolvedValueOnce({
          _tag: 'Right',
          right: [
            {
              id: 1,
              kkh: 'TEST001',
              xnxq: '2024-2025-1',
              jc_s: '1/2',
              room_s: '教室A',
              gh_s: 'T001',
              xm_s: '张老师',
              sjd: 'am'
            }
          ]
        } as any)
        .mockResolvedValueOnce({
          _tag: 'Right',
          right: [
            {
              id: 2,
              kkh: 'TEST002',
              xnxq: '2024-2025-1',
              jc_s: '3/4',
              room_s: '教室B',
              gh_s: 'T002',
              xm_s: '李老师',
              sjd: 'am'
            }
          ]
        } as any);

      // 执行测试
      const result = await courseAggregationService.fullAggregationWithClear(config);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right.successCount).toBe(2);
        expect(result.right.failureCount).toBe(0);
        expect(result.right.processedKkhs).toContain('Cleared 150 existing tasks');
        expect(result.right.processedKkhs).toContain('TEST001');
        expect(result.right.processedKkhs).toContain('TEST002');
      }

      // 验证方法调用顺序
      expect(mockJuheRenwuRepository.clearAllTasks).toHaveBeenCalledBefore(
        mockCourseRawRepository.findDistinctKkh as any
      );
      expect(mockJuheRenwuRepository.clearAllTasks).toHaveBeenCalledTimes(1);
    });

    it('应该处理清空表失败的情况', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        batchSize: 10
      };

      // 模拟清空表失败
      mockJuheRenwuRepository.clearAllTasks = vi.fn().mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });

      // 执行测试
      const result = await courseAggregationService.fullAggregationWithClear(config);

      // 验证结果
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toContain('Failed to clear existing tasks: 数据库连接失败');
      }

      // 验证没有继续执行聚合操作
      expect(mockCourseRawRepository.findDistinctKkh).not.toHaveBeenCalled();
    });

    it('应该处理聚合过程中的错误', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        batchSize: 10
      };

      // 模拟清空表成功
      mockJuheRenwuRepository.clearAllTasks = vi.fn().mockResolvedValue({
        success: true,
        data: 50
      });

      // 模拟获取开课号失败
      mockCourseRawRepository.findDistinctKkh = vi.fn().mockResolvedValue({
        success: false,
        error: '查询开课号失败'
      });

      // 执行测试
      const result = await courseAggregationService.fullAggregationWithClear(config);

      // 验证结果
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toContain('Failed to get course codes: 查询开课号失败');
      }

      // 验证清空操作已执行
      expect(mockJuheRenwuRepository.clearAllTasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('aggregateFullSemester', () => {
    it('应该成功聚合指定学期的课程数据', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        batchSize: 2
      };

      // 模拟获取开课号成功
      mockCourseRawRepository.findDistinctKkh = vi.fn().mockResolvedValue({
        success: true,
        data: ['TEST001', 'TEST002', 'TEST003']
      });

      // 模拟聚合单个课程成功
      vi.spyOn(courseAggregationService, 'aggregateSingleCourse')
        .mockResolvedValueOnce({ _tag: 'Right', right: [] } as any)
        .mockResolvedValueOnce({ _tag: 'Right', right: [] } as any)
        .mockResolvedValueOnce({ _tag: 'Left', left: '聚合失败' } as any);

      // 执行测试
      const result = await courseAggregationService.aggregateFullSemester(config);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right.successCount).toBe(2);
        expect(result.right.failureCount).toBe(1);
        expect(result.right.processedKkhs).toHaveLength(3);
        expect(result.right.errors).toContain('TEST003: 聚合失败');
      }
    });

    it('应该处理获取开课号失败的情况', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        batchSize: 10
      };

      // 模拟获取开课号失败
      mockCourseRawRepository.findDistinctKkh = vi.fn().mockResolvedValue({
        success: false,
        error: '数据库查询失败'
      });

      // 执行测试
      const result = await courseAggregationService.aggregateFullSemester(config);

      // 验证结果
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toContain('Failed to get course codes: 数据库查询失败');
      }
    });
  });

  describe('aggregateSingleCourse', () => {
    it('应该成功聚合单个课程的数据', async () => {
      // 准备测试数据
      const kkh = 'TEST001';
      const xnxq = '2024-2025-1';

      // 模拟获取原始课程数据成功
      mockCourseRawRepository.findByKkhAndSemester = vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            kkh: 'TEST001',
            xnxq: '2024-2025-1',
            jc: 1,
            rq: '2024-09-01',
            kcmc: '测试课程',
            room: '教室A',
            ghs: 'T001',
            xms: '张老师',
            st: '08:00',
            ed: '09:40',
            zt: 'add'
          },
          {
            kkh: 'TEST001',
            xnxq: '2024-2025-1',
            jc: 2,
            rq: '2024-09-01',
            kcmc: '测试课程',
            room: '教室A',
            ghs: 'T001',
            xms: '张老师',
            st: '08:00',
            ed: '09:40',
            zt: 'add'
          }
        ]
      });

      // 模拟保存聚合结果成功
      mockJuheRenwuRepository.createTasksBatch = vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            kkh: 'TEST001',
            jc_s: '1/2',
            room_s: '教室A',
            gh_s: 'T001',
            xm_s: '张老师',
            sjd: 'am'
          }
        ]
      });

      // 执行测试
      const result = await courseAggregationService.aggregateSingleCourse(kkh, xnxq);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toHaveLength(1);
        expect(result.right[0].kkh).toBe('TEST001');
        expect(result.right[0].jc_s).toBe('1/2');
        expect(result.right[0].sjd).toBe('am');
      }

      // 验证方法调用
      expect(mockCourseRawRepository.findByKkhAndSemester).toHaveBeenCalledWith(kkh, xnxq);
      expect(mockJuheRenwuRepository.createTasksBatch).toHaveBeenCalledTimes(1);
    });

    it('应该处理没有课程数据的情况', async () => {
      // 准备测试数据
      const kkh = 'TEST001';
      const xnxq = '2024-2025-1';

      // 模拟没有找到课程数据
      mockCourseRawRepository.findByKkhAndSemester = vi.fn().mockResolvedValue({
        success: true,
        data: []
      });

      // 执行测试
      const result = await courseAggregationService.aggregateSingleCourse(kkh, xnxq);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toHaveLength(0);
      }

      // 验证没有调用保存方法
      expect(mockJuheRenwuRepository.createTasksBatch).not.toHaveBeenCalled();
    });
  });
});
