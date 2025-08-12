import { LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserNav() {
  // 简化后的用户导航组件
  // 根据新的认证架构，直接显示用户信息，不进行复杂的认证状态检查
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

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={user.avatar} alt={user.name || '用户'} />
            <AvatarFallback>{getInitials(user.name || '用户')}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>
              {user.name || '用户'}
            </p>
            {user.email && (
              <p className='text-muted-foreground text-xs leading-none'>
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className='mr-2 h-4 w-4' />
          <span>个人资料</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className='mr-2 h-4 w-4' />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
