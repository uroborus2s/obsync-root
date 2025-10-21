import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserInfo } from '../../types/api';
import LeaveService from '../LeaveService';

// Mock dependencies
const mockLeaveApplicationRepository = {
  findById: vi.fn(),
  delete: vi.fn()
};

const mockAttendanceRecordRepository = {
  findById: vi.fn(),
  delete: vi.fn()
};

const mockAttendanceCourseRepository = {
  findById: vi.fn()
};

const mockLeaveApprovalRepository = {
  findByLeaveApplication: vi.fn(),
  delete: vi.fn()
};

const mockLeaveAttachmentRepository = {
  findByLeaveApplication: vi.fn(),
  delete: vi.fn()
};

const mockUserService = {
  getUserInfo: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('LeaveService - withdrawLeaveApplication 精确课程时间检查', () => {
  let leaveService: LeaveService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create service instance with mocked dependencies
    leaveService = new LeaveService(
      mockLeaveApplicationRepository as any,
      mockLeaveApprovalRepository as any,
      mockLeaveAttachmentRepository as any,
      mockAttendanceRecordRepository as any,
      mockAttendanceCourseRepository as any,
      mockUserService as any,
      mockLogger as any
    );
  });

  it('应该通过 attendance_record_id 获取精确的课程开始时间', async () => {
    // 准备测试数据
    const applicationId = 1;
    const studentInfo: UserInfo = {
      id: '0306012409318',
      name: '刘中昊',
      role: 'student'
    };

    // 模拟请假申请数据
    const mockApplication = {
      id: applicationId,
      student_id: '0306012409318',
      course_id: 'COURSE001',
      attendance_record_id: 123,
      status: 'leave_pending'
    };

    // 模拟考勤记录数据
    const mockAttendanceRecord = {
      id: 123,
      attendance_course_id: 456,
      student_id: '0306012409318'
    };

    // 模拟课程日程数据（课程还未开始）
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2小时后
    const mockCourse = {
      id: 456,
      course_code: 'COURSE001',
      start_time: futureTime.toISOString(),
      end_time: new Date(futureTime.getTime() + 90 * 60 * 1000).toISOString()
    };

    // 设置 mock 返回值
    mockLeaveApplicationRepository.findById.mockResolvedValue({
      success: true,
      data: { some: true, value: mockApplication }
    });

    mockAttendanceRecordRepository.findById.mockResolvedValue({
      success: true,
      data: { some: true, value: mockAttendanceRecord }
    });

    mockAttendanceCourseRepository.findById.mockResolvedValue({
      success: true,
      data: { some: true, value: mockCourse }
    });

    mockLeaveApplicationRepository.delete.mockResolvedValue({
      success: true,
      data: { some: true, value: {} }
    });

    mockAttendanceRecordRepository.delete.mockResolvedValue({
      success: true,
      data: { some: true, value: {} }
    });

    mockLeaveAttachmentRepository.findByLeaveApplication.mockResolvedValue({
      success: true,
      data: []
    });

    mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
      success: true,
      data: []
    });

    // 执行测试
    const result = await leaveService.withdrawLeaveApplication(
      applicationId,
      studentInfo
    );

    // 调试信息
    console.log('Test result:', result);

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // 验证调用了正确的方法和参数
    expect(mockLeaveApplicationRepository.findById).toHaveBeenCalledWith(
      applicationId
    );
    expect(mockAttendanceRecordRepository.findById).toHaveBeenCalledWith(123);
    expect(mockAttendanceCourseRepository.findById).toHaveBeenCalledWith(456);

    // 验证删除操作被调用
    expect(mockLeaveApplicationRepository.delete).toHaveBeenCalledWith(
      applicationId
    );
    expect(mockAttendanceRecordRepository.delete).toHaveBeenCalledWith(123);
  });

  it('应该在课程已开始时拒绝撤回', async () => {
    // 准备测试数据
    const applicationId = 1;
    const studentInfo: UserInfo = {
      id: '0306012409318',
      name: '刘中昊',
      role: 'student'
    };

    // 模拟请假申请数据
    const mockApplication = {
      id: applicationId,
      student_id: '0306012409318',
      course_id: 'COURSE001',
      attendance_record_id: 123,
      status: 'leave_pending'
    };

    // 模拟考勤记录数据
    const mockAttendanceRecord = {
      id: 123,
      attendance_course_id: 456,
      student_id: '0306012409318'
    };

    // 模拟课程日程数据（课程已开始）
    const pastTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1小时前
    const mockCourse = {
      id: 456,
      course_code: 'COURSE001',
      start_time: pastTime.toISOString(),
      end_time: new Date(pastTime.getTime() + 90 * 60 * 1000).toISOString()
    };

    // 设置 mock 返回值
    mockLeaveApplicationRepository.findById.mockResolvedValue({
      success: true,
      data: { some: true, value: mockApplication }
    });

    mockAttendanceRecordRepository.findById.mockResolvedValue({
      success: true,
      data: { some: true, value: mockAttendanceRecord }
    });

    mockAttendanceCourseRepository.findById.mockResolvedValue({
      success: true,
      data: { some: true, value: mockCourse }
    });

    // 执行测试
    const result = await leaveService.withdrawLeaveApplication(
      applicationId,
      studentInfo
    );

    // 验证结果
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('课程已开始，无法撤回请假申请');

    // 验证调用了正确的方法
    expect(mockAttendanceRecordRepository.findById).toHaveBeenCalledWith(123);
    expect(mockAttendanceCourseRepository.findById).toHaveBeenCalledWith(456);

    // 验证没有调用删除方法
    expect(mockLeaveApplicationRepository.delete).not.toHaveBeenCalled();
  });

  it('应该在找不到考勤记录时允许撤回', async () => {
    // 准备测试数据
    const applicationId = 1;
    const studentInfo: UserInfo = {
      id: '0306012409318',
      name: '刘中昊',
      role: 'student'
    };

    // 模拟请假申请数据（没有 attendance_record_id）
    const mockApplication = {
      id: applicationId,
      student_id: '0306012409318',
      course_id: 'COURSE001',
      attendance_record_id: null,
      status: 'leave_pending'
    };

    // 设置 mock 返回值
    mockLeaveApplicationRepository.findById.mockResolvedValue({
      success: true,
      data: { some: true, value: mockApplication }
    });

    mockLeaveApplicationRepository.delete.mockResolvedValue({
      success: true,
      data: { some: true, value: {} }
    });

    mockLeaveAttachmentRepository.findByLeaveApplication.mockResolvedValue({
      success: true,
      data: []
    });

    mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
      success: true,
      data: []
    });

    // 执行测试
    const result = await leaveService.withdrawLeaveApplication(
      applicationId,
      studentInfo
    );

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // 验证没有调用考勤记录查询
    expect(mockAttendanceRecordRepository.findById).not.toHaveBeenCalled();
    expect(mockAttendanceCourseRepository.findById).not.toHaveBeenCalled();
  });
});
