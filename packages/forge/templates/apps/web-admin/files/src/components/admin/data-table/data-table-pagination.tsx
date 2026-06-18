import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'
import type { Table } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  variant?: 'default' | 'workspace'
}

export function DataTablePagination<TData>({
  table,
  variant = 'default',
}: DataTablePaginationProps<TData>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between',
        variant === 'workspace' &&
          'border-t border-border/70 bg-background/96 px-4 pb-4 pt-4 backdrop-blur'
      )}
    >
      <div className='text-sm text-muted-foreground'>
        已选 {table.getFilteredSelectedRowModel().rows.length} /{' '}
        {table.getFilteredRowModel().rows.length} 条
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex items-center gap-2'>
          <p className='text-sm font-medium'>每页</p>
          <Select
            onValueChange={(value) => table.setPageSize(Number(value))}
            value={`${table.getState().pagination.pageSize}`}
          >
            <SelectTrigger className='w-20' size='sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align='end'>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center justify-between gap-2 sm:justify-end'>
          <p className='min-w-28 text-sm font-medium'>
            第 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 页
          </p>
          <div className='flex items-center gap-2'>
            <Button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
              size='icon-sm'
              variant='outline'
            >
              <ChevronsLeftIcon className='size-4' />
            </Button>
            <Button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size='icon-sm'
              variant='outline'
            >
              <ChevronLeftIcon className='size-4' />
            </Button>
            <Button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size='icon-sm'
              variant='outline'
            >
              <ChevronRightIcon className='size-4' />
            </Button>
            <Button
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              size='icon-sm'
              variant='outline'
            >
              <ChevronsRightIcon className='size-4' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
