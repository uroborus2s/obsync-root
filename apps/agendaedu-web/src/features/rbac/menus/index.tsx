/**
 * 菜单管理页面
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Menu as MenuIcon, ChevronRight } from 'lucide-react'
import { menuApi } from '@/lib/rbac-api'
import type { MenuEntity } from '@/types/rbac.types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

// 递归渲染菜单树
function MenuTreeItem({ menu }: { menu: MenuEntity }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = menu.children && menu.children.length > 0

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50'>
        {hasChildren && (
          <Button
            variant='ghost'
            size='sm'
            className='h-6 w-6 p-0'
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </Button>
        )}
        {!hasChildren && <div className='w-6' />}

        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <span className='font-medium'>{menu.name}</span>
            <Badge variant='outline' className='text-xs'>
              {menu.menuType}
            </Badge>
            {!menu.isVisible && (
              <Badge variant='secondary' className='text-xs'>
                隐藏
              </Badge>
            )}
          </div>
          {menu.path && (
            <div className='text-muted-foreground text-sm'>{menu.path}</div>
          )}
        </div>

        <div className='flex gap-2'>
          <Button variant='ghost' size='sm'>
            编辑
          </Button>
          <Button variant='ghost' size='sm'>
            删除
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className='ml-8 space-y-2'>
          {menu.children!.map((child) => (
            <MenuTreeItem key={child.id} menu={child} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MenusPage() {
  // 获取菜单树
  const { data: menuTree = [], isLoading } = useQuery({
    queryKey: ['menu-tree'],
    queryFn: menuApi.getMenuTree,
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
              <MenuIcon className='h-8 w-8' />
              菜单管理
            </h1>
            <p className='text-muted-foreground'>
              管理系统菜单结构，配置菜单权限
            </p>
          </div>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            添加菜单
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>菜单树</CardTitle>
            <CardDescription>
              系统菜单的层级结构
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='text-center'>加载中...</div>
            ) : menuTree.length === 0 ? (
              <div className='text-center text-muted-foreground'>
                暂无菜单数据
              </div>
            ) : (
              <div className='space-y-2'>
                {menuTree.map((menu) => (
                  <MenuTreeItem key={menu.id} menu={menu} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}

