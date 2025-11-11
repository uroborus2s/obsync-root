/**
 * 考勤API服务模块
 * 基于@stratix/icalink的attendance.controller.ts接口
 */

import { API_CONFIG } from '@/config/api-config';
import { IcaLinkApiClient, icaLinkApiClient } from './icalink-api-client';
import { getCookie } from './jwt-utils';

// 从后端类型定义中导入的接口类型
export interface StudentAttendanceSearchResponse {
  success: boolean;
  message?: string;
  data?: {
    id: number; // 课程ID
    attendance_record_id?: number; // 考勤记录ID，用于请假申请和撤回请假
    course: {
      external_id: string;
      kkh?: string;
      kcmc: string;
      rq?: string;
      sj_f?: string;
      sj_t?: string;
      room_s: string;
      xm_s: string;
      jc_s: string;
      jxz?: number | null;
      lq?: string | null;
      status?: 'not_started' | 'in_progress' | 'finished';
      course_start_time: string;
      course_end_time: string;
    };
    student: {
      xh: string;
      xm: string;
      bjmc?: string;
      zymc?: string;
    };
    final_status?:
      | 'present'
      | 'absent'
      | 'leave'
      | 'leave_pending'
      | 'truant'
      | 'late';
    pending_status?: 'unstarted' | 'leave' | 'leave_pending';
    live_status?:
      | 'present'
      | 'absent'
      | 'leave'
      | 'leave_pending'
      | 'truant'
      | 'late';
    attendance_status?: {
      is_checked_in: boolean;
      status?:
        | 'not_started'
        | 'present'
        | 'absent'
        | 'leave'
        | 'pending_approval'
        | 'leave_pending';
      checkin_time?: string;
      can_checkin: boolean;
      can_leave: boolean;
      auto_start_time?: string;
      auto_close_time?: string;
    };
    stats?: {
      total_count: number;
      checkin_count: number;
      late_count: number;
      absent_count: number;
      leave_count: number;
    };
  };
}

export interface TeacherAttendanceRecordResponse {
  success: boolean;
  message?: string;
  data?: {
    course: {
      kkh: string;
      kcmc: string;
      rq: string;
      sj_f: string;
      sj_t: string;
      room_s: string;
      xm_s: string;
      jc_s: string;
      jxz?: number;
    };
    teacher: {
      gh: string;
      xm: string;
      ssdwmc?: string;
      zc?: string;
    };
    stats: {
      total_count: number;
      checkin_count: number;
      late_count: number;
      absent_count: number;
      leave_count: number;
      checkin_rate: number;
    };
    attendance_status: {
      status: 'active' | 'closed';
      auto_start_time?: string;
      auto_close_time?: string;
    };
    course_status: {
      status: 'not_started' | 'in_progress' | 'finished';
      course_start_time: string;
      course_end_time: string;
    };
    student_details: Array<{
      xh: string;
      xm: string;
      bjmc?: string;
      zymc?: string;
      status:
        | 'not_started'
        | 'present'
        | 'absent'
        | 'leave'
        | 'pending_approval'
        | 'leave_pending';
      checkin_time?: string;
      leave_time?: string;
      leave_reason?: string;
      location?: string;
      ip_address?: string;
    }>;
  };
}

export interface StudentCheckInRequest {
  location?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  remark?: string;
}

export interface StudentCheckInResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    status:
      | 'not_started'
      | 'present'
      | 'absent'
      | 'leave'
      | 'pending_approval'
      | 'leave_pending';
    checkin_time?: string;
    approver?: {
      id: string;
      name: string;
    };
  };
}

export interface StudentLeaveRequest {
  attendance_record_id: string;
  leave_reason: string;
  leave_type: 'sick' | 'personal' | 'emergency' | 'other'; // 必填字段
  attachments?: Array<{
    file_name: string;
    file_content: string; // Base64编码
    file_type: string;
    file_size: number;
  }>;
  // 学生信息（由前端传递）
  student_id: string; // 学号
  student_name: string; // 姓名
  class_name: string; // 班级
  major_name: string; // 专业
}

export interface StudentLeaveResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    status:
      | 'not_started'
      | 'present'
      | 'absent'
      | 'leave'
      | 'pending_approval'
      | 'leave_pending';
    leave_time?: string;
    leave_reason: string;
    approver?: {
      id: string;
      name: string;
    };
  };
}

export interface StudentWithdrawLeaveRequest {
  attendance_record_id: string;
}

export interface StudentWithdrawLeaveResponse {
  success: boolean;
  message: string;
  data?: {
    deleted_attendance_id: string;
    cancelled_approval_ids: string[];
    withdraw_time: string;
  };
}

export interface StudentLeaveApplicationItem {
  // 基本请假申请信息（原始数据库字段）
  id: number;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  teacher_id: string;
  teacher_name: string;
  leave_type: 'sick' | 'personal' | 'emergency' | 'other';
  leave_reason: string;
  status: 'leave_pending' | 'leave' | 'leave_rejected';
  application_time: string;
  approval_time?: string | null;
  approval_comment?: string | null;
  created_at: string;
  updated_at: string;

  // 课程详细信息（原始数据库字段）
  course_detail_id?: number | null;
  semester?: string;
  teaching_week?: number; // 原来的 jxz 字段
  week_day?: number;
  teacher_codes?: string;
  teacher_names?: string;
  class_location?: string;
  start_time?: string;
  end_time?: string;
  periods?: string;
  time_period?: string;

  // 关联数据数组
  attachments: Array<{
    id: number;
    leave_application_id: number;
    file_name: string;
    file_type: string;
    file_size: number;
    upload_time: string;
  }>;
  approvals: Array<{
    approval_id?: number;
    leave_application_id?: number;
    approver_id?: string;
    approver_name: string;
    approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approval_comment?: string | null;
    approval_time?: string | null;
    created_at?: string;
    updated_at?: string;
  }>;
}

export interface StudentLeaveApplicationQueryResponse {
  success: boolean;
  message?: string;
  data?: {
    // 新的 API 直接返回数据数组和分页信息
    data: StudentLeaveApplicationItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    // stats 字段可能不存在，因为新 API 不再返回统计信息
    stats?: {
      total_count: number;
      leave_pending_count: number;
      leave_count: number;
      leave_rejected_count: number;
    };
  };
}

export interface TeacherLeaveApplicationItem {
  id: number;
  approval_id: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  teacher_name: string;
  leave_type: 'sick' | 'personal' | 'emergency' | 'other';
  leave_reason: string;
  status:
    | 'leave_pending'
    | 'leave'
    | 'leave_rejected'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'cancelled';
  approval_comment: string | null;
  approval_time: string | null;
  application_time: string;
  approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approval_record_id: number;
  start_time: string;
  end_time: string;
  class_location: string;
  jxz: number;
  jc: string;
  leave_date: string;
  class_date: string;
  class_time: string;
  teacher_info: {
    teacher_id: string;
    teacher_name: string;
    teacher_department: string;
  };
  attachments: Array<{
    id: number;
    leave_application_id: number;
    file_name: string;
    file_size: number;
    file_type: string;
    upload_time: string;
  }>;
  attachment_count: number;
}

export interface TeacherLeaveApplicationQueryResponse {
  success: boolean;
  message?: string;
  data?: {
    applications: TeacherLeaveApplicationItem[];
    total: number;
    page: number;
    page_size: number;
    stats: {
      pending_count: number;
      processed_count: number;
      approved_count: number;
      rejected_count: number;
      cancelled_count: number;
      total_count: number;
    };
  };
}

export interface TeacherApprovalRequest {
  approval_id: string;
  action: 'approve' | 'reject';
  comment?: string;
}

export interface TeacherApprovalResponse {
  success: boolean;
  message: string;
  data?: {
    approval_id: string;
    application_id: string;
    action: 'approve' | 'reject';
    final_status: 'pending' | 'approved' | 'rejected';
    approval_time: string;
    approval_comment?: string;
  };
}

export interface AttachmentViewResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    file_content?: string;
    file_url?: string;
  };
}

export interface StudentLeaveApplicationQueryParams {
  status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected';
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
}

export interface TeacherLeaveApplicationQueryParams {
  status?: string | string[]; // 支持单个状态或多个状态（逗号分隔或数组）
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
}

// 课程历史考勤相关接口
export interface CourseAttendanceHistoryParams {
  kkh: string;
  xnxq?: string;
  start_date?: string;
  end_date?: string;
}

export interface ClassAttendanceStats {
  attendance_record_id: string;
  class_date: string;
  class_time: string;
  class_period: string;
  teaching_week?: number;
  classroom?: string;
  total_students: number;
  present_count: number;
  leave_count: number;
  absent_count: number;
  attendance_rate: number;
  status: 'active' | 'closed';
  course_status: 'not_started' | 'in_progress' | 'finished';
  created_at: string;
}

export interface CourseAttendanceHistoryResponse {
  success: boolean;
  message?: string;
  data?: {
    course_info: {
      kkh: string;
      course_name: string;
      xnxq: string;
      teachers: Array<{
        gh: string;
        xm: string;
      }>;
    };
    attendance_history: ClassAttendanceStats[];
    overall_stats: {
      total_classes: number;
      average_attendance_rate: number;
      total_students: number;
      total_present: number;
      total_leave: number;
      total_absent: number;
    };
  };
}

/**
 * 个人课程统计查询参数
 */
export interface PersonalCourseStatsParams {
  /** 课程号 */
  kkh: string;
  /** 学年学期 */
  xnxq?: string;
}

/**
 * 学生个人考勤统计
 */
export interface StudentPersonalStats {
  /** 学号 */
  xh: string;
  /** 姓名 */
  xm: string;
  /** 班级名称 */
  bjmc?: string;
  /** 专业名称 */
  zymc?: string;
  /** 出勤率 */
  attendance_rate: number;
  /** 签到次数 */
  present_count: number;
  /** 旷课次数 */
  absent_count: number;
  /** 请假次数 */
  leave_count: number;
  /** 总课节数 */
  total_classes: number;
  /** 最近签到记录 */
  recent_records: Array<{
    /** 上课日期 */
    class_date: string;
    /** 签到状态 */
    status:
      | 'not_started'
      | 'present'
      | 'absent'
      | 'leave'
      | 'pending_approval'
      | 'leave_pending';
    /** 签到时间 */
    checkin_time?: string;
    /** 请假原因 */
    leave_reason?: string;
  }>;
}

/**
 * 个人课程统计响应
 */
export interface PersonalCourseStatsResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message?: string;
  /** 数据 */
  data?: {
    /** 课程信息 */
    course_info: {
      /** 课程号 */
      kkh: string;
      /** 课程名称 */
      course_name: string;
      /** 学年学期 */
      xnxq: string;
      /** 总课时 */
      total_classes: number;
      /** 班级人数 */
      total_students: number;
      /** 整体出勤率 */
      overall_attendance_rate: number;
      /** 授课教师 */
      teachers: string;
    };
    /** 学生统计列表 */
    student_stats: StudentPersonalStats[];
  };
}

/**
 * 考勤API服务类
 */
export class AttendanceApiService {
  private apiClient: IcaLinkApiClient;

  constructor(baseUrl?: string) {
    this.apiClient = new IcaLinkApiClient(baseUrl || API_CONFIG.baseUrl);
  }

  /**
   * 获取学生签到记录
   */
  async getStudentAttendanceRecord(
    attendanceId: string
  ): Promise<StudentAttendanceSearchResponse> {
    const response = await this.apiClient.get(
      `/icalink/v1/courses/external/${encodeURIComponent(attendanceId)}/complete?type=student`
    );
    return {
      success: !!response.success,
      message: response.message,
      data: response.data
    };
  }

  /**
   * 获取教师签到记录
   */
  async getTeacherAttendanceRecord(
    attendanceId: string
  ): Promise<TeacherAttendanceRecordResponse> {
    const response = await this.apiClient.get(
      `/icalink/v1/attendance/${attendanceId}/record?type=teacher`
    );
    return response.data;
  }

  /**
   * 学生签到
   */
  async studentCheckIn(
    attendanceRecordId: number,
    request: StudentCheckInRequest
  ): Promise<StudentCheckInResponse> {
    const response = await this.apiClient.post(
      `/icalink/v1/attendance/${encodeURIComponent(attendanceRecordId)}/checkin`,
      request
    );
    return {
      success: !!response.success,
      message: response.message || '签到完成',
      data: response.data
    };
  }

  /**
   * 学生请假
   */
  async studentLeave(
    request: StudentLeaveRequest
  ): Promise<StudentLeaveResponse> {
    // 将前端的 attendance_record_id 映射为后端期望的 course_id
    // 将前端的 attachments 字段映射为后端期望的 images 字段
    const backendRequest = {
      course_id: request.attendance_record_id, // 前端传递的是课程ID
      leave_reason: request.leave_reason,
      leave_type: request.leave_type,
      images: request.attachments?.map((attachment) => ({
        name: attachment.file_name,
        content: attachment.file_content,
        type: attachment.file_type as any,
        size: attachment.file_size
      })),
      // 传递学生信息
      student_id: request.student_id,
      student_name: request.student_name,
      class_name: request.class_name,
      major_name: request.major_name
    };

    const response = await this.apiClient.post(
      '/icalink/v1/leave-applications',
      backendRequest
    );
    return {
      success: !!response.success,
      message: response.message,
      data: response.data
    };
  }

  /**
   * 学生查询请假申请
   */
  async getStudentLeaveApplications(
    params?: StudentLeaveApplicationQueryParams
  ): Promise<StudentLeaveApplicationQueryResponse> {
    const queryString = params
      ? new URLSearchParams(
          Object.entries(params).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = String(value);
              }
              return acc;
            },
            {} as Record<string, string>
          )
        ).toString()
      : '';

    const url = queryString
      ? `/icalink/v1/attendance/leave-applications?${queryString}`
      : '/icalink/v1/attendance/leave-applications';

    const response = await this.apiClient.get(url);
    return response as unknown as StudentLeaveApplicationQueryResponse;
  }

  /**
   * 教师查询请假申请
   */
  async getTeacherLeaveApplications(
    params?: TeacherLeaveApplicationQueryParams
  ): Promise<TeacherLeaveApplicationQueryResponse> {
    const queryString = params
      ? new URLSearchParams(
          Object.entries(params).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = String(value);
              }
              return acc;
            },
            {} as Record<string, string>
          )
        ).toString()
      : '';

    const url = queryString
      ? `/icalink/v1/attendance/teacher-leave-applications?${queryString}`
      : '/icalink/v1/attendance/teacher-leave-applications';

    const response = await this.apiClient.get(url);
    return response as unknown as TeacherLeaveApplicationQueryResponse;
  }

  /**
   * 教师审批请假申请
   */
  async teacherApproveLeave(
    request: TeacherApprovalRequest
  ): Promise<TeacherApprovalResponse> {
    const response = await this.apiClient.post(
      '/icalink/v1/attendance/teacher-approve-leave',
      request
    );
    return response as unknown as TeacherApprovalResponse;
  }

  /**
   * 查看请假申请附件
   */
  async viewLeaveAttachment(
    attachmentId: string
  ): Promise<AttachmentViewResponse> {
    const response = await this.apiClient.get(
      `/icalink/v1/attendance/attachments/${attachmentId}/view`
    );
    return response.data;
  }

  /**
   * 下载请假申请附件
   */
  async downloadLeaveAttachment(attachmentId: string): Promise<Blob> {
    const response = await fetch(
      `${this.apiClient['baseUrl']}/icalink/v1/attendance/attachments/${attachmentId}/download`,
      {
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * 获取课程历史考勤数据（通过开课号）
   */
  async getCourseAttendanceHistory(
    kkh: string,
    params?: {
      xnxq?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<CourseAttendanceHistoryResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.xnxq) queryParams.append('xnxq', params.xnxq);
      if (params?.start_date)
        queryParams.append('start_date', params.start_date);
      if (params?.end_date) queryParams.append('end_date', params.end_date);

      const url = `/icalink/v1/attendance/course/${encodeURIComponent(kkh)}/history${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response = await this.apiClient.get(url);

      // 处理API客户端的响应格式
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.message || '获取课程历史考勤数据失败');
      }
    } catch (error) {
      console.error('获取课程历史考勤数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取个人课程统计
   */
  async getPersonalCourseStats(
    kkh: string,
    params?: {
      xnxq?: string;
    }
  ): Promise<PersonalCourseStatsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.xnxq) {
        queryParams.append('xnxq', params.xnxq);
      }

      const queryString = queryParams.toString();
      const url = `/icalink/v1/attendance/course/${kkh}/stats${queryString ? `?${queryString}` : ''}`;

      const response = await this.apiClient.get(url);

      return response as unknown as PersonalCourseStatsResponse;
    } catch (error) {
      console.error('获取个人课程统计失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '获取个人课程统计失败'
      };
    }
  }

  /**
   * 获取访问令牌（私有方法）
   */
  private async getAccessToken(): Promise<string | null> {
    // 这里需要从auth-manager获取token
    const { authManager } = await import('./auth-manager');
    return authManager.getAccessToken();
  }

  /**
   * 学生撤回请假申请（新版本，使用 attendance_record_id）
   */
  async studentWithdrawLeave(
    attendanceRecordId: number
  ): Promise<StudentWithdrawLeaveResponse> {
    const response = await this.apiClient.post<StudentWithdrawLeaveResponse>(
      `/icalink/v1/leave-applications/withdraw`,
      { attendance_record_id: attendanceRecordId }
    );
    return response as unknown as StudentWithdrawLeaveResponse;
  }

  /**
   * 学生撤回请假申请（旧版本，使用 application_id）
   * @deprecated 使用 studentWithdrawLeave(attendanceRecordId: number) 代替
   */
  async studentWithdrawLeaveLegacy(
    applicationId: string
  ): Promise<StudentWithdrawLeaveResponse> {
    const response = await this.apiClient.post<StudentWithdrawLeaveResponse>(
      `/icalink/v1/leave-applications/${applicationId}/withdraw`,
      {} // 发送空对象作为请求体
    );
    return response as unknown as StudentWithdrawLeaveResponse;
  }

  /* ========== 以下是已废弃的 POST Policy 相关方法 ==========
   * 已改用后端上传方式，这些方法已不再使用
   * 保留代码仅供参考
   */

  /*
  async getPostPolicyUpload(file: File): Promise<{
    success: boolean;
    message?: string;
    data?: {
      postURL: string;
      formData: Record<string, string>;
      objectPath: string;
      expiresIn: number;
      bucketName: string;
    };
  }> {
    try {
      const response = await this.apiClient.post<{
        postURL: string;
        formData: Record<string, string>;
        objectPath: string;
        expiresIn: number;
        bucketName: string;
      }>('/icalink/v1/oss/post-policy-upload', {
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        businessType: 'checkin'
      });

      return {
        success: !!response.success,
        message: response.message,
        data: response.data
      };
    } catch (error) {
      throw error;
    }
  }

  async uploadWithPostPolicy(
    postURL: string,
    formData: Record<string, string>,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误，上传失败'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'));
      });

      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.append(key, value);
      });
      formDataObj.append('file', file);

      xhr.open('POST', postURL);
      xhr.send(formDataObj);
    });
  }

  async uploadCheckinPhotoWithPostPolicy(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      photo_url: string;
      bucket_name: string;
    };
  }> {
    try {
      const policyResult = await this.getPostPolicyUpload(file);

      if (!policyResult.success || !policyResult.data) {
        return {
          success: false,
          message: policyResult.message || '获取上传凭证失败'
        };
      }

      const { postURL, formData, objectPath, bucketName } = policyResult.data;
      await this.uploadWithPostPolicy(postURL, formData, file, onProgress);

      return {
        success: true,
        message: '上传成功',
        data: {
          photo_url: objectPath,
          bucket_name: bucketName
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '上传失败'
      };
    }
  }
  */

  /**
   * 上传签到图片（后端上传方式，支持进度回调）
   *
   * @param file - 图片文件
   * @param onProgress - 上传进度回调函数
   * @returns 图片 OSS 路径
   */
  async uploadCheckinPhoto(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      photo_url: string;
      bucket_name: string;
    };
  }> {
    try {
      // 构造 FormData
      // ⚠️ 重要：字段必须在文件之前！
      // 因为 @fastify/multipart 按顺序解析，文件流会消费整个请求体
      const formData = new FormData();
      formData.append('businessType', 'checkin'); // ✅ 字段在前
      formData.append('file', file); // ✅ 文件在后

      // 使用 XMLHttpRequest 支持进度回调
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // 监听上传进度
        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              onProgress(progress);
            }
          });
        }

        // 监听上传完成
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success && response.data) {
                resolve({
                  success: true,
                  message: response.message || '上传成功',
                  data: {
                    photo_url: response.data.objectPath, // ✅ 修正：使用 objectPath
                    bucket_name: response.data.bucketName
                  }
                });
              } else {
                resolve({
                  success: false,
                  message: response.message || '上传失败'
                });
              }
            } catch {
              reject(new Error('解析响应失败'));
            }
          } else {
            reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`));
          }
        });

        // 监听上传错误
        xhr.addEventListener('error', () => {
          reject(new Error('网络错误，上传失败'));
        });

        // 监听上传中止
        xhr.addEventListener('abort', () => {
          reject(new Error('上传已取消'));
        });

        // 发送请求
        // 使用与 apiClient 相同的 baseUrl
        const apiUrl =
          import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api';
        xhr.open('POST', `${apiUrl}/icalink/v1/oss/upload`);

        // 设置携带 cookie（重要！）
        xhr.withCredentials = true;

        // 添加认证头（从 cookie 获取 token）
        const token = getCookie('token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });
    } catch (error) {
      console.error('上传签到图片失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '上传失败'
      };
    }
  }

  /**
   * 审批照片签到
   *
   * @param recordId - 签到记录ID
   * @param action - 审批动作：'approved' 通过，'rejected' 拒绝
   * @param remark - 审批备注（拒绝时建议填写）
   * @returns 审批结果
   */
  async approvePhotoCheckin(
    recordId: number,
    action: 'approved' | 'rejected',
    remark?: string
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      recordId: number;
    };
  }> {
    try {
      const response = await this.apiClient.post(
        `/icalink/v1/attendance/records/${recordId}/approve-photo`,
        {
          action,
          remark
        }
      );

      return {
        success: !!response.success,
        message: response.message,
        data: response.data
      };
    } catch (error) {
      console.error('审批照片签到失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '审批失败'
      };
    }
  }

  /**
   * 导出实时考勤数据
   * @param courseId 课程ID
   * @returns 导出任务响应
   */
  async exportRealtimeData(courseId: number): Promise<ExportTaskResponse> {
    try {
      const response = await icaLinkApiClient.post<ExportTaskResponse>(
        '/icalink/v1/attendance/export/realtime',
        {
          courseId
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || '导出失败');
      }

      return response.data;
    } catch (error) {
      console.error('导出实时考勤数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出历史统计数据
   * @param courseCode 课程代码
   * @param sortField 排序字段（可选）
   * @param sortOrder 排序方向（可选）
   * @returns 导出任务响应
   */
  async exportHistoryData(
    courseCode: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<ExportTaskResponse> {
    try {
      const response = await icaLinkApiClient.post<ExportTaskResponse>(
        '/icalink/v1/attendance/export/history',
        {
          courseCode,
          sortField,
          sortOrder
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || '导出失败');
      }

      return response.data;
    } catch (error) {
      console.error('导出历史统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 查询导出任务状态
   * @param taskId 任务ID
   * @returns 导出任务响应
   */
  async getExportTaskStatus(taskId: string): Promise<ExportTaskResponse> {
    try {
      const response = await icaLinkApiClient.get<ExportTaskResponse>(
        `/icalink/v1/attendance/export/status/${taskId}`
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || '查询失败');
      }

      return response.data;
    } catch (error) {
      console.error('查询导出任务状态失败:', error);
      throw error;
    }
  }

  /**
   * 下载导出文件
   * @param taskId 任务ID
   * @param fileName 文件名
   */
  async downloadExportFile(taskId: string, fileName: string): Promise<void> {
    try {
      console.log('📥 [前端下载] 开始下载文件', {
        taskId,
        fileName
      });

      // 使用统一的icaLinkApiClient下载Blob
      // 优点：
      // 1. 自动携带Cookie（credentials: 'include'）
      // 2. 自动处理401响应和token刷新
      // 3. 统一的错误处理机制
      // 4. 代码一致性
      const blob = await icaLinkApiClient.downloadBlob(
        `/icalink/v1/attendance/export/download/${taskId}`
      );

      console.log('📥 [前端下载] Blob下载成功', {
        blobSize: blob.size,
        blobType: blob.type,
        blobIsEmpty: blob.size === 0
      });

      if (blob.size === 0) {
        console.error('❌ [前端下载] Blob为空！');
        throw new Error('下载的文件为空');
      }

      // 创建临时URL并触发浏览器下载
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理临时URL，释放内存
      window.URL.revokeObjectURL(downloadUrl);

      console.log('✅ [前端下载] 文件下载成功', { fileName });
    } catch (error) {
      console.error('❌ [前端下载] 下载导出文件失败:', error);
      throw error;
    }
  }
}

// 导出任务响应接口
export interface ExportTaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  cacheHit?: boolean;
  progress?: number;
  error?: string;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  createdAt?: Date;
  completedAt?: Date;
}

// 创建默认实例
export const attendanceApi = new AttendanceApiService();
