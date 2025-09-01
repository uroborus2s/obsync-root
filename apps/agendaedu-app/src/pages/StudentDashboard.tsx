import { StudentFloatingMessageButton } from '@/components/StudentFloatingMessageButton';
import { Toaster, ToastProvider } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { attendanceApi } from '@/lib/attendance-api';
import { authManager } from '@/lib/auth-manager';
import { icaLinkApiClient } from '@/lib/icalink-api-client';
import { getUserInfoFromCookie, type JWTPayload } from '@/lib/jwt-utils';
import { LocationHelper } from '@/utils/location-helper';
import {
  formatDistance,
  validateLocationForCheckIn
} from '@/utils/locationUtils';
import { BookOpen, Calendar, Clock, MapPin, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// 移除固定测试位置，使用真实位置获取

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
  const [userInfo, setUserInfo] = useState<JWTPayload | null>(null);
  // const [wpsInitialized, setWpsInitialized] = useState(false);

  const id = searchParams.get('id');

  // // 初始化WPS JSAPI
  // useEffect(() => {
  //   const initializeWPS = async () => {
  //     try {
  //       console.log('🔧 开始初始化WPS JSAPI...');

  //       // 检查是否在WPS环境中
  //       if (wpsAuthService.isWPSEnvironment()) {
  //         console.log('📱 检测到WPS环境，开始授权...');

  //         // 检查WPS SDK是否已加载
  //         if (typeof window !== 'undefined' && window.ksoxz_sdk) {
  //           console.log('✅ WPS SDK已加载，尝试初始化...');

  //           // 首先获取WPS配置
  //           try {
  //             // 获取当前页面URL
  //             const currentUrl = window.location.href;

  //             const response = await fetch(
  //               `/api/auth/wps/jsapi-ticket?url=${encodeURIComponent(currentUrl)}`
  //             );
  //             const config = await response.json();

  //             if (config && config.appId) {
  //               console.log('📋 获取到WPS配置:', config);

  //               // 使用获取的配置初始化WPS SDK
  //               if (window.ksoxz_sdk.config) {
  //                 window.ksoxz_sdk.config({
  //                   params: {
  //                     appId: config.appId,
  //                     timeStamp: config.timeStamp,
  //                     nonceStr: config.nonceStr,
  //                     signature: config.signature
  //                   },
  //                   onSuccess: function () {
  //                     console.log('✅ WPS SDK配置成功');
  //                     setWpsInitialized(true);
  //                   },
  //                   onError: function (error: unknown) {
  //                     console.error('❌ WPS SDK配置失败:', error);
  //                     setWpsInitialized(true); // 标记为已初始化，回退到浏览器API
  //                   }
  //                 });
  //               } else {
  //                 console.warn(
  //                   '⚠️ WPS SDK不支持config方法，直接标记为已初始化'
  //                 );
  //                 setWpsInitialized(true);
  //               }
  //             } else {
  //               console.warn('⚠️ WPS配置获取失败，使用默认配置');
  //               setWpsInitialized(true);
  //             }
  //           } catch (configError) {
  //             console.error('❌ 获取WPS配置失败:', configError);
  //             setWpsInitialized(true);
  //           }
  //         } else {
  //           console.warn('⚠️ WPS SDK未加载，请检查script标签');
  //           setWpsInitialized(true);
  //         }
  //       } else {
  //         console.log('🌐 非WPS环境，将使用浏览器原生API');
  //         setWpsInitialized(true); // 标记为已初始化，使用浏览器API
  //       }
  //     } catch (error) {
  //       console.error('❌ WPS JSAPI初始化异常:', error);
  //       setWpsInitialized(true); // 即使失败也标记为已初始化，回退到浏览器API
  //     }
  //   };

  //   // initializeWPS();
  // }, []);

  useEffect(() => {
    // 从cookie获取用户信息
    const user = getUserInfoFromCookie();
    setUserInfo(user);

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
      // 使用新的合并接口
      const response = await icaLinkApiClient.get<AttendanceData>(
        `/icalink/v1/courses/external/${encodeURIComponent(id)}/complete?type=student`
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
    authManager.redirectToAuth(currentUrl);
  };

  const handleCheckin = async () => {
    if (!id || checkinLoading || !attendanceData) return;

    try {
      setCheckinLoading(true);
      // 获取真实位置信息进行签到
      let locationData;
      try {
        locationData = await LocationHelper.getCurrentLocation();
        console.log('📍 获取到当前位置:', locationData);
      } catch (error) {
        console.error('获取位置失败:', error);
        toast.error('获取位置失败，请检查位置权限设置');
        return;
      }

      // 进行位置验证
      const roomInfo = attendanceData.course.room_s;
      console.log('🏫 课程房间信息:', roomInfo);

      if (!roomInfo) {
        toast.error('课程房间信息缺失，无法进行位置验证');
        return;
      }

      // 验证用户位置是否在允许的签到范围内（500米）
      const locationValidation = validateLocationForCheckIn(
        {
          lng: locationData.longitude,
          lat: locationData.latitude
        },
        roomInfo
      );

      console.log('🎯 位置验证结果:', locationValidation);

      if (!locationValidation.valid) {
        // 位置验证失败，显示详细错误信息
        const errorMsg = locationValidation.error || '不在签到范围内';
        const distanceInfo = locationValidation.distance
          ? `当前距离: ${formatDistance(locationValidation.distance)}`
          : '';

        toast.error('签到失败', {
          description: `${errorMsg}${distanceInfo ? '\n' + distanceInfo : ''}`,
          duration: 5000
        });
        return;
      }

      // 位置验证通过，显示成功信息
      const successMsg = locationValidation.matchedBuilding
        ? `位置验证通过，距离${locationValidation.matchedBuilding.name} ${formatDistance(locationValidation.distance || 0)}`
        : '位置验证通过';

      console.log('✅ ' + successMsg);

      // 使用真实位置信息进行签到
      const response = await attendanceApi.studentCheckIn(id, {
        location: locationData.address,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy
      });

      if (response.success) {
        // 签到成功，重新获取数据
        await loadAttendanceData();
        // 使用Toast显示成功消息
        toast.success('签到成功！', {
          description: successMsg,
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
    const { course, attendance_status } = attendanceData;

    // 计算签到时间窗口（上课前10分钟到上课后10分钟）
    const courseStartTime = new Date(course.course_start_time);
    const checkinStartTime = new Date(
      courseStartTime.getTime() - 10 * 60 * 1000
    ); // 上课前10分钟
    const checkinEndTime = new Date(courseStartTime.getTime() + 10 * 60 * 1000); // 上课后10分钟

    // 判断当前是否在签到时间窗口内
    const isInCheckinWindow =
      currentTime >= checkinStartTime && currentTime <= checkinEndTime;

    // 计算请假截止时间（课程开始前8小时）
    const leaveDeadlineTime = new Date(courseStartTime.getTime()); // 课程开始前8小时

    // 判断当前是否可以申请请假：在截止时间前 且 未签到 且 未请假 且 非审批中
    const canApplyLeave =
      currentTime <= leaveDeadlineTime &&
      !attendance_status.is_checked_in &&
      attendance_status.status !== 'leave' &&
      attendance_status.status !== 'leave_pending';

    // 测试模式：临时开放签到按钮用于测试
    const isTestMode = false; // 设置为 false 恢复正常模式

    // 判断是否可以签到：在时间窗口内 且 未签到 且 未请假 且 非审批中
    const canCheckin = isTestMode
      ? !attendance_status.is_checked_in &&
        attendance_status.status !== 'leave' &&
        attendance_status.status !== 'leave_pending'
      : isInCheckinWindow &&
        !attendance_status.is_checked_in &&
        attendance_status.status !== 'leave' &&
        attendance_status.status !== 'leave_pending';

    // 计算请假状态提示信息
    const getLeaveButtonText = () => {
      if (attendance_status.is_checked_in) {
        return '已签到无法请假';
      }
      if (
        attendance_status.status === 'leave' ||
        attendance_status.status === 'leave_pending'
      ) {
        return '已申请请假';
      }
      if (currentTime > leaveDeadlineTime) {
        return '请假时间已过';
      }
      return '请假';
    };

    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='mx-auto max-w-md space-y-4 p-4'>
          {/* 学生信息卡片 - 使用cookie中的用户信息 */}
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='flex items-center space-x-4'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                <User className='h-8 w-8 text-gray-600' />
              </div>
              <div className='flex-1'>
                <h1 className='text-xl font-bold text-gray-900'>
                  {userInfo?.username || '未知用户'}
                </h1>
                <p className='text-gray-600'>
                  学号：
                  {userInfo?.studentNumber || userInfo?.userNumber || '未知'}
                </p>
                <div className='mt-2 space-y-1'>
                  <p className='text-sm text-gray-500'>
                    班级：{userInfo?.className || '未知班级'}
                  </p>
                  <p className='text-sm text-gray-500'>
                    专业：{userInfo?.majorName || '未知专业'}
                  </p>
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
                <span className='text-sm'>{course.lq} 室</span>
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
                  {/* 测试模式下显示详细的时间窗口信息 */}
                  {isTestMode && (
                    <div className='mt-3 rounded bg-yellow-50 p-3 text-left text-xs text-gray-600'>
                      <div className='mb-1 font-semibold text-yellow-700'>
                        🧪 测试模式
                      </div>
                      <div>
                        签到窗口: {checkinStartTime.toLocaleTimeString()} -{' '}
                        {checkinEndTime.toLocaleTimeString()}
                      </div>
                      <div>
                        在窗口内: {isInCheckinWindow ? '✅ 是' : '❌ 否'}
                      </div>
                      <div>可以签到: {canCheckin ? '✅ 是' : '❌ 否'}</div>
                    </div>
                  )}
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
                    type='button'
                    onClick={handleCheckin}
                    disabled={checkinLoading || !canCheckin}
                    className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                      !canCheckin
                        ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {checkinLoading
                      ? '签到中...'
                      : !canCheckin
                        ? isTestMode
                          ? '已签到或已请假'
                          : isInCheckinWindow
                            ? '已签到或已请假'
                            : '不在签到时间'
                        : isTestMode
                          ? '签到 (测试模式)'
                          : '签到'}
                  </button>

                  {/* 请假按钮 */}
                  <button
                    type='button'
                    onClick={() => navigate(`/leave/${encodeURIComponent(id)}`)}
                    disabled={!canApplyLeave}
                    className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                      !canApplyLeave
                        ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {getLeaveButtonText()}
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
            <div className='space-y-2'>
              <p>
                <strong>请假截止时间：</strong>
                {leaveDeadlineTime.toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
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
