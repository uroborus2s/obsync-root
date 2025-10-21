import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserInfo } from '../../types/api';
import { ApprovalResult } from '../../types/database';
import LeaveService from '../LeaveService';

// Mock dependencies
const mockLeaveApplicationRepository = {
  findById: vi.fn(),
  update: vi.fn(),
  create: vi.fn()
};

const mockLeaveApprovalRepository = {
  findByLeaveApplication: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn()
};

const mockAttendanceRecordRepository = {
  update: vi.fn()
};

const mockAttendanceCourseRepository = {
  findById: vi.fn()
};

const mockLeaveAttachmentRepository = {};
const mockUserService = {};
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('LeaveService - Multi-Teacher Approval', () => {
  let leaveService: LeaveService;
  let teacherInfo1: UserInfo;
  let teacherInfo2: UserInfo;
  let teacherInfo3: UserInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    leaveService = new LeaveService(
      mockLeaveApplicationRepository as any,
      mockLeaveApprovalRepository as any,
      mockLeaveAttachmentRepository as any,
      mockAttendanceRecordRepository as any,
      mockAttendanceCourseRepository as any,
      mockUserService as any,
      mockLogger as any
    );

    teacherInfo1 = { id: '0154', name: '张教授' } as UserInfo;
    teacherInfo2 = { id: '0326', name: '李教授' } as UserInfo;
    teacherInfo3 = { id: '0789', name: '王教授' } as UserInfo;
  });

  describe('validateApprovalPermission', () => {
    it('should allow teacher with pending approval record to approve', async () => {
      const applicationId = 1;

      // Mock leave application exists and is pending
      mockLeaveApplicationRepository.findById.mockResolvedValue({
        success: true,
        data: { some: true, value: { status: 'leave_pending' } }
      });

      // Mock approval records exist for this teacher
      mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            approver_id: '0154',
            approval_result: ApprovalResult.PENDING
          },
          {
            id: 2,
            approver_id: '0326',
            approval_result: ApprovalResult.PENDING
          }
        ]
      });

      const result = await leaveService.validateApprovalPermission(
        applicationId,
        '0154'
      );

      expect(result.success).toBe(true);
      expect(result.data.canApprove).toBe(true);
      expect(result.data.isAssignedTeacher).toBe(true);
      expect(result.data.approvalRecord).toBeDefined();
    });

    it('should reject teacher not in approval records', async () => {
      const applicationId = 1;

      mockLeaveApplicationRepository.findById.mockResolvedValue({
        success: true,
        data: { some: true, value: { status: 'leave_pending' } }
      });

      mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            approver_id: '0154',
            approval_result: ApprovalResult.PENDING
          }
        ]
      });

      const result = await leaveService.validateApprovalPermission(
        applicationId,
        '0999'
      );

      expect(result.success).toBe(true);
      expect(result.data.canApprove).toBe(false);
      expect(result.data.reason).toContain('不是该请假申请的指定审批人');
    });

    it('should reject teacher who already approved', async () => {
      const applicationId = 1;

      mockLeaveApplicationRepository.findById.mockResolvedValue({
        success: true,
        data: { some: true, value: { status: 'leave_pending' } }
      });

      mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            approver_id: '0154',
            approval_result: ApprovalResult.APPROVED
          }
        ]
      });

      const result = await leaveService.validateApprovalPermission(
        applicationId,
        '0154'
      );

      expect(result.success).toBe(true);
      expect(result.data.canApprove).toBe(false);
      expect(result.data.reason).toContain('已经审批过该申请');
    });
  });

  describe('calculateFinalApprovalStatus', () => {
    it('should return LEAVE when all teachers approved', async () => {
      const applicationId = 1;

      mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
        success: true,
        data: [
          { approval_result: ApprovalResult.APPROVED },
          { approval_result: ApprovalResult.APPROVED },
          { approval_result: ApprovalResult.APPROVED }
        ]
      });

      const result =
        await leaveService.calculateFinalApprovalStatus(applicationId);

      expect(result.success).toBe(true);
      expect(result.data.finalStatus).toBe('leave');
      expect(result.data.allApproved).toBe(true);
      expect(result.data.anyRejected).toBe(false);
      expect(result.data.totalCount).toBe(3);
      expect(result.data.approvedCount).toBe(3);
    });

    it('should return LEAVE_REJECTED when any teacher rejected', async () => {
      const applicationId = 1;

      mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
        success: true,
        data: [
          { approval_result: ApprovalResult.APPROVED },
          { approval_result: ApprovalResult.REJECTED },
          { approval_result: ApprovalResult.PENDING }
        ]
      });

      const result =
        await leaveService.calculateFinalApprovalStatus(applicationId);

      expect(result.success).toBe(true);
      expect(result.data.finalStatus).toBe('leave_rejected');
      expect(result.data.allApproved).toBe(false);
      expect(result.data.anyRejected).toBe(true);
      expect(result.data.rejectedCount).toBe(1);
    });

    it('should return LEAVE_PENDING when some teachers still pending', async () => {
      const applicationId = 1;

      mockLeaveApprovalRepository.findByLeaveApplication.mockResolvedValue({
        success: true,
        data: [
          { approval_result: ApprovalResult.APPROVED },
          { approval_result: ApprovalResult.PENDING },
          { approval_result: ApprovalResult.PENDING }
        ]
      });

      const result =
        await leaveService.calculateFinalApprovalStatus(applicationId);

      expect(result.success).toBe(true);
      expect(result.data.finalStatus).toBe('leave_pending');
      expect(result.data.allApproved).toBe(false);
      expect(result.data.anyRejected).toBe(false);
      expect(result.data.pendingCount).toBe(2);
      expect(result.data.approvedCount).toBe(1);
    });
  });
});
