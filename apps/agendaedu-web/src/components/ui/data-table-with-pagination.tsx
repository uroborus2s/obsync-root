import { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Skeleton } from '@/components/ui/skeleton'

export interface Column<T> {
  key: string
  header: string | ReactNode
  cell: (item: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableWithPaginationProps<T> {
  // 数据
  data: T[]
  columns: Column<T>[]
  total: number

  // 分页
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void

  // 状态
  isLoading?: boolean
  error?: Error | null

  // 自定义
  emptyMessage?: string
  errorMessage?: string
  rowKey?: (item: T, index: number) => string | number
  onRowClick?: (item: T) => void
  rowClassName?: (item: T) => string
}

export function DataTableWithPagination<T>({
  data,
  columns,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  error = null,
  emptyMessage = '暂无数据',
  errorMessage = '加载失败',
  rowKey = (_, index) => index,
  onRowClick,
  rowClassName,
}: DataTableWithPaginationProps<T>) {
  // 加载状态
  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={column.headerClassName}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className='h-4 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <EnhancedPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          disabled={true}
        />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className='space-y-4'>
        <div className='overflow-x-auto rounded-md border'>
          <div className='flex h-[400px] items-center justify-center'>
            <div className='text-center'>
              <p className='text-muted-foreground text-sm'>{errorMessage}</p>
              <p className='text-muted-foreground mt-2 text-xs'>
                {error.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 空数据状态
  if (!data || data.length === 0) {
    return (
      <div className='space-y-4'>
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={column.headerClassName}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-[400px] text-center'
                >
                  <p className='text-muted-foreground text-sm'>
                    {emptyMessage}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <EnhancedPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          disabled={true}
        />
      </div>
    )
  }

  // 正常数据状态
  return (
    <div className='space-y-4'>
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headerClassName}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={rowKey(item, index)}
                onClick={() => onRowClick?.(item)}
                className={
                  onRowClick
                    ? `cursor-pointer ${rowClassName?.(item) || ''}`
                    : rowClassName?.(item)
                }
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(item, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <EnhancedPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        disabled={isLoading}
      />
    </div>
  )
}

