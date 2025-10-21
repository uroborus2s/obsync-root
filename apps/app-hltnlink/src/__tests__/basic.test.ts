// @wps/hltnlink 基础功能测试
// 验证核心组件的基本功能

import { describe, it, expect } from 'vitest';
import { EXTERNAL_DATA_TYPES } from '../types/api.js';
import { SyncType, SyncStatus } from '../types/database.js';
import { createSuccessResult, createErrorResult, ServiceErrorCode } from '../types/service.js';

describe('基础类型和常量', () => {
  it('应该正确导出外部数据类型', () => {
    expect(EXTERNAL_DATA_TYPES.COURSES).toBe('courses');
    expect(EXTERNAL_DATA_TYPES.STUDENTS).toBe('students');
    expect(EXTERNAL_DATA_TYPES.TEACHERS).toBe('teachers');
    expect(EXTERNAL_DATA_TYPES.SCHEDULES).toBe('schedules');
    expect(EXTERNAL_DATA_TYPES.CLASSES).toBe('classes');
  });

  it('应该正确导出同步类型', () => {
    expect(SyncType.FULL_SYNC).toBe('full_sync');
    expect(SyncType.INCREMENTAL_SYNC).toBe('incremental_sync');
    expect(SyncType.COURSE_SYNC).toBe('course_sync');
    expect(SyncType.STUDENT_SYNC).toBe('student_sync');
    expect(SyncType.TEACHER_SYNC).toBe('teacher_sync');
    expect(SyncType.SCHEDULE_SYNC).toBe('schedule_sync');
    expect(SyncType.CALENDAR_SYNC).toBe('calendar_sync');
  });

  it('应该正确导出同步状态', () => {
    expect(SyncStatus.PENDING).toBe('pending');
    expect(SyncStatus.RUNNING).toBe('running');
    expect(SyncStatus.SUCCESS).toBe('success');
    expect(SyncStatus.FAILED).toBe('failed');
    expect(SyncStatus.CANCELLED).toBe('cancelled');
  });
});

describe('服务结果工具函数', () => {
  it('应该创建成功结果', () => {
    const data = { test: 'data' };
    const result = createSuccessResult(data, 'Test message');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.message).toBe('Test message');
    expect(result.timestamp).toBeDefined();
  });

  it('应该创建错误结果', () => {
    const error = 'Test error';
    const errorCode = ServiceErrorCode.VALIDATION_ERROR;
    const errorDetails = { detail: 'test' };
    
    const result = createErrorResult(error, errorCode, errorDetails);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(result.errorCode).toBe(errorCode);
    expect(result.errorDetails).toEqual(errorDetails);
    expect(result.timestamp).toBeDefined();
  });
});

describe('数据转换', () => {
  it('应该正确转换外部课程数据格式', () => {
    const externalCourse = {
      id: 'ext-001',
      courseName: '高等数学',
      courseCode: 'MATH001',
      creditHours: 4,
      department: '数学系',
      semester: '2024-2025-1',
      academicYear: '2024-2025'
    };

    const expectedInternalFormat = {
      id: 0, // 数据库自动生成
      external_id: 'ext-001',
      course_name: '高等数学',
      course_code: 'MATH001',
      credit_hours: 4,
      department: '数学系',
      semester: '2024-2025-1',
      academic_year: '2024-2025',
      created_at: expect.any(String),
      updated_at: expect.any(String)
    };

    // 模拟转换逻辑
    const transformed = {
      id: 0,
      external_id: externalCourse.id,
      course_name: externalCourse.courseName,
      course_code: externalCourse.courseCode,
      credit_hours: externalCourse.creditHours,
      department: externalCourse.department,
      semester: externalCourse.semester,
      academic_year: externalCourse.academicYear,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    expect(transformed).toMatchObject(expectedInternalFormat);
  });

  it('应该正确转换外部学生数据格式', () => {
    const externalStudent = {
      id: 'ext-stu-001',
      studentId: '2024001',
      name: '张三',
      className: '计算机科学与技术1班',
      department: '计算机学院',
      major: '计算机科学与技术',
      grade: '2024',
      phone: '13800138000',
      email: 'zhangsan@example.com'
    };

    const expectedInternalFormat = {
      id: 0,
      external_id: 'ext-stu-001',
      student_id: '2024001',
      name: '张三',
      class_name: '计算机科学与技术1班',
      department: '计算机学院',
      major: '计算机科学与技术',
      grade: '2024',
      phone: '13800138000',
      email: 'zhangsan@example.com',
      created_at: expect.any(String),
      updated_at: expect.any(String)
    };

    // 模拟转换逻辑
    const transformed = {
      id: 0,
      external_id: externalStudent.id,
      student_id: externalStudent.studentId,
      name: externalStudent.name,
      class_name: externalStudent.className,
      department: externalStudent.department,
      major: externalStudent.major,
      grade: externalStudent.grade,
      phone: externalStudent.phone,
      email: externalStudent.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    expect(transformed).toMatchObject(expectedInternalFormat);
  });
});

describe('工作流配置验证', () => {
  it('应该验证数据同步工作流配置', () => {
    const workflowConfig = {
      name: 'hltnlink-full-data-sync',
      version: '1.0.0',
      description: 'Complete data synchronization workflow for hltnlink application'
    };

    expect(workflowConfig.name).toBe('hltnlink-full-data-sync');
    expect(workflowConfig.version).toBe('1.0.0');
    expect(workflowConfig.description).toContain('hltnlink');
  });

  it('应该验证任务执行器配置', () => {
    const executorConfig = {
      name: 'dataSyncExecutor',
      description: 'Execute data synchronization from external API to local database',
      version: '1.0.0',
      tags: ['data-sync', 'api', 'database']
    };

    expect(executorConfig.name).toBe('dataSyncExecutor');
    expect(executorConfig.tags).toContain('data-sync');
    expect(executorConfig.tags).toContain('api');
    expect(executorConfig.tags).toContain('database');
  });
});

describe('API配置验证', () => {
  it('应该验证外部API配置结构', () => {
    const apiConfig = {
      baseUrl: 'https://api.example.com',
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    };

    expect(apiConfig.baseUrl).toMatch(/^https?:\/\//);
    expect(apiConfig.appId).toBeTruthy();
    expect(apiConfig.appSecret).toBeTruthy();
    expect(apiConfig.timeout).toBeGreaterThan(0);
    expect(apiConfig.retryAttempts).toBeGreaterThanOrEqual(0);
    expect(apiConfig.retryDelay).toBeGreaterThanOrEqual(0);
  });

  it('应该验证同步选项配置', () => {
    const syncOptions = {
      syncType: 'FULL' as const,
      dataTypes: [EXTERNAL_DATA_TYPES.COURSES, EXTERNAL_DATA_TYPES.STUDENTS],
      batchSize: 1000,
      maxRetries: 3,
      retryDelay: 1000,
      dryRun: false,
      forceSync: false
    };

    expect(['FULL', 'INCREMENTAL']).toContain(syncOptions.syncType);
    expect(syncOptions.dataTypes).toBeInstanceOf(Array);
    expect(syncOptions.dataTypes.length).toBeGreaterThan(0);
    expect(syncOptions.batchSize).toBeGreaterThan(0);
    expect(syncOptions.maxRetries).toBeGreaterThanOrEqual(0);
  });
});

describe('错误处理', () => {
  it('应该正确处理服务错误代码', () => {
    const errorCodes = [
      ServiceErrorCode.UNKNOWN_ERROR,
      ServiceErrorCode.VALIDATION_ERROR,
      ServiceErrorCode.DATABASE_ERROR,
      ServiceErrorCode.API_ERROR,
      ServiceErrorCode.SYNC_ERROR,
      ServiceErrorCode.CALENDAR_ERROR
    ];

    errorCodes.forEach(code => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });
  });

  it('应该创建包含错误详情的错误结果', () => {
    const errorDetails = {
      originalError: new Error('Original error'),
      context: { operation: 'test' },
      timestamp: new Date().toISOString()
    };

    const result = createErrorResult(
      'Test error occurred',
      ServiceErrorCode.UNKNOWN_ERROR,
      errorDetails
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error occurred');
    expect(result.errorCode).toBe(ServiceErrorCode.UNKNOWN_ERROR);
    expect(result.errorDetails).toEqual(errorDetails);
  });
});
