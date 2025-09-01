import {
  IconBook,
  IconChartBar,
  IconClipboardCheck,
  IconDashboard,
} from '@tabler/icons-react'
import {
  Activity,
  Clock,
  Command,
  FileText,
  TrendingUp,
  UserCheck,
  Workflow,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '用户',
    email: 'user@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: '课程签到系统',
      logo: Command,
      plan: '管理后台',
    },
  ],
  navGroups: [
    {
      title: '系统管理',
      items: [
        {
          title: '工作流管理',
          icon: Workflow,
          items: [
            {
              title: '工作流定义',
              url: '/workflows/definitions' as const,
              icon: FileText,
            },
            {
              title: '工作流实例',
              url: '/workflows/instances' as const,
              icon: Activity,
            },
            {
              title: '定时任务',
              url: '/workflows/schedules' as const,
              icon: Clock,
            },
          ],
        },
        {
          title: '签到管理',
          icon: IconClipboardCheck,
          items: [
            {
              title: '签到总览',
              url: '/attendance/overview' as const,
              icon: IconDashboard,
            },
            {
              title: '数据分析',
              url: '/attendance/analytics' as const,
              icon: IconChartBar,
            },
            {
              title: '出勤排行',
              url: '/attendance/rankings' as const,
              icon: TrendingUp,
            },
            {
              title: '学生考勤',
              url: '/attendance/students' as const,
              icon: UserCheck,
            },
            {
              title: '课程考勤',
              url: '/attendance/courses' as const,
              icon: IconBook,
            },
          ],
        },
      ],
    },
  ],
}
