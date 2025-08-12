import { ChevronsUpDown, LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

  // 简化后的用户信息，不依赖复杂的认证状态管理
  const user = {
    name: '用户',
    email: 'user@example.com',
    avatar: undefined,
  }

  const handleLogout = () => {
    // 简化的登出逻辑：清除本地状态并重定向到认证页面
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
                <AvatarImage src={user.avatar} alt={user.name || '用户'} />
                <AvatarFallback className='rounded-lg'>
                  {getInitials(user.name || '用户')}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {user.name || '用户'}
                </span>
                <span className='truncate text-xs'>
                  {user.email || '未知用户'}
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
                  <AvatarImage src={user.avatar} alt={user.name || '用户'} />
                  <AvatarFallback className='rounded-lg'>
                    {getInitials(user.name || '用户')}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>
                    {user.name || '用户'}
                  </span>
                  <span className='truncate text-xs'>
                    {user.email || '未知用户'}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User />
                个人信息
              </DropdownMenuItem>
            </DropdownMenuGroup>
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
