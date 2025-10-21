/**
 * PermissionStatusRepository 测试
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PermissionStatusRepository from '../PermissionStatusRepository.js';

describe('PermissionStatusRepository', () => {
  let repository: PermissionStatusRepository;
  let mockDatabaseApi: jest.Mocked<DatabaseAPI>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockDatabaseApi = {
      executeQuery: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    repository = new PermissionStatusRepository(mockDatabaseApi, mockLogger);
  });

  describe('updateStudentCourseStatus', () => {
    it('应该成功更新学生课程关联状态', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: true,
        data: 5
      });

      const config = {
        kkh: 'TEST001',
        xnxq: '2023-2024-1',
        gxZt: '3',
        userIds: ['2021001', '2021002', '2021003']
      };

      const result = await repository.updateStudentCourseStatus(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(mockDatabaseApi.executeQuery).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '开始更新学生课程关联状态',
        expect.any(Object)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '学生课程关联状态更新成功',
        expect.any(Object)
      );
    });

    it('应该处理没有用户ID的情况', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: true,
        data: 10
      });

      const config = {
        kkh: 'TEST001',
        xnxq: '2023-2024-1',
        gxZt: '3'
      };

      const result = await repository.updateStudentCourseStatus(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it('应该处理数据库错误', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: false,
        error: { message: 'Database connection failed' }
      });

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      const result = await repository.updateStudentCourseStatus(config);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该处理异常情况', async () => {
      mockDatabaseApi.executeQuery.mockRejectedValue(
        new Error('Network error')
      );

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      const result = await repository.updateStudentCourseStatus(config);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('更新学生课程关联状态失败');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateTeacherCourseStatus', () => {
    it('应该成功更新教师课程关联状态', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: true,
        data: 3
      });

      const config = {
        kkh: 'TEST001',
        xnxq: '2023-2024-1',
        gxZt: '3',
        userIds: ['T001', 'T002']
      };

      const result = await repository.updateTeacherCourseStatus(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(mockDatabaseApi.executeQuery).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '开始更新教师课程关联状态',
        expect.any(Object)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '教师课程关联状态更新成功',
        expect.any(Object)
      );
    });

    it('应该处理数据库错误', async () => {
      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: false,
        error: { message: 'Database connection failed' }
      });

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      const result = await repository.updateTeacherCourseStatus(config);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updatePermissionStatus', () => {
    it('应该成功批量更新权限状态', async () => {
      // Mock 学生表更新
      mockDatabaseApi.executeQuery
        .mockResolvedValueOnce({
          success: true,
          data: 5
        })
        // Mock 教师表更新
        .mockResolvedValueOnce({
          success: true,
          data: 2
        });

      const config = {
        kkh: 'TEST001',
        xnxq: '2023-2024-1',
        gxZt: '3',
        userIds: ['2021001', '2021002', 'T001', 'T002']
      };

      const result = await repository.updatePermissionStatus(config);

      expect(result.success).toBe(true);
      expect(result.data.studentUpdateCount).toBe(5);
      expect(result.data.teacherUpdateCount).toBe(2);
      expect(result.data.totalUpdateCount).toBe(7);
      expect(mockDatabaseApi.executeQuery).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '开始批量更新权限状态',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '批量更新权限状态完成',
        expect.any(Object)
      );
    });

    it('应该处理部分更新失败的情况', async () => {
      // Mock 学生表更新成功
      mockDatabaseApi.executeQuery
        .mockResolvedValueOnce({
          success: true,
          data: 5
        })
        // Mock 教师表更新失败
        .mockResolvedValueOnce({
          success: false,
          error: { message: 'Teacher table update failed' }
        });

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      const result = await repository.updatePermissionStatus(config);

      expect(result.success).toBe(true);
      expect(result.data.studentUpdateCount).toBe(5);
      expect(result.data.teacherUpdateCount).toBe(0);
      expect(result.data.totalUpdateCount).toBe(5);
      expect(result.data.errors).toHaveLength(1);
      expect(result.data.errors?.[0]).toContain('教师表更新失败');
    });

    it('应该处理完全失败的情况', async () => {
      // Mock 学生表更新失败
      mockDatabaseApi.executeQuery
        .mockResolvedValueOnce({
          success: false,
          error: { message: 'Student table update failed' }
        })
        // Mock 教师表更新失败
        .mockResolvedValueOnce({
          success: false,
          error: { message: 'Teacher table update failed' }
        });

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      const result = await repository.updatePermissionStatus(config);

      expect(result.success).toBe(true);
      expect(result.data.studentUpdateCount).toBe(0);
      expect(result.data.teacherUpdateCount).toBe(0);
      expect(result.data.totalUpdateCount).toBe(0);
      expect(result.data.errors).toHaveLength(2);
    });

    it('应该处理异常情况', async () => {
      mockDatabaseApi.executeQuery.mockRejectedValue(
        new Error('Network error')
      );

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      const result = await repository.updatePermissionStatus(config);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('批量更新权限状态失败');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('SQL查询构建', () => {
    it('应该正确构建带有所有条件的SQL查询', async () => {
      let capturedQuery: any;
      mockDatabaseApi.executeQuery.mockImplementation(async (queryFn) => {
        capturedQuery = await queryFn({
          execute: vi.fn().mockResolvedValue({ numAffectedRows: 1 })
        } as any);
        return { success: true, data: 1 };
      });

      const config = {
        kkh: 'TEST001',
        xnxq: '2023-2024-1',
        gxZt: '3',
        userIds: ['2021001', '2021002']
      };

      await repository.updateStudentCourseStatus(config);

      // 验证SQL查询被正确调用
      expect(mockDatabaseApi.executeQuery).toHaveBeenCalledTimes(1);
    });

    it('应该正确构建没有可选条件的SQL查询', async () => {
      let capturedQuery: any;
      mockDatabaseApi.executeQuery.mockImplementation(async (queryFn) => {
        capturedQuery = await queryFn({
          execute: vi.fn().mockResolvedValue({ numAffectedRows: 1 })
        } as any);
        return { success: true, data: 1 };
      });

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      await repository.updateStudentCourseStatus(config);

      // 验证SQL查询被正确调用
      expect(mockDatabaseApi.executeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('时间格式测试', () => {
    it('应该使用正确的本地时间格式', async () => {
      let capturedUpdateTime: string;

      mockDatabaseApi.executeQuery.mockImplementation(async (queryFn) => {
        const mockDb = {
          execute: vi.fn().mockImplementation((query) => {
            // 捕获SQL中的时间参数
            const queryString = query.toString();
            const timeMatch = queryString.match(
              /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/
            );
            if (timeMatch) {
              capturedUpdateTime = timeMatch[0];
            }
            return Promise.resolve({ numAffectedRows: 1 });
          })
        };
        return queryFn(mockDb as any);
      });

      mockDatabaseApi.executeQuery.mockResolvedValue({
        success: true,
        data: 1
      });

      const config = {
        kkh: 'TEST001',
        gxZt: '3'
      };

      await repository.updateStudentCourseStatus(config);

      // 验证时间格式是否正确（YYYY-MM-DD HH:mm:ss）
      expect(capturedUpdateTime).toMatch(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
      );

      // 验证时间是否接近当前时间（允许1分钟误差）
      const capturedTime = new Date(capturedUpdateTime!);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - capturedTime.getTime());
      expect(timeDiff).toBeLessThan(60000); // 小于1分钟
    });
  });
});
