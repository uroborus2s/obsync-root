import {
  icaLinkApiClient,
  type AttendanceCourseInfo
} from '@/lib/icalink-api-client';
import { AttendanceSheet } from '@/pages/AttendanceSheet';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function getAuthUrl(state?: string): string {
  // 构建WPS授权URL，按照重构要求使用指定的参数
  const currentUrl = state || window.location.href;
  const encodedState = btoa(currentUrl); // 将当前页面URL进行base64编码

  const params = new URLSearchParams({
    appid: 'AK20250614WBSGPX',
    response_type: 'code',
    redirect_uri: 'https://kwps.jlufe.edu.cn/api/auth/authorization', // 不需要额外的encodeURIComponent，URLSearchParams会自动处理
    scope: 'user_info',
    state: encodedState
  });

  const authUrl = `https://openapi.wps.cn/oauthapi/v2/authorize?${params.toString()}`;
  console.log('🔗 生成的授权URL:', authUrl);
  return authUrl;
}

interface UserInfo {
  userType?: string;
  userId?: string;
  userName?: string;
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

interface AttendanceViewState {
  loading: boolean;
  authenticated: boolean;
  userInfo: UserInfo | null;
  courseInfo: AttendanceCourseInfo | null;
  error: string | null;
}

export function AttendanceView() {
  const [searchParams] = useSearchParams();
  const externalId = searchParams.get('id');

  const [state, setState] = useState<AttendanceViewState>({
    loading: true,
    authenticated: false,
    userInfo: null,
    courseInfo: null,
    error: null
  });

  /**
   * 检查认证状态并加载数据
   */
  const checkAuthAndLoadData = useCallback(async () => {
    try {
      console.log('🔍 开始认证检查流程...');
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // 1. 检查用户登录状态
      const authResult = await icaLinkApiClient.checkAuthStatus();
      console.log('🔐 认证结果:', authResult.success);

      if (!authResult.success) {
        console.log('❌ 用户未登录，准备重定向到登录页面');

        // 构建当前页面URL作为登录后的返回地址
        const currentUrl = window.location.href;

        // 设置短暂的错误状态，然后重定向
        setState((prev) => ({
          ...prev,
          loading: false,
          authenticated: false,
          error: '用户未登录，正在跳转到登录页面...'
        }));

        // 延迟1秒后重定向，让用户看到提示信息
        setTimeout(() => {
          const authUrl = getAuthUrl(currentUrl);
          console.log('🔄 重定向到WPS授权页面:', authUrl);
          window.location.href = authUrl;
        }, 100);

        return;
      }

      // 2. 认证成功，获取用户信息
      console.log('✅ 认证成功，获取用户信息...');
      const userInfo = authResult.data?.user;
      if (!userInfo) {
        console.log('❌ 用户信息获取失败');
        setState((prev) => ({
          ...prev,
          loading: false,
          error: '用户信息获取失败'
        }));
        return;
      }

      // 3. 根据external_id获取课程完整信息（包含考勤数据）
      console.log('📚 获取课程完整信息，external_id:', externalId);
      const courseResult = await icaLinkApiClient.get(
        `/icalink/v1/courses/external/${encodeURIComponent(externalId!)}/complete?type=${userInfo.userType || 'teacher'}`
      );
      console.log('📚 课程完整信息结果:', courseResult);

      if (!courseResult.success) {
        console.log('❌ 课程信息获取失败:', courseResult.message);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: courseResult.message || '课程信息获取失败'
        }));
        return;
      }

      // 4. 成功加载所有数据
      console.log('🎉 所有数据加载成功!');
      setState({
        loading: false,
        authenticated: true,
        userInfo: userInfo as unknown as UserInfo,
        courseInfo: courseResult.data!,
        error: null
      });
    } catch (error) {
      console.error('💥 检查认证状态和加载数据失败:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '系统异常，请稍后重试'
      }));
    }
  }, [externalId]);

  useEffect(() => {
    console.log('🔄 useEffect 执行，externalId:', externalId);

    if (!externalId) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '缺少课程ID参数'
      }));
      return;
    }

    checkAuthAndLoadData();
  }, [externalId, checkAuthAndLoadData]);

  // 加载中状态
  if (state.loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
          <p className='text-gray-600'>正在验证身份和加载课程信息...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (state.error) {
    const isAuthError =
      state.error.includes('未登录') || state.error.includes('登录');

    return (
      <div className='flex min-h-screen items-center justify-center bg-red-50'>
        <div className='p-8 text-center'>
          <div className='mb-4 text-6xl text-red-500'>
            {isAuthError ? '🔐' : '⚠️'}
          </div>
          <h1 className='mb-4 text-2xl font-bold text-red-600'>
            {isAuthError ? '需要登录' : '加载失败'}
          </h1>
          <p className='mb-4 text-gray-600'>{state.error}</p>

          <div className='space-y-3'>
            {isAuthError ? (
              <button
                type='button'
                onClick={() => {
                  const currentUrl = window.location.href;
                  const authUrl = getAuthUrl(currentUrl);
                  console.log('🔄 手动重定向到WPS授权页面:', authUrl);
                  window.location.href = authUrl;
                }}
                className='rounded bg-green-500 px-6 py-2 text-white transition-colors hover:bg-green-600'
              >
                立即登录
              </button>
            ) : (
              <button
                type='button'
                onClick={() => {
                  setState((prev) => ({ ...prev, error: null }));
                  checkAuthAndLoadData();
                }}
                className='rounded bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600'
              >
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 认证成功，根据用户类型展示对应页面
  if (state.authenticated && state.userInfo && state.courseInfo) {
    // 将课程信息通过URL参数或context传递给页面组件
    const courseInfo = state.courseInfo;

    if (state.userInfo.userType === 'student') {
      // 学生用户展示学生页面
      return (
        <div>
          {/* 可以在这里添加课程信息显示 */}
          <div className='mb-4 bg-blue-50 p-4'>
            <h2 className='text-lg font-semibold text-blue-800'>
              {courseInfo.course_name}
            </h2>
            <p className='text-blue-600'>
              {courseInfo.teacher_name} • {courseInfo.class_location} •{' '}
              {courseInfo.class_date} {courseInfo.class_time}
            </p>
          </div>
          <StudentDashboard />
        </div>
      );
    } else if (state.userInfo.userType === 'teacher') {
      // 教师用户展示教师页面
      return (
        <div>
          {/* 可以在这里添加课程信息显示 */}
          <div className='mb-4 bg-green-50 p-4'>
            <h2 className='text-lg font-semibold text-green-800'>
              {courseInfo.course_name}
            </h2>
            <p className='text-green-600'>
              {courseInfo.class_location} • {courseInfo.class_date}{' '}
              {courseInfo.class_time}
            </p>
          </div>
          <AttendanceSheet />
        </div>
      );
    } else {
      // 未知用户类型
      return (
        <div className='flex min-h-screen items-center justify-center bg-yellow-50'>
          <div className='p-8 text-center'>
            <div className='mb-4 text-6xl text-yellow-500'>❓</div>
            <h1 className='mb-4 text-2xl font-bold text-yellow-600'>
              用户类型未知
            </h1>
            <p className='text-gray-600'>
              当前用户类型：{state.userInfo.userType}
            </p>
          </div>
        </div>
      );
    }
  }

  // 其他未处理的状态
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='p-8 text-center'>
        <h1 className='mb-4 text-2xl font-bold text-gray-600'>系统异常</h1>
        <p className='text-gray-500'>请稍后重试</p>
      </div>
    </div>
  );
}
