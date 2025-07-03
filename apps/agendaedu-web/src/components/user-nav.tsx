import { LogOut, QrCode, User } from 'lucide-react'
import { useWpsAuthContext } from '@/hooks/use-wps-auth-context'
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
  const { isAuthenticated, user, isLoading, openQrLogin, logout } =
    useWpsAuthContext()

  if (isLoading) {
    return (
      <div className='flex items-center space-x-2'>
        <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200' />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Button onClick={openQrLogin} variant='outline' size='sm'>
        <QrCode className='mr-2 h-4 w-4' />
        WPS登录
      </Button>
    )
  }

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>{user.name}</p>
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
        <DropdownMenuItem onClick={logout}>
          <LogOut className='mr-2 h-4 w-4' />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
