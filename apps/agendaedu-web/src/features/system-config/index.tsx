import { Outlet } from '@tanstack/react-router'
import {
  IconCalendar,
  IconClock,
  IconDatabase,
  IconSettings,
} from '@tabler/icons-react'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import SidebarNav from './components/sidebar-nav'

export default function SystemConfig() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            系统配置
          </h1>
          <p className='text-muted-foreground'>
            管理系统级配置参数，包括学期配置、课程时间表、同步任务等。
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full p-1 lg:w-4/5'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}

const sidebarNavItems = [
  {
    title: '全部配置',
    icon: <IconSettings size={18} />,
    href: '/system-config',
  },
  {
    title: '学期配置',
    icon: <IconCalendar size={18} />,
    href: '/system-config/term',
  },
  {
    title: '课程时间表',
    icon: <IconClock size={18} />,
    href: '/system-config/course',
  },
  {
    title: '同步任务',
    icon: <IconDatabase size={18} />,
    href: '/system-config/sync',
  },
]
