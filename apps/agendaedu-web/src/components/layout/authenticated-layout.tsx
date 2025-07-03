import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { Outlet } from '@tanstack/react-router'
import { authManager } from '@/lib/auth-manager'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { useWpsAuthContext } from '@/hooks/use-wps-auth-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { AppSidebar } from '@/components/layout/app-sidebar'
import SkipToMain from '@/components/skip-to-main'

interface Props {
  children?: React.ReactNode
}

// 直接跳转到WPS授权页面的组件
function DirectAuthRedirect() {
  const [_checked, setChecked] = useState(false)

  useEffect(() => {
    // 先请求接口判断是否401
    fetch('https://chat.whzhsc.cn/apiv2/tasks/tree/roots?page=1&page_size=1', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status === 401) {
          // 跳转认证
          const currentUrl = window.location.href
          authManager.redirectToAuth(currentUrl)
        }
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [])

  // 检查中或跳转中，显示 loading
  return (
    <div className='flex h-screen items-center justify-center bg-gray-50'>
      <div className='flex flex-col items-center space-y-4'>
        <Spinner size='lg' />
        <p className='text-muted-foreground'>正在验证登录状态...</p>
      </div>
    </div>
  )
}

export function AuthenticatedLayout({ children }: Props) {
  const defaultOpen = Cookies.get('sidebar_state') !== 'false'
  const { isAuthenticated, isLoading } = useWpsAuthContext()

  // 加载状态
  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center bg-gray-50'>
        <div className='flex flex-col items-center space-y-4'>
          <Spinner size='lg' />
          <p className='text-muted-foreground'>正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  // 未登录状态 - 先请求接口判断
  if (!isAuthenticated) {
    return <DirectAuthRedirect />
  }

  // 已登录 - 显示正常的应用布局
  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <div
          id='content'
          className={cn(
            'ml-auto w-full max-w-full',
            'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
            'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'sm:transition-[width] sm:duration-200 sm:ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-full',
            'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh'
          )}
        >
          {children ? children : <Outlet />}
        </div>
      </SidebarProvider>
    </SearchProvider>
  )
}
