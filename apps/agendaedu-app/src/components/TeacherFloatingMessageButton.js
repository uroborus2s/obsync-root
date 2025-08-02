import { attendanceApi } from '@/lib/attendance-api';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
export function TeacherFloatingMessageButton({ className = '' }) {
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        // 获取教师待审批请假申请数量
        const fetchPendingCount = async () => {
            setIsLoading(true);
            try {
                const response = await attendanceApi.getTeacherLeaveApplications({
                    status: 'pending',
                    page: 1,
                    page_size: 1 // 只需要获取统计数据
                });
                if (response.success && response.data) {
                    setPendingCount(response.data.stats.pending_count);
                }
                else {
                    console.warn('获取待审批申请数量失败:', response.message);
                    setPendingCount(0);
                }
            }
            catch (error) {
                console.error('获取待审批申请数量失败:', error);
                setPendingCount(0);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchPendingCount();
        // 设置定时器定期更新数量
        const interval = setInterval(fetchPendingCount, 60000); // 每60秒更新一次
        return () => clearInterval(interval);
    }, []);
    const handleClick = () => {
        navigate('/approval');
    };
    // 如果没有待审批申请，仍然显示按钮但不显示数字
    return (<div className={`fixed bottom-6 right-4 z-50 ${className}`}>
      <button onClick={handleClick} disabled={isLoading} className='relative flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-green-600 active:scale-95 disabled:opacity-50' aria-label={pendingCount > 0
            ? `查看待审批申请，有${pendingCount}条待审批`
            : '查看审批申请'}>
        <Bell className='h-6 w-6'/>

        {/* 待审批数量徽章 */}
        {pendingCount > 0 && (<div className='absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white'>
            {pendingCount > 99 ? '99+' : pendingCount}
          </div>)}

        {/* 加载指示器 */}
        {isLoading && (<div className='absolute -right-1 -top-1 h-3 w-3 animate-spin rounded-full border border-white border-t-transparent'></div>)}
      </button>
    </div>);
}
//# sourceMappingURL=TeacherFloatingMessageButton.js.map