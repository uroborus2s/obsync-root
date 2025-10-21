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
  RefreshCw,
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
          permission: {
            requiredRoles: ['admin', 'super_admin'],
            mode: 'or',
          },
          items: [
            {
              title: '工作流定义',
              url: '/workflows/definitions' as const,
              icon: FileText,
              permission: {
                requiredRoles: ['admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '工作流实例',
              url: '/workflows/instances' as const,
              icon: Activity,
              permission: {
                requiredRoles: ['admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '课表重建',
              url: '/workflows/course-restore' as const,
              icon: RefreshCw,
              permission: {
                requiredRoles: ['admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '定时任务',
              url: '/workflows/schedules' as const,
              icon: Clock,
              permission: {
                requiredRoles: ['admin', 'super_admin'],
                mode: 'or',
              },
            },
          ],
        },
        {
          title: '签到管理',
          icon: IconClipboardCheck,
          permission: {
            requiredRoles: ['teacher', 'admin', 'super_admin'],
            mode: 'or',
          },
          items: [
            {
              title: '签到总览',
              url: '/attendance/overview' as const,
              icon: IconDashboard,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '数据分析',
              url: '/attendance/analytics' as const,
              icon: IconChartBar,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '出勤排行',
              url: '/attendance/rankings' as const,
              icon: TrendingUp,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '学生考勤',
              url: '/attendance/students' as const,
              icon: UserCheck,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '课程考勤',
              url: '/attendance/courses' as const,
              icon: IconBook,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '课程表统计',
              url: '/attendance/course-statistics' as const,
              icon: IconChartBar,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
          ],
        },
      ],
    },
  ],
}
