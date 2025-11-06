import { ConfirmDialog } from '@/components/ConfirmDialog';
import LeaveApprovalDialog from '@/components/LeaveApprovalDialog';
import ManualCheckinDialog from '@/components/ManualCheckinDialog';
import PhotoApprovalDialog from '@/components/PhotoApprovalDialog';
import { Toaster, ToastProvider } from '@/components/ui/toast';
import VerificationConfirmDialog from '@/components/VerificationConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { authManager } from '@/lib/auth-manager';
import { icaLinkApiClient } from '@/lib/icalink-api-client';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  MapPin,
  User,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface CourseData {
  id: number;
  juhe_renwu_id: number;
  external_id: string;
  course_code: string;
  course_name: string;
  semester: string;
  teaching_week: number;
  week_day: number;
  teacher_codes?: string;
  teacher_names?: string;
  class_location?: string;
  start_time: Date;
  end_time: Date;
  periods?: string;
  time_period: string;
  attendance_enabled: boolean;
  attendance_start_offset?: number;
  attendance_end_offset?: number;
  late_threshold?: number;
  auto_absent_after?: number;
  need_checkin: number; // 0: 无需签到, 1: 需要签到
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: Date;
  deleted_by?: string;
  metadata?: any;
}

interface Stats {
  total_count: number;
  checkin_count: number;
  late_count?: number;
  absent_count: number;
  leave_count: number;
  truant_count: number;
}

interface StudentAttendanceDetail {
  student_id: string;
  student_name: string | null;
  class_name: string | null;
  major_name: string | null;
  absence_type:
    | 'present'
    | 'absent'
    | 'leave'
    | 'leave_pending'
    | 'unstarted'
    | 'truant'
    | 'pending_approval'; // 照片签到待审核
  checkin_time?: string | Date | null;
  attendance_record_id?: number | null; // 用于审批接口
  checkin_location?: string | null;
  checkin_latitude?: number | null;
  checkin_longitude?: number | null;
  checkin_accuracy?: number | null;
  metadata?: {
    photo_url?: string; // 照片 URL
    location_offset_distance?: number; // 位置偏移距离（米）
    reason?: string;
  } | null;
}

interface AttendanceWindow {
  id: number;
  open_time: string;
  window_id: string;
  course_id: number;
  external_id: string;
  duration_minutes: number;
}

interface TeacherAttendanceData {
  course: CourseData;
  students: StudentAttendanceDetail[];
  stats: Stats;
  status: 'not_started' | 'in_progress' | 'final';
  attendance_window?: AttendanceWindow;
}

// 学生缺勤统计数据
interface StudentAbsenceStats {
  id: number;
  student_id: string;
  student_name: string;
  course_code: string;
  course_name: string;
  absence_rate: number;
  truant_rate: number;
  leave_rate: number;
  total_classes: number;
  absent_count: number;
  truant_count: number;
  leave_count: number;
  total_sessions: number; // 总课时
  completed_sessions: number; // 已上课时
}

// 学生缺勤记录详情
interface StudentAbsenceRecord {
  id: number;
  student_id: string;
  student_name: string;
  course_code: string;
  course_name: string;
  teaching_week: number;
  week_day: number;
  periods: string;
  absence_type: 'absent' | 'leave' | 'truant' | 'leave_pending';
  stat_date: string;
  semester: string;
}

// 扩展的 API 响应类型，支持实际 API 返回的格式
interface ExtendedApiResponse<T> {
  success?: boolean;
  code?: number;
  message?: string;
  data?: T;
}

function AttendanceSheetContent() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [teacherData, setTeacherData] = useState<TeacherAttendanceData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 验签按钮状态管理
  const [canCreateWindow, setCanCreateWindow] = useState(false);
  const [isCreatingWindow, setIsCreatingWindow] = useState(false);
  const [windowCountdown, setWindowCountdown] = useState<number | null>(null); // 倒计时（秒）
  const [windowExpired, setWindowExpired] = useState(false); // 窗口是否已过期

  // 验签确认对话框状态
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] =
    useState(false);

  // 补卡对话框状态
  const [makeupStudent, setMakeupStudent] =
    useState<StudentAttendanceDetail | null>(null);
  const [isMakingUp, setIsMakingUp] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 请假审批对话框状态
  const [approvalStudent, setApprovalStudent] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // 照片签到审核对话框状态
  const [photoApprovalStudent, setPhotoApprovalStudent] =
    useState<StudentAttendanceDetail | null>(null);
  const [isPhotoApprovalDialogOpen, setIsPhotoApprovalDialogOpen] =
    useState(false);
  const [isApprovingPhoto, setIsApprovingPhoto] = useState(false);

  // 缺勤统计状态
  const [absenceStats, setAbsenceStats] = useState<StudentAbsenceStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null
  );
  const [studentAbsenceRecords, setStudentAbsenceRecords] = useState<
    Record<string, StudentAbsenceRecord[]>
  >({});
  const [isLoadingRecords, setIsLoadingRecords] = useState<
    Record<string, boolean>
  >({});

  // Tab 切换状态
  const [activeTab, setActiveTab] = useState<'attendance' | 'absence'>(
    'attendance'
  );

  // 切换签到设置状态
  const [isUpdatingCheckinSetting, setIsUpdatingCheckinSetting] =
    useState(false);

  // 切换签到设置确认对话框状态
  const [isCheckinSettingDialogOpen, setIsCheckinSettingDialogOpen] =
    useState(false);
  const [pendingCheckinSetting, setPendingCheckinSetting] = useState<{
    newValue: 0 | 1;
    title: string;
    message: string;
  } | null>(null);

  const id = searchParams.get('id');

  // 格式化课程时间显示
  const formatCourseTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[start.getDay()];

    const dateStr =
      start
        .toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit'
        })
        .replace('/', '月') + '日';

    const startTimeStr = start.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const endTimeStr = end.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `${dateStr} (${weekday})\n${startTimeStr} - ${endTimeStr}`;
  };

  // 格式化教学周和节次信息
  const formatPeriod = (jc_s: string, startTime: string) => {
    const start = new Date(startTime);
    const dateStr = start
      .toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      .replace(/\//g, '/');

    return `${dateStr} ${jc_s}节`;
  };

  // 格式化缺勤类型
  const formatAbsenceType = (type: string) => {
    const typeMap: Record<string, string> = {
      absent: '缺勤',
      leave: '请假',
      truant: '旷课',
      leave_pending: '待审批'
    };
    return typeMap[type] || type;
  };

  // 格式化星期
  const formatWeekDay = (weekDay: number) => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[weekDay] || `周${weekDay}`;
  };

  // 格式化百分比
  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const loadTeacherAttendanceData = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // 使用新的合并接口
      const response = await icaLinkApiClient.get<TeacherAttendanceData>(
        `/icalink/v1/courses/external/${encodeURIComponent(id)}/complete?type=teacher`
      );

      // 处理 API 响应格式 - 检查是否有 success 字段（实际 API 响应）或 code 字段（API 客户端格式）
      const responseData =
        response as unknown as ExtendedApiResponse<TeacherAttendanceData>;
      if (
        (responseData.success && responseData.data) ||
        (response.success && response.data)
      ) {
        const data = responseData.data || response.data;
        if (data) {
          setTeacherData(data);
        }
      } else {
        throw new Error(
          responseData.message || response.message || '获取课程信息失败'
        );
      }
    } catch (error: unknown) {
      console.error('获取教师签到记录失败:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 检查是否是401错误，如果是则重定向到授权页面
      if (errorMessage.includes('401') || errorMessage.includes('需要授权')) {
        handleAuthRedirect();
        return;
      }

      setError(errorMessage || '获取课程信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载缺勤统计数据
  const loadAbsenceStats = async (courseCode: string) => {
    setIsLoadingStats(true);
    try {
      const response = await icaLinkApiClient.get<StudentAbsenceStats[]>(
        `/icalink/v1/stats/course-absence-stats/${encodeURIComponent(courseCode)}`
      );

      const responseData = response as unknown as ExtendedApiResponse<
        StudentAbsenceStats[]
      >;
      if (
        (responseData.success && responseData.data) ||
        (response.success && response.data)
      ) {
        const data = responseData.data || response.data;
        if (data) {
          setAbsenceStats(data);
        }
      }
    } catch (error) {
      console.error('获取缺勤统计失败:', error);
      toast.error('获取缺勤统计失败', {
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4000
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 加载学生缺勤记录详情
  const loadStudentAbsenceRecords = async (
    studentId: string,
    courseCode: string
  ) => {
    setIsLoadingRecords((prev) => ({ ...prev, [studentId]: true }));
    try {
      const response = await icaLinkApiClient.get<StudentAbsenceRecord[]>(
        `/icalink/v1/stats/student-absent-records?studentId=${encodeURIComponent(studentId)}&courseCode=${encodeURIComponent(courseCode)}&sortField=teaching_week&sortOrder=asc`
      );

      const responseData = response as unknown as ExtendedApiResponse<
        StudentAbsenceRecord[]
      >;
      if (
        (responseData.success && responseData.data) ||
        (response.success && response.data)
      ) {
        const data = responseData.data || response.data;
        if (data) {
          setStudentAbsenceRecords((prev) => ({ ...prev, [studentId]: data }));
        }
      }
    } catch (error) {
      console.error('获取缺勤记录详情失败:', error);
      toast.error('获取缺勤记录详情失败', {
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4000
      });
    } finally {
      setIsLoadingRecords((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  // 切换学生详情展开/收起
  const toggleStudentDetails = async (
    studentId: string,
    courseCode: string
  ) => {
    if (expandedStudentId === studentId) {
      // 收起
      setExpandedStudentId(null);
    } else {
      // 展开
      setExpandedStudentId(studentId);
      // 如果还没有加载过该学生的记录，则加载
      if (!studentAbsenceRecords[studentId]) {
        await loadStudentAbsenceRecords(studentId, courseCode);
      }
    }
  };

  // 计算是否可以创建验签窗口
  const calculateCanCreateWindow = () => {
    if (!teacherData || teacherData.status !== 'in_progress') {
      return false;
    }

    const now = new Date();
    const courseStartTime = new Date(teacherData.course.start_time);
    const courseEndTime = new Date(teacherData.course.end_time);

    // 时间条件：课程开始后 10 分钟至课程结束时间
    const windowCreateStart = new Date(
      courseStartTime.getTime() + 10 * 60 * 1000
    );

    // 检查是否在允许创建窗口的时间范围内
    if (now < windowCreateStart || now > courseEndTime) {
      return false;
    }

    // 检查是否已有活跃的签到窗口
    if (teacherData.attendance_window) {
      const windowOpenTime = new Date(teacherData.attendance_window.open_time);
      const windowValidEnd = new Date(
        windowOpenTime.getTime() +
          teacherData.attendance_window.duration_minutes * 60 * 1000
      );

      // 如果窗口还在有效期内，不能创建新窗口
      if (now < windowValidEnd) {
        return false;
      }
    }

    return true;
  };

  // 当课程ID变化时，重新加载数据
  useEffect(() => {
    loadTeacherAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 当课程数据加载完成后，加载缺勤统计
  useEffect(() => {
    if (teacherData?.course?.course_code) {
      loadAbsenceStats(teacherData.course.course_code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherData?.course?.course_code]);

  // 当 need_checkin = 0 时，自动切换到"缺勤统计"Tab
  useEffect(() => {
    if (teacherData?.course?.need_checkin === 0 && activeTab === 'attendance') {
      setActiveTab('absence');
    }
  }, [teacherData?.course?.need_checkin, activeTab]);

  // 定时器：每秒检查验签按钮状态（仅在进行中的课程）
  useEffect(() => {
    if (!teacherData || teacherData.status !== 'in_progress') {
      setCanCreateWindow(false);
      return;
    }

    // 立即计算一次
    setCanCreateWindow(calculateCanCreateWindow());

    // 每秒更新一次
    const timer = setInterval(() => {
      setCanCreateWindow(calculateCanCreateWindow());
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherData]);

  // 定时器：计算验签窗口倒计时
  useEffect(() => {
    if (!teacherData?.attendance_window) {
      setWindowCountdown(null);
      setWindowExpired(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const windowOpenTime = new Date(teacherData.attendance_window!.open_time);
      const windowValidEnd = new Date(
        windowOpenTime.getTime() +
          teacherData.attendance_window!.duration_minutes * 60 * 1000
      );

      const remainingMs = windowValidEnd.getTime() - now.getTime();
      const remainingSeconds = Math.floor(remainingMs / 1000);

      if (remainingSeconds <= 0) {
        setWindowCountdown(0);
        setWindowExpired(true);
      } else {
        setWindowCountdown(remainingSeconds);
        setWindowExpired(false);
      }
    };

    // 立即计算一次
    updateCountdown();

    // 每秒更新一次
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [teacherData?.attendance_window]);

  // 格式化倒计时显示
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAuthRedirect = () => {
    // 保存当前页面URL用于授权后返回
    const currentUrl = window.location.href;
    authManager.redirectToAuth(currentUrl);
  };

  // 打开验签确认对话框
  const handleOpenVerificationDialog = () => {
    if (!teacherData || !canCreateWindow || isCreatingWindow) {
      return;
    }
    setIsVerificationDialogOpen(true);
  };

  // 关闭验签确认对话框
  const handleCloseVerificationDialog = () => {
    if (!isCreatingWindow) {
      setIsVerificationDialogOpen(false);
    }
  };

  // 确认创建验签窗口
  const handleConfirmCreateVerificationWindow = async () => {
    if (!teacherData || !canCreateWindow || isCreatingWindow) {
      return;
    }

    setIsCreatingWindow(true);

    try {
      const response = await icaLinkApiClient.post(
        `/icalink/v1/courses/${teacherData.course.id}/verification-window`,
        {
          duration_minutes: 2 // 默认2分钟
        }
      );

      if (response.success && response.data) {
        // 更新本地状态，添加窗口信息
        setTeacherData({
          ...teacherData,
          attendance_window: {
            id: 0, // 临时ID，实际应该从响应中获取
            open_time: response.data.start_time,
            window_id: response.data.window_id,
            course_id: teacherData.course.id,
            external_id: teacherData.course.external_id,
            duration_minutes: 2
          }
        });

        // 关闭确认对话框
        setIsVerificationDialogOpen(false);

        toast.success('验签窗口已开启！', {
          description: `窗口ID: ${response.data.window_id}\n有效时间: 2分钟`,
          duration: 4000
        });
      } else {
        toast.error('创建验签窗口失败', {
          description: response.message || '请重试',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('创建验签窗口失败:', error);
      toast.error('创建验签窗口失败', {
        description: '请重试',
        duration: 4000
      });
    } finally {
      setIsCreatingWindow(false);
    }
  };

  // 打开补卡对话框
  const handleOpenMakeupDialog = (student: StudentAttendanceDetail) => {
    setMakeupStudent(student);
    setIsDialogOpen(true);
  };

  // 关闭补卡对话框
  const handleCloseMakeupDialog = () => {
    if (!isMakingUp) {
      setIsDialogOpen(false);
      setMakeupStudent(null);
    }
  };

  // 确认补卡
  const handleConfirmMakeup = async (reason: string) => {
    if (!teacherData || !makeupStudent) return;

    setIsMakingUp(true);

    try {
      // 调用教师补卡接口
      const response = await icaLinkApiClient.post(
        `/icalink/v1/courses/${teacherData.course.id}/manual-checkin`,
        {
          student_id: makeupStudent.student_id,
          reason: reason || '教师补卡'
        }
      );

      if (response.success) {
        toast.success('补卡成功！', {
          description: '学生考勤状态已更新',
          duration: 3000
        });
        // 关闭对话框
        setIsDialogOpen(false);
        setMakeupStudent(null);
        // 刷新数据
        await loadTeacherAttendanceData();
      } else {
        toast.error('补卡失败', {
          description: response.message || '请重试',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('补卡失败:', error);
      toast.error('补卡失败', {
        description: '请重试',
        duration: 4000
      });
    } finally {
      setIsMakingUp(false);
    }
  };

  // 打开请假审批对话框
  const handleOpenApprovalDialog = (student: StudentAttendanceDetail) => {
    setApprovalStudent({
      studentId: student.student_id,
      studentName: student.student_name || '未知'
    });
    setIsApprovalDialogOpen(true);
  };

  // 关闭请假审批对话框
  const handleCloseApprovalDialog = () => {
    if (!isApproving) {
      setIsApprovalDialogOpen(false);
      setApprovalStudent(null);
    }
  };

  // 查询请假申请详情
  const handleFetchLeaveApplication = async (
    studentId: string,
    courseId: string
  ) => {
    try {
      const queryParams = new URLSearchParams({
        student_id: studentId,
        course_id: courseId
      });

      const response = await icaLinkApiClient.get(
        `/icalink/v1/attendance/teacher-leave-applications?${queryParams.toString()}`
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('查询请假申请失败:', error);
      throw error;
    }
  };

  // 同意请假
  const handleApproveLeave = async (
    attendanceRecordId: number,
    comment?: string
  ) => {
    setIsApproving(true);

    try {
      const response = await icaLinkApiClient.post(
        `/icalink/v1/attendance/teacher-approve-leave`,
        {
          attendance_record_id: String(attendanceRecordId),
          action: 'approve',
          comment: comment || ''
        }
      );

      if (response.success) {
        toast.success('请假申请已批准', {
          description: '学生考勤状态已更新',
          duration: 3000
        });
        // 刷新数据
        await loadTeacherAttendanceData();
      } else {
        toast.error('审批失败', {
          description: response.message || '请重试',
          duration: 4000
        });
        throw new Error(response.message || '审批失败');
      }
    } catch (error) {
      console.error('审批失败:', error);
      toast.error('审批失败', {
        description: error instanceof Error ? error.message : '请重试',
        duration: 4000
      });
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  // 拒绝请假
  const handleRejectLeave = async (
    attendanceRecordId: number,
    comment: string
  ) => {
    setIsApproving(true);

    try {
      const response = await icaLinkApiClient.post(
        `/icalink/v1/attendance/teacher-approve-leave`,
        {
          attendance_record_id: String(attendanceRecordId),
          action: 'reject',
          comment: comment
        }
      );

      if (response.success) {
        toast.success('请假申请已拒绝', {
          description: '学生考勤状态已更新',
          duration: 3000
        });
        // 刷新数据
        await loadTeacherAttendanceData();
      } else {
        toast.error('拒绝失败', {
          description: response.message || '请重试',
          duration: 4000
        });
        throw new Error(response.message || '拒绝失败');
      }
    } catch (error) {
      console.error('拒绝失败:', error);
      toast.error('拒绝失败', {
        description: error instanceof Error ? error.message : '请重试',
        duration: 4000
      });
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  // 打开照片审核对话框
  const handleOpenPhotoApprovalDialog = (student: StudentAttendanceDetail) => {
    setPhotoApprovalStudent(student);
    setIsPhotoApprovalDialogOpen(true);
  };

  // 关闭照片审核对话框
  const handleClosePhotoApprovalDialog = () => {
    if (!isApprovingPhoto) {
      setIsPhotoApprovalDialogOpen(false);
      setPhotoApprovalStudent(null);
    }
  };

  // 批准照片签到
  const handleApprovePhotoCheckin = async () => {
    if (!photoApprovalStudent?.attendance_record_id) {
      toast.error('审批失败', {
        description: '缺少签到记录ID',
        duration: 4000
      });
      return;
    }

    setIsApprovingPhoto(true);

    try {
      // 修复：使用正确的 API 路径
      const response = await icaLinkApiClient.post(
        `/icalink/v1/attendance/records/${photoApprovalStudent.attendance_record_id}/approve-photo`,
        {
          action: 'approved' // 审批通过
        }
      );

      if (response.success) {
        toast.success('照片签到已批准', {
          description: '学生考勤状态已更新为已签到',
          duration: 3000
        });

        // 关闭对话框
        setIsPhotoApprovalDialogOpen(false);
        setPhotoApprovalStudent(null);

        // 刷新数据
        await loadTeacherAttendanceData();
      } else {
        toast.error('审批失败', {
          description: response.message || '请重试',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('审批照片签到失败:', error);
      toast.error('审批失败', {
        description: error instanceof Error ? error.message : '请重试',
        duration: 4000
      });
    } finally {
      setIsApprovingPhoto(false);
    }
  };

  // 打开切换签到设置确认对话框
  const handleToggleCheckinSetting = () => {
    if (!teacherData?.course) return;

    const course = teacherData.course;
    const newNeedCheckin = course.need_checkin === 1 ? 0 : 1;
    const title = newNeedCheckin === 0 ? '关闭签到' : '启用签到';
    const message =
      newNeedCheckin === 0
        ? '确定要将本节课设置为无需签到吗？设置后学生无需签到，本次课统计时算满勤。'
        : '确定要启用本节课的签到功能吗？启用后学生需要进行签到，系统默认每节课都需签到。';

    setPendingCheckinSetting({
      newValue: newNeedCheckin,
      title,
      message
    });
    setIsCheckinSettingDialogOpen(true);
  };

  // 确认切换签到设置
  const handleConfirmToggleCheckinSetting = async () => {
    if (!teacherData?.course || !pendingCheckinSetting) return;

    const course = teacherData.course;
    const { newValue: newNeedCheckin } = pendingCheckinSetting;

    // 关闭对话框
    setIsCheckinSettingDialogOpen(false);
    setIsUpdatingCheckinSetting(true);

    try {
      const response = await icaLinkApiClient.patch(
        `/icalink/v1/courses/${course.id}/checkin-setting`,
        {
          need_checkin: newNeedCheckin
        }
      );

      if (response.success) {
        toast.success(newNeedCheckin === 0 ? '已关闭签到' : '已启用签到', {
          description: '设置已更新',
          duration: 3000
        });
        // 刷新数据
        await loadTeacherAttendanceData();
      } else {
        // 根据错误消息显示友好提示
        let errorDescription = response.message || '请重试';
        if (
          response.message?.includes('not started') ||
          response.message?.includes('未开始')
        ) {
          errorDescription = '只能在课程开始前修改签到设置';
        }

        toast.error('设置失败', {
          description: errorDescription,
          duration: 4000
        });
        throw new Error(response.message || '设置失败');
      }
    } catch (error) {
      console.error('设置失败:', error);
      let errorDescription = '请重试';
      if (error instanceof Error) {
        if (
          error.message?.includes('not started') ||
          error.message?.includes('未开始')
        ) {
          errorDescription = '只能在课程开始前修改签到设置';
        } else {
          errorDescription = error.message;
        }
      }

      toast.error('设置失败', {
        description: errorDescription,
        duration: 4000
      });
    } finally {
      setIsUpdatingCheckinSetting(false);
    }
  };

  const getStatusIcon = (status: StudentAttendanceDetail['absence_type']) => {
    switch (status) {
      case 'unstarted':
        return <Calendar className='h-4 w-4 text-gray-500' />;
      case 'present':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'absent':
        return <XCircle className='h-4 w-4 text-red-500' />;
      case 'leave':
        return <Calendar className='h-4 w-4 text-blue-500' />;
      case 'leave_pending':
        return <AlertCircle className='h-4 w-4 text-orange-500' />;
      case 'pending_approval':
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      default:
        return <XCircle className='h-4 w-4 text-gray-500' />;
    }
  };

  const getStatusText = (status: StudentAttendanceDetail['absence_type']) => {
    switch (status) {
      case 'unstarted':
        return '未开始';
      case 'present':
        return '已签到';
      case 'absent':
        return '缺勤';
      case 'leave':
        return '请假';
      case 'leave_pending':
        return '请假（未批）';
      case 'truant':
        return '旷课';
      case 'pending_approval':
        return '签到待审核';
      default:
        return '未知';
    }
  };

  // 获取课程状态文本
  const getCourseStatusText = (status: TeacherAttendanceData['status']) => {
    switch (status) {
      case 'not_started':
        return '未开始';
      case 'in_progress':
        return '进行中';
      case 'final':
        return '已结束';
      default:
        return '未知';
    }
  };

  // 获取课程状态颜色
  const getCourseStatusColor = (status: TeacherAttendanceData['status']) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-600';
      case 'in_progress':
        return 'bg-green-100 text-green-600';
      case 'final':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (status: StudentAttendanceDetail['absence_type']) => {
    switch (status) {
      case 'unstarted':
        return 'text-gray-600 bg-gray-50';
      case 'present':
        return 'text-green-600 bg-green-50';
      case 'absent':
        return 'text-red-600 bg-red-50';
      case 'leave':
        return 'text-blue-600 bg-blue-50';
      case 'leave_pending':
        return 'text-orange-600 bg-orange-50';
      case 'pending_approval':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p className='text-gray-600'>加载签到数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <h1 className='mb-4 text-2xl font-bold text-red-600'>加载失败</h1>
          <p className='mb-4 text-gray-600'>{error}</p>
          <button
            type='button'
            onClick={() => {
              loadTeacherAttendanceData();
            }}
            className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 如果有课程ID，显示教师端课程管理页面
  if (id && teacherData) {
    const { course, students, stats } = teacherData;

    return (
      <div className='flex h-screen flex-col bg-gray-50'>
        <div className='mx-auto flex max-w-4xl flex-1 flex-col bg-white shadow-lg'>
          {/* 头部标题 - 移除标签页，只显示标题 */}
          <div className='bg-white shadow-sm'>
            <div className='border-b border-blue-600 bg-blue-50 px-4 py-3'>
              <h1 className='text-center text-lg font-semibold text-blue-600'>
                本节课签到
              </h1>
            </div>
          </div>
          {/* 主要内容 - 直接显示本节课签到内容 */}
          <div className='flex-1 overflow-hidden p-4'>
            <>
              {/* 课程信息 */}
              <div className='mb-6 rounded-lg bg-blue-50 p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <h2 className='text-xl font-semibold text-gray-800'>
                      {course.course_name}
                    </h2>
                    {/* 课程状态标签 */}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getCourseStatusColor(
                        teacherData.status
                      )}`}
                    >
                      {getCourseStatusText(teacherData.status)}
                    </span>
                  </div>
                  {/* 操作按钮组 */}
                  <div className='flex items-center space-x-2'>
                    {/* 切换签到设置按钮 - 仅在未开始的课程显示 */}
                    {teacherData.status === 'not_started' && (
                      <button
                        type='button'
                        onClick={handleToggleCheckinSetting}
                        disabled={isUpdatingCheckinSetting}
                        className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                          course.need_checkin === 0
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        } ${
                          isUpdatingCheckinSetting
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                      >
                        {isUpdatingCheckinSetting
                          ? '设置中...'
                          : course.need_checkin === 0
                            ? '启用签到'
                            : '关闭签到'}
                      </button>
                    )}
                    {/* 验签按钮 - 仅在进行中的课程且需要签到时显示 */}
                    {teacherData.status === 'in_progress' &&
                      course.need_checkin === 1 && (
                        <button
                          type='button'
                          onClick={handleOpenVerificationDialog}
                          disabled={!canCreateWindow || isCreatingWindow}
                          className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                            canCreateWindow && !isCreatingWindow
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'cursor-not-allowed bg-gray-300 text-gray-500'
                          }`}
                        >
                          {isCreatingWindow ? '创建中...' : '验签'}
                        </button>
                      )}
                  </div>
                </div>
                <div className='mb-3 text-lg font-medium text-blue-600'>
                  {formatCourseTime(
                    course.start_time.toString(),
                    course.end_time.toString()
                  )}
                </div>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='space-y-2 text-sm text-gray-600'>
                    <p className='flex items-center'>
                      <MapPin className='mr-2 h-4 w-4 text-gray-400' />
                      <span className='font-medium'>
                        {course.class_location || '未知'} 室
                      </span>
                    </p>
                    <p className='flex items-center'>
                      <User className='mr-2 h-4 w-4 text-gray-400' />
                      <span className='font-medium'>
                        {course.teacher_names || '未知'}
                      </span>
                    </p>
                  </div>
                  <div className='space-y-2 text-sm text-gray-600'>
                    <p>
                      <span className='font-medium'>时间：</span>
                      {formatPeriod(
                        course.periods || '',
                        course.start_time.toString()
                      )}
                    </p>
                    <p>
                      <span className='font-medium'>教学周：</span>
                      {course.teaching_week || '未知'}
                    </p>
                    <p>
                      <span className='font-medium'>学期：</span>
                      {course.semester}
                    </p>
                  </div>
                </div>

                {/* 窗口状态显示 - 仅在进行中的课程且有窗口时显示，窗口结束后隐藏 */}
                {teacherData.status === 'in_progress' &&
                  teacherData.attendance_window &&
                  !windowExpired && (
                    <div className='mt-3 rounded-lg border border-blue-200 bg-blue-100 p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          <div className='h-2 w-2 animate-pulse rounded-full bg-green-500'></div>
                          <span className='text-sm font-medium text-blue-800'>
                            验签窗口已开启
                          </span>
                        </div>
                        <span className='text-xs text-blue-600'>
                          窗口ID: {teacherData.attendance_window.window_id}
                        </span>
                      </div>
                      <div className='mt-2 flex items-center justify-between text-xs text-blue-700'>
                        <div>
                          开启时间:{' '}
                          {new Date(
                            teacherData.attendance_window.open_time
                          ).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}{' '}
                          | 有效时长:{' '}
                          {teacherData.attendance_window.duration_minutes} 分钟
                        </div>
                        {windowCountdown !== null && (
                          <div
                            className={`ml-4 rounded px-2 py-1 font-mono text-sm font-bold ${
                              windowCountdown <= 30
                                ? 'bg-red-200 text-red-700'
                                : 'bg-green-200 text-green-700'
                            }`}
                          >
                            剩余 {formatCountdown(windowCountdown)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* 签到统计 - 匹配图片样式 */}
              <div className='mb-6 rounded-lg bg-white p-4 shadow-sm'>
                <div className='space-y-3'>
                  {/* 第一排：基本统计 */}
                  <div className='grid grid-cols-5 gap-3 text-center'>
                    <div className='rounded-lg bg-blue-50 p-4'>
                      <div className='text-xl font-bold text-blue-600'>
                        {stats.total_count}
                      </div>
                      <div className='mt-1 text-sm text-gray-600'>总数</div>
                    </div>
                    <div className='rounded-lg bg-green-50 p-4'>
                      <div className='text-xl font-bold text-green-600'>
                        {stats.checkin_count}
                      </div>
                      <div className='mt-1 text-sm text-gray-600'>已签</div>
                    </div>
                    <div className='rounded-lg bg-blue-50 p-4'>
                      <div className='text-xl font-bold text-blue-600'>
                        {stats.leave_count}
                      </div>
                      <div className='mt-1 text-sm text-gray-600'>请假</div>
                    </div>
                    <div className='rounded-lg bg-orange-50 p-4'>
                      <div className='text-xl font-bold text-orange-600'>
                        {stats.truant_count}
                      </div>
                      <div className='mt-1 text-sm text-gray-600'>旷课</div>
                    </div>
                    <div className='rounded-lg bg-red-50 p-4'>
                      <div className='text-xl font-bold text-red-600'>
                        {stats.absent_count}
                      </div>
                      <div className='mt-1 text-sm text-gray-600'>缺勤</div>
                    </div>
                  </div>

                  {/* 第二排：课时统计 */}
                  <div className='grid grid-cols-2 gap-3 text-center'>
                    <div className='rounded-lg bg-purple-50 p-4'>
                      <div className='text-xl font-bold text-purple-600'>
                        {absenceStats.length > 0
                          ? absenceStats[0].total_sessions || 0
                          : 0}
                      </div>
                      <div className='mt-1 text-sm text-gray-600'>总课时</div>
                    </div>
                    <div className='rounded-lg bg-indigo-50 p-4'>
                      <div className='text-xl font-bold text-indigo-600'>
                        {absenceStats.length > 0
                          ? absenceStats[0].completed_sessions || 0
                          : 0}
                      </div>
                      <div className='mt-1 text-sm text-gray-600'>已上课时</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab 导航和内容区域 */}
              {students && students.length > 0 && (
                <div className='mb-6 rounded-lg bg-white shadow-sm'>
                  {/* Tab 导航栏 */}
                  <div className='flex border-b border-gray-200'>
                    {/* 签到情况 Tab - 仅在 need_checkin = 1 时显示 */}
                    {course.need_checkin === 1 && (
                      <button
                        type='button'
                        onClick={() => setActiveTab('attendance')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === 'attendance'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        签到情况
                      </button>
                    )}
                    {/* 缺勤统计 Tab - 始终显示 */}
                    <button
                      type='button'
                      onClick={() => setActiveTab('absence')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'absence'
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      缺勤统计
                    </button>
                  </div>

                  {/* Tab 内容区域 */}
                  <div className='p-4'>
                    {/* 签到情况 Tab */}
                    {activeTab === 'attendance' && (
                      <div className='max-h-96 space-y-2 overflow-y-auto'>
                        {students.map((student, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50'
                          >
                            <div className='flex items-center space-x-3'>
                              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100'>
                                <User className='h-4 w-4 text-gray-600' />
                              </div>
                              <div>
                                <div className='font-medium text-gray-900'>
                                  {student.student_name || '未知'}
                                </div>
                                <div className='text-xs text-gray-500'>
                                  {student.student_id}
                                </div>
                              </div>
                            </div>

                            <div className='flex items-center space-x-2'>
                              {/* 时间信息 */}
                              {student.absence_type === 'present' &&
                                student.checkin_time && (
                                  <span className='text-xs text-gray-500'>
                                    {new Date(
                                      student.checkin_time
                                    ).toLocaleTimeString('zh-CN', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}

                              {/* 状态标签 - 根据课程状态和学生状态显示不同内容 */}
                              {student.absence_type === 'pending_approval' &&
                              student.metadata?.photo_url ? (
                                // 照片签到待审核：显示状态标签 + 审核按钮
                                <div className='flex items-center space-x-2'>
                                  {/* 先显示状态标签 */}
                                  <span
                                    className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${getStatusColor(
                                      student.absence_type
                                    )}`}
                                  >
                                    {getStatusIcon(student.absence_type)}
                                    <span>
                                      {getStatusText(student.absence_type)}
                                    </span>
                                  </span>
                                  {/* 再显示审核按钮 - 微信风格绿底白字 */}
                                  <button
                                    type='button'
                                    onClick={() =>
                                      handleOpenPhotoApprovalDialog(student)
                                    }
                                    className='rounded-md bg-[#07C160] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#06AD56] active:bg-[#059048]'
                                  >
                                    审核
                                  </button>
                                </div>
                              ) : student.absence_type === 'leave_pending' &&
                                (teacherData.status === 'in_progress' ||
                                  teacherData.status === 'not_started') ? (
                                // 请假待审批：显示状态标签 + 审批按钮
                                <div className='flex items-center space-x-2'>
                                  {/* 先显示状态标签 */}
                                  <span
                                    className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${getStatusColor(
                                      student.absence_type
                                    )}`}
                                  >
                                    {getStatusIcon(student.absence_type)}
                                    <span>
                                      {getStatusText(student.absence_type)}
                                    </span>
                                  </span>
                                  {/* 再显示审批按钮 - 微信风格绿底白字 */}
                                  <button
                                    type='button'
                                    onClick={() =>
                                      handleOpenApprovalDialog(student)
                                    }
                                    className='rounded-md bg-[#07C160] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#06AD56] active:bg-[#059048]'
                                  >
                                    审批
                                  </button>
                                </div>
                              ) : (student.absence_type === 'absent' ||
                                  student.absence_type === 'truant') &&
                                teacherData.status === 'in_progress' &&
                                new Date() >
                                  new Date(
                                    new Date(course.start_time).getTime() +
                                      10 * 60 * 1000
                                  ) ? (
                                // 课程开始10分钟后，缺勤/旷课学生显示状态标签 + 补签按钮
                                <div className='flex items-center space-x-2'>
                                  {/* 先显示状态标签 */}
                                  <span
                                    className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${getStatusColor(
                                      student.absence_type
                                    )}`}
                                  >
                                    {getStatusIcon(student.absence_type)}
                                    <span>
                                      {getStatusText(student.absence_type)}
                                    </span>
                                  </span>
                                  {/* 再显示补签按钮 - 微信风格绿底白字 */}
                                  <button
                                    type='button'
                                    onClick={() =>
                                      handleOpenMakeupDialog(student)
                                    }
                                    className='rounded-md bg-[#07C160] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#06AD56] active:bg-[#059048]'
                                  >
                                    补签
                                  </button>
                                </div>
                              ) : (
                                // 其他情况显示普通状态标签
                                <span
                                  className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${getStatusColor(
                                    student.absence_type
                                  )}`}
                                >
                                  {getStatusIcon(student.absence_type)}
                                  <span>
                                    {getStatusText(student.absence_type)}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 缺勤统计 Tab */}
                    {activeTab === 'absence' && (
                      <div className='max-h-96 overflow-y-auto'>
                        {isLoadingStats ? (
                          <div className='flex items-center justify-center py-8'>
                            <div className='text-sm text-gray-500'>
                              加载中...
                            </div>
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            {absenceStats.map((stat) => (
                              <div key={stat.student_id} className='space-y-2'>
                                {/* 统计摘要行 */}
                                <div
                                  className='cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50'
                                  onClick={() =>
                                    toggleStudentDetails(
                                      stat.student_id,
                                      stat.course_code
                                    )
                                  }
                                >
                                  <div className='flex items-center justify-between'>
                                    <div className='flex items-center space-x-3'>
                                      <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100'>
                                        <User className='h-4 w-4 text-gray-600' />
                                      </div>
                                      <div>
                                        <div className='font-medium text-gray-900'>
                                          {stat.student_name}
                                        </div>
                                        <div className='text-xs text-gray-500'>
                                          {stat.student_id}
                                        </div>
                                      </div>
                                    </div>
                                    <div className='flex items-center space-x-4'>
                                      <div className='text-right'>
                                        <div className='flex space-x-3 text-xs'>
                                          <span className='text-red-600'>
                                            缺勤次数: {stat.absent_count}
                                          </span>
                                          <span className='text-orange-600'>
                                            旷课次数: {stat.truant_count}
                                          </span>
                                          <span className='text-blue-600'>
                                            请假次数: {stat.leave_count}
                                          </span>
                                        </div>
                                      </div>
                                      <div className='text-gray-400'>
                                        {expandedStudentId ===
                                        stat.student_id ? (
                                          <svg
                                            className='h-5 w-5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                          >
                                            <path
                                              strokeLinecap='round'
                                              strokeLinejoin='round'
                                              strokeWidth={2}
                                              d='M5 15l7-7 7 7'
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            className='h-5 w-5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                          >
                                            <path
                                              strokeLinecap='round'
                                              strokeLinejoin='round'
                                              strokeWidth={2}
                                              d='M19 9l-7 7-7-7'
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* 详情展开区域 - 移除左侧缩进,与父容器等宽 */}
                                {expandedStudentId === stat.student_id && (
                                  <div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                                    {isLoadingRecords[stat.student_id] ? (
                                      <div className='flex items-center justify-center py-4'>
                                        <div className='text-sm text-gray-500'>
                                          加载详情中...
                                        </div>
                                      </div>
                                    ) : studentAbsenceRecords[
                                        stat.student_id
                                      ] &&
                                      studentAbsenceRecords[stat.student_id]
                                        .length > 0 ? (
                                      <div className='space-y-2'>
                                        <div className='mb-2 text-sm font-medium text-gray-700'>
                                          缺勤记录详情
                                        </div>
                                        {studentAbsenceRecords[
                                          stat.student_id
                                        ].map((record) => (
                                          <div
                                            key={record.id}
                                            className='flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs'
                                          >
                                            <div className='flex items-center space-x-3'>
                                              <span className='font-medium text-gray-700'>
                                                第{record.teaching_week}周
                                              </span>
                                              <span className='text-gray-600'>
                                                {formatWeekDay(record.week_day)}
                                              </span>
                                              <span className='text-gray-600'>
                                                {record.periods}节
                                              </span>
                                            </div>
                                            <div>
                                              <span
                                                className={`rounded-full px-2 py-0.5 font-medium ${
                                                  record.absence_type ===
                                                  'truant'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : record.absence_type ===
                                                        'leave'
                                                      ? 'bg-blue-100 text-blue-700'
                                                      : 'bg-red-100 text-red-700'
                                                }`}
                                              >
                                                {formatAbsenceType(
                                                  record.absence_type
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className='py-4 text-center text-sm text-gray-500'>
                                        暂无缺勤记录
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          </div>
        </div>

        {/* <TeacherFloatingMessageButton className='fixed bottom-24 right-6 z-50' /> */}

        {/* 验签确认对话框 */}
        <VerificationConfirmDialog
          isOpen={isVerificationDialogOpen}
          onClose={handleCloseVerificationDialog}
          onConfirm={handleConfirmCreateVerificationWindow}
          isSubmitting={isCreatingWindow}
        />

        {/* 补卡对话框 */}
        <ManualCheckinDialog
          isOpen={isDialogOpen}
          student={makeupStudent}
          onClose={handleCloseMakeupDialog}
          onConfirm={handleConfirmMakeup}
          isSubmitting={isMakingUp}
        />

        {/* 请假审批对话框 */}
        {approvalStudent && (
          <LeaveApprovalDialog
            isOpen={isApprovalDialogOpen}
            studentId={approvalStudent.studentId}
            courseId={course.id}
            onClose={handleCloseApprovalDialog}
            onApprove={handleApproveLeave}
            onReject={handleRejectLeave}
            onFetchApplication={handleFetchLeaveApplication}
            isSubmitting={isApproving}
          />
        )}

        {/* 照片签到审核对话框 */}
        {photoApprovalStudent && isPhotoApprovalDialogOpen && (
          <PhotoApprovalDialog
            isOpen={isPhotoApprovalDialogOpen}
            student={photoApprovalStudent}
            onClose={handleClosePhotoApprovalDialog}
            onApprove={handleApprovePhotoCheckin}
            isSubmitting={isApprovingPhoto}
          />
        )}

        {/* 切换签到设置确认对话框 */}
        <ConfirmDialog
          isOpen={isCheckinSettingDialogOpen}
          onClose={() => setIsCheckinSettingDialogOpen(false)}
          onConfirm={handleConfirmToggleCheckinSetting}
          title={pendingCheckinSetting?.title || ''}
          message={pendingCheckinSetting?.message || ''}
          confirmText='确定'
          cancelText='取消'
          isLoading={isUpdatingCheckinSetting}
          variant='warning'
        />
      </div>
    );
  }

  // 原有的签到表功能（没有课程ID时显示）
  return null;
}

export function AttendanceSheet() {
  return (
    <ToastProvider>
      <Toaster />
      <AttendanceSheetContent />
    </ToastProvider>
  );
}

// 导出补卡对话框组件供外部使用
export { default as ManualCheckinDialog } from '@/components/ManualCheckinDialog';
