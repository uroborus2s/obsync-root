import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react'
import type { Column } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  const sortDirection = column.getIsSorted()

  return (
    <Button
      className={cn('-ml-3 h-8 px-3 text-sm font-medium', className)}
      onClick={() => column.toggleSorting(sortDirection === 'asc')}
      size='sm'
      variant='ghost'
    >
      <span>{title}</span>
      {sortDirection === 'desc' ? (
        <ArrowDownIcon className='size-4' />
      ) : sortDirection === 'asc' ? (
        <ArrowUpIcon className='size-4' />
      ) : (
        <ChevronsUpDownIcon className='size-4' />
      )}
    </Button>
  )
}
