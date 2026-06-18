import { LogOut } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

import { useAuth } from '@/app/providers/auth-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function UserPanel() {
  const router = useRouter()
  const { logout, user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label='打开用户菜单'
          className='size-9 rounded-2xl border border-border/70 bg-background p-0 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] hover:bg-accent/60'
          size='icon'
          variant='outline'
        >
          <Avatar className='size-8'>
            <AvatarFallback className='bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-semibold text-white'>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className='sr-only'>用户菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-64 rounded-2xl border-border/70 p-1.5 shadow-xl'
      >
        <DropdownMenuLabel className='space-y-2'>
          <div className='flex items-center gap-3'>
            <Avatar className='size-10'>
              <AvatarFallback className='bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-semibold text-white'>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <p className='truncate font-medium'>{user.name}</p>
              <p className='truncate text-xs font-normal text-muted-foreground'>
                {user.email}
              </p>
            </div>
          </div>
          <Badge className='rounded-full px-2.5' variant='secondary'>
            {user.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout()
            router.history.push('/login')
          }}
          variant='destructive'
        >
          <LogOut className='size-4' />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
