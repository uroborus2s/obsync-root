import { Toaster, ToastProvider } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { attendanceApi } from '@/lib/attendance-api';
import { authManager } from '@/lib/auth-manager';
import { icaLinkApiClient } from '@/lib/icalink-api-client';
import { LocationInfo } from '@/lib/wps-collaboration-api';
import {
  BackendAttendanceData,
  determineDisplayState,
  DisplayState
} from '@/utils/attendance-status-helper';
import { LocationHelper } from '@/utils/location-helper';
import { validateLocationForCheckIn } from '@/utils/locationUtils';
import { checkWPSSDKStatus } from '@/utils/wps-sdk-checker';
import { addMinutes } from 'date-fns';
import { BookOpen, Calendar, Clock, MapPin, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// === withAbort 工具函数 ===
function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted)
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise
      .then((v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      })
      .catch((e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      });
  });
}

function StudentDashboardContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // === 核心状态 ===
  const [attendanceData, setAttendanceData] =
    useState<BackendAttendanceData | null>(null);
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 页面级加载
  const [checkinLoading, setCheckinLoading] = useState(false); // 签到按钮加载
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentLocation, setCurrentLocation] = useState<LocationInfo | null>(
    null
  );

  // === Ref 与 AbortController ===
  const dataFetchAbortRef = useRef<AbortController | null>(null);
  const checkinAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const id = searchParams.get('id');

  // === 认证重定向 ===
  const handleAuthRedirect = () => {
    const currentUrl = window.location.href;
    authManager.redirectToAuth(currentUrl);
  };

  // === 数据加载函数 ===
  const loadAttendanceData = useCallback(
    async (isRefetch = false) => {
      if (!id) return;

      if (dataFetchAbortRef.current && !isRefetch) {
        dataFetchAbortRef.current.abort();
      }
      dataFetchAbortRef.current = new AbortController();
      const { signal } = dataFetchAbortRef.current;

      if (!isRefetch) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const p = icaLinkApiClient.get<BackendAttendanceData>(
          `/icalink/v1/courses/external/${encodeURIComponent(
            id
          )}/complete?type=student`
        );
        const response = await withAbort(Promise.resolve(p as any), signal);

        console.log(response);
        if (response.success && response.data) {
          if (!isMountedRef.current) return;
          setAttendanceData(response.data);
        } else {
          throw new Error(response.message || '获取课程信息失败');
        }
      } catch (err: unknown) {
        if ((err as any)?.name === 'AbortError') {
          console.log('Data fetch aborted');
          return;
        }
        console.error('获取签到记录失败:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('401')) {
          // handleAuthRedirect();
          return;
        }
        setError(errorMessage);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [id]
  );

  // === 签到处理函数 ===
  const handleCheckin = async () => {
    if (!id || checkinLoading || !attendanceData) return;

    if (document.visibilityState !== 'visible') {
      toast.error('签到失败', {
        description: '页面不是当前活动窗口，已阻止签到操作。'
      });
      return;
    }

    if (checkinAbortRef.current) {
      checkinAbortRef.current.abort();
    }
    checkinAbortRef.current = new AbortController();
    const { signal } = checkinAbortRef.current;

    setCheckinLoading(true);

    try {
      // 1. 获取地理位置
      let locationData: LocationInfo;
      try {
        const p =
          LocationHelper.getCurrentLocation() as unknown as Promise<LocationInfo>;
        locationData = await withAbort(p, signal);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        toast.error('获取位置失败', {
          description: '请检查浏览器或系统位置权限设置。'
        });
        throw error; // 中断签到流程
      }

      // 2. 验证位置范围
      const roomInfo = attendanceData.course.room_s;
      if (!roomInfo) {
        toast.error('签到失败', {
          description: '课程教室信息缺失，无法进行位置验证。'
        });
        return;
      }
      const locationValidation = validateLocationForCheckIn(
        { lat: locationData.latitude, lng: locationData.longitude },
        roomInfo
      );
      if (!locationValidation.valid) {
        toast.error('签到失败', {
          description: '您当前不在上课地点附近，无法签到。'
        });
        return;
      }

      // 3. 判断签到来源并构建Payload
      const { verification_windows } = attendanceData;

      // 判断是否为窗口期签到
      const isWindowCheckin = !!(
        verification_windows?.window_id &&
        verification_windows?.open_time &&
        verification_windows?.duration_minutes
      );

      // 构建基础 payload
      const payload: any = {
        location: locationData.address.description,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        course_start_time: attendanceData.course.course_start_time // ✅ 必填字段
      };

      // 如果是窗口期签到，添加窗口相关字段
      if (isWindowCheckin && verification_windows) {
        // 计算窗口关闭时间
        const windowOpenTime = new Date(verification_windows.open_time);
        const windowCloseTime = addMinutes(
          windowOpenTime,
          verification_windows.duration_minutes
        );

        payload.window_id = verification_windows.window_id;
        payload.window_open_time = verification_windows.open_time;
        payload.window_close_time = windowCloseTime.toISOString();
      }

      // 4. 发起签到请求
      const req = attendanceApi.studentCheckIn(attendanceData.id, payload);
      const response = await withAbort(Promise.resolve(req), signal);

      if (response.success) {
        toast.success('签到成功!', { description: '签到状态已更新。' });

        // ⭐ 签到成功后，直接更新本地状态
        setAttendanceData((prevData) => {
          if (!prevData) return null;

          const updatedData = { ...prevData };
          const now = new Date().toISOString();

          // 如果是窗口签到，更新窗口信息和考勤记录
          if (isWindowCheckin && verification_windows) {
            updatedData.verification_windows = {
              ...verification_windows,
              attendance_record: {
                id: prevData.attendance_record_id || 0,
                checkin_time: now,
                status: 'present',
                last_checkin_source: 'window',
                last_checkin_reason: '窗口签到',
                window_id: verification_windows.window_id
              }
            };
          }

          // 更新状态字段（根据 updateStatusField 更新对应的状态）
          if (displayState?.updateStatusField) {
            // 使用类型断言来避免类型错误
            (updatedData as any)[displayState.updateStatusField] = 'present';
          }

          return updatedData;
        });
      } else {
        throw new Error(response.message || '签到失败，请重试');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('401')) {
          handleAuthRedirect();
        } else {
          toast.error('签到失败', { description: errorMessage });
        }
      }
    } finally {
      if (!signal.aborted) {
        setCheckinLoading(false);
      }
    }
  };

  // === Effects ===

  // 组件挂载/卸载
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      dataFetchAbortRef.current?.abort();
      checkinAbortRef.current?.abort();
    };
  }, []);

  // 页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面恢复可见时，重新加载数据
        console.log('Page is visible again, reloading data...');
        loadAttendanceData(true);
      } else {
        // 页面隐藏时，中止正在进行的请求
        dataFetchAbortRef.current?.abort();
        checkinAbortRef.current?.abort();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadAttendanceData]);

  // 初始化加载用户信息和WPS SDK
  useEffect(() => {
    checkWPSSDKStatus(setCurrentLocation);
  }, []);

  // 课程ID变化时，加载数据
  useEffect(() => {
    if (id) {
      setAttendanceData(null);
      setDisplayState(null);
      loadAttendanceData();
    }
  }, [id, loadAttendanceData]);

  // 时间和数据显示状态更新
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      // 实时计算显示状态
      if (attendanceData) {
        setDisplayState(determineDisplayState(attendanceData, now));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attendanceData]); // 依赖 attendanceData

  // === 渲染逻辑 ===

  if (isLoading || !displayState) {
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
            type='button'
            onClick={() => loadAttendanceData()}
            className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!id || !attendanceData) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <h1 className='mb-4 text-xl font-semibold text-gray-800'>
            暂无课程数据
          </h1>
          <p className='mb-4 text-gray-600'>
            {!id
              ? '缺少课程参数，请从课程列表进入。'
              : '未获取到课程详情，请尝试刷新。'}
          </p>
        </div>
      </div>
    );
  }

  const { course } = attendanceData;

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-md space-y-4 p-4'>
        {/* 学生信息卡片 */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='flex items-center space-x-4'>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
              <User className='h-8 w-8 text-gray-600' />
            </div>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>
                {attendanceData.student.xm || '未知用户'}
              </h1>
              <p className='text-gray-600'>
                学号：
                {attendanceData.student.xh || '未知'}
              </p>
              <div className='mt-2 space-y-1'>
                <p className='text-sm text-gray-500'>
                  班级：{attendanceData.student.bjmc || '未知班级'}
                </p>
                <p className='text-sm text-gray-500'>
                  专业：{attendanceData.student.zymc || '未知专业'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 课程信息卡片 */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-lg font-bold text-gray-900'>
            {course.kcmc}
          </h2>
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
                {new Date(course.course_end_time).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
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
            <div className={displayState.statusColor}>
              <div className='mb-3 text-4xl'>{displayState.statusIcon}</div>
              <div className='text-xl font-semibold'>
                {displayState.statusText}
              </div>
              {displayState.subText && (
                <div className='mt-2 text-sm text-gray-500'>
                  {displayState.subText}
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className='space-y-3'>
            {displayState.uiCategory === 'leaveCheckinEnabled' && (
              <>
                <button
                  type='button'
                  onClick={handleCheckin}
                  disabled={checkinLoading}
                  className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                    checkinLoading
                      ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {checkinLoading
                    ? '处理中...'
                    : displayState.checkInButtonText}
                </button>
                <button
                  type='button'
                  onClick={() => navigate(`/leave/${encodeURIComponent(id)}`)}
                  className={`w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700`}
                >
                  {displayState.leaveButtonText}
                </button>
              </>
            )}

            {displayState.uiCategory === 'leaveCheckinDisabled' && (
              <>
                <button
                  type='button'
                  disabled
                  className={`w-full cursor-not-allowed rounded-lg bg-gray-300 px-4 py-3 font-semibold text-gray-500 transition-colors`}
                >
                  {displayState.checkInButtonText}
                </button>
                <button
                  type='button'
                  onClick={() => navigate(`/leave/${encodeURIComponent(id)}`)}
                  className={`w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700`}
                >
                  {displayState.leaveButtonText}
                </button>
              </>
            )}

            {displayState.uiCategory === 'checkinOnly' && (
              <button
                type='button'
                onClick={handleCheckin}
                disabled={checkinLoading}
                className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                  checkinLoading
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {checkinLoading ? '处理中...' : displayState.checkInButtonText}
              </button>
            )}
          </div>
        </div>

        {/* 时间提示卡片 */}
        <div className='rounded-lg bg-gray-50 p-4 text-sm text-gray-700'>
          <p>
            <strong>当前时间：</strong>
            {currentTime.toLocaleTimeString('zh-CN')}
          </p>
        </div>
      </div>
      {/* <StudentFloatingMessageButton /> */}
    </div>
  );
}

export function StudentDashboard() {
  return (
    <ToastProvider>
      <Toaster />
      <StudentDashboardContent />
    </ToastProvider>
  );
}
