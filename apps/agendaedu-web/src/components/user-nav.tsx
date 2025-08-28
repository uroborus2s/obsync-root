import {
  Briefcase,
  Building,
  GraduationCap,
  LogOut,
  Shield,
} from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

export function UserNav() {
  // 使用JWT用户信息Hook
  const {
    isAuthenticated,
    user,
    loading,
    error,
    logout,
    getDisplayName,
    getAvatar,
    getRoleDisplayText,
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

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  // 判断是否应该隐藏职称和学历信息
  const shouldHideTitleAndEducation = (user: any) => {
    if (!user) return false

    // 检查职称是否为工程师
    const isEngineer = user.title && user.title.includes('工程师')

    // 检查学历是否为硕士研究生
    const isMasterStudent =
      user.education && user.education.includes('硕士研究生')

    return isEngineer || isMasterStudent
  }

  // 加载状态
  if (loading) {
    return (
      <Button
        variant='ghost'
        className='relative h-8 w-8 rounded-full'
        disabled
      >
        <Avatar className='h-8 w-8'>
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  // 错误状态或未认证状态
  if (!isAuthenticated || !user) {
    return (
      <Button
        variant='ghost'
        className='relative h-8 w-8 rounded-full'
        disabled
      >
        <Avatar className='h-8 w-8'>
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={getAvatar()} alt={getDisplayName()} />
            <AvatarFallback>{getInitials(getDisplayName())}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-80' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-2'>
            <div className='flex items-center space-x-2'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src={getAvatar()} alt={getDisplayName()} />
                <AvatarFallback>{getInitials(getDisplayName())}</AvatarFallback>
              </Avatar>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm leading-none font-medium'>
                  {getDisplayName()}
                </p>
                <div className='flex items-center space-x-1'>
                  <Badge variant='secondary' className='text-xs'>
                    {getUserTypeDisplayText()}
                  </Badge>
                  {user.title && !shouldHideTitleAndEducation(user) && (
                    <Badge variant='outline' className='text-xs'>
                      {user.title}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 用户详细信息 */}
            <div className='text-muted-foreground space-y-1 text-xs'>
              {user.employeeNumber && (
                <div className='flex items-center space-x-1'>
                  <Shield className='h-3 w-3' />
                  <span>工号: {user.employeeNumber}</span>
                </div>
              )}
              {user.department && (
                <div className='flex items-center space-x-1'>
                  <Building className='h-3 w-3' />
                  <span>{user.department}</span>
                </div>
              )}
              {user.college && user.college !== user.department && (
                <div className='flex items-center space-x-1'>
                  <GraduationCap className='h-3 w-3' />
                  <span>{user.college}</span>
                </div>
              )}
              {user.education && !shouldHideTitleAndEducation(user) && (
                <div className='flex items-center space-x-1'>
                  <Briefcase className='h-3 w-3' />
                  <span>{user.education}</span>
                </div>
              )}
            </div>

            {/* 角色信息 */}
            <div className='flex flex-wrap gap-1'>
              {user.roles.map((role) => (
                <Badge key={role} variant='default' className='text-xs'>
                  {role === 'teacher'
                    ? '教师'
                    : role === 'student'
                      ? '学生'
                      : role === 'admin'
                        ? '管理员'
                        : role === 'staff'
                          ? '职员'
                          : role === 'super_admin'
                            ? '超级管理员'
                            : role}
                </Badge>
              ))}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className='mr-2 h-4 w-4' />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
