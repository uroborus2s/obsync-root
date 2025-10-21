/**
 * FetchCourseDataExecutor 单元测试
 */

import type { Logger } from '@stratix/core';
import type { ExecutionContext } from '@stratix/tasks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FetchCourseDataExecutor, {
  type FetchCourseDataConfig
} from '../../executors/FetchCourseDataExecutor.js';
import type { IStudentCourseRepository } from '../../repositories/StudentCourseRepository.js';
import type { ITeacherCourseRepository } from '../../repositories/TeacherCourseRepository.js';
import type { StudentCourse, TeacherCourse } from '../../types/database.js';

// Mock 数据
const mockStudentCourses: StudentCourse[] = [
  {
    kkh: 'TEST001',
    xh: 'S001',
    xnxq: '2024-2025-1',
    kcbh: 'CS101',
    pyfadm: null,
    xsyd: null,
    xgxklbdm: null,
    sj: '2024-01-01',
    zt: '1'
  },
  {
    kkh: 'TEST002',
    xh: 'S001',
    xnxq: '2024-2025-1',
    kcbh: 'CS102',
    pyfadm: null,
    xsyd: null,
    xgxklbdm: null,
    sj: '2024-01-01',
    zt: '1'
  }
];

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
  }
];

describe('FetchCourseDataExecutor', () => {
  let executor: FetchCourseDataExecutor;
  let mockStudentCourseRepository: IStudentCourseRepository;
  let mockTeacherCourseRepository: ITeacherCourseRepository;
  let mockLogger: Logger;

  beforeEach(() => {
    // Mock repositories
    mockStudentCourseRepository = {
      findByXh: vi.fn(),
      findByXhAndXnxq: vi.fn()
    } as any;

    mockTeacherCourseRepository = {
      findByGh: vi.fn(),
      findByGhAndXnxq: vi.fn()
    } as any;

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    executor = new FetchCourseDataExecutor(
      mockStudentCourseRepository,
      mockTeacherCourseRepository,
      mockLogger
    );
  });

  describe('execute', () => {
    it('应该成功获取学生课程数据', async () => {
      // Arrange
      const config: FetchCourseDataConfig = {
        userType: 'student',
        xgh: 'S001',
        xnxq: '2024-2025-1'
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockStudentCourseRepository.findByXhAndXnxq = vi.fn().mockResolvedValue({
        success: true,
        data: mockStudentCourses
      });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        userType: 'student',
        xgh: 'S001',
        courses: [
          { kkh: 'TEST001', xnxq: '2024-2025-1', xgh: 'S001' },
          { kkh: 'TEST002', xnxq: '2024-2025-1', xgh: 'S001' }
        ],
        totalCount: 2,
        dryRun: undefined
      });

      expect(mockStudentCourseRepository.findByXhAndXnxq).toHaveBeenCalledWith(
        'S001',
        '2024-2025-1'
      );
    });

    it('应该成功获取教师课程数据', async () => {
      // Arrange
      const config: FetchCourseDataConfig = {
        userType: 'teacher',
        xgh: 'T001'
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockTeacherCourseRepository.findByGh = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeacherCourses
      });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        userType: 'teacher',
        xgh: 'T001',
        courses: [
          { kkh: 'TEST001', kcbh: 'CS101', xnxq: '2024-2025-1', xgh: 'T001' }
        ],
        totalCount: 1,
        dryRun: undefined
      });

      expect(mockTeacherCourseRepository.findByGh).toHaveBeenCalledWith('T001');
    });

    it('应该在用户类型为空时返回错误', async () => {
      // Arrange
      const config = {
        userType: '',
        xgh: 'S001'
      } as any;

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('用户类型不能为空');
    });

    it('应该在用户类型无效时返回错误', async () => {
      // Arrange
      const config = {
        userType: 'invalid',
        xgh: 'S001'
      } as any;

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('用户类型必须是 student 或 teacher');
    });

    it('应该在学号/工号为空时返回错误', async () => {
      // Arrange
      const config = {
        userType: 'student',
        xgh: ''
      } as any;

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('学号或工号不能为空');
    });

    it('应该处理仓储查询错误', async () => {
      // Arrange
      const config: FetchCourseDataConfig = {
        userType: 'student',
        xgh: 'S001'
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockStudentCourseRepository.findByXh = vi.fn().mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('获取学生课程数据失败: Database error');
    });

    it('应该正确去重课程数据', async () => {
      // Arrange
      const duplicatedCourses: StudentCourse[] = [
        ...mockStudentCourses,
        mockStudentCourses[0] // 重复的课程
      ];

      const config: FetchCourseDataConfig = {
        userType: 'student',
        xgh: 'S001',
        xnxq: '2024-2025-1'
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockStudentCourseRepository.findByXhAndXnxq = vi.fn().mockResolvedValue({
        success: true,
        data: duplicatedCourses
      });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(2); // 去重后应该是2个
      expect(result.data?.courses).toHaveLength(2);
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      // Act
      const result = await executor.healthCheck();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getConfigValidation', () => {
    it('应该返回配置验证规则', () => {
      // Act
      const validation = executor.getConfigValidation();

      // Assert
      expect(validation).toEqual({
        userType: {
          required: true,
          type: 'string',
          enum: ['student', 'teacher']
        },
        xgh: {
          required: true,
          type: 'string',
          minLength: 1
        },
        xnxq: {
          required: false,
          type: 'string'
        },
        dryRun: {
          required: false,
          type: 'boolean',
          default: false
        }
      });
    });
  });
});
