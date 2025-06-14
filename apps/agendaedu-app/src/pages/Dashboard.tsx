import { FloatingApprovalButton } from '@/components/FloatingApprovalButton';
import {
  Calendar,
  CheckCircle,
  ClipboardList,
  FileText,
  UserCheck,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const quickActions = [
  {
    title: '请假申请',
    description: '提交请假申请',
    icon: FileText,
    path: '/leave',
    color: 'bg-blue-500'
  },
  {
    title: '签到',
    description: '课程签到',
    icon: UserCheck,
    path: '/checkin',
    color: 'bg-green-500'
  },
  {
    title: '签到表',
    description: '查看签到记录',
    icon: ClipboardList,
    path: '/attendance',
    color: 'bg-purple-500'
  },
  {
    title: '审批',
    description: '处理请假审批',
    icon: CheckCircle,
    path: '/approval',
    color: 'bg-orange-500'
  }
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm'>
        <div className='px-4 py-6'>
          <h1 className='text-2xl font-bold text-gray-900'>智慧教育管理</h1>
          <p className='mt-1 text-gray-600'>欢迎使用课程管理系统</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='px-4 py-6'>
        <div className='mb-6 grid grid-cols-2 gap-4'>
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='flex items-center'>
              <div className='rounded-lg bg-blue-100 p-2'>
                <Calendar className='h-6 w-6 text-blue-600' />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-gray-600'>今日课程</p>
                <p className='text-xl font-semibold text-gray-900'>3</p>
              </div>
            </div>
          </div>

          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='flex items-center'>
              <div className='rounded-lg bg-green-100 p-2'>
                <Users className='h-6 w-6 text-green-600' />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-gray-600'>出勤率</p>
                <p className='text-xl font-semibold text-gray-900'>95%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-gray-900'>快捷操作</h2>
          <div className='grid grid-cols-2 gap-4'>
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className='rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md'
              >
                <div className='flex flex-col items-center text-center'>
                  <div className={`rounded-full p-3 ${action.color} mb-3`}>
                    <action.icon className='h-6 w-6 text-white' />
                  </div>
                  <h3 className='mb-1 font-medium text-gray-900'>
                    {action.title}
                  </h3>
                  <p className='text-sm text-gray-600'>{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 漂浮的审批消息按钮 */}
      <FloatingApprovalButton />
    </div>
  );
}
