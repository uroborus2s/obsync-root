import { FloatingApprovalButton } from '@/components/FloatingApprovalButton';
import {
  attendanceApi,
  type ClassAttendanceStats,
  type CourseAttendanceHistoryResponse,
  type StudentAttendanceSearchResponse,
  type StudentCheckInRequest
} from '@/lib/attendance-api';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  RefreshCw,
  Share2,
  TrendingUp,
  User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
}

// 固定的测试位置信息
const FIXED_LOCATION: LocationInfo = {
  latitude: 39.9042,
  longitude: 116.4074,
  address: '教学楼A座 201教室'
};

export function CheckIn() {
  const navigate = useNavigate();
  const { attendanceId } = useParams<{ attendanceId: string }>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<string>(
    FIXED_LOCATION.address || ''
  );
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(
    FIXED_LOCATION
  );
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceData, setAttendanceData] =
    useState<StudentAttendanceSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [historyData, setHistoryData] =
    useState<CourseAttendanceHistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 加载考勤数据
    if (attendanceId) {
      loadAttendanceData();
    } else {
      setError('缺少考勤ID参数');
      setIsLoadingData(false);
    }

    // 自动设置固定位置信息
    setLocationInfo(FIXED_LOCATION);
    setLocation(FIXED_LOCATION.address || '');

    return () => clearInterval(timer);
  }, [attendanceId]);

  const loadAttendanceData = async () => {
    if (!attendanceId) return;

    setIsLoadingData(true);
    setError(null);
    try {
      const response =
        await attendanceApi.getStudentAttendanceRecord(attendanceId);

      if (response.success && response.data) {
        setAttendanceData(response);
        // 检查是否已经签到
        if (response.data.attendance_status.is_checked_in) {
          setIsCheckedIn(true);
        }
      } else {
        setError(response.message || '获取考勤信息失败');
      }
    } catch (error) {
      console.error('加载考勤数据失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadCourseHistory = async () => {
    if (!attendanceData?.data?.course?.kkh) return;

    setIsLoadingHistory(true);
    try {
      // 从考勤数据中动态获取课程号
      const kkh = attendanceData.data.course.kkh;

      const response = await attendanceApi.getCourseAttendanceHistory(kkh);

      if (response.success && response.data) {
        setHistoryData(response);
      } else {
        console.error('获取课程历史失败:', response.message);
      }
    } catch (error) {
      console.error('加载课程历史失败:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory && !historyData) {
      loadCourseHistory();
    }
  };

  // 计算学期开始日期（这里需要根据实际情况调整）
  const getSemesterStartDate = (xnxq: string): Date => {
    // 解析学年学期，例如 "2024-2025-2" 表示2024-2025学年第2学期
    const [startYear, endYear, semester] = xnxq.split('-');

    if (semester === '1') {
      // 第一学期通常从9月开始
      return new Date(parseInt(startYear), 8, 1); // 9月1日
    } else {
      // 第二学期通常从2月开始
      return new Date(parseInt(endYear), 1, 1); // 2月1日
    }
  };

  // 计算周数
  const getWeekNumber = (classDate: string, semesterStart: Date): number => {
    const date = new Date(classDate);
    const diffTime = date.getTime() - semesterStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  };

  // 格式化课程时间显示
  const formatClassTime = (
    classItem: ClassAttendanceStats,
    semesterStart: Date
  ): string => {
    // 优先使用教学周信息，如果没有则计算周数
    const weekNum =
      classItem.teaching_week ||
      getWeekNumber(classItem.class_date, semesterStart);
    const date = new Date(classItem.class_date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}/${month}/${day}`;

    return `第${weekNum}周 ${dateStr} ${classItem.class_time}`;
  };

  // 获取出勤率颜色
  const getAttendanceRateColor = (rate: number): string => {
    if (rate >= 0.9) return 'text-green-600';
    if (rate >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleGetLocation = async () => {
    setIsLoading(true);
    try {
      // 直接使用固定位置信息，用于测试
      setLocationInfo(FIXED_LOCATION);
      setLocation(
        FIXED_LOCATION.address ||
          `${FIXED_LOCATION.latitude.toFixed(6)}, ${FIXED_LOCATION.longitude.toFixed(6)}`
      );
      setIsLoading(false);
      alert('位置获取成功（测试模式）');
    } catch (error) {
      console.error('获取位置失败:', error);
      setIsLoading(false);
      alert('获取位置失败，请重试');
    }
  };

  const handleCheckIn = async () => {
    if (!attendanceId) {
      alert('缺少考勤ID');
      return;
    }

    // 去掉位置检查，直接使用固定位置进行签到
    const currentLocationInfo = locationInfo || FIXED_LOCATION;

    setIsLoading(true);
    try {
      const checkInRequest: StudentCheckInRequest = {
        location: currentLocationInfo.address,
        latitude: currentLocationInfo.latitude,
        longitude: currentLocationInfo.longitude
      };

      const response = await attendanceApi.studentCheckIn(
        attendanceId,
        checkInRequest
      );

      if (response.success) {
        setIsCheckedIn(true);
        alert('签到成功！');

        // 重新加载数据以获取最新状态
        setTimeout(() => {
          loadAttendanceData();
        }, 1000);
      } else {
        setError(response.message || '签到失败');
        alert(response.message || '签到失败，请重试');
      }
    } catch (error) {
      console.error('签到失败:', error);
      setError('签到失败，请重试');
      alert('签到失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!attendanceData?.data) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: '课程签到',
          text: `我已完成《${attendanceData.data.course.kcmc}》的签到`,
          url: window.location.href
        });
      } else {
        // 复制到剪贴板
        const text = `我已完成《${attendanceData.data.course.kcmc}》的签到 - ${window.location.href}`;
        await navigator.clipboard.writeText(text);
        alert('分享链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
      alert('分享失败，请重试');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getAttendanceStatusText = (status?: string) => {
    switch (status) {
      case 'present':
        return '已签到';
      case 'absent':
        return '缺勤';
      case 'leave':
        return '请假';
      case 'pending_approval':
        return '待审批';
      case 'leave_pending':
        return '请假待审批';
      default:
        return '未签到';
    }
  };

  const getAttendanceStatusColor = (status?: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-100';
      case 'absent':
        return 'text-red-600 bg-red-100';
      case 'leave':
        return 'text-blue-600 bg-blue-100';
      case 'pending_approval':
      case 'leave_pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoadingData) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p className='text-gray-600'>加载考勤信息中...</p>
        </div>
      </div>
    );
  }

  if (error && !attendanceData) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='bg-white shadow-sm'>
          <div className='flex items-center px-4 py-4'>
            <button
              onClick={() => navigate(-1)}
              className='rounded-lg p-2 hover:bg-gray-100'
              aria-label='返回'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='ml-3 text-lg font-semibold'>课程签到</h1>
          </div>
        </div>
        <div className='flex items-center justify-center py-8'>
          <div className='rounded-lg bg-white p-8 text-center shadow-sm'>
            <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-400' />
            <h3 className='mb-2 text-lg font-medium text-gray-900'>加载失败</h3>
            <p className='mb-4 text-gray-600'>{error}</p>
            <button
              onClick={loadAttendanceData}
              className='rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm'>
        <div className='flex items-center justify-between px-4 py-4'>
          <div className='flex items-center'>
            <button
              onClick={() => navigate(-1)}
              className='rounded-lg p-2 hover:bg-gray-100'
              aria-label='返回'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='ml-3 text-lg font-semibold'>课程签到</h1>
          </div>
          <button
            onClick={loadAttendanceData}
            disabled={isLoadingData}
            className='rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50'
            aria-label='刷新'
          >
            <RefreshCw
              className={`h-5 w-5 ${isLoadingData ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className='space-y-6 p-4'>
        {/* 错误提示 */}
        {error && (
          <div className='rounded-lg bg-red-50 p-4'>
            <div className='flex items-center'>
              <AlertCircle className='mr-2 h-5 w-5 text-red-500' />
              <span className='text-sm text-red-700'>{error}</span>
            </div>
          </div>
        )}

        {/* 时间显示 */}
        <div className='rounded-lg bg-white p-6 text-center shadow-sm'>
          <div className='mb-2 text-3xl font-bold text-gray-900'>
            {formatTime(currentTime)}
          </div>
          <div className='text-gray-600'>{formatDate(currentTime)}</div>
        </div>

        {/* 课程信息 */}
        {attendanceData?.data && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900'>课程信息</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs ${getAttendanceStatusColor(attendanceData.data.attendance_status.status)}`}
              >
                {getAttendanceStatusText(
                  attendanceData.data.attendance_status.status
                )}
              </span>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center'>
                <div className='mr-3 h-2 w-2 rounded-full bg-blue-500'></div>
                <div className='flex-1'>
                  <div className='font-medium text-gray-900'>
                    {attendanceData.data.course.kcmc}
                  </div>
                  <div className='text-sm text-gray-500'>
                    {attendanceData.data.course.sj_f} -{' '}
                    {attendanceData.data.course.sj_t}
                  </div>
                </div>
              </div>

              {attendanceData.data.course.room_s && (
                <div className='flex items-center'>
                  <MapPin className='mr-3 h-4 w-4 text-gray-400' />
                  <span className='text-gray-600'>
                    {attendanceData.data.course.room_s}
                  </span>
                </div>
              )}

              {attendanceData.data.course.xm_s && (
                <div className='flex items-center'>
                  <User className='mr-3 h-4 w-4 text-gray-400' />
                  <span className='text-gray-600'>
                    {attendanceData.data.course.xm_s}
                  </span>
                </div>
              )}

              {attendanceData.data.course.jxz && (
                <div className='flex items-center'>
                  <Calendar className='mr-3 h-4 w-4 text-gray-400' />
                  <span className='text-gray-600'>
                    第{attendanceData.data.course.jxz}教学周
                  </span>
                </div>
              )}

              {attendanceData.data.course.lq && (
                <div className='flex items-center'>
                  <MapPin className='mr-3 h-4 w-4 text-gray-400' />
                  <span className='text-gray-600'>
                    {attendanceData.data.course.lq}
                  </span>
                </div>
              )}

              <div className='flex items-center'>
                <Clock className='mr-3 h-4 w-4 text-gray-400' />
                <span
                  className={`text-sm font-medium ${
                    attendanceData.data.course.status === 'not_started'
                      ? 'text-gray-600'
                      : attendanceData.data.course.status === 'in_progress'
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}
                >
                  {attendanceData.data.course.status === 'not_started'
                    ? '未开始'
                    : attendanceData.data.course.status === 'in_progress'
                      ? '进行中'
                      : '已完成'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 签到统计 */}
        {attendanceData?.data?.stats && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='mb-4 flex items-center'>
              <TrendingUp className='mr-2 h-5 w-5 text-blue-500' />
              <h3 className='font-medium text-gray-900'>考勤统计</h3>
            </div>
            <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-600'>
                  {attendanceData.data.stats.checkin_count}
                </div>
                <div className='text-sm text-gray-600'>签到</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-red-600'>
                  {attendanceData.data.stats.absent_count}
                </div>
                <div className='text-sm text-gray-600'>缺勤</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-blue-600'>
                  {attendanceData.data.stats.leave_count}
                </div>
                <div className='text-sm text-gray-600'>请假</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-gray-600'>
                  {attendanceData.data.stats.total_count}
                </div>
                <div className='text-sm text-gray-600'>总课时</div>
              </div>
            </div>
          </div>
        )}

        {/* 课程历史记录 */}
        <div className='rounded-lg bg-white shadow-sm'>
          <button
            onClick={toggleHistory}
            className='flex w-full items-center justify-between p-4 text-left hover:bg-gray-50'
          >
            <div className='flex items-center'>
              <Calendar className='mr-2 h-5 w-5 text-blue-500' />
              <h3 className='font-medium text-gray-900'>课程历史记录</h3>
            </div>
            {showHistory ? (
              <ChevronUp className='h-5 w-5 text-gray-400' />
            ) : (
              <ChevronDown className='h-5 w-5 text-gray-400' />
            )}
          </button>

          {showHistory && (
            <div className='border-t border-gray-200 p-4'>
              {isLoadingHistory ? (
                <div className='py-4 text-center'>
                  <div className='mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500'></div>
                  <p className='text-sm text-gray-600'>加载历史记录中...</p>
                </div>
              ) : historyData?.data ? (
                <div className='space-y-3'>
                  {/* 课程总体统计 */}
                  <div className='mb-4 rounded-lg bg-gray-50 p-3'>
                    <h4 className='mb-2 font-medium text-gray-900'>
                      {historyData.data.course_info.course_name}
                    </h4>
                    <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
                      <div>
                        <span className='text-gray-600'>总课时：</span>
                        <span className='font-medium'>
                          {historyData.data.overall_stats.total_classes}
                        </span>
                      </div>
                      <div>
                        <span className='text-gray-600'>平均出勤率：</span>
                        <span
                          className={`font-medium ${getAttendanceRateColor(historyData.data.overall_stats.average_attendance_rate)}`}
                        >
                          {(
                            historyData.data.overall_stats
                              .average_attendance_rate * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div>
                        <span className='text-gray-600'>总学生数：</span>
                        <span className='font-medium'>
                          {historyData.data.overall_stats.total_students}
                        </span>
                      </div>
                      <div>
                        <span className='text-gray-600'>学年学期：</span>
                        <span className='font-medium'>
                          {historyData.data.course_info.xnxq}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 历史记录列表 */}
                  <div className='space-y-2'>
                    {historyData.data.attendance_history.map((classItem) => {
                      const semesterStart = getSemesterStartDate(
                        historyData.data!.course_info.xnxq
                      );
                      return (
                        <div
                          key={classItem.attendance_record_id}
                          className='flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50'
                        >
                          <div className='flex-1'>
                            <div className='font-medium text-gray-900'>
                              {formatClassTime(classItem, semesterStart)}
                            </div>
                            <div className='text-sm text-gray-500'>
                              节次：{classItem.class_period}
                            </div>
                          </div>
                          <div className='text-right'>
                            <div
                              className={`text-sm font-medium ${getAttendanceRateColor(classItem.attendance_rate)}`}
                            >
                              出勤率{' '}
                              {(classItem.attendance_rate * 100).toFixed(1)}%
                            </div>
                            <div className='text-xs text-gray-500'>
                              {classItem.present_count}/
                              {classItem.total_students}人
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className='py-4 text-center text-gray-500'>
                  暂无历史记录
                </div>
              )}
            </div>
          )}
        </div>

        {/* 位置信息 */}
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center'>
              <MapPin className='mr-2 h-5 w-5 text-blue-500' />
              <h3 className='font-medium text-gray-900'>位置信息</h3>
            </div>
            <button
              onClick={handleGetLocation}
              disabled={isLoading}
              className='rounded-lg bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 disabled:opacity-50'
            >
              {isLoading ? '获取中...' : '获取位置'}
            </button>
          </div>
          <div className='text-sm text-gray-600'>
            {location || '请点击获取位置信息'}
          </div>
        </div>

        {/* 签到按钮 */}
        {!isCheckedIn &&
        !attendanceData?.data?.attendance_status.is_checked_in ? (
          <button
            onClick={handleCheckIn}
            disabled={isLoading}
            className='w-full rounded-lg bg-green-500 py-4 text-lg font-medium text-white hover:bg-green-600 disabled:opacity-50'
          >
            {isLoading ? (
              <div className='flex items-center justify-center'>
                <div className='mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white'></div>
                签到中...
              </div>
            ) : (
              <div className='flex items-center justify-center'>
                <CheckCircle className='mr-2 h-5 w-5' />
                立即签到（测试模式）
              </div>
            )}
          </button>
        ) : (
          <div className='rounded-lg bg-green-50 p-4 text-center'>
            <CheckCircle className='mx-auto mb-2 h-8 w-8 text-green-500' />
            <div className='font-medium text-green-700'>签到成功</div>
            <div className='text-sm text-green-600'>
              {attendanceData?.data?.attendance_status.checkin_time &&
                `签到时间: ${new Date(attendanceData.data.attendance_status.checkin_time).toLocaleString('zh-CN')}`}
            </div>
            <button
              onClick={handleShare}
              className='mt-3 flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600'
            >
              <Share2 className='mr-1 h-4 w-4' />
              分享签到
            </button>
          </div>
        )}
      </div>

      <FloatingApprovalButton />
    </div>
  );
}
