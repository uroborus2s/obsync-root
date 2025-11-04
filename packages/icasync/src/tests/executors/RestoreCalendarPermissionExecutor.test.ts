/**
 * RestoreCalendarPermissionExecutor 单元测试
 */

import type { Logger } from '@stratix/core';
import type { ExecutionContext } from '@stratix/tasks';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RestoreCalendarPermissionExecutor, {
  type RestorePermissionConfig
} from '../../executors/RestoreCalendarPermission.executor.js';
import type { ICalendarMappingRepository } from '../../repositories/CalendarMapping.repository.js';
import type { IPermissionStatusRepository } from '../../repositories/PermissionStatus.repository.js';
import type { CalendarMapping } from '../../types/database.js';

// Mock 数据
const mockCalendarMapping: CalendarMapping = {
  id: 1,
  kkh: 'TEST001',
  xnxq: '2024-2025-1',
  calendar_id: 'cal_123456',
  calendar_name: '测试课程',
  is_deleted: false,
  deleted_at: null,
  metadata: null,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z')
};

describe('RestoreCalendarPermissionExecutor', () => {
  let executor: RestoreCalendarPermissionExecutor;
  let mockCalendarMappingRepository: ICalendarMappingRepository;
  let mockPermissionStatusRepository: IPermissionStatusRepository;
  let mockWasV7ApiCalendar: WpsCalendarAdapter;
  let mockLogger: Logger;

  beforeEach(() => {
    // Mock repositories
    mockCalendarMappingRepository = {
      findByKkh: vi.fn()
    } as any;

    mockPermissionStatusRepository = {
      updateStudentCourseStatus: vi.fn(),
      updateTeacherCourseStatus: vi.fn()
    } as any;

    // Mock WPS API
    mockWasV7ApiCalendar = {
      createCalendarPermission: vi.fn()
    } as any;

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    executor = new RestoreCalendarPermissionExecutor(
      mockCalendarMappingRepository,
      mockPermissionStatusRepository,
      mockWasV7ApiCalendar,
      mockLogger
    );
  });

  describe('execute', () => {
    it('应该成功为学生恢复日历权限', async () => {
      // Arrange
      const config: RestorePermissionConfig = {
        userType: 'student',
        xgh: 'S001',
        courseInfo: {
          kkh: 'TEST001',
          kcbh: 'CS101',
          xnxq: '2024-2025-1',
          xgh: 'S001'
        }
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockCalendarMappingRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: [mockCalendarMapping]
      });

      mockWasV7ApiCalendar.createCalendarPermission = vi
        .fn()
        .mockResolvedValue({
          id: 'perm_123456'
        });

      mockPermissionStatusRepository.updateStudentCourseStatus = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: 1
        });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        kkh: 'TEST001',
        calendarId: 'cal_123456',
        success: true
      });

      expect(
        mockWasV7ApiCalendar.createCalendarPermission
      ).toHaveBeenCalledWith({
        calendar_id: 'cal_123456',
        user_id: 'S001',
        role: 'reader',
        id_type: 'external'
      });

      expect(
        mockPermissionStatusRepository.updateStudentCourseStatus
      ).toHaveBeenCalledWith({
        kkh: 'TEST001',
        xnxq: '2024-2025-1',
        gxZt: 'restored',
        userIds: ['S001']
      });
    });

    it('应该成功为教师恢复日历权限', async () => {
      // Arrange
      const config: RestorePermissionConfig = {
        userType: 'teacher',
        xgh: 'T001',
        courseInfo: {
          kkh: 'TEST001',
          kcbh: 'CS101',
          xnxq: '2024-2025-1',
          xgh: 'T001'
        }
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockCalendarMappingRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: [mockCalendarMapping]
      });

      mockWasV7ApiCalendar.createCalendarPermission = vi
        .fn()
        .mockResolvedValue({
          id: 'perm_123456'
        });

      mockPermissionStatusRepository.updateTeacherCourseStatus = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: 1
        });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        kkh: 'TEST001',
        calendarId: 'cal_123456',
        success: true
      });

      expect(
        mockWasV7ApiCalendar.createCalendarPermission
      ).toHaveBeenCalledWith({
        calendar_id: 'cal_123456',
        user_id: 'T001',
        role: 'writer',
        id_type: 'external'
      });

      expect(
        mockPermissionStatusRepository.updateTeacherCourseStatus
      ).toHaveBeenCalledWith({
        kkh: 'TEST001',
        xnxq: '2024-2025-1',
        gxZt: 'restored',
        userIds: ['T001']
      });
    });

    it('应该在测试模式下跳过实际权限添加', async () => {
      // Arrange
      const config: RestorePermissionConfig = {
        userType: 'student',
        xgh: 'S001',
        courseInfo: {
          kkh: 'TEST001',
          xgh: 'S001'
        },
        dryRun: true
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockCalendarMappingRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: [mockCalendarMapping]
      });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        kkh: 'TEST001',
        calendarId: 'cal_123456',
        success: true
      });

      expect(
        mockWasV7ApiCalendar.createCalendarPermission
      ).not.toHaveBeenCalled();
    });

    it('应该在未找到日历时返回错误', async () => {
      // Arrange
      const config: RestorePermissionConfig = {
        userType: 'student',
        xgh: 'S001',
        courseInfo: {
          kkh: 'TEST999',
          xgh: 'S001'
        }
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockCalendarMappingRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: []
      });

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.data).toEqual({
        kkh: 'TEST999',
        success: false,
        error: '未找到开课号 TEST999 对应的日历'
      });
    });

    it('应该处理WPS API调用失败', async () => {
      // Arrange
      const config: RestorePermissionConfig = {
        userType: 'student',
        xgh: 'S001',
        courseInfo: {
          kkh: 'TEST001',
          xgh: 'S001'
        }
      };

      const context: ExecutionContext = {
        inputData: config,
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };

      mockCalendarMappingRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: [mockCalendarMapping]
      });

      mockWasV7ApiCalendar.createCalendarPermission = vi
        .fn()
        .mockRejectedValue(new Error('WPS API error'));

      // Act
      const result = await executor.execute(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        kkh: 'TEST001',
        calendarId: 'cal_123456',
        success: false,
        error: 'WPS API error'
      });
    });

    it('应该验证输入参数', async () => {
      // Arrange
      const config = {
        userType: '',
        xgh: 'S001',
        courseInfo: {
          kkh: 'TEST001'
        }
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
      expect(result.data?.error).toBe('用户类型不能为空');
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
      expect(validation).toHaveProperty('userType');
      expect(validation).toHaveProperty('xgh');
      expect(validation).toHaveProperty('courseInfo');
      expect(validation).toHaveProperty('dryRun');
      expect(validation).toHaveProperty('maxRetries');
    });
  });
});
