/**
 * 增强的分页组件
 * 统一的分页样式和功能，包括：
 * - 每页数量选择
 * - 跳转到指定页
 * - 上一页/下一页
 * - 页码信息显示
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface EnhancedPaginationProps {
  /** 当前页码（从1开始） */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总记录数 */
  total: number
  /** 页码变更回调 */
  onPageChange: (page: number) => void
  /** 每页数量变更回调 */
  onPageSizeChange: (pageSize: number) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 每页数量选项 */
  pageSizeOptions?: number[]
  /** 是否显示跳转功能 */
  showJumper?: boolean
}

export function EnhancedPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  pageSizeOptions = [10, 20, 50, 100],
  showJumper = true,
}: EnhancedPaginationProps) {
  const [jumpToPage, setJumpToPage] = useState('')
  const totalPages = Math.ceil(total / pageSize)

  const handlePageSizeChange = (newPageSize: string) => {
    onPageSizeChange(Number(newPageSize))
    onPageChange(1) // 重置到第一页
    setJumpToPage('')
  }

  const handleJumpToPage = () => {
    const targetPage = Number(jumpToPage)
    if (targetPage > 0 && targetPage <= totalPages) {
      onPageChange(targetPage)
      setJumpToPage('')
    } else {
      toast.error(`请输入 1-${totalPages} 之间的页码`)
    }
  }

  const handlePreviousPage = () => {
    if (page > 1) {
      onPageChange(page - 1)
      setJumpToPage('')
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      onPageChange(page + 1)
      setJumpToPage('')
    }
  }

  return (
    <div className='mt-6 space-y-4'>
      {/* 分页信息和控制 */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        {/* 左侧：总记录数和每页数量选择 */}
        <div className='flex items-center gap-4'>
          <div className='text-muted-foreground text-sm'>共 {total} 条记录</div>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground text-sm'>每页显示</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
              disabled={disabled}
            >
              <SelectTrigger className='h-8 w-[70px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className='text-muted-foreground text-sm'>条</span>
          </div>
        </div>

        {/* 右侧：分页控制 */}
        <div className='flex items-center gap-2'>
          {/* 上一页 */}
          <Button
            variant='outline'
            size='sm'
            onClick={handlePreviousPage}
            disabled={page === 1 || disabled}
          >
            <ChevronLeft className='h-4 w-4' />
            上一页
          </Button>

          {/* 页码信息 */}
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <span>第</span>
            <span className='text-foreground font-medium'>{page}</span>
            <span>/</span>
            <span className='text-foreground font-medium'>{totalPages}</span>
            <span>页</span>
          </div>

          {/* 下一页 */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleNextPage}
            disabled={page === totalPages || disabled || totalPages === 0}
          >
            下一页
            <ChevronRight className='h-4 w-4' />
          </Button>

          {/* 跳转到指定页 */}
          {showJumper && totalPages > 1 && (
            <div className='ml-4 flex items-center gap-2'>
              <span className='text-muted-foreground text-sm'>跳转到</span>
              <Input
                type='number'
                min='1'
                max={totalPages}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJumpToPage()
                  }
                }}
                placeholder='页码'
                className='h-8 w-16 text-center'
                disabled={disabled}
              />
              <Button
                variant='outline'
                size='sm'
                onClick={handleJumpToPage}
                disabled={disabled || !jumpToPage}
              >
                跳转
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

