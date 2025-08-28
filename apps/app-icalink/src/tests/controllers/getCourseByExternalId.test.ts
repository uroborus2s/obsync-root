// @wps/app-icalink getCourseByExternalId 接口测试
// 基于 vitest 的单元测试

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import AttendanceController from '../../controllers/AttendanceController.js';
import type { IAttendanceService } from '../../services/interfaces/IAttendanceService.js';
import type { IUserService } from '../../services/interfaces/IUserService.js';
import type { IAttendanceCourseRepository } from '../../repositories/interfaces/IAttendanceCourseRepository.js';
import type { IcasyncAttendanceCourse } from '../../types/database.js';

// Mock数据
const mockCourse: IcasyncAttendanceCourse = {
  id: 1,
  juhe_renwu_id: 123,
  external_id: 'test-external-id',
  course_code: 'CS101',
  course_name: '计算机基础',
  semester: '2024-1',
  teaching_week: 1,
  week_day: 1,
  teacher_codes: '001,002',
  teacher_names: '张老师,李老师',
  class_location: '教学楼A101',
  start_time: new Date('2024-01-01T08:00:00Z'),
  end_time: new Date('2024-01-01T10:00:00Z'),
  periods: '1-2',
  time_period: 'am',
  attendance_enabled: true,
  attendance_start_offset: -30,
  attendance_end_offset: 60,
  late_threshold: 10,
  auto_absent_after: 60,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
  created_by: 'system',
  updated_by: 'system',
  deleted_at: undefined,
  deleted_by: undefined,
  metadata: null
};

describe('AttendanceController - getCourseByExternalId', () => {
  let controller: AttendanceController;
  let mockLogger: Logger;
  let mockAttendanceService: IAttendanceService;
  let mockUserService: IUserService;
  let mockAttendanceCourseRepository: IAttendanceCourseRepository;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    // Mock Services
    mockAttendanceService = {} as any;
    mockUserService = {} as any;

    // Mock Repository
    mockAttendanceCourseRepository = {
      findByExternalId: vi.fn()
    } as any;

    // Mock Request and Reply
    mockRequest = {
      params: { external_id: 'test-external-id' },
      userIdentity: { userId: 'test-user', userType: 'student' }
    };

    mockReply = {
      status: vi.fn().mockReturnThis()
    };

    controller = new AttendanceController(
      mockLogger,
      mockAttendanceService,
      mockUserService,
      mockAttendanceCourseRepository
    );
  });

  describe('成功场景', () => {
    it('应该成功获取存在的课程信息', async () => {
      // Arrange
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: mockCourse
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('课程信息获取成功');
      expect(result.data).toBeDefined();
      expect(result.data.external_id).toBe('test-external-id');
      expect(result.data.course_name).toBe('计算机基础');
      expect(result.data.teacher_info).toHaveLength(2);
      expect(result.data.teacher_info[0].teacher_id).toBe('001');
      expect(result.data.teacher_info[0].teacher_name).toBe('张老师');
      expect(mockAttendanceCourseRepository.findByExternalId).toHaveBeenCalledWith('test-external-id');
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    it('应该正确转换时间格式', async () => {
      // Arrange
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: mockCourse
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.data.start_time).toBe('2024-01-01T08:00:00.000Z');
      expect(result.data.end_time).toBe('2024-01-01T10:00:00.000Z');
      expect(result.data.created_at).toBe('2024-01-01T00:00:00.000Z');
      expect(result.data.updated_at).toBe('2024-01-01T00:00:00.000Z');
    });

    it('应该正确处理教师信息', async () => {
      // Arrange
      const courseWithSingleTeacher = {
        ...mockCourse,
        teacher_codes: '001',
        teacher_names: '张老师'
      };
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: courseWithSingleTeacher
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.data.teacher_info).toHaveLength(1);
      expect(result.data.teacher_info[0].teacher_id).toBe('001');
      expect(result.data.teacher_info[0].teacher_name).toBe('张老师');
    });
  });

  describe('错误场景', () => {
    it('应该在external_id为空时返回400错误', async () => {
      // Arrange
      mockRequest.params.external_id = '';

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('外部ID参数无效');
      expect(result.code).toBe('INVALID_EXTERNAL_ID');
      expect(mockReply.status).toHaveBeenCalledWith(400);
    });

    it('应该在课程不存在时返回404错误', async () => {
      // Arrange
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: null
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('课程不存在');
      expect(result.code).toBe('COURSE_NOT_FOUND');
      expect(mockReply.status).toHaveBeenCalledWith(404);
    });

    it('应该在数据库错误时返回500错误', async () => {
      // Arrange
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: false,
        error: { message: '数据库连接失败' }
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('数据库连接失败');
      expect(result.code).toBe('COURSE_FETCH_ERROR');
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该在发生异常时返回500错误', async () => {
      // Arrange
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockRejectedValue(
        new Error('Unexpected error')
      );

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('服务器内部错误');
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该正确处理没有教师信息的课程', async () => {
      // Arrange
      const courseWithoutTeachers = {
        ...mockCourse,
        teacher_codes: null,
        teacher_names: null
      };
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: courseWithoutTeachers
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.teacher_info).toEqual([]);
    });

    it('应该正确处理教师名称不匹配的情况', async () => {
      // Arrange
      const courseWithMismatchedTeachers = {
        ...mockCourse,
        teacher_codes: '001,002,003',
        teacher_names: '张老师,李老师' // 少一个名称
      };
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: courseWithMismatchedTeachers
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.teacher_info).toHaveLength(3);
      expect(result.data.teacher_info[2].teacher_name).toBe(''); // 缺失的名称应该为空字符串
    });

    it('应该正确处理特殊字符的external_id', async () => {
      // Arrange
      mockRequest.params.external_id = 'test@course#001';
      mockAttendanceCourseRepository.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockCourse, external_id: 'test@course#001' }
      });

      // Act
      const result = await controller.getCourseByExternalId(mockRequest, mockReply);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.external_id).toBe('test@course#001');
      expect(mockAttendanceCourseRepository.findByExternalId).toHaveBeenCalledWith('test@course#001');
    });
  });
});
