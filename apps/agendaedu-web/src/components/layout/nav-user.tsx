import { ChevronsUpDown, LogOut } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

// 生成用户名缩写
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function NavUser() {
  const { isMobile } = useSidebar()

  // 使用JWT用户信息Hook
  const {
    isAuthenticated,
    user,
    loading,
    logout,
    getDisplayName,
    getAvatar,
    getUserTypeDisplayText,
  } = useUser()

  const handleLogout = () => {
    // 使用Hook的logout方法
    logout()

    // 清除其他本地状态
    localStorage.clear()
    sessionStorage.clear()

    // 动态导入认证配置进行重定向
    import('@/config/wps-auth-config')
      .then(({ redirectToWpsAuth }) => {
        redirectToWpsAuth(window.location.origin + '/dashboard')
      })
      .catch(() => {
        // 降级处理：直接刷新页面
        window.location.reload()
      })
  }

  // 加载状态
  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <Avatar className='h-8 w-8 rounded-lg'>
              <AvatarFallback className='rounded-lg'>...</AvatarFallback>
            </Avatar>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-semibold'>加载中...</span>
              <span className='truncate text-xs'>请稍候</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // 未认证状态
  if (!isAuthenticated || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <Avatar className='h-8 w-8 rounded-lg'>
              <AvatarFallback className='rounded-lg'>?</AvatarFallback>
            </Avatar>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-semibold'>未登录</span>
              <span className='truncate text-xs'>请登录</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={getAvatar()} alt={getDisplayName()} />
                <AvatarFallback className='rounded-lg'>
                  {getInitials(getDisplayName())}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {getDisplayName()}
                </span>
                <span className='truncate text-xs'>
                  {getUserTypeDisplayText()}{' '}
                  {user.employeeNumber && `• ${user.employeeNumber}`}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={getAvatar()} alt={getDisplayName()} />
                  <AvatarFallback className='rounded-lg'>
                    {getInitials(getDisplayName())}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>
                    {getDisplayName()}
                  </span>
                  <span className='truncate text-xs'>
                    {getUserTypeDisplayText()}
                  </span>
                  {user.department && (
                    <span className='text-muted-foreground truncate text-xs'>
                      {user.department}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
