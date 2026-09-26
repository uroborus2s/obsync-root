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
  hasNextPage?: boolean
  pageSizeOptions?: number[]
  disabled?: boolean
  variant?: 'default' | 'workspace'
}

export function DataTablePagination<TData>({
  table,
  hasNextPage,
  pageSizeOptions = [10, 20, 30, 40, 50],
  disabled = false,
  variant = 'default',
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const knownPageCount = pageCount >= 0
  const totalRows = table.options.manualPagination
    ? table.options.rowCount
    : table.getFilteredRowModel().rows.length
  const canPrevious = !disabled && pageCount !== 0 && table.getCanPreviousPage()
  const canNext =
    !disabled &&
    (knownPageCount
      ? table.getCanNextPage()
      : (hasNextPage ?? table.getCanNextPage()))
  const sizes = [...new Set([...pageSizeOptions, pageSize])]
    .filter((size) => Number.isInteger(size) && size > 0)
    .sort((a, b) => a - b)

  return (
    <div
      className={cn(
        'flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between',
        variant === 'workspace' &&
          'border-t border-border/70 bg-background/96 px-4 pb-4 pt-4 backdrop-blur'
      )}
    >
      <div className='text-sm text-muted-foreground'>
        {totalRows === undefined
          ? `本页 ${table.getRowModel().rows.length} 条`
          : `共 ${totalRows} 条`}
        {table.getFilteredSelectedRowModel().rows.length > 0
          ? `，已选 ${table.getFilteredSelectedRowModel().rows.length} 条`
          : null}
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex items-center gap-2'>
          <p className='text-sm font-medium'>每页</p>
          <Select
            disabled={disabled}
            onValueChange={(value) =>
              table.setPagination({ pageIndex: 0, pageSize: Number(value) })
            }
            value={`${table.getState().pagination.pageSize}`}
          >
            <SelectTrigger aria-label='每页条数' className='w-20' size='sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align='end'>
              {sizes.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center justify-between gap-2 sm:justify-end'>
          <p className='min-w-28 text-sm font-medium'>
            {knownPageCount
              ? `第 ${pageCount === 0 ? 0 : pageIndex + 1} / ${pageCount} 页`
              : `第 ${pageIndex + 1} 页`}
          </p>
          <div className='flex items-center gap-2'>
            <Button
              aria-label='首页'
              disabled={!canPrevious}
              onClick={() => table.setPageIndex(0)}
              size='icon-sm'
              variant='outline'
            >
              <ChevronsLeftIcon className='size-4' />
            </Button>
            <Button
              aria-label='上一页'
              disabled={!canPrevious}
              onClick={() => table.previousPage()}
              size='icon-sm'
              variant='outline'
            >
              <ChevronLeftIcon className='size-4' />
            </Button>
            <Button
              aria-label='下一页'
              disabled={!canNext}
              onClick={() => table.nextPage()}
              size='icon-sm'
              variant='outline'
            >
              <ChevronRightIcon className='size-4' />
            </Button>
            {knownPageCount ? (
              <Button
                aria-label='末页'
                disabled={!canNext}
                onClick={() => table.setPageIndex(pageCount - 1)}
                size='icon-sm'
                variant='outline'
              >
                <ChevronsRightIcon className='size-4' />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
