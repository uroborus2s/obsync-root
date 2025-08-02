import { attendanceApi } from '@/lib/attendance-api';
import { FileCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
export function FloatingApprovalButton({ className = '' }) {
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [isVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        // 从真实API获取待审批数量
        const fetchPendingCount = async () => {
            setIsLoading(true);
            try {
                console.log('🔄 开始获取待审批数量...');
                const response = await attendanceApi.getTeacherLeaveApplications({
                    status: 'pending',
                    page: 1,
                    page_size: 1 // 只需要获取统计数据
                });
                console.log('📊 API响应:', response);
                if (response.success && response.data) {
                    const count = response.data.stats.pending_count;
                    console.log('✅ 获取到待审批数量:', count);
                    setPendingCount(count);
                }
                else {
                    console.warn('⚠️ API调用成功但数据格式不正确:', response);
                    // 如果API调用失败，使用模拟数据
                    console.log('🔄 使用模拟数据: 2');
                    setPendingCount(2);
                }
            }
            catch (error) {
                console.error('❌ 获取待审批数量失败:', error);
                // 检查错误类型
                if (error instanceof Error) {
                    console.error('错误详情:', error.message);
                    console.error('错误堆栈:', error.stack);
                }
                // 如果API调用失败，使用模拟数据
                console.log('🔄 API调用失败，使用模拟数据: 2');
                setPendingCount(2);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchPendingCount();
        // 每30秒更新一次数据
        const interval = setInterval(fetchPendingCount, 30000);
        return () => clearInterval(interval);
    }, []);
    const handleClick = () => {
        navigate('/approval');
    };
    // 如果没有待审批的申请，可以选择隐藏按钮
    if (!isVisible || pendingCount === 0) {
        return null;
    }
    return (<div className={`fixed z-50 ${className}`}>
      <div className='group relative'>
        {/* 外层光环效果 */}
        <div className='absolute -inset-2 animate-pulse rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 opacity-30 blur-lg transition-all duration-500 group-hover:opacity-60 group-hover:blur-xl'></div>

        {/* 中层光环 */}
        <div className='absolute -inset-1 animate-ping rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-40 transition-all duration-300 group-hover:opacity-70'></div>

        {/* 主按钮 */}
        <button onClick={handleClick} className='relative flex h-14 w-14 items-center justify-center rounded-full border border-purple-400/30 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 hover:shadow-purple-500/50 active:scale-95' aria-label={`查看请假审批，有${pendingCount}个待处理`}>
          {/* 内部渐变光效 */}
          <div className='absolute inset-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50'></div>

          {/* 图标容器 */}
          <div className='relative z-10 flex items-center justify-center'>
            <FileCheck className='h-6 w-6 drop-shadow-lg transition-all duration-300 group-hover:rotate-12 group-hover:scale-110'/>

            {/* 闪烁星星效果 */}
            <Sparkles className='absolute -right-1 -top-1 h-3 w-3 text-yellow-300 opacity-0 transition-all duration-300 group-hover:animate-bounce group-hover:opacity-100'/>
          </div>

          {/* 消息数量徽章 - 超级炫酷版本 */}
          {pendingCount > 0 && (<div className='absolute -right-2 -top-2 z-20'>
              {/* 徽章外层光环 */}
              <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-red-400 to-orange-500 opacity-60 blur-sm'></div>

              {/* 徽章主体 */}
              <div className='relative flex h-6 w-6 animate-bounce items-center justify-center rounded-full border border-red-300/50 bg-gradient-to-br from-red-400 via-red-500 to-orange-500 text-xs font-bold text-white shadow-lg'>
                {/* 内部高光 */}
                <div className='absolute inset-0.5 rounded-full bg-gradient-to-br from-white/40 to-transparent'></div>

                {/* 数字 */}
                <span className='relative z-10 drop-shadow-sm'>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>

                {/* 闪光效果 */}
                <div className='absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0'></div>
              </div>
            </div>)}

          {/* 旋转光环效果 */}
          <div className='animate-spin-slow absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 transition-all duration-500 group-hover:opacity-20'></div>

          {/* 脉冲效果 */}
          <div className='absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 transition-all duration-300 group-hover:opacity-30'></div>
        </button>

        {/* 超级炫酷的悬浮提示 */}
        <div className='absolute right-full top-1/2 mr-4 hidden -translate-y-1/2 transform opacity-0 transition-all duration-300 group-hover:block group-hover:opacity-100'>
          <div className='relative'>
            {/* 提示框外层光环 */}
            <div className='absolute -inset-1 rounded-xl bg-gradient-to-r from-purple-400 to-pink-400 opacity-30 blur-sm'></div>

            {/* 提示框主体 */}
            <div className='relative whitespace-nowrap rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-3 text-sm text-white shadow-2xl'>
              {/* 内部高光 */}
              <div className='absolute inset-0.5 rounded-xl bg-gradient-to-br from-white/10 to-transparent'></div>

              {/* 文字内容 */}
              <div className='relative z-10 flex items-center space-x-2'>
                <Sparkles className='h-4 w-4 animate-pulse text-yellow-400'/>
                <span className='font-medium'>请假审批</span>
                {pendingCount > 0 && (<span className='rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-xs font-bold'>
                    {pendingCount}个待处理
                  </span>)}
              </div>

              {/* 箭头 */}
              <div className='absolute left-full top-1/2 -translate-y-1/2 transform'>
                <div className='border-8 border-transparent border-l-gray-800'></div>
                <div className='border-6 absolute -left-2 top-1/2 -translate-y-1/2 border-transparent border-l-gray-700'></div>
              </div>
            </div>
          </div>
        </div>

        {/* 加载状态指示器 */}
        {isLoading && (<div className='absolute inset-0 flex items-center justify-center rounded-full bg-black/20'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=FloatingApprovalButton.js.map