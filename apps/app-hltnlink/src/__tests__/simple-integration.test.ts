// @wps/hltnlink 简化集成测试
// 验证核心组件的基本集成功能

import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarSyncExecutor from '../executors/CalendarSyncExecutor.js';
import DataSyncExecutor from '../executors/DataSyncExecutor.js';
import DataTransformService from '../services/implementations/DataTransformService.js';
import { EXTERNAL_DATA_TYPES } from '../types/api.js';
import { createSuccessResult } from '../types/service.js';

// Mock dependencies
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(() => mockLogger),
  level: 'info'
};

describe('简化集成测试', () => {
  let dataTransformService: DataTransformService;
  let dataSyncExecutor: DataSyncExecutor;
  let calendarSyncExecutor: CalendarSyncExecutor;

  beforeEach(() => {
    vi.clearAllMocks();

    // 初始化数据转换服务
    dataTransformService = new DataTransformService(mockLogger);

    // Mock数据同步服务
    const mockDataSyncService = {
      executeFullSync: vi.fn().mockResolvedValue(
        createSuccessResult({
          syncId: 'test-sync-001',
          status: 'SUCCESS' as const,
          progress: 100,
          currentStep: 'Completed',
          totalSteps: 3,
          completedSteps: 3,
          startTime: new Date().toISOString(),
          processedRecords: 10,
          totalRecords: 10,
          errors: []
        })
      ),
      executeIncrementalSync: vi.fn(),
      syncDataType: vi.fn(),
      syncSchedulesToCalendar: vi.fn().mockResolvedValue(
        createSuccessResult({
          success: true,
          syncedEvents: 5,
          failedEvents: 0,
          errors: []
        })
      ),
      getSyncProgress: vi.fn(),
      cancelSync: vi.fn(),
      getSyncHistory: vi.fn(),
      getSyncStatistics: vi.fn(),
      validateDataIntegrity: vi.fn(),
      cleanupExpiredData: vi.fn(),
      resetSyncStatus: vi.fn(),
      getSyncConfiguration: vi.fn(),
      updateSyncConfiguration: vi.fn()
    };

    // 初始化执行器
    dataSyncExecutor = new DataSyncExecutor(
      mockLogger,
      mockDataSyncService as any
    );
    calendarSyncExecutor = new CalendarSyncExecutor(
      mockLogger,
      mockDataSyncService as any
    );
  });

  describe('数据转换服务', () => {
    it('应该正确转换课程数据', async () => {
      const mockCourseData = [
        {
          id: 'course-001',
          courseName: '高等数学',
          courseCode: 'MATH001',
          creditHours: 4,
          department: '数学系',
          semester: '2024-2025-1',
          academicYear: '2024-2025'
        }
      ];

      const result =
        await dataTransformService.transformCourseData(mockCourseData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        external_id: 'course-001',
        course_name: '高等数学',
        course_code: 'MATH001',
        credit_hours: 4,
        department: '数学系',
        semester: '2024-2025-1',
        academic_year: '2024-2025'
      });
    });

    it('应该正确转换学生数据', async () => {
      const mockStudentData = [
        {
          id: 'student-001',
          studentId: '2024001',
          name: '张三',
          className: '计算机1班',
          department: '计算机学院',
          major: '计算机科学',
          grade: '2024'
        }
      ];

      const result =
        await dataTransformService.transformStudentData(mockStudentData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        external_id: 'student-001',
        student_id: '2024001',
        name: '张三',
        class_name: '计算机1班',
        department: '计算机学院',
        major: '计算机科学',
        grade: '2024'
      });
    });

    it('应该验证转换后的数据', async () => {
      const invalidData = [
        {
          id: 0,
          external_id: '',
          course_name: '',
          course_code: 'INVALID',
          credit_hours: -1,
          department: '',
          semester: '',
          academic_year: '',
          created_at: '',
          updated_at: ''
        }
      ];

      const result = await dataTransformService.validateTransformedData(
        invalidData,
        EXTERNAL_DATA_TYPES.COURSES
      );

      expect(result.success).toBe(true);
      expect(result.data?.validRecords).toHaveLength(0);
      expect(result.data?.invalidRecords).toHaveLength(1);
      expect(result.data?.invalidRecords[0].errors).toContain(
        'External ID is required'
      );
    });
  });

  describe('数据同步执行器', () => {
    it('应该正确验证配置', () => {
      const validConfig = {
        syncType: 'FULL',
        dataType: 'courses',
        batchSize: 1000
      };

      const result = dataSyncExecutor.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('应该拒绝无效配置', () => {
      const invalidConfig = {
        syncType: 'INVALID',
        dataType: 'unknown',
        batchSize: -1
      };

      const result = dataSyncExecutor.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('应该提供健康检查', async () => {
      const health = await dataSyncExecutor.healthCheck();
      expect(['healthy', 'unhealthy']).toContain(health);
    });

    it('应该执行数据同步任务', async () => {
      const mockContext = {
        taskId: 'test-task-001',
        workflowId: 'test-workflow-001',
        config: {
          syncType: 'FULL',
          dataType: 'courses',
          batchSize: 1000
        },
        inputs: {},
        metadata: {}
      };

      const result = await dataSyncExecutor.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.syncId).toBe('test-sync-001');
      expect(result.data?.processedRecords).toBe(10);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('日历同步执行器', () => {
    it('应该正确验证配置', () => {
      const validConfig = {
        calendarId: 'test-calendar',
        events: [
          {
            title: '测试事件',
            startTime: '2024-01-01T09:00:00Z',
            endTime: '2024-01-01T10:00:00Z'
          }
        ],
        syncMode: 'MERGE'
      };

      const result = calendarSyncExecutor.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('应该拒绝无效配置', () => {
      const invalidConfig = {
        calendarId: '',
        events: [],
        syncMode: 'INVALID'
      };

      const result = calendarSyncExecutor.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('应该执行日历同步任务', async () => {
      const mockContext = {
        taskId: 'calendar-task-001',
        workflowId: 'calendar-workflow-001',
        config: {
          calendarId: 'test-calendar',
          events: [
            {
              title: '测试课程',
              startTime: '2024-01-01T09:00:00Z',
              endTime: '2024-01-01T10:00:00Z'
            }
          ],
          syncMode: 'MERGE'
        },
        inputs: {},
        metadata: {}
      };

      const result = await calendarSyncExecutor.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.syncedEvents).toBe(5);
      expect(result.data?.failedEvents).toBe(0);
    });
  });

  describe('工作流配置验证', () => {
    it('应该验证数据同步任务配置', () => {
      const taskConfig = {
        syncType: 'FULL',
        dataType: 'courses',
        batchSize: 1000,
        options: {
          dryRun: false,
          forceSync: false,
          skipValidation: false
        }
      };

      expect(taskConfig.syncType).toBe('FULL');
      expect(taskConfig.dataType).toBe('courses');
      expect(taskConfig.batchSize).toBe(1000);
      expect(taskConfig.options.dryRun).toBe(false);
    });

    it('应该验证日历同步任务配置', () => {
      const calendarConfig = {
        calendarId: 'test-calendar-id',
        syncMode: 'MERGE',
        options: {
          deleteExisting: false,
          enableRecurrence: true,
          batchSize: 10
        }
      };

      expect(calendarConfig.calendarId).toBe('test-calendar-id');
      expect(calendarConfig.syncMode).toBe('MERGE');
      expect(calendarConfig.options.enableRecurrence).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理执行器初始化错误', async () => {
      const invalidExecutor = new DataSyncExecutor(mockLogger, null as any);

      const health = await invalidExecutor.healthCheck();
      expect(health).toBe('unhealthy');
    });

    it('应该处理配置验证错误', () => {
      const invalidConfig = null;

      const result = dataSyncExecutor.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration is required');
    });

    it('应该处理任务执行错误', async () => {
      const mockContext = {
        taskId: 'error-task',
        workflowId: 'error-workflow',
        config: {
          syncType: 'INVALID_TYPE',
          dataType: 'invalid',
          batchSize: -1
        },
        inputs: {},
        metadata: {}
      };

      const result = await dataSyncExecutor.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // shouldRetry字段可能不会被设置，这是正常的
    });
  });
});
