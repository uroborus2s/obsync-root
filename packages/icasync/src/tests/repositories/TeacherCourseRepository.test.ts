/**
 * TeacherCourseRepository 单元测试
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherCourseRepository from '../../repositories/TeacherCourseRepository.js';
import type { TeacherCourse } from '../../types/database.js';

// Mock 数据
const mockTeacherCourses: TeacherCourse[] = [
  {
    kkh: 'TEST001',
    gh: 'T001',
    xnxq: '2024-2025-1',
    kcbh: 'CS101',
    sj: '2024-01-01',
    zt: '1',
    gx_zt: null,
    gx_sj: null
  },
  {
    kkh: 'TEST002',
    gh: 'T001',
    xnxq: '2024-2025-1',
    kcbh: 'CS102',
    sj: '2024-01-01',
    zt: '1',
    gx_zt: null,
    gx_sj: null
  }
];

describe('TeacherCourseRepository', () => {
  let repository: TeacherCourseRepository;
  let mockDatabaseApi: DatabaseAPI;
  let mockLogger: Logger;

  beforeEach(() => {
    // Mock DatabaseAPI
    mockDatabaseApi = {
      executeQuery: vi.fn()
    } as any;

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    repository = new TeacherCourseRepository(mockDatabaseApi, mockLogger);
  });

  describe('findByGh', () => {
    it('应该根据工号查找教师课程关联', async () => {
      // Arrange
      const gh = 'T001';
      const expectedResult = {
        success: true,
        data: mockTeacherCourses
      };

      // Mock findMany 方法
      vi.spyOn(repository as any, 'findMany').mockResolvedValue(expectedResult);

      // Act
      const result = await repository.findByGh(gh);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(repository['findMany']).toHaveBeenCalledWith(expect.any(Function));
    });

    it('应该在工号为空时抛出错误', async () => {
      // Act & Assert
      await expect(repository.findByGh('')).rejects.toThrow(
        'Teacher number cannot be empty'
      );
    });
  });

  describe('findByKkh', () => {
    it('应该根据开课号查找教师课程关联', async () => {
      // Arrange
      const kkh = 'TEST001';
      const expectedResult = {
        success: true,
        data: [mockTeacherCourses[0]]
      };

      // Mock findMany 方法
      vi.spyOn(repository as any, 'findMany').mockResolvedValue(expectedResult);

      // Act
      const result = await repository.findByKkh(kkh);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(repository['findMany']).toHaveBeenCalledWith(expect.any(Function));
    });

    it('应该在开课号为空时抛出错误', async () => {
      // Act & Assert
      await expect(repository.findByKkh('')).rejects.toThrow(
        'Course number cannot be empty'
      );
    });
  });

  describe('findByGhAndXnxq', () => {
    it('应该根据工号和学年学期查找教师课程关联', async () => {
      // Arrange
      const gh = 'T001';
      const xnxq = '2024-2025-1';
      const expectedResult = {
        success: true,
        data: mockTeacherCourses
      };

      // Mock findMany 方法
      vi.spyOn(repository as any, 'findMany').mockResolvedValue(expectedResult);

      // Act
      const result = await repository.findByGhAndXnxq(gh, xnxq);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(repository['findMany']).toHaveBeenCalledWith(expect.any(Function));
    });

    it('应该在参数为空时抛出错误', async () => {
      // Act & Assert
      await expect(
        repository.findByGhAndXnxq('', '2024-2025-1')
      ).rejects.toThrow('Teacher number cannot be empty');

      await expect(repository.findByGhAndXnxq('T001', '')).rejects.toThrow(
        'Academic year and semester cannot be empty'
      );
    });
  });

  describe('checkTeacherCoursePermission', () => {
    it('应该检查教师是否有指定课程的权限', async () => {
      // Arrange
      const gh = 'T001';
      const kkh = 'TEST001';
      const expectedResult = {
        success: true,
        data: mockTeacherCourses[0]
      };

      // Mock findOneNullable 方法
      vi.spyOn(repository as any, 'findOneNullable').mockResolvedValue(
        expectedResult
      );

      // Act
      const result = await repository.checkTeacherCoursePermission(gh, kkh);

      // Assert
      expect(result).toEqual({
        success: true,
        data: true
      });
    });

    it('应该在未找到权限时返回false', async () => {
      // Arrange
      const gh = 'T001';
      const kkh = 'TEST999';
      const expectedResult = {
        success: true,
        data: null
      };

      // Mock findOneNullable 方法
      vi.spyOn(repository as any, 'findOneNullable').mockResolvedValue(
        expectedResult
      );

      // Act
      const result = await repository.checkTeacherCoursePermission(gh, kkh);

      // Assert
      expect(result).toEqual({
        success: true,
        data: false
      });
    });
  });

  describe('getTeacherCourseNumbers', () => {
    it('应该获取教师的所有课程号列表', async () => {
      // Arrange
      const gh = 'T001';
      const expectedCourseNumbers = ['TEST001', 'TEST002'];
      const mockQueryResult = {
        success: true,
        data: expectedCourseNumbers
      };

      mockDatabaseApi.executeQuery = vi.fn().mockResolvedValue(mockQueryResult);

      // Act
      const result = await repository.getTeacherCourseNumbers(gh);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expectedCourseNumbers
      });
      expect(mockDatabaseApi.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        { readonly: true, connectionName: 'syncdb' }
      );
    });

    it('应该在工号为空时抛出错误', async () => {
      // Act & Assert
      await expect(repository.getTeacherCourseNumbers('')).rejects.toThrow(
        'Teacher number cannot be empty'
      );
    });

    it('应该处理数据库查询错误', async () => {
      // Arrange
      const gh = 'T001';
      const mockError = new Error('Database error');
      mockDatabaseApi.executeQuery = vi.fn().mockResolvedValue({
        success: false,
        error: mockError.message
      });

      // Act
      const result = await repository.getTeacherCourseNumbers(gh);

      // Assert
      expect(result).toEqual({
        success: false,
        error: mockError.message
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get teacher course numbers',
        expect.objectContaining({
          gh,
          error: mockError.message
        })
      );
    });

    it('应该支持按学年学期过滤', async () => {
      // Arrange
      const gh = 'T001';
      const xnxq = '2024-2025-1';
      const expectedCourseNumbers = ['TEST001'];
      const mockQueryResult = {
        success: true,
        data: expectedCourseNumbers
      };

      mockDatabaseApi.executeQuery = vi.fn().mockResolvedValue(mockQueryResult);

      // Act
      const result = await repository.getTeacherCourseNumbers(gh, xnxq);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expectedCourseNumbers
      });
      expect(mockDatabaseApi.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        { readonly: true, connectionName: 'syncdb' }
      );
    });
  });
});
