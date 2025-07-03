import {
  IconBook,
  IconCalendar,
  IconChartBar,
  IconChecklist,
  IconDashboard,
  IconSchool,
  IconSearch,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react'
import { Command, RefreshCw, Settings } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '用户',
    email: 'user@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: '课程打卡系统',
      logo: Command,
      plan: '管理后台',
    },
  ],
  navGroups: [
    {
      title: '主要功能',
      items: [
        {
          title: '仪表板',
          url: '/dashboard' as const,
          icon: IconDashboard,
        },
        {
          title: '数据查询',
          url: '/data-query' as const,
          icon: IconSearch,
        },
        {
          title: '统计分析',
          url: '/analytics' as const,
          icon: IconChartBar,
        },
        {
          title: '基础管理',
          url: '/basic-management' as const,
          icon: IconSettings,
        },
      ],
    },
    {
      title: '系统管理',
      items: [
        {
          title: '任务管理',
          icon: IconChecklist,
          items: [
            {
              title: '任务列表',
              url: '/tasks' as const,
            },
            {
              title: '同步管理',
              url: '/tasks/sync' as const,
              icon: RefreshCw,
            },
            {
              title: '任务设置',
              url: '/tasks/settings' as const,
              icon: Settings,
            },
          ],
        },
        {
          title: '课程管理',
          icon: IconBook,
          items: [
            {
              title: '课程列表',
              url: '/courses' as const,
            },
            {
              title: '课表管理',
              url: '/courses/schedule' as const,
              icon: IconCalendar,
            },
            {
              title: '课程设置',
              url: '/courses/settings' as const,
              icon: Settings,
            },
          ],
        },
        {
          title: '学生管理',
          url: '/students' as const,
          icon: IconUsers,
        },
        {
          title: '教师管理',
          url: '/teachers' as const,
          icon: IconSchool,
        },
      ],
    },
  ],
}
