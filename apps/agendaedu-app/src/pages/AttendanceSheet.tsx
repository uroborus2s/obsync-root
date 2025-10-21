import { TeacherFloatingMessageButton } from '@/components/TeacherFloatingMessageButton';
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
  kcmc: string;
  room_s: string;
  xm_s: string;
  jc_s: string;
  jxz?: number; // 教学周
  lq?: string; // 楼群或相关标识
}

interface TeacherData {
  xh: string;
  xm: string;
  bjmc: string;
  zymc: string;
}

interface AttendanceStatus {
  is_checked_in: boolean;
  status?: 'not_started' | 'active' | 'finished';
  checkin_time?: string;
  can_checkin: boolean;
  can_leave: boolean;
  auto_start_time: string;
  auto_close_time: string;
}

interface CourseStatus {
  status: 'not_started' | 'in_progress' | 'finished';
  course_start_time: string;
  course_end_time: string;
}

interface Stats {
  total_count: number;
  checkin_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
}

interface StudentDetail {
  xh: string;
  xm: string;
  bjmc?: string;
  zymc?: string;
  status: 'not_started' | 'present' | 'absent' | 'leave' | 'leave_pending';
  checkin_time?: string;
  leave_time?: string;
  leave_reason?: string;
  location?: string;
  ip_address?: string;
}

interface TeacherAttendanceData {
  course: CourseData;
  student: TeacherData;
  attendance_status: AttendanceStatus;
  course_status: CourseStatus;
  stats: Stats;
  student_details?: StudentDetail[];
}

// 扩展的 API 响应类型，支持实际 API 返回的格式
interface ExtendedApiResponse<T> {
  success?: boolean;
  code?: number;
  message?: string;
  data?: T;
}

export function AttendanceSheet() {
  const [searchParams] = useSearchParams();
  const [teacherData, setTeacherData] = useState<TeacherAttendanceData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // 获取课程状态颜色
  const getCourseStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'finished':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取课程状态文本
  const getCourseStatusText = (status: string) => {
    switch (status) {
      case 'not_started':
        return '未开始';
      case 'in_progress':
        return '进行中';
      case 'finished':
        return '已结束';
      default:
        return '未知';
    }
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

  // 当课程ID变化时，重新加载数据
  useEffect(() => {
    loadTeacherAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAuthRedirect = () => {
    // 保存当前页面URL用于授权后返回
    const currentUrl = window.location.href;
    authManager.redirectToAuth(currentUrl);
  };

  const getStatusIcon = (status: StudentDetail['status']) => {
    switch (status) {
      case 'not_started':
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

  const getStatusText = (status: StudentDetail['status']) => {
    switch (status) {
      case 'not_started':
        return '未开始';
      case 'present':
        return '已签到';
      case 'absent':
        return '缺勤';
      case 'leave':
        return '请假';
      case 'leave_pending':
        return '请假（未批）';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: StudentDetail['status']) => {
    switch (status) {
      case 'not_started':
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

  // 计算请假总数（包含已批准的请假和待审批的请假）
  const calculateTotalLeaveCount = (
    stats: Stats,
    studentDetails?: StudentDetail[]
  ) => {
    // 从stats中获取已批准的请假数量
    let totalLeave = stats.leave_count;

    // 如果有学生详情，统计待审批的请假数量
    if (studentDetails) {
      const pendingLeaveCount = studentDetails.filter(
        (student) => student.status === 'leave_pending'
      ).length;
      totalLeave += pendingLeaveCount;
    }

    return totalLeave;
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
    const { course, course_status, stats } = teacherData;

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
                <h2 className='mb-3 text-xl font-semibold text-gray-800'>
                  {course.kcmc}
                </h2>
                <div className='mb-3 text-lg font-medium text-blue-600'>
                  {formatCourseTime(
                    course_status.course_start_time,
                    course_status.course_end_time
                  )}
                </div>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='space-y-2 text-sm text-gray-600'>
                    <p className='flex items-center'>
                      <MapPin className='mr-2 h-4 w-4 text-gray-400' />
                      <span className='font-medium'>{course.lq} 室</span>
                    </p>
                    <p className='flex items-center'>
                      <User className='mr-2 h-4 w-4 text-gray-400' />
                      <span className='font-medium'>{course.xm_s}</span>
                    </p>
                  </div>
                  <div className='space-y-2 text-sm text-gray-600'>
                    <p>
                      <span className='font-medium'>时间：</span>
                      {formatPeriod(
                        course.jc_s,
                        course_status.course_start_time
                      )}
                    </p>
                    <p>
                      <span className='font-medium'>教学周：</span>
                      {course.jxz || '未知'}
                    </p>
                    <p>
                      <span className='font-medium'>状态：</span>
                      <span
                        className={`ml-1 rounded px-2 py-1 text-xs ${getCourseStatusColor(course_status.status)}`}
                      >
                        {getCourseStatusText(course_status.status)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 签到统计 - 匹配图片样式 */}
              <div className='mb-6 rounded-lg bg-white p-4 shadow-sm'>
                <div className='grid grid-cols-4 gap-4 text-center'>
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
                      {calculateTotalLeaveCount(
                        stats,
                        teacherData.student_details
                      )}
                    </div>
                    <div className='mt-1 text-sm text-gray-600'>请假</div>
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
              {teacherData.student_details &&
                teacherData.student_details.length > 0 && (
                  <div className='mb-6 rounded-lg bg-white p-4 shadow-sm'>
                    <h3 className='mb-4 font-semibold text-gray-800'>
                      学生签到情况
                    </h3>
                    <div className='max-h-96 space-y-2 overflow-y-auto'>
                      {teacherData.student_details.map((student, index) => (
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
                                {student.xm}
                              </div>
                              <div className='text-xs text-gray-500'>
                                {student.xh}
                              </div>
                            </div>
                          </div>

                          <div className='flex items-center space-x-2'>
                            {/* 时间信息 */}
                            {student.status === 'present' &&
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

                            {/* 状态标签 */}
                            <span
                              className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${getStatusColor(
                                student.status
                              )}`}
                            >
                              {getStatusIcon(student.status)}
                              <span>{getStatusText(student.status)}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          </div>
        </div>

        <TeacherFloatingMessageButton className='fixed bottom-24 right-6 z-50' />
      </div>
    );
  }

  // 原有的签到表功能（没有课程ID时显示）
  return null;
}
