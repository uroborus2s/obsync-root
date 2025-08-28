// @stratix/icasync AttendanceCoursesRepository 单元测试
import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewAttendanceCourse } from '../../types/database.js';
import AttendanceCoursesRepository from '../AttendanceCoursesRepository.js';

// Mock dependencies
const mockDatabaseAPI = {
  executeQuery: vi.fn(),
  executeTransaction: vi.fn()
} as unknown as DatabaseAPI;

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('AttendanceCoursesRepository', () => {
  let repository: AttendanceCoursesRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new AttendanceCoursesRepository(mockDatabaseAPI, mockLogger);
  });

  describe('findByJuheRenwuId', () => {
    it('应该根据聚合任务ID查找签到课程', async () => {
      const mockAttendanceCourse = {
        id: 1,
        juhe_renwu_id: 123,
        course_code: 'CS101',
        course_name: '计算机科学导论',
        semester: '2024-2025-1',
        teaching_week: 1,
        week_day: 1,
        start_time: '2024-09-02T08:00:00+08:00',
        end_time: '2024-09-02T09:40:00+08:00',
        time_period: 'am',
        attendance_enabled: 1
      };

      // Mock findOneNullable method
      vi.spyOn(repository, 'findOneNullable').mockResolvedValue({
        success: true,
        data: mockAttendanceCourse
      });

      const result = await repository.findByJuheRenwuId(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAttendanceCourse);
      expect(repository.findOneNullable).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('应该在ID无效时抛出错误', async () => {
      await expect(repository.findByJuheRenwuId(0)).rejects.toThrow(
        'juheRenwuId must be a positive number'
      );
      await expect(repository.findByJuheRenwuId(-1)).rejects.toThrow(
        'juheRenwuId must be a positive number'
      );
    });
  });

  describe('findByCourseCode', () => {
    it('应该根据课程代码和学期查找签到课程', async () => {
      const mockCourses = [
        {
          id: 1,
          course_code: 'CS101',
          course_name: '计算机科学导论',
          semester: '2024-2025-1'
        },
        {
          id: 2,
          course_code: 'CS101',
          course_name: '计算机科学导论',
          semester: '2024-2025-1'
        }
      ];

      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: mockCourses
      });

      const result = await repository.findByCourseCode('CS101', '2024-2025-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCourses);
      expect(repository.findMany).toHaveBeenCalledWith(expect.any(Function), {
        orderBy: 'class_date',
        order: 'asc'
      });
    });
  });

  describe('createBatch', () => {
    it('应该批量创建签到课程', async () => {
      const newCourses: NewAttendanceCourse[] = [
        {
          juhe_renwu_id: 123,
          external_id: 123,
          course_code: 'CS101',
          course_name: '计算机科学导论',
          semester: '2024-2025-1',
          teaching_week: 1,
          week_day: 1,
          start_time: '2024-09-02T08:00:00+08:00',
          end_time: '2024-09-02T09:40:00+08:00',
          time_period: 'am',
          attendance_enabled: 1
        }
      ];

      const mockCreatedCourses = newCourses.map((course, index) => ({
        ...course,
        id: index + 1,
        created_at: new Date(),
        updated_at: new Date()
      }));

      vi.spyOn(repository, 'createMany').mockResolvedValue({
        success: true,
        data: mockCreatedCourses
      });

      const result = await repository.createBatch(newCourses);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedCourses);
      expect(repository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            course_code: 'CS101',
            course_name: '计算机科学导论'
          })
        ])
      );
    });

    it('应该在课程数组为空时抛出错误', async () => {
      await expect(repository.createBatch([])).rejects.toThrow(
        'Courses array cannot be empty'
      );
    });

    it('应该验证必需字段', async () => {
      const invalidCourse = {
        // 缺少必需字段
        course_code: 'CS101'
      } as NewAttendanceCourse;

      await expect(repository.createBatch([invalidCourse])).rejects.toThrow(
        /Course at index 0:/
      );
    });
  });

  describe('findEnabledCourses', () => {
    it('应该查找启用签到的课程', async () => {
      const mockEnabledCourses = [
        {
          id: 1,
          course_code: 'CS101',
          semester: '2024-2025-1',
          attendance_enabled: 1
        }
      ];

      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: mockEnabledCourses
      });

      const result = await repository.findEnabledCourses('2024-2025-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEnabledCourses);
      expect(repository.findMany).toHaveBeenCalledWith(expect.any(Function), {
        orderBy: 'class_date',
        order: 'asc'
      });
    });
  });

  describe('updateAttendanceStatus', () => {
    it('应该更新签到状态', async () => {
      vi.spyOn(repository, 'updateMany').mockResolvedValue({
        success: true,
        data: 2 // 更新了2条记录
      });

      const result = await repository.updateAttendanceStatus([1, 2], true);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(repository.updateMany).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          attendance_enabled: 1
        })
      );
    });

    it('应该在ID数组为空时抛出错误', async () => {
      await expect(repository.updateAttendanceStatus([], true)).rejects.toThrow(
        'IDs array cannot be empty'
      );
    });
  });

  describe('countBySemester', () => {
    it('应该统计学期内的签到课程数量', async () => {
      vi.spyOn(repository, 'count').mockResolvedValue({
        success: true,
        data: 10
      });

      const result = await repository.countBySemester('2024-2025-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
      expect(repository.count).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('deleteBySemester', () => {
    it('应该根据学期删除签到课程', async () => {
      vi.spyOn(repository, 'deleteMany').mockResolvedValue({
        success: true,
        data: 5 // 删除了5条记录
      });

      const result = await repository.deleteBySemester('2024-2025-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(repository.deleteMany).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('软删除功能', () => {
    it('应该软删除所有签到课程', async () => {
      vi.spyOn(repository, 'updateMany').mockResolvedValue({
        success: true,
        data: 10 // 软删除了10条记录
      });

      const result = await repository.softDeleteAll('test-user');

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
      expect(repository.updateMany).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: 'test-user'
        })
      );
    });

    it('应该软删除指定学期的签到课程', async () => {
      vi.spyOn(repository, 'updateMany').mockResolvedValue({
        success: true,
        data: 3 // 软删除了3条记录
      });

      const result = await repository.softDeleteBySemester(
        '2024-2025-1',
        'test-user'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(repository.updateMany).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: 'test-user'
        })
      );
    });

    it('应该软删除指定课程代码的签到课程', async () => {
      vi.spyOn(repository, 'updateMany').mockResolvedValue({
        success: true,
        data: 2
      });

      const result = await repository.softDeleteByCourseCode(
        'CS101',
        '2024-2025-1',
        'test-user'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(repository.updateMany).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: 'test-user'
        })
      );
    });

    it('应该软删除指定ID的签到课程', async () => {
      vi.spyOn(repository, 'updateNullable').mockResolvedValue({
        success: true,
        data: { id: 1, course_code: 'CS101' } as any
      });

      const result = await repository.softDeleteById(1, 'test-user');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(repository.updateNullable).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: 'test-user'
        })
      );
    });

    it('应该查询活跃的签到课程', async () => {
      const mockActiveCourses = [
        { id: 1, course_code: 'CS101', deleted_at: null },
        { id: 2, course_code: 'CS102', deleted_at: null }
      ];

      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: mockActiveCourses
      });

      const result = await repository.findActiveOnly('2024-2025-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockActiveCourses);
      expect(repository.findMany).toHaveBeenCalledWith(expect.any(Function), {
        orderBy: 'start_time',
        order: 'asc'
      });
    });

    it('应该恢复软删除的签到课程', async () => {
      vi.spyOn(repository, 'updateNullable').mockResolvedValue({
        success: true,
        data: { id: 1, course_code: 'CS101' } as any
      });

      const result = await repository.restoreById(1, 'test-user');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(repository.updateNullable).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          deleted_at: null,
          deleted_by: null,
          updated_by: 'test-user'
        })
      );
    });

    it('应该查询已删除的签到课程', async () => {
      const mockDeletedCourses = [
        { id: 1, course_code: 'CS101', deleted_at: '2024-01-01T00:00:00Z' }
      ];

      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: mockDeletedCourses
      });

      const result = await repository.findDeletedOnly('2024-2025-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDeletedCourses);
      expect(repository.findMany).toHaveBeenCalledWith(expect.any(Function), {
        orderBy: 'deleted_at',
        order: 'desc'
      });
    });

    it('应该在软删除时验证必需参数', async () => {
      await expect(repository.softDeleteBySemester('')).rejects.toThrow();
      await expect(
        repository.softDeleteByCourseCode('', '2024-2025-1')
      ).rejects.toThrow();
      await expect(repository.softDeleteById(0)).rejects.toThrow();
    });
  });

  describe('默认过滤软删除记录', () => {
    it('查询方法应该默认过滤已软删除的记录', async () => {
      // 测试 findByJuheRenwuId 是否包含软删除过滤
      vi.spyOn(repository, 'findOneNullable').mockImplementation(
        (queryBuilder) => {
          // 验证查询构建器是否包含软删除过滤
          const mockQb = {
            where: vi.fn().mockReturnThis()
          };
          queryBuilder(mockQb);
          expect(mockQb.where).toHaveBeenCalledWith('deleted_at', 'is', null);

          return Promise.resolve({
            success: true,
            data: { id: 1, juhe_renwu_id: 123 } as any
          });
        }
      );

      await repository.findByJuheRenwuId(123);
      expect(repository.findOneNullable).toHaveBeenCalled();
    });
  });

  describe('validateId', () => {
    it('应该验证有效的ID', () => {
      // 这个方法是私有的，我们通过公共方法间接测试
      expect(() => repository.findByJuheRenwuId(1)).not.toThrow();
    });
  });
});
