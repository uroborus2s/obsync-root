/**
 * 应用侧边栏组件
 */

import { BarChart3, Calendar, Home, Settings } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from './ui/sidebar';

// 菜单项数据
const menuItems = [
  {
    title: '首页',
    url: '#',
    icon: Home
  },
  {
    title: '任务管理',
    url: '#tasks',
    icon: Calendar
  },
  {
    title: '统计分析',
    url: '#stats',
    icon: BarChart3
  },
  {
    title: '设置',
    url: '#settings',
    icon: Settings
  }
];

interface AppSidebarProps {
  activeItem?: string;
  onItemClick?: (url: string) => void;
}

export function AppSidebar({
  activeItem = '#tasks',
  onItemClick
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className='px-4 py-2'>
          <h2 className='text-lg font-semibold'>AgendaEdu</h2>
          <p className='text-muted-foreground text-sm'>任务管理系统</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>主要功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeItem === item.url}
                    onClick={() => onItemClick?.(item.url)}
                  >
                    <a href={item.url} className='flex items-center gap-2'>
                      <item.icon className='h-4 w-4' />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className='px-4 py-2'>
          <p className='text-muted-foreground text-xs'>
            © 2024 Stratix AgendaEdu
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
