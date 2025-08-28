import { TeacherFloatingMessageButton } from '@/components/TeacherFloatingMessageButton';
import {
  attendanceApi,
  type CourseAttendanceHistoryResponse,
  type PersonalCourseStatsResponse
} from '@/lib/attendance-api';
import { authManager } from '@/lib/auth-manager';
import { icaLinkApiClient } from '@/lib/icalink-api-client';
import {
  wpsCollaboration,
  type AttendanceData,
  type CourseAttendanceStats,
  type PersonalAttendanceStats
} from '@/lib/wps-collaboration-api';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronDown,
  MapPin,
  TrendingUp,
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
  const [activeTab, setActiveTab] = useState<
    'current' | 'history' | 'personal'
  >('current');
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentData, setCurrentData] = useState<AttendanceData | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherAttendanceData | null>(
    null
  );
  const [historyData, setHistoryData] = useState<AttendanceData[]>([]);
  const [courseHistoryData, setCourseHistoryData] =
    useState<CourseAttendanceHistoryResponse | null>(null);
  const [personalStats, setPersonalStats] = useState<PersonalAttendanceStats[]>(
    []
  );
  const [courseStats, setCourseStats] = useState<CourseAttendanceStats | null>(
    null
  );
  const [personalCourseStats, setPersonalCourseStats] =
    useState<PersonalCourseStatsResponse | null>(null);
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

  // 格式化历史记录时间显示
  const formatHistoryTime = (
    classDate: string,
    classTime: string,
    weekNumber?: number
  ) => {
    const date = new Date(classDate);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];

    // 格式化日期为 YYYY/MM/DD
    const dateStr = date
      .toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      .replace(/\//g, '/');

    // 处理时间格式，将 "09:50:00.000 - 11:25:00.000" 转换为 "09:50-11:25"
    const timeStr = classTime.replace(/:\d{2}\.\d{3}/g, '').replace(' - ', '-');

    // 如果有教学周信息，显示教学周
    const weekInfo = weekNumber ? `第${weekNumber}周` : '';

    return `${weekInfo}（${weekday}）${dateStr} ${timeStr}`;
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

  // 获取总人数显示值（确保始终显示数字）
  const getTotalStudentsDisplay = (record: {
    total_students: number;
    present_count: number;
    leave_count: number;
    absent_count: number;
  }) => {
    // 总人数应该始终显示，即使课程未开始
    return record.total_students;
  };

  useEffect(() => {
    if (id) {
      // 如果有课程ID，获取教师端具体课程数据
      loadTeacherAttendanceData();
      // 同时加载课程历史数据
      loadCourseHistoryData();
      // 加载个人课程统计数据
      loadPersonalCourseStats();
    } else {
      // 没有课程ID，显示原有的签到表功能
      loadAttendanceData();
    }
  }, [id]);

  // 当切换到个人统计标签页时，确保数据已加载
  useEffect(() => {
    console.log('🔍 个人统计useEffect触发:', {
      activeTab,
      id,
      hasPersonalCourseStats: !!personalCourseStats,
      personalCourseStatsSuccess: personalCourseStats?.success
    });

    if (activeTab === 'personal' && id && !personalCourseStats) {
      console.log('✅ 切换到个人统计标签页，重新加载数据');
      loadPersonalCourseStats();
    } else if (activeTab === 'personal' && id && personalCourseStats) {
      console.log('ℹ️ 个人统计数据已存在:', personalCourseStats);
    }
  }, [activeTab, id, personalCourseStats]);

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

  const loadCourseHistoryData = async () => {
    if (!id) {
      console.log('❌ loadCourseHistoryData: 没有课程ID');
      return;
    }

    try {
      console.log('🔍 开始加载课程历史数据，ID:', id);
      console.log('🌐 直接传递ID给后端，让后端处理ID到kkh的转换...');

      // 直接传递ID给后端，让后端根据ID获取kkh然后查询数据
      const response = await attendanceApi.getCourseAttendanceHistory(id);
      console.log('📊 API响应:', response);

      setCourseHistoryData(response);
      console.log('✅ 课程历史数据设置完成');
    } catch (error) {
      console.error('❌ 加载课程历史数据失败:', error);
    }
  };

  const loadPersonalCourseStats = async () => {
    if (!id) {
      console.log('❌ loadPersonalCourseStats: 没有课程ID');
      return;
    }

    try {
      console.log('🔍 开始加载个人课程统计数据，ID:', id);
      console.log('🌐 直接传递ID给后端，让后端处理ID到kkh的转换...');

      // 直接传递ID给后端，让后端根据ID获取kkh然后查询数据
      const response = await attendanceApi.getPersonalCourseStats(id);
      console.log('📊 个人统计API响应:', response);

      if (response.success && response.data) {
        setPersonalCourseStats(response);
        console.log('✅ 个人课程统计数据设置完成');
      } else {
        console.error('❌ 获取个人课程统计失败:', response.message);
        setPersonalCourseStats(null);
      }
    } catch (error) {
      console.error('❌ 获取个人课程统计失败:', error);
      setPersonalCourseStats(null);
    }
  };

  const loadAttendanceData = async () => {
    setIsLoading(true);
    try {
      // 模拟加载数据
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const current = wpsCollaboration.getMockAttendanceData();
      const history = wpsCollaboration.getMockHistoryData();
      const personal = wpsCollaboration.getMockPersonalStats();
      const course = wpsCollaboration.getMockCourseStats();

      setCurrentData(current);
      setHistoryData(history);
      setPersonalStats(personal);
      setCourseStats(course);
    } catch (error) {
      console.error('加载签到数据失败:', error);
      setError('加载签到数据失败');
    } finally {
      setIsLoading(false);
    }
  };

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

  // 兼容原有签到表功能的状态处理函数
  const getLegacyStatusIcon = (
    status: 'present' | 'late' | 'absent' | 'leave'
  ) => {
    switch (status) {
      case 'present':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'late':
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      case 'absent':
        return <XCircle className='h-4 w-4 text-red-500' />;
      case 'leave':
        return <Calendar className='h-4 w-4 text-blue-500' />;
    }
  };

  const getLegacyStatusText = (
    status: 'present' | 'late' | 'absent' | 'leave'
  ) => {
    switch (status) {
      case 'present':
        return '已签到';
      case 'late':
        return '迟到';
      case 'absent':
        return '缺勤';
      case 'leave':
        return '请假';
    }
  };

  const getLegacyStatusColor = (
    status: 'present' | 'late' | 'absent' | 'leave'
  ) => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-50';
      case 'late':
        return 'text-yellow-600 bg-yellow-50';
      case 'absent':
        return 'text-red-600 bg-red-50';
      case 'leave':
        return 'text-blue-600 bg-blue-50';
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
            onClick={() => {
              if (id) {
                loadTeacherAttendanceData();
              } else {
                loadAttendanceData();
              }
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
          {/* 头部标签页 */}
          <div className='bg-white shadow-sm'>
            <div className='flex border-b'>
              <button
                onClick={() => setActiveTab('current')}
                className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                  activeTab === 'current'
                    ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                本节课签到
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                历史统计
              </button>
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                  activeTab === 'personal'
                    ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                更多
              </button>
            </div>
          </div>
          {/* 主要内容 */}
          <div className='flex-1 overflow-hidden p-4'>
            {activeTab === 'current' && (
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
            )}

            {activeTab === 'history' && (
              <div className='flex h-full flex-col'>
                {/* 如果有课程历史数据，显示真实数据 */}
                {courseHistoryData?.success && courseHistoryData.data ? (
                  <>
                    {/* 课程信息概览 - 固定高度 */}
                    <div className='mb-4 rounded-lg bg-white p-4 shadow-sm'>
                      <h2 className='mb-4 text-lg font-semibold text-gray-900'>
                        {courseHistoryData.data.course_info.course_name} -
                        历史考勤统计
                      </h2>

                      {/* 总体统计 */}
                      <div className='grid grid-cols-4 gap-4 text-center'>
                        <div className='rounded-lg bg-blue-50 p-4'>
                          <div className='text-2xl font-bold text-blue-600'>
                            {courseHistoryData.data.overall_stats.total_classes}
                          </div>
                          <div className='text-sm text-gray-600'>总课节数</div>
                        </div>
                        <div className='rounded-lg bg-green-50 p-4'>
                          <div className='text-2xl font-bold text-green-600'>
                            {courseHistoryData.data.overall_stats.average_attendance_rate.toFixed(
                              1
                            )}
                            %
                          </div>
                          <div className='text-sm text-gray-600'>
                            平均出勤率
                          </div>
                        </div>
                        <div className='rounded-lg bg-orange-50 p-4'>
                          <div className='text-2xl font-bold text-orange-600'>
                            {courseHistoryData.data.overall_stats.total_leave}
                          </div>
                          <div className='text-sm text-gray-600'>
                            总请假次数
                          </div>
                        </div>
                        <div className='rounded-lg bg-red-50 p-4'>
                          <div className='text-2xl font-bold text-red-600'>
                            {courseHistoryData.data.overall_stats.total_absent}
                          </div>
                          <div className='text-sm text-gray-600'>
                            总缺勤次数
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 历史记录列表 - 占满剩余空间 */}
                    <div className='flex-1 rounded-lg bg-white p-4 shadow-sm'>
                      <h3 className='mb-4 font-medium text-gray-900'>
                        历史考勤记录
                      </h3>
                      <div className='flex h-full flex-col'>
                        <div className='flex-1 space-y-3 overflow-y-auto pr-2'>
                          {courseHistoryData.data.attendance_history
                            .sort((a, b) => {
                              // 按照日期时间倒序排列（最新的在前面）
                              const dateA = new Date(
                                `${a.class_date} ${a.class_time}`
                              );
                              const dateB = new Date(
                                `${b.class_date} ${b.class_time}`
                              );
                              return dateB.getTime() - dateA.getTime();
                            })
                            .map((record) => (
                              <div
                                key={record.attendance_record_id}
                                className='rounded-lg border border-gray-200 p-4'
                              >
                                <div className='mb-2 flex items-center justify-between'>
                                  <div className='flex items-center space-x-2'>
                                    <h4 className='font-medium text-gray-900'>
                                      {record.teaching_week}周
                                    </h4>
                                    <span
                                      className={`rounded-full px-2 py-1 text-xs ${getCourseStatusColor(
                                        record.course_status
                                      )}`}
                                    >
                                      {getCourseStatusText(
                                        record.course_status
                                      )}
                                    </span>
                                  </div>
                                  <div className='text-sm text-gray-500'>
                                    {formatHistoryTime(
                                      record.class_date,
                                      record.class_time
                                    )}
                                  </div>
                                </div>

                                <div className='mb-2 text-sm text-gray-600'>
                                  节次：{record.class_period || 'N/A'} |
                                  出勤率：
                                  {record.course_status === 'finished'
                                    ? `${
                                        typeof record.attendance_rate ===
                                        'number'
                                          ? record.attendance_rate.toFixed(1)
                                          : record.attendance_rate
                                      }%`
                                    : 'N/A'}
                                </div>

                                <div className='grid grid-cols-4 gap-4 text-center text-sm'>
                                  <div>
                                    <div className='font-bold text-blue-600'>
                                      {getTotalStudentsDisplay(record)}
                                    </div>
                                    <div className='text-gray-600'>总人数</div>
                                  </div>
                                  <div>
                                    <div className='font-bold text-green-600'>
                                      {record.course_status === 'finished'
                                        ? record.present_count
                                        : 'N/A'}
                                    </div>
                                    <div className='text-gray-600'>签到</div>
                                  </div>
                                  <div>
                                    <div className='font-bold text-orange-600'>
                                      {record.course_status === 'finished'
                                        ? record.leave_count
                                        : 'N/A'}
                                    </div>
                                    <div className='text-gray-600'>请假</div>
                                  </div>
                                  <div>
                                    <div className='font-bold text-red-600'>
                                      {record.course_status === 'finished'
                                        ? record.absent_count
                                        : 'N/A'}
                                    </div>
                                    <div className='text-gray-600'>缺勤</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='flex h-full items-center justify-center rounded-lg bg-white shadow-sm'>
                    <div className='text-center text-gray-500'>
                      <BarChart3 className='mx-auto mb-4 h-12 w-12' />
                      <h3 className='mb-2 text-lg font-medium'>暂无历史数据</h3>
                      <p className='text-sm'>当前课程还没有历史考勤记录</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'personal' && (
              <div className='flex h-full flex-col'>
                {/* 如果有个人课程统计数据，显示真实数据 */}
                {personalCourseStats?.success && personalCourseStats?.data ? (
                  <>
                    {/* 课程信息概览 */}
                    <div className='mb-4 rounded-lg bg-white p-4 shadow-sm'>
                      <h2 className='mb-6 text-lg font-semibold text-gray-900'>
                        {personalCourseStats.data.course_info.course_name} -
                        个人统计
                      </h2>

                      {/* 教师信息 - 增大字体并添加间隔 */}
                      <div className='mb-6 space-y-2'>
                        <p className='flex items-center'>
                          <User className='mr-2 h-4 w-4 text-gray-400' />
                          <span className='text-lg font-semibold text-gray-700'>
                            {personalCourseStats.data.course_info.teachers}
                          </span>
                        </p>
                      </div>

                      {/* 课程总体信息 */}
                      <div className='mb-6 grid grid-cols-3 gap-4 text-center'>
                        <div className='rounded-lg bg-blue-50 p-4'>
                          <div className='text-2xl font-bold text-blue-600'>
                            {personalCourseStats.data.course_info.total_classes}
                          </div>
                          <div className='text-sm text-gray-600'>总课节数</div>
                        </div>
                        <div className='rounded-lg bg-green-50 p-4'>
                          <div className='text-2xl font-bold text-green-600'>
                            {
                              personalCourseStats.data.course_info
                                .total_students
                            }
                          </div>
                          <div className='text-sm text-gray-600'>班级人数</div>
                        </div>
                        <div className='rounded-lg bg-orange-50 p-4'>
                          <div className='text-2xl font-bold text-orange-600'>
                            {Number(
                              personalCourseStats.data.course_info
                                .overall_attendance_rate
                            ).toFixed(1)}
                            %
                          </div>
                          <div className='text-sm text-gray-600'>
                            整体出勤率
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 学生个人统计列表 */}
                    <div className='flex flex-1 flex-col rounded-lg bg-white p-4 shadow-sm'>
                      <div className='mb-4 flex items-center space-x-2'>
                        <BarChart3 className='h-5 w-5 text-blue-500' />
                        <h3 className='text-lg font-semibold text-gray-900'>
                          学生个人统计
                        </h3>
                      </div>

                      <div className='flex-1 space-y-4 overflow-y-auto'>
                        {personalCourseStats.data.student_stats.map(
                          (student, index) => (
                            <div
                              key={index}
                              className='rounded-lg border border-gray-200 p-4'
                            >
                              {/* 学生基本信息 */}
                              <div className='mb-3 flex items-center justify-between'>
                                <div className='flex items-center space-x-3'>
                                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                                    <User className='h-5 w-5 text-blue-600' />
                                  </div>
                                  <div>
                                    <div className='font-medium text-gray-900'>
                                      {student.xm}
                                    </div>
                                    <div className='text-sm text-gray-500'>
                                      {student.bjmc || '未知班级'}
                                    </div>
                                    {student.zymc && (
                                      <div className='text-xs text-gray-400'>
                                        {student.zymc}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className='text-right'>
                                  <div className='text-lg font-bold text-blue-600'>
                                    {Number(student.attendance_rate).toFixed(1)}
                                    %
                                  </div>
                                  <div className='text-sm text-gray-500'>
                                    出勤率
                                  </div>
                                </div>
                              </div>

                              {/* 出勤率进度条 */}
                              <div className='mb-3 h-2 rounded-full bg-gray-200'>
                                <div
                                  className='h-2 rounded-full bg-blue-500'
                                  style={{
                                    width: `${Number(student.attendance_rate)}%`
                                  }}
                                ></div>
                              </div>

                              {/* 统计数据 */}
                              <div className='mb-3 grid grid-cols-4 gap-3 text-center text-sm'>
                                <div>
                                  <div className='font-bold text-blue-600'>
                                    {student.total_classes}
                                  </div>
                                  <div className='text-gray-600'>总课时</div>
                                </div>
                                <div>
                                  <div className='font-bold text-green-600'>
                                    {student.present_count}
                                  </div>
                                  <div className='text-gray-600'>签到</div>
                                </div>
                                <div>
                                  <div className='font-bold text-orange-600'>
                                    {student.leave_count}
                                  </div>
                                  <div className='text-gray-600'>请假</div>
                                </div>
                                <div>
                                  <div className='font-bold text-red-600'>
                                    {student.absent_count}
                                  </div>
                                  <div className='text-gray-600'>缺勤</div>
                                </div>
                              </div>

                              {/* 最近记录 */}
                              {student.recent_records &&
                                student.recent_records.length > 0 && (
                                  <div>
                                    <h5 className='mb-2 text-sm font-medium text-gray-700'>
                                      最近记录
                                    </h5>
                                    <div className='space-y-1'>
                                      {student.recent_records
                                        .slice(0, 3)
                                        .map((record, recordIndex) => (
                                          <div
                                            key={recordIndex}
                                            className='flex items-center justify-between text-xs'
                                          >
                                            <span className='text-gray-600'>
                                              {new Date(
                                                record.class_date
                                              ).toLocaleDateString('zh-CN')}
                                            </span>
                                            <span
                                              className={`rounded-full px-2 py-1 ${
                                                record.status === 'present'
                                                  ? 'bg-green-100 text-green-800'
                                                  : record.status === 'leave'
                                                    ? 'bg-orange-100 text-orange-800'
                                                    : record.status === 'absent'
                                                      ? 'bg-red-100 text-red-800'
                                                      : 'bg-gray-100 text-gray-800'
                                              }`}
                                            >
                                              {record.status === 'present'
                                                ? '签到'
                                                : record.status === 'leave'
                                                  ? '请假'
                                                  : record.status === 'absent'
                                                    ? '缺勤'
                                                    : '未开始'}
                                            </span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* 如果没有个人课程统计数据，显示加载或空状态 */
                  <div className='flex h-full items-center justify-center rounded-lg bg-white shadow-sm'>
                    <div className='text-center text-gray-500'>
                      <User className='mx-auto mb-4 h-12 w-12' />
                      <h3 className='mb-2 text-lg font-medium'>个人统计</h3>
                      <p className='text-sm'>
                        {isLoading
                          ? '正在加载个人统计数据...'
                          : '暂无个人统计数据'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <TeacherFloatingMessageButton className='fixed bottom-24 right-6 z-50' />
      </div>
    );
  }

  // 原有的签到表功能（没有课程ID时显示）
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 简化的Header - 只保留Tab导航 */}
      <div className='bg-white shadow-sm'>
        {/* Tab Navigation */}
        <div className='flex border-b'>
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
              activeTab === 'current'
                ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            本节课签到
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            历史统计
          </button>

          {/* 下拉菜单 */}
          <div className='relative'>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`flex items-center space-x-1 px-4 py-3 font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>{activeTab === 'personal' ? '个人统计' : '更多'}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showDropdown && (
              <div className='absolute right-0 top-full z-10 w-32 rounded-lg border border-gray-200 bg-white shadow-lg'>
                <button
                  onClick={() => {
                    setActiveTab('personal');
                    setShowDropdown(false);
                  }}
                  className='w-full px-4 py-2 text-left text-sm text-gray-700 first:rounded-t-lg last:rounded-b-lg hover:bg-gray-50'
                >
                  个人统计
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='p-4'>
        {activeTab === 'current' && currentData && (
          <div className='space-y-4'>
            {/* 课程信息卡片 */}
            <div className='rounded-lg bg-white p-4 shadow-sm'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  {currentData.courseName}
                </h2>
                <div className='text-sm text-gray-500'>
                  {currentData.date} {currentData.time}
                </div>
              </div>

              <div className='mb-4 grid grid-cols-2 gap-4 text-sm'>
                <div className='flex items-center'>
                  <MapPin className='mr-2 h-4 w-4 text-gray-400' />
                  <span className='text-gray-600'>{currentData.classroom}</span>
                </div>
                <div className='flex items-center'>
                  <User className='mr-2 h-4 w-4 text-gray-400' />
                  <span className='text-gray-600'>{currentData.teacher}</span>
                </div>
              </div>

              {/* 签到统计 */}
              <div className='mb-4 grid grid-cols-4 gap-4'>
                <div className='rounded-lg bg-blue-50 p-3 text-center'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {currentData.totalStudents}
                  </div>
                  <div className='text-xs text-gray-600'>总人数</div>
                </div>
                <div className='rounded-lg bg-green-50 p-3 text-center'>
                  <div className='text-2xl font-bold text-green-600'>
                    {currentData.presentCount}
                  </div>
                  <div className='text-xs text-gray-600'>已签到</div>
                </div>
                <div className='rounded-lg bg-yellow-50 p-3 text-center'>
                  <div className='text-2xl font-bold text-yellow-600'>
                    {currentData.lateCount}
                  </div>
                  <div className='text-xs text-gray-600'>迟到</div>
                </div>
                <div className='rounded-lg bg-red-50 p-3 text-center'>
                  <div className='text-2xl font-bold text-red-600'>
                    {currentData.absentCount}
                  </div>
                  <div className='text-xs text-gray-600'>缺勤</div>
                </div>
              </div>

              {/* 学生列表 */}
              <div className='space-y-2'>
                <h3 className='font-medium text-gray-900'>学生签到情况</h3>
                <div className='max-h-64 space-y-2 overflow-y-auto'>
                  {currentData.records.map((record, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between rounded-lg border border-gray-200 p-3'
                    >
                      <div className='flex items-center space-x-3'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100'>
                          <User className='h-4 w-4 text-gray-600' />
                        </div>
                        <div>
                          <div className='font-medium text-gray-900'>
                            {record.studentName}
                          </div>
                          <div className='text-xs text-gray-500'>
                            {record.studentId}
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center space-x-2'>
                        {record.checkInTime && (
                          <span className='text-xs text-gray-500'>
                            {record.checkInTime}
                          </span>
                        )}
                        <span
                          className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${getLegacyStatusColor(
                            record.status
                          )}`}
                        >
                          {getLegacyStatusIcon(record.status)}
                          <span>{getLegacyStatusText(record.status)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className='space-y-4'>
            {/* 如果有课程历史数据，显示真实数据 */}
            {courseHistoryData?.success && courseHistoryData.data ? (
              <>
                {/* 课程信息概览 */}
                <div className='rounded-lg bg-white p-4 shadow-sm'>
                  <h2 className='mb-4 text-lg font-semibold text-gray-900'>
                    {courseHistoryData.data.course_info.course_name} -
                    历史考勤统计
                  </h2>

                  {/* 总体统计 */}
                  <div className='mb-6 grid grid-cols-4 gap-4 text-center'>
                    <div className='rounded-lg bg-blue-50 p-4'>
                      <div className='text-2xl font-bold text-blue-600'>
                        {courseHistoryData.data.overall_stats.total_classes}
                      </div>
                      <div className='text-sm text-gray-600'>总课节数</div>
                    </div>
                    <div className='rounded-lg bg-green-50 p-4'>
                      <div className='text-2xl font-bold text-green-600'>
                        {courseHistoryData.data.overall_stats.average_attendance_rate.toFixed(
                          1
                        )}
                        %
                      </div>
                      <div className='text-sm text-gray-600'>平均出勤率</div>
                    </div>
                    <div className='rounded-lg bg-orange-50 p-4'>
                      <div className='text-2xl font-bold text-orange-600'>
                        {courseHistoryData.data.overall_stats.total_leave}
                      </div>
                      <div className='text-sm text-gray-600'>总请假次数</div>
                    </div>
                    <div className='rounded-lg bg-red-50 p-4'>
                      <div className='text-2xl font-bold text-red-600'>
                        {courseHistoryData.data.overall_stats.total_absent}
                      </div>
                      <div className='text-sm text-gray-600'>总缺勤次数</div>
                    </div>
                  </div>

                  {/* 历史记录列表 */}
                  <div className='space-y-3'>
                    <h3 className='font-medium text-gray-900'>历史考勤记录</h3>
                    <div className='max-h-96 space-y-3 overflow-y-auto'>
                      {courseHistoryData.data.attendance_history
                        .sort((a, b) => {
                          // 按照日期时间倒序排列（最新的在前面）
                          const dateA = new Date(
                            `${a.class_date} ${a.class_time}`
                          );
                          const dateB = new Date(
                            `${b.class_date} ${b.class_time}`
                          );
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((record, index) => (
                          <div
                            key={record.attendance_record_id}
                            className='rounded-lg border border-gray-200 p-4'
                          >
                            <div className='mb-2 flex items-center justify-between'>
                              <h4 className='font-medium text-gray-900'>
                                第{index + 1}节课
                              </h4>
                              <div className='text-sm text-gray-500'>
                                {formatHistoryTime(
                                  record.class_date,
                                  record.class_time,
                                  record.teaching_week
                                )}
                              </div>
                            </div>

                            <div className='mb-2 text-sm text-gray-600'>
                              节次：{record.class_period} | 出勤率：
                              {typeof record.attendance_rate === 'number'
                                ? record.attendance_rate.toFixed(1)
                                : record.attendance_rate}
                              %
                            </div>

                            <div className='grid grid-cols-4 gap-4 text-center text-sm'>
                              <div>
                                <div className='font-bold text-blue-600'>
                                  {record.total_students}
                                </div>
                                <div className='text-gray-600'>总人数</div>
                              </div>
                              <div>
                                <div className='font-bold text-green-600'>
                                  {record.present_count}
                                </div>
                                <div className='text-gray-600'>签到</div>
                              </div>
                              <div>
                                <div className='font-bold text-orange-600'>
                                  {record.leave_count}
                                </div>
                                <div className='text-gray-600'>请假</div>
                              </div>
                              <div>
                                <div className='font-bold text-red-600'>
                                  {record.absent_count}
                                </div>
                                <div className='text-gray-600'>缺勤</div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* 如果没有课程历史数据，显示原有的模拟数据 */
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <h2 className='mb-4 text-lg font-semibold text-gray-900'>
                  历史签到记录
                </h2>
                <div className='space-y-3'>
                  {historyData
                    .sort((a, b) => {
                      // 按照日期时间倒序排列（最新的在前面）
                      const dateA = new Date(`${a.date} ${a.time}`);
                      const dateB = new Date(`${b.date} ${b.time}`);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map((data, index) => (
                      <div
                        key={index}
                        className='rounded-lg border border-gray-200 p-4'
                      >
                        <div className='mb-2 flex items-center justify-between'>
                          <h3 className='font-medium text-gray-900'>
                            {data.courseName}
                          </h3>
                          <span className='text-sm text-gray-500'>
                            {data.date} {data.time}
                          </span>
                        </div>
                        <div className='grid grid-cols-4 gap-4 text-center text-sm'>
                          <div>
                            <div className='font-bold text-blue-600'>
                              {data.totalStudents}
                            </div>
                            <div className='text-gray-600'>总人数</div>
                          </div>
                          <div>
                            <div className='font-bold text-green-600'>
                              {data.presentCount}
                            </div>
                            <div className='text-gray-600'>签到</div>
                          </div>
                          <div>
                            <div className='font-bold text-yellow-600'>
                              {data.lateCount}
                            </div>
                            <div className='text-gray-600'>迟到</div>
                          </div>
                          <div>
                            <div className='font-bold text-red-600'>
                              {data.absentCount}
                            </div>
                            <div className='text-gray-600'>缺勤</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'personal' && (
          <div className='space-y-4'>
            {/* 个人统计图表 */}
            <div className='rounded-lg bg-white p-4 shadow-sm'>
              <div className='mb-4 flex items-center space-x-2'>
                <BarChart3 className='h-5 w-5 text-blue-500' />
                <h2 className='text-lg font-semibold text-gray-900'>
                  个人出勤统计
                </h2>
              </div>

              {/* 统计数据 */}
              {personalStats.map((stat, index) => (
                <div key={index} className='mb-4 last:mb-0'>
                  <div className='mb-2 flex items-center justify-between'>
                    <span className='font-medium text-gray-900'>
                      {stat.studentName}
                    </span>
                    <span className='text-sm text-gray-500'>
                      出勤率 {stat.attendanceRate}%
                    </span>
                  </div>

                  <div className='mb-2 h-2 rounded-full bg-gray-200'>
                    <div
                      className='h-2 rounded-full bg-blue-500'
                      style={{ width: `${stat.attendanceRate}%` }}
                    ></div>
                  </div>

                  <div className='grid grid-cols-4 gap-2 text-xs text-gray-600'>
                    <div className='text-center'>
                      <div className='font-medium text-blue-600'>
                        {stat.totalClasses}
                      </div>
                      <div>总课时</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-medium text-green-600'>
                        {stat.presentCount}
                      </div>
                      <div>已出勤</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-medium text-yellow-600'>
                        {stat.lateCount}
                      </div>
                      <div>迟到</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-medium text-red-600'>
                        {stat.absentCount}
                      </div>
                      <div>缺勤</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 课程统计概览 */}
            {courseStats && (
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <div className='mb-4 flex items-center space-x-2'>
                  <TrendingUp className='h-5 w-5 text-green-500' />
                  <h2 className='text-lg font-semibold text-gray-900'>
                    本学期概览
                  </h2>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='rounded-lg bg-blue-50 p-4 text-center'>
                    <div className='text-2xl font-bold text-blue-600'>
                      {courseStats.totalClasses}
                    </div>
                    <div className='text-sm text-gray-600'>总课时数</div>
                  </div>
                  <div className='rounded-lg bg-green-50 p-4 text-center'>
                    <div className='text-2xl font-bold text-green-600'>
                      {courseStats.overallAttendanceRate.toFixed(1)}%
                    </div>
                    <div className='text-sm text-gray-600'>平均出勤率</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TeacherFloatingMessageButton />
    </div>
  );
}
