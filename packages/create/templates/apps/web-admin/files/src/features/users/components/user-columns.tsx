import {
  MailIcon,
  MoreHorizontalIcon,
  PencilLineIcon,
  ShieldIcon,
  UserRoundSearchIcon,
} from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header'
import { DataTableText } from '@/components/admin/data-table/data-table-text'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserRecord } from '@/features/users/data/mock-users'

const statusVariantMap: Record<
  UserRecord['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  Active: 'secondary',
  'Pending MFA': 'outline',
  Invited: 'outline',
  Suspended: 'destructive',
}

interface UserColumnActions {
  onEditUser: (userId: string) => void
  onOpenDetail: (userId: string) => void
}

export function createUserColumns({
  onEditUser,
  onOpenDetail,
}: UserColumnActions): ColumnDef<UserRecord>[] {
  return [
    {
      accessorKey: 'select',
      enableHiding: false,
      enableSorting: false,
      maxSize: 40,
      meta: {
        cellClassName: 'px-2 text-center',
        headerClassName: 'px-2 text-center',
        pin: 'left',
      },
      minSize: 40,
      size: 40,
      header: ({ table }) => (
        <Checkbox
          aria-label='Select all'
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label='Select row'
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
    },
    {
      accessorKey: 'name',
      meta: {
        pin: 'left',
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='姓名' />
      ),
      cell: ({ row }) => {
        const user = row.original

        return (
          <button
            className='flex min-w-0 items-center gap-3 text-left'
            onClick={() => onOpenDetail(user.id)}
            type='button'
          >
            <Avatar className='size-9'>
              <AvatarFallback>
                {user.name
                  .split(' ')
                  .map((segment) => segment[0])
                  .join('')
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <DataTableText className='font-medium' maxChars={18} tooltip value={user.name} />
              <DataTableText
                className='text-sm text-muted-foreground'
                maxChars={24}
                tooltip
                value={user.email}
              />
            </div>
          </button>
        )
      },
    },
    {
      accessorKey: 'role',
      meta: {
        maxChars: 16,
        tooltip: true,
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='角色' />
      ),
    },
    {
      accessorKey: 'team',
      meta: {
        maxChars: 18,
        tooltip: true,
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='团队' />
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='状态' />
      ),
      cell: ({ row }) => (
        <Badge variant={statusVariantMap[row.original.status]}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'lastActive',
      meta: {
        tooltip: true,
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='最近活跃' />
      ),
      cell: ({ row }) => row.original.lastActive,
    },
    {
      id: 'actions',
      enableHiding: false,
      meta: {
        pin: 'right',
      },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className='size-8' size='icon-sm' variant='ghost'>
              <MoreHorizontalIcon className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>行操作</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onOpenDetail(row.original.id)}>
              <UserRoundSearchIcon className='size-4' />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditUser(row.original.id)}>
              <PencilLineIcon className='size-4' />
              编辑用户
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MailIcon className='size-4' />
              发送消息
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ShieldIcon className='size-4' />
              策略复核
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
