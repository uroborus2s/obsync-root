import { ToastProvider, Toaster } from '@/components/ui/toast';
import { Approval } from '@/pages/Approval';
import { AttendanceSheet } from '@/pages/AttendanceSheet';
import AuthCallback from '@/pages/AuthCallback';
import { CheckIn } from '@/pages/CheckIn';
import { Dashboard } from '@/pages/Dashboard';
import { Leave } from '@/pages/Leave';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { StudentMessages } from '@/pages/StudentMessages';
import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

function AppContent() {
  console.log('🚀 AppContent 渲染中...');
  console.log('📍 当前路径:', window.location.pathname);

  return (
    <div className='bg-background min-h-screen'>
      <main>
        <Routes>
          {/* 授权回调路由 */}
          <Route path='/auth/callback' element={<AuthCallback />} />

          {/* 教师页面路由 */}
          <Route path='/' element={<Dashboard />} />
          <Route path='/leave' element={<Leave />} />
          <Route path='/leave/:attendanceId' element={<Leave />} />
          <Route path='/checkin' element={<CheckIn />} />
          <Route path='/attendance' element={<AttendanceSheet />} />
          <Route path='/approval' element={<Approval />} />

          {/* 学生页面路由 */}
          <Route path='/student' element={<StudentDashboard />} />
          <Route path='/student/messages' element={<StudentMessages />} />

          {/* 新的签到页面路由 */}
          <Route path='/attendance/student' element={<StudentDashboard />} />
          <Route path='/attendance/teacher' element={<AttendanceSheet />} />

          {/* 404 路由 */}
          <Route
            path='*'
            element={
              <div className='flex min-h-screen items-center justify-center bg-yellow-50'>
                <div className='p-8 text-center'>
                  <h1 className='mb-4 text-2xl font-bold text-yellow-600'>
                    页面未找到
                  </h1>
                  <p className='mb-2 text-gray-600'>
                    当前路径: {window.location.pathname}
                  </p>
                  <p className='mb-2 text-gray-600'>basename: /app</p>
                  <p className='mb-4 text-gray-600'>
                    完整URL: {window.location.href}
                  </p>
                  <button
                    onClick={() => (window.location.href = '/app/')}
                    className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
                  >
                    返回首页
                  </button>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

function App() {
  console.log('🎯 App 组件初始化...');

  useEffect(() => {
    console.log('🔧 useEffect 执行中...');

    // 全局初始化WPS协作JSAPI
    // const initializeWPS = async () => {
    //   try {
    //     console.log('🔍 检查 WPS SDK...');
    //     // 检测是否在WPS协作环境中
    //     if (typeof window !== 'undefined' && window.ksoxz_sdk) {
    //       console.log('✅ 找到 WPS SDK，开始初始化...');
    //       await wpsCollaboration.initialize({
    //         appId: 'your-app-id', // 需要替换为实际的AppID
    //         scope: ['location', 'image', 'share', 'device', 'ui']
    //       });
    //       console.log('🎉 WPS协作JSAPI全局初始化成功');
    //     } else {
    //       console.log('⚠️ 当前不在WPS协作环境中，将使用模拟模式');
    //     }
    //   } catch (error) {
    //     console.warn('⚠️ WPS协作JSAPI初始化失败，使用模拟模式:', error);
    //   }
    // };

    // initializeWPS();
  }, []);

  console.log('🎨 App 渲染中...');

  return (
    <Router basename='/app'>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Router>
  );
}

export default App;
