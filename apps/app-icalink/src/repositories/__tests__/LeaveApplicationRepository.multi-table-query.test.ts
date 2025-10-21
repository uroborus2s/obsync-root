import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaveStatus } from '../../types/database';
import LeaveApplicationRepository from '../LeaveApplicationRepository';

// Mock dependencies
const mockDatabaseApi = {
  getReadConnection: vi.fn(),
  getWriteConnection: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// Mock database connection
const mockDb = {
  selectFrom: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  execute: vi.fn()
};

describe('LeaveApplicationRepository - Multi-Table Query', () => {
  let repository: LeaveApplicationRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup database connection mock
    mockDatabaseApi.getReadConnection.mockReturnValue(mockDb);
    mockDatabaseApi.getWriteConnection.mockReturnValue(mockDb);

    repository = new LeaveApplicationRepository(
      mockDatabaseApi as any,
      mockLogger as any
    );

    // Mock the readConnection property
    Object.defineProperty(repository, 'readConnection', {
      get: () => mockDb
    });
  });

  describe('findWithDetailsPaginated', () => {
    it('should perform multi-table JOIN query correctly', async () => {
      // Mock main query result
      const mockMainQueryResult = [
        {
          id: 1,
          attendance_record_id: 101,
          student_id: 'S001',
          student_name: '张三',
          course_id: 'C001',
          course_name: '高等数学',
          class_date: new Date('2024-01-15'),
          class_time: '08:00-09:40',
          class_location: '教学楼A101',
          teacher_id: 'T001',
          teacher_name: '李教授',
          leave_type: 'sick',
          leave_reason: '感冒发烧',
          status: 'leave_pending',
          application_time: new Date('2024-01-14'),
          approval_time: null,
          approval_comment: null,
          created_at: new Date('2024-01-14'),
          updated_at: new Date('2024-01-14'),

          // Course details
          course_detail_id: 201,
          semester: '2024-1',
          teaching_week: 1,
          week_day: 1,
          teacher_codes: 'T001,T002',
          teacher_names: '李教授,王教授',
          course_location: '教学楼A101',
          start_time: new Date('2024-01-15 08:00:00'),
          end_time: new Date('2024-01-15 09:40:00'),
          periods: '1-2',
          time_period: 'am'
        }
      ];

      // Mock approval query result
      const mockApprovalResult = [
        {
          leave_application_id: 1,
          approval_id: 301,
          approver_id: 'T001',
          approver_name: '李教授',
          approval_result: 'pending',
          approval_time: null,
          approval_comment: null,
          approval_order: 1,
          is_final_approver: true
        },
        {
          leave_application_id: 1,
          approval_id: 302,
          approver_id: 'T002',
          approver_name: '王教授',
          approval_result: 'pending',
          approval_time: null,
          approval_comment: null,
          approval_order: 2,
          is_final_approver: true
        }
      ];

      // Mock attachment query result
      const mockAttachmentResult = [
        {
          leave_application_id: 1,
          attachment_id: 401,
          file_name: 'medical_certificate.jpg',
          file_size: 1024000,
          file_type: 'image/jpeg',
          upload_time: new Date('2024-01-14')
        }
      ];

      // Mock count result
      const mockCountResult = { success: true, data: 1 };

      // Setup mock call sequence
      mockDb.execute
        .mockResolvedValueOnce(mockMainQueryResult) // Main query
        .mockResolvedValueOnce(mockApprovalResult) // Approval query
        .mockResolvedValueOnce(mockAttachmentResult); // Attachment query

      // Mock countByConditions method
      vi.spyOn(repository, 'countByConditions').mockResolvedValue(
        mockCountResult
      );

      const conditions = { student_id: 'S001' };
      const options = { pagination: { page: 1, page_size: 10 } };

      const result = await repository.findWithDetailsPaginated(
        conditions,
        options
      );

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.data).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(result.data.page).toBe(1);
      expect(result.data.page_size).toBe(10);
      expect(result.data.has_next).toBe(false);
      expect(result.data.has_prev).toBe(false);

      const leaveApplication = result.data.data[0];

      // Verify basic leave application data
      expect(leaveApplication.id).toBe(1);
      expect(leaveApplication.student_name).toBe('张三');
      expect(leaveApplication.course_name).toBe('高等数学');
      expect(leaveApplication.status).toBe('leave_pending');

      // Verify course details
      expect(leaveApplication.start_time).toEqual(
        new Date('2024-01-15 08:00:00')
      );
      expect(leaveApplication.end_time).toEqual(
        new Date('2024-01-15 09:40:00')
      );
      expect(leaveApplication.teaching_week).toBe(1); // 现在使用原始数据库字段名

      // Verify multi-teacher approvals
      expect(leaveApplication.approvals).toHaveLength(2);
      expect(leaveApplication.approvals?.[0].approver_name).toBe('李教授');
      expect(leaveApplication.approvals?.[1].approver_name).toBe('王教授');
      expect(leaveApplication.approvals?.[0].approval_result).toBe('pending');

      // Verify attachments
      expect(leaveApplication.attachments).toHaveLength(1);
      expect(leaveApplication.attachments?.[0].file_name).toBe(
        'medical_certificate.jpg'
      );
      // 移除转换后的字段验证，因为现在只返回原始数据 + approvals + attachments
      // expect(leaveApplication.attachment_count).toBe(1);
      // expect(leaveApplication.has_attachments).toBe(true);

      // Verify database queries were called correctly
      expect(mockDb.selectFrom).toHaveBeenCalledWith(
        'icalink_leave_applications as ila'
      );
      expect(mockDb.leftJoin).toHaveBeenCalledWith(
        'icasync_attendance_courses as iac',
        'iac.course_code',
        'ila.course_id'
      );
    });

    it('should handle empty results correctly', async () => {
      // Mock empty results
      mockDb.execute
        .mockResolvedValueOnce([]) // Main query
        .mockResolvedValueOnce([]) // Approval query (won't be called)
        .mockResolvedValueOnce([]); // Attachment query (won't be called)

      vi.spyOn(repository, 'countByConditions').mockResolvedValue({
        success: true,
        data: 0
      });

      const conditions = { student_id: 'NONEXISTENT' };
      const options = { pagination: { page: 1, page_size: 10 } };

      const result = await repository.findWithDetailsPaginated(
        conditions,
        options
      );

      expect(result.success).toBe(true);
      expect(result.data.data).toHaveLength(0);
      expect(result.data.total).toBe(0);
      expect(result.data.has_next).toBe(false);
      expect(result.data.has_prev).toBe(false);
    });

    it('should apply query conditions correctly', async () => {
      mockDb.execute.mockResolvedValue([]);
      vi.spyOn(repository, 'countByConditions').mockResolvedValue({
        success: true,
        data: 0
      });

      const conditions = {
        student_id: 'S001',
        teacher_id: 'T001',
        course_id: 'C001',
        status: 'leave_pending' as LeaveStatus,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      };

      await repository.findWithDetailsPaginated(conditions);

      // Verify that where clauses were called for each condition
      expect(mockDb.where).toHaveBeenCalledWith('ila.student_id', '=', 'S001');
      expect(mockDb.where).toHaveBeenCalledWith('ila.teacher_id', '=', 'T001');
      expect(mockDb.where).toHaveBeenCalledWith('ila.course_id', '=', 'C001');
      expect(mockDb.where).toHaveBeenCalledWith(
        'ila.status',
        '=',
        'leave_pending'
      );
      expect(mockDb.where).toHaveBeenCalledWith(
        'ila.application_time',
        '>=',
        conditions.start_date
      );
      expect(mockDb.where).toHaveBeenCalledWith(
        'ila.application_time',
        '<=',
        conditions.end_date
      );
    });
  });
});
