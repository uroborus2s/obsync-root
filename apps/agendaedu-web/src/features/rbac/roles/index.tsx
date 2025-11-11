/**
 * 角色管理页面
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { RoleEntity } from '@/types/rbac.types'
import { Plus, Users } from 'lucide-react'
import { roleApi } from '@/lib/rbac-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export default function RolesPage() {
  const [_selectedRole, _setSelectedRole] = useState<RoleEntity | null>(null)

  // 获取角色列表
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: roleApi.getAllRoles,
  })

  return (
    <>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
              <Users className='h-8 w-8' />
              角色管理
            </h1>
            <p className='text-muted-foreground'>
              管理系统角色，为角色分配权限
            </p>
          </div>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            添加角色
          </Button>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {isLoading ? (
            <div className='col-span-full text-center'>加载中...</div>
          ) : roles.length === 0 ? (
            <div className='text-muted-foreground col-span-full text-center'>
              暂无角色数据
            </div>
          ) : (
            roles.map((role) => (
              <Card key={role.id} className='transition-shadow hover:shadow-md'>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div>
                      <CardTitle>{role.name}</CardTitle>
                      <CardDescription className='mt-1'>
                        {role.code}
                      </CardDescription>
                    </div>
                    <div className='flex gap-2'>
                      {role.isSystem && <Badge variant='secondary'>系统</Badge>}
                      <Badge
                        variant={
                          role.status === 'active' ? 'default' : 'outline'
                        }
                      >
                        {role.status === 'active' ? '启用' : '禁用'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-muted-foreground text-sm'>
                    {role.description || '暂无描述'}
                  </p>
                  <div className='mt-4 flex gap-2'>
                    <Button variant='outline' size='sm' className='flex-1'>
                      编辑
                    </Button>
                    <Button variant='outline' size='sm' className='flex-1'>
                      权限配置
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Main>
    </>
  )
}
