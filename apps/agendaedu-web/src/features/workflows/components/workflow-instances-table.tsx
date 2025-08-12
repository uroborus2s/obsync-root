import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkflowInstance, WorkflowStatus } from '@/types/workflow.types'
import {
  workflowStatusColors,
  workflowStatusLabels,
} from '@/types/workflow.types'
import { zhCN } from 'date-fns/locale'
import {
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Pause,
  StopCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { workflowApi } from '@/lib/workflow-api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableLoadingState } from '@/components/loading-state'

interface WorkflowInstancesTableProps {
  status?: WorkflowStatus
  workflowDefinitionId?: number
  onViewInstance?: (instance: WorkflowInstance) => void
  onViewHistory?: (instance: WorkflowInstance) => void
}

export function WorkflowInstancesTable({
  status,
  workflowDefinitionId,
  onViewInstance,
  onViewHistory,
}: WorkflowInstancesTableProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [instanceToCancel, setInstanceToCancel] =
    useState<WorkflowInstance | null>(null)
  const queryClient = useQueryClient()

  // 获取工作流实例列表
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workflow-instances', status, workflowDefinitionId],
    queryFn: () =>
      workflowApi.getWorkflowInstances({
        status,
        workflowDefinitionId,
        page: 1,
        pageSize: 50,
      }),
    refetchInterval: status === 'running' ? 5000 : undefined, // 运行中的实例每5秒刷新
  })

  // 取消工作流实例
  const cancelMutation = useMutation({
    mutationFn: (id: number) => workflowApi.cancelWorkflowInstance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-stats'] })
      toast.success('工作流实例取消成功')
      setCancelDialogOpen(false)
      setInstanceToCancel(null)
    },
    onError: (error) => {
      toast.error(`取消失败: ${error.message}`)
    },
  })

  const handleCancel = (instance: WorkflowInstance) => {
    setInstanceToCancel(instance)
    setCancelDialogOpen(true)
  }

  const confirmCancel = () => {
    if (instanceToCancel) {
      cancelMutation.mutate(instanceToCancel.id)
    }
  }

  const getStatusIcon = (status: WorkflowStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className='h-4 w-4' />
      case 'running':
        return (
          <div className='h-4 w-4 animate-pulse rounded-full bg-blue-500' />
        )
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-600' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-600' />
      case 'cancelled':
        return <Pause className='h-4 w-4 text-gray-600' />
      default:
        return null
    }
  }

  const calculateProgress = (instance: WorkflowInstance) => {
    if (instance.status === 'completed') return 100
    if (instance.status === 'failed' || instance.status === 'cancelled')
      return 0

    // 基于执行路径计算进度
    const totalNodes =
      instance.workflowDefinition?.definition?.nodes?.length || 1
    const executedNodes = instance.executionPath?.length || 0
    return Math.min((executedNodes / totalNodes) * 100, 90) // 运行中最多显示90%
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return '-'

    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)

    if (duration < 60) return `${duration}秒`
    if (duration < 3600) return `${Math.floor(duration / 60)}分钟`
    return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分钟`
  }

  const instances = data?.items || []

  return (
    <>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>实例ID</TableHead>
              <TableHead>工作流名称</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>进度</TableHead>
              <TableHead>当前节点</TableHead>
              <TableHead>执行时长</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead className='w-[100px]'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoadingState
              isLoading={isLoading}
              error={error}
              isEmpty={instances.length === 0}
              emptyMessage='暂无工作流实例'
              colSpan={8}
              onRetry={() => refetch()}
            />
            {!isLoading &&
              !error &&
              instances.map((instance) => {
                const progress = calculateProgress(instance)
                return (
                  <TableRow key={instance.id}>
                    <TableCell className='font-mono text-sm'>
                      {String(instance.id).slice(0, 8)}...
                    </TableCell>
                    <TableCell className='font-medium'>
                      {instance.workflowDefinition?.name || '未知工作流'}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        {getStatusIcon(instance.status)}
                        <Badge
                          className={workflowStatusColors[instance.status]}
                        >
                          {workflowStatusLabels[instance.status]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Progress value={progress} className='w-16' />
                        <span className='text-muted-foreground text-sm'>
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='max-w-[150px] truncate'>
                      {instance.currentNode || '-'}
                    </TableCell>
                    <TableCell>
                      {formatDuration(instance.startedAt, instance.completedAt)}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {instance.startedAt ? (
                        <div>
                          <div>
                            {format(
                              new Date(instance.startedAt),
                              'MM-dd HH:mm'
                            )}
                          </div>
                          <div className='text-xs'>
                            {formatDistanceToNow(new Date(instance.startedAt), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => onViewInstance?.(instance)}
                          >
                            <Eye className='mr-2 h-4 w-4' />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onViewHistory?.(instance)}
                          >
                            <Clock className='mr-2 h-4 w-4' />
                            执行历史
                          </DropdownMenuItem>
                          {instance.status === 'running' && (
                            <DropdownMenuItem
                              onClick={() => handleCancel(instance)}
                              className='text-red-600'
                            >
                              <StopCircle className='mr-2 h-4 w-4' />
                              取消执行
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消</AlertDialogTitle>
            <AlertDialogDescription>
              确定要取消工作流实例 "{String(instanceToCancel?.id).slice(0, 8)}
              ..." 的执行吗？ 此操作将立即停止工作流的执行。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className='bg-red-600 hover:bg-red-700'
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? '取消中...' : '确认取消'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
