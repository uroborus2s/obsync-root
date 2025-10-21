import { ToastProvider, Toaster } from '@/components/ui/toast';
import { Approval } from '@/pages/Approval';
import { AttendanceSheet } from '@/pages/AttendanceSheet';
import { AttendanceView } from '@/pages/AttendanceView';
import { Dashboard } from '@/pages/Dashboard';
import { Leave } from '@/pages/Leave';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { StudentMessages } from '@/pages/StudentMessages';
import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { LocationTestPage } from './pages/LocationTestPage';

function AppContent() {
  return (
    <div className='bg-background min-h-screen'>
      <main>
        <Routes>
          {/* 新的统一入口点路由 - 支持?id=external_id参数 */}
          <Route
            path='/attendance/view'
            element={
              <>
                {console.log('🎯 AttendanceView路由匹配!')}
                <AttendanceView />
              </>
            }
          />

          {/* 原有的教师页面路由 - 保持向后兼容 */}
          <Route path='/' element={<Dashboard />} />
          <Route path='/leave' element={<Leave />} />
          <Route path='/leave/:attendanceId' element={<Leave />} />
          <Route path='/attendance' element={<AttendanceSheet />} />
          <Route path='/approval' element={<Approval />} />

          {/* 原有的学生页面路由 - 保持向后兼容 */}
          <Route path='/student' element={<StudentDashboard />} />
          <Route path='/student/messages' element={<StudentMessages />} />

          {/* 原有的签到页面路由 - 保持向后兼容 */}
          <Route path='/attendance/student' element={<StudentDashboard />} />
          <Route path='/attendance/teacher' element={<AttendanceSheet />} />

          {/* 测试页面路由 */}
          <Route path='/test/location' element={<LocationTestPage />} />

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
                  <p className='mb-2 text-gray-600'>
                    React Router basename: /app
                  </p>
                  <p className='mb-2 text-gray-600'>
                    匹配的路径应该是:{' '}
                    {window.location.pathname.replace('/app', '')}
                  </p>
                  <p className='mb-4 text-gray-600'>
                    完整URL: {window.location.href}
                  </p>
                  <div className='space-y-2'>
                    <button
                      type='button'
                      onClick={() => (window.location.href = '/app/')}
                      className='block w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
                    >
                      返回首页
                    </button>
                    <p className='text-sm text-gray-500'>
                      提示: 使用 /app/attendance/view?id=课程ID 访问考勤页面
                    </p>
                    <p className='text-sm text-red-500'>
                      调试: 如果看到这个页面，请检查路由配置
                    </p>
                  </div>
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
    const initializeWPS = async () => {
      try {
        console.log('🔍 检查 WPS SDK...');
        // 检测是否在WPS协作环境中
        if (typeof window !== 'undefined' && window.ksoxz_sdk) {
          console.log('✅ 找到 WPS SDK，应用将支持完整的WPS协作功能');
          console.log('📱 WPS协作环境检测成功，位置获取、拍照等功能已就绪');
        } else {
          console.log('⚠️ 当前不在WPS协作环境中，将使用模拟模式');
          console.log('💡 在WPS协作应用中打开可获得完整功能体验');
        }
      } catch (error) {
        console.warn('⚠️ WPS协作环境检测异常:', error);
      }
    };

    initializeWPS();
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
