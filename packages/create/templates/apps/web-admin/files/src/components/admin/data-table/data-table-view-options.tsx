import { Settings2Icon } from 'lucide-react'
import type { Table } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  variant?: 'default' | 'workspace'
}

export function DataTableViewOptions<TData>({
  table,
  variant = 'default',
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            'ml-auto',
            variant === 'workspace' &&
              'h-10 rounded-2xl border border-border/70 bg-background px-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]'
          )}
          size='sm'
          variant='outline'
        >
          <Settings2Icon className='size-4' />
          视图
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuLabel>显示列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) => column.getCanHide() && (column.columns?.length ?? 0) === 0
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              checked={column.getIsVisible()}
              className='capitalize'
              key={column.id}
              onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
            >
              {column.columnDef.header && typeof column.columnDef.header === 'string'
                ? column.columnDef.header
                : column.id.replace(/_/g, ' ')}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
