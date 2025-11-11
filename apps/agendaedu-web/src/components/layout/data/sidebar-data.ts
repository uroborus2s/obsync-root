import { IconClipboardCheck } from '@tabler/icons-react'
import {
  Activity,
  BookOpen,
  Calendar,
  Command,
  FileText,
  HardDrive,
  Network,
  RefreshCw,
  Settings,
  Users,
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
        // 工作流管理菜单已隐藏 - 2025-11-10
        // {
        //   title: '工作流管理',
        //   icon: Workflow,
        //   // TODO: 后续统一处理权限 - 临时允许teacher角色访问
        //   permission: {
        //     requiredRoles: ['teacher', 'admin', 'super_admin'],
        //     mode: 'or',
        //   },
        //   items: [
        //     {
        //       title: '工作流定义',
        //       url: '/workflows/definitions' as const,
        //       icon: FileText,
        //       // TODO: 后续统一处理权限 - 临时允许teacher角色访问
        //       permission: {
        //         requiredRoles: ['teacher', 'admin', 'super_admin'],
        //         mode: 'or',
        //       },
        //     },
        //     {
        //       title: '工作流实例',
        //       url: '/workflows/instances' as const,
        //       icon: Activity,
        //       // TODO: 后续统一处理权限 - 临时允许teacher角色访问
        //       permission: {
        //         requiredRoles: ['teacher', 'admin', 'super_admin'],
        //         mode: 'or',
        //       },
        //     },
        //     {
        //       title: '课表重建',
        //       url: '/workflows/course-restore' as const,
        //       icon: RefreshCw,
        //       // TODO: 后续统一处理权限 - 临时允许teacher角色访问
        //       permission: {
        //         requiredRoles: ['teacher', 'admin', 'super_admin'],
        //         mode: 'or',
        //       },
        //     },
        //     {
        //       title: '定时任务',
        //       url: '/workflows/schedules' as const,
        //       icon: Clock,
        //       // TODO: 后续统一处理权限 - 临时允许teacher角色访问
        //       permission: {
        //         requiredRoles: ['teacher', 'admin', 'super_admin'],
        //         mode: 'or',
        //       },
        //     },
        //   ],
        // },
        {
          title: '签到管理',
          icon: IconClipboardCheck,
          permission: {
            requiredRoles: ['teacher', 'admin', 'super_admin'],
            mode: 'or',
          },
          items: [
            {
              title: '缺勤历史明细表',
              url: '/data-query/absent-history' as const,
              icon: FileText,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '教学班表',
              url: '/data-query/teaching-class' as const,
              icon: BookOpen,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '课程签到统计',
              url: '/data-query/course-stats-tree' as const,
              icon: Network,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '学工签到统计',
              url: '/attendance/student-stats' as const,
              icon: Users,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '课程管理',
              url: '/course-management' as const,
              icon: RefreshCw,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
            {
              title: '签到失败日志',
              url: '/attendance/failed-logs' as const,
              icon: Activity,
              permission: {
                requiredRoles: ['teacher', 'admin', 'super_admin'],
                mode: 'or',
              },
            },
          ],
        },
        {
          title: '课程日历',
          url: '/course-calendar' as const,
          icon: Calendar,
          permission: {
            requiredRoles: ['teacher', 'admin', 'super_admin'],
            mode: 'or',
          },
        },
        {
          title: '系统配置',
          url: '/system-config' as const,
          icon: Settings,
          permission: {
            requiredRoles: ['teacher', 'admin', 'super_admin'],
            mode: 'or',
          },
        },
        {
          title: 'WPS云盘管理',
          icon: HardDrive,
          // TODO: 后续统一处理权限 - 临时允许teacher角色访问
          permission: {
            requiredRoles: ['teacher', 'admin', 'super_admin'],
            mode: 'or',
          },
          items: [
            {
              title: '驱动盘管理',
              url: '/wps-drive' as const,
              icon: HardDrive,
              // TODO: 后续统一处理权限 - 临时允许teacher角色访问
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
