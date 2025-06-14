import { cn } from '@/lib/utils';
import {
  CheckCircle,
  ClipboardList,
  FileText,
  Home,
  UserCheck
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/leave', icon: FileText, label: '请假' },
  { path: '/checkin', icon: UserCheck, label: '签到' },
  { path: '/attendance', icon: ClipboardList, label: '签到表' },
  { path: '/approval', icon: CheckCircle, label: '审批' }
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className='border-border fixed bottom-0 left-0 right-0 border-t bg-white'>
      <div className='flex items-center justify-around py-2'>
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg p-2 transition-colors',
              'min-h-[60px] min-w-[60px]',
              location.pathname === path
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Icon className='mb-1 h-5 w-5' />
            <span className='text-xs font-medium'>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
