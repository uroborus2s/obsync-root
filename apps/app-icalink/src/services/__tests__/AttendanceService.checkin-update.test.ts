import { Logger } from '@stratix/core';
import { IQueueAdapter } from '@stratix/queue';
import { fromNullable } from '@stratix/utils/functional';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserInfo } from '../../types/api';
import { ServiceErrorCode } from '../../types/service.js';
import AttendanceService from '../AttendanceService';

// Mock Repositories and Adapters
const mockLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(() => mockLogger)
};

const mockQueueAdapter: IQueueAdapter = {
  add: vi.fn(),
  process: vi.fn(),
  close: vi.fn(),
  getJob: vi.fn(),
  getJobs: vi.fn(),
  removeJob: vi.fn()
};

const mockStudentRepository = {};
const mockCourseStudentRepository = {
  findOne: vi.fn()
};
const mockAttendanceCourseRepository = {
  findOne: vi.fn()
};
const mockAttendanceRecordRepository = {};
const mockAttendanceStatsRepository = {};
const mockAttendanceViewRepository = {};
const mockLeaveApplicationRepository = {};
const mockAbsentStudentRelationRepository = {};
const mockVerificationWindowRepository = {
  findLatestByCourse: vi.fn()
};

describe('AttendanceService - checkin', () => {
  let attendanceService: AttendanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    attendanceService = new AttendanceService(
      mockLogger,
      mockQueueAdapter,
      mockStudentRepository as any,
      mockCourseStudentRepository as any,
      mockAttendanceCourseRepository as any,
      mockAttendanceRecordRepository as any,
      mockAttendanceStatsRepository as any,
      mockAttendanceViewRepository as any,
      mockLeaveApplicationRepository as any,
      mockAbsentStudentRelationRepository as any,
      mockVerificationWindowRepository as any
    );
  });

  const studentInfo: Required<UserInfo> = {
    userId: 'student123',
    name: 'Test Student',
    userType: 'student',
    role: 'student'
  };

  const courseExtId = 'COURSE_EXT_001';
  const checkinData = {
    location: 'Test Location',
    latitude: 39.9042,
    longitude: 116.4074,
    accuracy: 10
  };

  const mockCourse = {
    id: 1,
    external_id: courseExtId,
    course_code: 'CS101',
    xnxq: '2023-2024-1',
    start_time: new Date('2024-01-15T10:00:00Z'),
    end_time: new Date('2024-01-15T11:40:00Z')
  };

  const mockEnrollment = { id: 1, kkh: 'CS101', xh: 'student123' };

  it('should successfully queue a check-in job for an enrolled student', async () => {
    // Arrange
    mockAttendanceCourseRepository.findOne.mockResolvedValue(
      fromNullable(mockCourse)
    );
    mockCourseStudentRepository.findOne.mockResolvedValue(
      fromNullable(mockEnrollment)
    );
    mockVerificationWindowRepository.findLatestByCourse.mockResolvedValue(null);
    mockQueueAdapter.add.mockResolvedValue({ id: 'job1' });

    // Act
    const dto = {
      courseExtId,
      studentInfo,
      checkinData
    };
    const result = await attendanceService.checkin(dto);

    // Assert
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.right.status).toBe('queued');
    }
    expect(mockQueueAdapter.add).toHaveBeenCalledWith(
      'checkin',
      expect.objectContaining({
        courseId: mockCourse.id,
        studentInfo,
        request: checkinData
      })
    );
  });

  it('should return PERMISSION_DENIED if user is not a student', async () => {
    // Arrange
    const teacherInfo: Required<UserInfo> = {
      ...studentInfo,
      userType: 'teacher'
    };

    // Act
    const dto = {
      courseExtId,
      studentInfo: teacherInfo,
      checkinData
    };
    const result = await attendanceService.checkin(dto);

    // Assert
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.left.code).toBe(String(ServiceErrorCode.PERMISSION_DENIED));
    }
    expect(mockQueueAdapter.add).not.toHaveBeenCalled();
  });

  it('should return RESOURCE_NOT_FOUND if course does not exist', async () => {
    // Arrange
    const { None } = await import('@stratix/utils/functional');
    mockAttendanceCourseRepository.findOne.mockResolvedValue(None());

    // Act
    const dto = {
      courseExtId,
      studentInfo,
      checkinData
    };
    const result = await attendanceService.checkin(dto);

    // Assert
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.left.code).toBe(
        String(ServiceErrorCode.RESOURCE_NOT_FOUND)
      );
    }
    expect(mockQueueAdapter.add).not.toHaveBeenCalled();
  });

  it('should return VALIDATION_FAILED if student is not enrolled in the course', async () => {
    // Arrange
    const { None } = await import('@stratix/utils/functional');
    mockAttendanceCourseRepository.findOne.mockResolvedValue(
      fromNullable(mockCourse)
    );
    mockCourseStudentRepository.findOne.mockResolvedValue(None());

    // Act
    const dto = {
      courseExtId,
      studentInfo,
      checkinData
    };
    const result = await attendanceService.checkin(dto);

    // Assert
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.left.code).toBe(String(ServiceErrorCode.VALIDATION_FAILED));
    }
    expect(mockQueueAdapter.add).not.toHaveBeenCalled();
  });

  it('should return UNKNOWN_ERROR if queueing fails', async () => {
    // Arrange
    mockAttendanceCourseRepository.findOne.mockResolvedValue(
      fromNullable(mockCourse)
    );
    mockCourseStudentRepository.findOne.mockResolvedValue(
      fromNullable(mockEnrollment)
    );
    mockVerificationWindowRepository.findLatestByCourse.mockResolvedValue(null);
    const queueError = new Error('Queue is down');
    mockQueueAdapter.add.mockRejectedValue(queueError);

    // Act
    const dto = {
      courseExtId,
      studentInfo,
      checkinData
    };
    const result = await attendanceService.checkin(dto);

    // Assert
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.left.code).toBe(String(ServiceErrorCode.UNKNOWN_ERROR));
    }
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: queueError },
      'Failed to queue check-in job'
    );
  });
});
