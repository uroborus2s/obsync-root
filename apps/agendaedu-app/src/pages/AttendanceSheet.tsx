import ManualCheckinDialog from '@/components/ManualCheckinDialog';
import { Toaster, ToastProvider } from '@/components/ui/toast';
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
    | 'truant';
  checkin_time?: string | Date | null;
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

  // 补卡对话框状态
  const [makeupStudent, setMakeupStudent] =
    useState<StudentAttendanceDetail | null>(null);
  const [isMakingUp, setIsMakingUp] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  // 创建验签窗口
  const handleCreateVerificationWindow = async () => {
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
                  {/* 验签按钮 - 仅在进行中的课程显示 */}
                  {teacherData.status === 'in_progress' && (
                    <button
                      type='button'
                      onClick={handleCreateVerificationWindow}
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
                <div className='grid grid-cols-5 gap-3 text-center'>
                  <div className='rounded-lg bg-blue-50 p-4'>
                    <div className='text-3xl font-bold text-blue-600'>
                      {stats.total_count}
                    </div>
                    <div className='mt-1 text-sm text-gray-600'>总人数</div>
                  </div>
                  <div className='rounded-lg bg-green-50 p-4'>
                    <div className='text-3xl font-bold text-green-600'>
                      {stats.checkin_count}
                    </div>
                    <div className='mt-1 text-sm text-gray-600'>已签到</div>
                  </div>
                  <div className='rounded-lg bg-blue-50 p-4'>
                    <div className='text-3xl font-bold text-blue-600'>
                      {stats.leave_count}
                    </div>
                    <div className='mt-1 text-sm text-gray-600'>请假</div>
                  </div>
                  <div className='rounded-lg bg-orange-50 p-4'>
                    <div className='text-3xl font-bold text-orange-600'>
                      {stats.truant_count}
                    </div>
                    <div className='mt-1 text-sm text-gray-600'>旷课</div>
                  </div>
                  <div className='rounded-lg bg-red-50 p-4'>
                    <div className='text-3xl font-bold text-red-600'>
                      {stats.absent_count}
                    </div>
                    <div className='mt-1 text-sm text-gray-600'>缺勤</div>
                  </div>
                </div>
              </div>

              {/* 学生签到情况 - 匹配图片样式 */}
              {students && students.length > 0 && (
                <div className='mb-6 rounded-lg bg-white p-4 shadow-sm'>
                  <h3 className='mb-4 font-semibold text-gray-800'>
                    学生签到情况
                  </h3>
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
                          {student.absence_type === 'absent' &&
                          teacherData.status === 'in_progress' &&
                          new Date() > new Date(course.end_time) ? (
                            // 课程结束后，缺勤学生显示补卡按钮 - 微信风格绿底白字
                            <button
                              type='button'
                              onClick={() => handleOpenMakeupDialog(student)}
                              className='rounded-md bg-[#07C160] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#06AD56] active:bg-[#059048]'
                            >
                              补签
                            </button>
                          ) : (
                            // 其他情况显示普通状态标签
                            <span
                              className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${getStatusColor(
                                student.absence_type
                              )}`}
                            >
                              {getStatusIcon(student.absence_type)}
                              <span>{getStatusText(student.absence_type)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          </div>
        </div>

        {/* <TeacherFloatingMessageButton className='fixed bottom-24 right-6 z-50' /> */}

        {/* 补卡对话框 */}
        <ManualCheckinDialog
          isOpen={isDialogOpen}
          student={makeupStudent}
          onClose={handleCloseMakeupDialog}
          onConfirm={handleConfirmMakeup}
          isSubmitting={isMakingUp}
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
