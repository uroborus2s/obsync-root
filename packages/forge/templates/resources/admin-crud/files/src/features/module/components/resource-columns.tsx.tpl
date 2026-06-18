import type { ColumnDef } from '@tanstack/react-table'
import {
  FolderPen,
  MoreHorizontalIcon,
  SquareArrowOutUpRight,
  UserRound,
} from 'lucide-react'

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header'
import { DataTableText } from '@/components/admin/data-table/data-table-text'
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
import type { {{pascalName}}Record } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'

const statusVariantMap: Record<
  {{pascalName}}Record['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  Active: 'secondary',
  Draft: 'outline',
  Archived: 'destructive',
}

interface {{pascalName}}ColumnActions {
  onEdit: (recordId: string) => void
  onOpenDetail: (recordId: string) => void
}

export function create{{pascalName}}Columns({
  onEdit,
  onOpenDetail,
}: {{pascalName}}ColumnActions): ColumnDef<{{pascalName}}Record>[] {
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
        <DataTableColumnHeader column={column} title='名称' />
      ),
      cell: ({ row }) => (
        <button
          className='min-w-0 text-left'
          onClick={() => onOpenDetail(row.original.id)}
          type='button'
        >
          <DataTableText className='font-medium' maxChars={20} tooltip value={row.original.name} />
        </button>
      ),
    },
    {
      accessorKey: 'owner',
      meta: {
        maxChars: 16,
        tooltip: true,
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='负责人' />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <UserRound className='size-4 text-muted-foreground' />
          <DataTableText maxChars={16} tooltip value={row.original.owner} />
        </div>
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
      accessorKey: 'updatedAt',
      meta: {
        tooltip: true,
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='最近更新' />
      ),
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
              <SquareArrowOutUpRight className='size-4' />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row.original.id)}>
              <FolderPen className='size-4' />
              编辑记录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
