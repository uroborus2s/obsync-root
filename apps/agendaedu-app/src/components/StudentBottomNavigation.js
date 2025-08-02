import { Calendar, CheckCircle, Home, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
export function StudentBottomNavigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const navItems = [
        {
            id: 'home',
            label: '首页',
            icon: Home,
            path: '/student'
        },
        {
            id: 'checkin',
            label: '签到',
            icon: CheckCircle,
            path: '/student/checkin'
        },
        {
            id: 'leave',
            label: '请假',
            icon: Calendar,
            path: '/student/leave'
        },
        {
            id: 'profile',
            label: '我的',
            icon: User,
            path: '/student/profile'
        }
    ];
    const isActive = (path) => {
        return location.pathname === path;
    };
    return (<div className='safe-area-pb fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white'>
      <div className='grid h-16 grid-cols-4'>
        {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (<button key={item.id} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center space-y-1 transition-colors ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-500'}`}/>
              <span className={`text-xs ${active ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>);
        })}
      </div>
    </div>);
}
//# sourceMappingURL=StudentBottomNavigation.js.map