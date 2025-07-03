import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { TaskStatus } from '@/types/task.types'
import { zhCN } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Pause,
  Play,
  XCircle,
} from 'lucide-react'
import { TreeTaskResponse } from '@/lib/task-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TaskTreeRowActions } from './task-tree-row-actions'

// 状态颜色映射
const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [TaskStatus.RUNNING]: 'bg-blue-100 text-blue-800',
  [TaskStatus.PAUSED]: 'bg-orange-100 text-orange-800',
  [TaskStatus.SUCCESS]: 'bg-green-100 text-green-800',
  [TaskStatus.FAILED]: 'bg-red-100 text-red-800',
  [TaskStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
  [TaskStatus.TIMEOUT]: 'bg-purple-100 text-purple-800',
}

// 状态图标映射
const statusIcons: Record<
  TaskStatus,
  React.ComponentType<{ className?: string }>
> = {
  [TaskStatus.PENDING]: Clock,
  [TaskStatus.RUNNING]: Play,
  [TaskStatus.PAUSED]: Pause,
  [TaskStatus.SUCCESS]: CheckCircle,
  [TaskStatus.FAILED]: XCircle,
  [TaskStatus.CANCELLED]: XCircle,
  [TaskStatus.TIMEOUT]: AlertTriangle,
}

// 状态中文标签
const statusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '等待中',
  [TaskStatus.RUNNING]: '运行中',
  [TaskStatus.PAUSED]: '已暂停',
  [TaskStatus.SUCCESS]: '已完成',
  [TaskStatus.FAILED]: '失败',
  [TaskStatus.CANCELLED]: '已取消',
  [TaskStatus.TIMEOUT]: '超时',
}

// 扩展的任务数据类型（包含表格显示所需的属性）
export type TaskTreeTableData = TreeTaskResponse & {
  level: number
  isExpanded: boolean
  hasChildren: boolean
  isLoading?: boolean
}

type TaskTreeTableNewProps = {
  data: TaskTreeTableData[]
  className?: string
  onToggleExpansion?: (taskId: string) => Promise<void>
}

export function TaskTreeTableNew({
  data,
  className,
  onToggleExpansion,
}: TaskTreeTableNewProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set())

  // 处理节点展开/收缩
  const handleToggleExpansion = async (taskId: string) => {
    if (onToggleExpansion) {
      setLoadingTasks((prev) => new Set(prev).add(taskId))
      try {
        await onToggleExpansion(taskId)
      } finally {
        setLoadingTasks((prev: Set<string>) => {
          const newSet = new Set(prev)
          newSet.delete(taskId)
          return newSet
        })
      }
    }
  }

  const columns: ColumnDef<TaskTreeTableData>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='选择全部'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='选择行'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: '任务名称',
      cell: ({ row }) => {
        const task = row.original
        const hasChildren = task.hasChildren
        const level = task.level
        const isLoading = loadingTasks.has(task.id)

        return (
          <div className='flex items-center space-x-2'>
            {/* 层级缩进 */}
            <div
              className='flex items-center'
              style={{ width: `${level * 24}px` }}
            >
              {level > 0 && (
                <div className='flex items-center'>
                  {/* 垂直连接线 */}
                  <div className='bg-border mr-2 h-6 w-px' />
                  {/* 水平连接线 */}
                  <div className='bg-border h-px w-3' />
                </div>
              )}
            </div>

            {/* 展开/收缩按钮 */}
            {hasChildren ? (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleToggleExpansion(task.id)}
                className='hover:bg-muted h-4 w-4 p-0'
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : task.isExpanded ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </Button>
            ) : (
              <div className='w-4' />
            )}

            {/* 任务类型标签 */}
            {task.task_type && (
              <Badge variant='outline' className='text-xs'>
                {task.task_type}
              </Badge>
            )}

            {/* 任务名称 */}
            <span className='font-medium'>{task.name}</span>

            {/* 子任务数量提示 */}
            {hasChildren && (
              <Badge variant='secondary' className='text-xs'>
                {task.childrenCount}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => {
        const status = row.original.status as TaskStatus
        const StatusIcon = statusIcons[status]

        return (
          <Badge className={statusColors[status]}>
            <StatusIcon className='mr-1 h-3 w-3' />
            {statusLabels[status]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'progress',
      header: '进度',
      cell: ({ row }) => {
        // 保证 progress 一定为数字
        const progressRaw = row.original.progress
        const progress =
          typeof progressRaw === 'number'
            ? progressRaw
            : Number(progressRaw) || 0

        return (
          <div className='flex w-[120px] items-center space-x-2'>
            <Progress value={progress} className='h-2 flex-1' />
            <span className='text-muted-foreground min-w-[3rem] text-xs'>
              {progress.toFixed(0)}%
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: '优先级',
      cell: ({ row }) => {
        const priority = row.original.priority || 0

        let variant: 'default' | 'secondary' | 'destructive' = 'default'
        let label = '普通'

        if (priority >= 8) {
          variant = 'destructive'
          label = '紧急'
        } else if (priority >= 5) {
          variant = 'default'
          label = '高'
        } else if (priority >= 2) {
          variant = 'secondary'
          label = '普通'
        } else {
          variant = 'secondary'
          label = '低'
        }

        return (
          <Badge variant={variant} className='text-xs'>
            {label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'executor_name',
      header: '执行器',
      cell: ({ row }) => {
        const executorName = row.original.executor_name

        return (
          <div className='text-muted-foreground text-sm'>
            {executorName || '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: '创建时间',
      cell: ({ row }) => {
        const createdAt = new Date(row.original.created_at)

        return (
          <div className='text-muted-foreground text-sm'>
            {formatDistanceToNow(createdAt, {
              addSuffix: true,
              locale: zhCN,
            })}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => <TaskTreeRowActions row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className={className}>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
