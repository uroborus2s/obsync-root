/**
 * 权限列表表格列定义
 */

import type { ColumnDef } from '@tanstack/react-table'
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { PermissionEntity } from '@/types/rbac.types'

interface PermissionColumnsProps {
  onEdit: (permission: PermissionEntity) => void
  onDelete: (permission: PermissionEntity) => void
}

export function getPermissionColumns({
  onEdit,
  onDelete,
}: PermissionColumnsProps): ColumnDef<PermissionEntity>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <div className='w-[60px]'>{row.getValue('id')}</div>,
    },
    {
      accessorKey: 'name',
      header: '权限名称',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'code',
      header: '权限代码',
      cell: ({ row }) => (
        <code className='rounded bg-muted px-2 py-1 text-sm'>
          {row.getValue('code')}
        </code>
      ),
    },
    {
      accessorKey: 'resource',
      header: '资源',
      cell: ({ row }) => (
        <Badge variant='outline'>{row.getValue('resource')}</Badge>
      ),
    },
    {
      accessorKey: 'action',
      header: '操作',
      cell: ({ row }) => (
        <Badge variant='secondary'>{row.getValue('action')}</Badge>
      ),
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => {
        const description = row.getValue('description') as string | null
        return (
          <div className='max-w-[300px] truncate text-muted-foreground'>
            {description || '-'}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const permission = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>打开菜单</span>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(permission)}>
                <Pencil className='mr-2 h-4 w-4' />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(permission)}
                className='text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

