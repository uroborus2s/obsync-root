// @stratix/icasync 课程聚合服务单元测试

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICourseRawRepository } from '../../repositories/CourseRawRepository.js';
import type { IJuheRenwuRepository } from '../../repositories/JuheRenwuRepository.js';
import type { CourseRaw } from '../../types/database.js';
import { CourseAggregationService } from '../CourseAggregationService.js';

// Mock 仓储
const mockCourseRawRepository: ICourseRawRepository = {
  findByIdNullable: vi.fn(),
  create: vi.fn(),
  updateNullable: vi.fn(),
  delete: vi.fn(),
  findByKkh: vi.fn(),
  findByXnxq: vi.fn(),
  findByKkhAndXnxq: vi.fn(),
  findByKkhAndSemester: vi.fn(),
  findByKkhAndDate: vi.fn(),
  findDistinctKkh: vi.fn(),
  findByZt: vi.fn(),
  findByGxZt: vi.fn(),
  findUnprocessedChanges: vi.fn(),
  findChangesByType: vi.fn(),
  findChangesAfterTime: vi.fn(),
  getDistinctChangedCourses: vi.fn(),
  updateGxZtBatch: vi.fn(),
  markAsProcessed: vi.fn(),
  findCoursesByTeacher: vi.fn(),
  findCoursesByRoom: vi.fn(),
  findCoursesByTimeSlot: vi.fn(),
  findCoursesForAggregation: vi.fn(),
  countByXnxq: vi.fn(),
  countByKkh: vi.fn(),
  countByKkhAndSemester: vi.fn(),
  countUnprocessedChanges: vi.fn(),
  countByChangeType: vi.fn(),
  validateCourseData: vi.fn(),
  findDuplicateCourses: vi.fn(),
  findConflictingCourses: vi.fn()
};

const mockJuheRenwuRepository: IJuheRenwuRepository = {
  findByIdNullable: vi.fn(),
  create: vi.fn(),
  updateNullable: vi.fn(),
  delete: vi.fn(),
  findByKkh: vi.fn(),
  findByKkhAndDate: vi.fn(),
  findByGxZt: vi.fn(),
  findByDateRange: vi.fn(),
  findByTeacher: vi.fn(),
  findPendingTasks: vi.fn(),
  findProcessedTasks: vi.fn(),
  findSoftDeletedTasks: vi.fn(),
  updateSyncStatus: vi.fn(),
  updateSyncStatusBatch: vi.fn(),
  createTasksBatch: vi.fn(),
  softDeleteByKkh: vi.fn(),
  softDeleteByKkhAndDate: vi.fn(),
  markAsProcessed: vi.fn(),
  findTasksForSync: vi.fn(),
  findTasksForCalendar: vi.fn(),
  findConflictingTasks: vi.fn(),
  findTasksByTimeSlot: vi.fn(),
  countByKkh: vi.fn(),
  countByGxZt: vi.fn(),
  countByDateRange: vi.fn(),
  countPendingTasks: vi.fn(),
  aggregateFromRawCourses: vi.fn(),
  deleteByKkh: vi.fn(),
  deleteSoftDeletedTasks: vi.fn(),
  deleteOldTasks: vi.fn()
};

describe('CourseAggregationService', () => {
  let service: CourseAggregationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CourseAggregationService(
      mockCourseRawRepository,
      mockJuheRenwuRepository
    );
  });

  describe('aggregateFullSemester', () => {
    it('应该成功聚合整个学期的课程数据', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-2',
        batchSize: 2
      };

      const mockKkhs = ['202420252003013016705', '202420252003013037101'];
      const mockCourses: CourseRaw[] = [
        {
          id: 1,
          kkh: '202420252003013016705',
          xnxq: '2024-2025-2',
          jxz: 1,
          zc: 1,
          jc: 1,
          lq: '第一教学楼',
          room: '1422',
          xq: '1',
          ghs: '101049',
          lc: '4',
          rq: '2025/03/03 00:00:00.000',
          st: '08:00:00.000',
          ed: '08:45:00.000',
          sj: '2025-07-30 21:57:06',
          zt: 'add',
          gx_sj: null,
          gx_zt: null,
          kcmc: '国际税收',
          xms: '王君',
          sfdk: '1',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      // 设置 mock 返回值
      vi.mocked(mockCourseRawRepository.findDistinctKkh).mockResolvedValue({
        success: true,
        data: mockKkhs
      });

      vi.mocked(mockCourseRawRepository.findByKkhAndSemester).mockResolvedValue(
        {
          success: true,
          data: mockCourses
        }
      );

      vi.mocked(mockJuheRenwuRepository.createTasksBatch).mockResolvedValue({
        success: true,
        data: []
      });

      // 执行测试
      const result = await service.aggregateFullSemester(config);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right.processedKkhs).toEqual(mockKkhs);
        expect(result.right.successCount).toBe(2);
        expect(result.right.failureCount).toBe(0);
      }

      // 验证方法调用
      expect(mockCourseRawRepository.findDistinctKkh).toHaveBeenCalledWith(
        '2024-2025-2'
      );
      expect(
        mockCourseRawRepository.findByKkhAndSemester
      ).toHaveBeenCalledTimes(2);
    });

    it('应该处理获取开课号失败的情况', async () => {
      const config = {
        xnxq: '2024-2025-2'
      };

      // 设置 mock 返回失败
      vi.mocked(mockCourseRawRepository.findDistinctKkh).mockResolvedValue({
        success: false,
        error: 'Database error',
        data: []
      });

      // 执行测试
      const result = await service.aggregateFullSemester(config);

      // 验证结果
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toContain('Failed to get course codes');
      }
    });
  });

  describe('aggregateIncremental', () => {
    it('应该成功执行增量聚合', async () => {
      const kkh = '202420252003013016705';
      const rq = '2025/03/03';

      const mockCourses: CourseRaw[] = [
        {
          id: 1,
          kkh,
          xnxq: '2024-2025-2',
          jxz: 1,
          zc: 1,
          jc: 1,
          lq: '第一教学楼',
          room: '1422',
          xq: '1',
          ghs: '101049',
          lc: '4',
          rq: '2025/03/03 00:00:00.000',
          st: '08:00:00.000',
          ed: '08:45:00.000',
          sj: '2025-07-30 21:57:06',
          zt: 'add',
          gx_sj: null,
          gx_zt: null,
          kcmc: '国际税收',
          xms: '王君',
          sfdk: '1',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      // 设置 mock 返回值
      vi.mocked(
        mockJuheRenwuRepository.softDeleteByKkhAndDate
      ).mockResolvedValue({
        success: true,
        data: 1
      });

      vi.mocked(mockCourseRawRepository.findByKkhAndDate).mockResolvedValue({
        success: true,
        data: mockCourses
      });

      vi.mocked(mockJuheRenwuRepository.createTasksBatch).mockResolvedValue({
        success: true,
        data: []
      });

      // 执行测试
      const result = await service.aggregateIncremental(kkh, rq);

      // 验证结果
      expect(result._tag).toBe('Right');

      // 验证方法调用
      expect(
        mockJuheRenwuRepository.softDeleteByKkhAndDate
      ).toHaveBeenCalledWith(kkh, rq);
      expect(mockCourseRawRepository.findByKkhAndDate).toHaveBeenCalledWith(
        kkh,
        rq
      );
    });

    it('应该处理没有课程数据的情况', async () => {
      const kkh = '202420252003013016705';
      const rq = '2025/03/03';

      // 设置 mock 返回值
      vi.mocked(
        mockJuheRenwuRepository.softDeleteByKkhAndDate
      ).mockResolvedValue({
        success: true,
        data: 0
      });

      vi.mocked(mockCourseRawRepository.findByKkhAndDate).mockResolvedValue({
        success: true,
        data: []
      });

      // 执行测试
      const result = await service.aggregateIncremental(kkh, rq);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toEqual([]);
      }
    });
  });

  describe('aggregateSingleCourse', () => {
    it('应该成功聚合单个课程', async () => {
      const kkh = '202420252003013016705';
      const xnxq = '2024-2025-2';

      const mockCourses: CourseRaw[] = [
        {
          id: 1,
          kkh,
          xnxq,
          jxz: 1,
          zc: 1,
          jc: 1,
          lq: '第一教学楼',
          room: '1422',
          xq: '1',
          ghs: '101049',
          lc: '4',
          rq: '2025/03/03 00:00:00.000',
          st: '08:00:00.000',
          ed: '08:45:00.000',
          sj: '2025-07-30 21:57:06',
          zt: 'add',
          gx_sj: null,
          gx_zt: null,
          kcmc: '国际税收',
          xms: '王君',
          sfdk: '1',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      // 设置 mock 返回值
      vi.mocked(mockCourseRawRepository.findByKkhAndSemester).mockResolvedValue(
        {
          success: true,
          data: mockCourses
        }
      );

      vi.mocked(mockJuheRenwuRepository.createTasksBatch).mockResolvedValue({
        success: true,
        data: []
      });

      // 执行测试
      const result = await service.aggregateSingleCourse(kkh, xnxq);

      // 验证结果
      expect(result._tag).toBe('Right');

      // 验证方法调用
      expect(mockCourseRawRepository.findByKkhAndSemester).toHaveBeenCalledWith(
        kkh,
        xnxq
      );
    });
  });

  describe('validateAggregation', () => {
    it('应该验证聚合数据的完整性', async () => {
      const kkh = '202420252003013016705';
      const xnxq = '2024-2025-2';

      // 设置 mock 返回值
      vi.mocked(
        mockCourseRawRepository.countByKkhAndSemester
      ).mockResolvedValue({
        success: true,
        data: 10
      });

      vi.mocked(mockJuheRenwuRepository.countByKkh).mockResolvedValue({
        success: true,
        data: 5
      });

      // 执行测试
      const result = await service.validateAggregation(kkh, xnxq);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toBe(true);
      }

      // 验证方法调用
      expect(
        mockCourseRawRepository.countByKkhAndSemester
      ).toHaveBeenCalledWith(kkh, xnxq);
      expect(mockJuheRenwuRepository.countByKkh).toHaveBeenCalledWith(kkh);
    });

    it('应该检测无效的聚合数据', async () => {
      const kkh = '202420252003013016705';
      const xnxq = '2024-2025-2';

      // 设置 mock 返回值 - 聚合数据为0
      vi.mocked(
        mockCourseRawRepository.countByKkhAndSemester
      ).mockResolvedValue({
        success: true,
        data: 10
      });

      vi.mocked(mockJuheRenwuRepository.countByKkh).mockResolvedValue({
        success: true,
        data: 0
      });

      // 执行测试
      const result = await service.validateAggregation(kkh, xnxq);

      // 验证结果
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toBe(false);
      }
    });
  });
});
