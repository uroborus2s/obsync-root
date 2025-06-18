import { StudentFloatingMessageButton } from '@/components/StudentFloatingMessageButton';
import { Toaster, ToastProvider } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import { attendanceApi } from '@/lib/attendance-api';
import { authManager } from '@/lib/auth-manager';
import { BookOpen, Calendar, Clock, MapPin, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// 固定的测试位置信息
const FIXED_LOCATION = {
  latitude: 39.9042,
  longitude: 116.4074,
  address: '教学楼A座 201教室',
  accuracy: 10
};

interface CourseData {
  kcmc: string;
  course_start_time: string;
  course_end_time: string;
  room_s: string;
  xm_s: string;
  jc_s: string;
  jxz: number;
  lq: string;
  status: string;
  // 保留旧字段以兼容现有代码
  rq?: string;
  sj_f?: string;
  sj_t?: string;
}

interface StudentData {
  xh: string;
  xm: string;
  bjmc: string;
  zymc: string;
}

interface AttendanceStatus {
  is_checked_in: boolean;
  status?: string;
  checkin_time?: string;
  can_checkin: boolean;
  can_leave: boolean;
  auto_start_time: string;
  auto_close_time: string;
}

interface Stats {
  total_count: number;
  checkin_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
}

interface AttendanceData {
  course: CourseData;
  student: StudentData;
  attendance_status: AttendanceStatus;
  stats: Stats;
}

function StudentDashboardContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const id = searchParams.get('id');

  useEffect(() => {
    console.log('⚡ useEffect 触发, id:', id);
    if (id) {
      // 如果有课程ID，获取具体课程的签到数据
      console.log('📚 有课程ID，加载签到数据...');
      loadAttendanceData();
    } else {
      // 没有课程ID，显示学生首页
      console.log('🏠 没有课程ID，显示学生首页...');
      loadDashboardData();
    }
  }, [id]);

  // 实时更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 模拟加载数据
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // 由于页面已简化，不再需要加载这些数据
    } catch (error) {
      console.error('加载数据失败:', error);
      setError('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!id) return;

    console.log('🔍 加载签到数据...');
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<AttendanceData>(
        `/attendance/${encodeURIComponent(id)}/record?type=student`
      );

      if (response.success && response.data) {
        setAttendanceData(response.data);
      } else {
        throw new Error(response.message || '获取课程信息失败');
      }
    } catch (error: unknown) {
      console.error('获取签到记录失败:', error);

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

  const handleAuthRedirect = () => {
    // 保存当前页面URL用于授权后返回
    const currentUrl = window.location.href;
    authManager.redirectToAuth(btoa(currentUrl));
  };

  const handleCheckin = async () => {
    if (!id || checkinLoading) return;

    try {
      setCheckinLoading(true);

      // 使用固定位置信息进行签到（测试模式）
      const testLocation = FIXED_LOCATION;

      // 使用正确的签到API接口
      const response = await attendanceApi.studentCheckIn(id, {
        location: testLocation.address,
        latitude: testLocation.latitude,
        longitude: testLocation.longitude,
        accuracy: testLocation.accuracy
      });

      if (response.success) {
        // 签到成功，重新获取数据
        await loadAttendanceData();
        // 使用Toast显示成功消息
        toast.success('签到成功！', {
          description: '您已成功完成课程签到（测试模式）',
          duration: 3000
        });
      } else {
        throw new Error(response.message || '签到失败');
      }
    } catch (error: unknown) {
      console.error('签到失败:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 检查是否是401错误
      if (errorMessage.includes('401') || errorMessage.includes('需要授权')) {
        handleAuthRedirect();
        return;
      }

      // 使用Toast显示错误消息
      toast.error('签到失败', {
        description: errorMessage || '签到失败，请重试',
        duration: 4000
      });
    } finally {
      setCheckinLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p className='text-gray-600'>加载中...</p>
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
                loadAttendanceData();
              } else {
                loadDashboardData();
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

  // 如果有课程ID，显示签到页面
  if (id && attendanceData) {
    const { course, student, attendance_status } = attendanceData;

    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='mx-auto max-w-md space-y-4 p-4'>
          {/* 学生信息卡片 */}
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='flex items-center space-x-4'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                <User className='h-8 w-8 text-gray-600' />
              </div>
              <div className='flex-1'>
                <h1 className='text-xl font-bold text-gray-900'>
                  {student.xm}
                </h1>
                <p className='text-gray-600'>学号：{student.xh}</p>
                <div className='mt-2 space-y-1'>
                  <p className='text-sm text-gray-500'>班级：{student.bjmc}</p>
                  <p className='text-sm text-gray-500'>专业：{student.zymc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 课程信息卡片 */}
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-bold text-gray-900'>{course.kcmc}</h2>
              <div
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  course.status === 'not_started'
                    ? 'bg-blue-100 text-blue-700'
                    : course.status === 'in_progress'
                      ? 'bg-green-100 text-green-700'
                      : course.status === 'ended'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {course.status === 'not_started' && '未开始'}
                {course.status === 'in_progress' && '进行中'}
                {course.status === 'ended' && '已结束'}
                {course.status !== 'not_started' &&
                  course.status !== 'in_progress' &&
                  course.status !== 'ended' &&
                  course.status}
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center text-gray-600'>
                <Calendar className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  {new Date(course.course_start_time).toLocaleDateString(
                    'zh-CN',
                    {
                      month: '2-digit',
                      day: '2-digit',
                      weekday: 'short'
                    }
                  )}
                </span>
              </div>
              <div className='flex items-center text-gray-600'>
                <Clock className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  {new Date(course.course_start_time).toLocaleTimeString(
                    'zh-CN',
                    {
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  )}{' '}
                  -{' '}
                  {new Date(course.course_end_time).toLocaleTimeString(
                    'zh-CN',
                    {
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  )}
                </span>
              </div>
              <div className='flex items-center text-gray-600'>
                <MapPin className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  {course.lq} {course.room_s}教室
                </span>
              </div>
              <div className='flex items-center text-gray-600'>
                <User className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>{course.xm_s}</span>
              </div>
              <div className='flex items-center text-gray-600'>
                <BookOpen className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  第{course.jxz}教学周 {course.jc_s}节
                </span>
              </div>
            </div>
          </div>

          {/* 签到状态卡片 */}
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='mb-6 text-center'>
              {attendance_status.is_checked_in ? (
                <div className='text-green-600'>
                  <div className='mb-3 text-4xl'>✓</div>
                  <div className='text-xl font-semibold'>已签到</div>
                  {attendance_status.checkin_time && (
                    <div className='mt-2 text-sm text-gray-500'>
                      签到时间：
                      {new Date(
                        attendance_status.checkin_time
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : attendance_status.status === 'leave_pending' ? (
                <div className='text-yellow-600'>
                  <div className='mb-3 text-4xl'>⏳</div>
                  <div className='text-xl font-semibold'>请假审批中</div>
                  <div className='mt-2 text-sm text-gray-500'>
                    请在右下角消息处查看审核状态或撤回请假重新签到
                  </div>
                </div>
              ) : attendance_status.status === 'leave' ? (
                <div className='text-orange-600'>
                  <div className='mb-3 text-4xl'>📝</div>
                  <div className='text-xl font-semibold'>已请假</div>
                  <div className='mt-2 text-sm text-gray-500'>
                    请假申请已通过，请在右下角处查着审核状态或撤回请假，重新签到
                  </div>
                </div>
              ) : (
                <div className='text-gray-600'>
                  <div className='mb-3 text-4xl'>⏰</div>
                  <div className='text-xl font-semibold'>未签到</div>
                  <div className='mt-2 text-sm text-gray-500'>
                    当前时间：{currentTime.toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 - 只在未签到且未请假且非审批中状态显示 */}
            {!attendance_status.is_checked_in &&
              attendance_status.status !== 'leave' &&
              attendance_status.status !== 'leave_pending' && (
                <div className='space-y-3'>
                  {/* 签到按钮 */}
                  <button
                    onClick={handleCheckin}
                    disabled={checkinLoading || !attendance_status.can_checkin}
                    className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                      !attendance_status.can_checkin
                        ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {checkinLoading
                      ? '签到中...'
                      : !attendance_status.can_checkin
                        ? '暂不可签到'
                        : '签到（测试模式）'}
                  </button>

                  {/* 请假按钮 */}
                  <button
                    onClick={() => navigate(`/leave/${encodeURIComponent(id)}`)}
                    disabled={!attendance_status.can_leave}
                    className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                      !attendance_status.can_leave
                        ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    请假
                  </button>
                </div>
              )}

            {/* 状态提示信息 */}
            {attendance_status.is_checked_in && (
              <div className='py-2 text-center text-gray-500'>您已完成签到</div>
            )}
          </div>

          {/* 时间提示卡片 */}
          <div className='rounded-lg bg-gray-50 p-4 text-sm text-gray-700'>
            <p>
              <strong>请假时间：</strong>
              {new Date(
                attendance_status.auto_start_time
              ).toLocaleString()}{' '}
              之前
            </p>
          </div>
        </div>
        <StudentFloatingMessageButton />
      </div>
    );
  }
  return null;
}

export function StudentDashboard() {
  return (
    <ToastProvider>
      <Toaster />
      <StudentDashboardContent />
    </ToastProvider>
  );
}
