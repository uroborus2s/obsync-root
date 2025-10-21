import { useQuery } from '@tanstack/react-query'
import type {
  WorkflowGroup,
  WorkflowGroupResponse,
  WorkflowInstance,
} from '@/types/workflow.types'
import {
  workflowStatusColors,
  workflowStatusLabels,
} from '@/types/workflow.types'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  PlayCircle,
  Users,
  XCircle,
} from 'lucide-react'
import { workflowApi } from '@/lib/workflow-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface WorkflowGroupsViewProps {
  data?: WorkflowGroupResponse
  isLoading: boolean
  error: Error | null
  expandedGroups: Set<number>
  onGroupToggle: (workflowDefinitionId: number) => void
  onViewInstance: (instanceId: number) => void
}

interface WorkflowGroupItemProps {
  group: WorkflowGroup
  isExpanded: boolean
  onToggle: () => void
  onViewInstance: (instanceId: number) => void
}

function WorkflowGroupItem({
  group,
  isExpanded,
  onToggle,
  onViewInstance,
}: WorkflowGroupItemProps) {
  // 获取该分组下的根实例列表（当展开时）
  const { data: instancesData, isLoading: instancesLoading } = useQuery({
    queryKey: ['workflow-group-instances', group.workflowDefinitionId],
    queryFn: () =>
      workflowApi.getWorkflowGroupInstances(group.workflowDefinitionId, {
        page: 1,
        pageSize: 50, // 每个分组最多显示50个实例
      }),
    enabled: isExpanded,
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircle className='h-4 w-4 text-blue-600' />
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-600' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-600' />
      case 'pending':
        return <Clock className='h-4 w-4 text-yellow-600' />
      default:
        return <AlertCircle className='h-4 w-4 text-gray-600' />
    }
  }

  const getStatusBadge = (status: string) => {
    const colorClass =
      workflowStatusColors[status as keyof typeof workflowStatusColors] ||
      'bg-gray-100 text-gray-800'
    const label =
      workflowStatusLabels[status as keyof typeof workflowStatusLabels] ||
      status
    return (
      <Badge variant='secondary' className={colorClass}>
        {label}
      </Badge>
    )
  }

  return (
    <Card className='mb-4'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={onToggle}
              className='h-8 w-8 p-1'
            >
              {isExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
            </Button>
            <div>
              <CardTitle className='text-lg'>
                {group.workflowDefinitionName}
              </CardTitle>
              {group.workflowDefinitionDescription && (
                <CardDescription className='mt-1'>
                  {group.workflowDefinitionDescription}
                </CardDescription>
              )}
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-right'>
              <div className='text-muted-foreground text-sm'>根实例数量</div>
              <div className='text-2xl font-bold'>
                {group.rootInstanceCount}
              </div>
            </div>
            {group.latestInstanceStatus && (
              <div className='text-right'>
                <div className='text-muted-foreground text-sm'>最新状态</div>
                <div className='mt-1'>
                  {getStatusBadge(group.latestInstanceStatus)}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        {/* 统计信息 */}
        <div className='mb-4 grid grid-cols-4 gap-4'>
          <div className='flex items-center gap-2'>
            <PlayCircle className='h-4 w-4 text-blue-600' />
            <span className='text-sm'>
              运行中: {group.runningInstanceCount}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <CheckCircle className='h-4 w-4 text-green-600' />
            <span className='text-sm'>
              已完成: {group.completedInstanceCount}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <XCircle className='h-4 w-4 text-red-600' />
            <span className='text-sm'>失败: {group.failedInstanceCount}</span>
          </div>
          <div className='flex items-center gap-2'>
            <Calendar className='h-4 w-4 text-gray-600' />
            <span className='text-sm'>
              最新活动:{' '}
              {group.latestActivity
                ? new Date(group.latestActivity).toLocaleDateString()
                : '无'}
            </span>
          </div>
        </div>

        {/* 展开的实例列表 */}
        {isExpanded && (
          <div className='border-t pt-4'>
            {instancesLoading ? (
              <div className='space-y-2'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : instancesData?.items && instancesData.items.length > 0 ? (
              <div className='space-y-2'>
                <div className='text-muted-foreground mb-2 text-sm font-medium'>
                  根实例列表 ({instancesData.items.length})
                </div>
                {instancesData.items.map((instance: WorkflowInstance) => (
                  <div
                    key={instance.id}
                    className='hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3'
                  >
                    <div className='flex items-center gap-3'>
                      {getStatusIcon(instance.status)}
                      <div>
                        <div className='font-medium'>{instance.name}</div>
                        <div className='text-muted-foreground text-sm'>
                          ID: {instance.id} | 创建时间:{' '}
                          {new Date(instance.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      {getStatusBadge(instance.status)}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => onViewInstance(instance.id)}
                      >
                        <Eye className='mr-1 h-4 w-4' />
                        查看
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-muted-foreground py-8 text-center'>
                该流程下暂无实例
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function WorkflowGroupsView({
  data,
  isLoading,
  error,
  expandedGroups,
  onGroupToggle,
  onViewInstance,
}: WorkflowGroupsViewProps) {
  if (isLoading) {
    return (
      <div className='space-y-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-1/3' />
              <Skeleton className='h-4 w-2/3' />
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-4 gap-4'>
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className='h-8 w-full' />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className='py-8 text-center'>
        <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-500' />
        <h3 className='mb-2 text-lg font-semibold'>加载失败</h3>
        <p className='text-muted-foreground'>
          {error.message || '获取流程分组数据时发生错误'}
        </p>
      </div>
    )
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className='py-8 text-center'>
        <Users className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
        <h3 className='mb-2 text-lg font-semibold'>暂无流程</h3>
        <p className='text-muted-foreground'>
          当前没有找到任何工作流程，请检查筛选条件或创建新的工作流。
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {data.groups.map((group) => (
        <WorkflowGroupItem
          key={group.workflowDefinitionId}
          group={group}
          isExpanded={expandedGroups.has(group.workflowDefinitionId)}
          onToggle={() => onGroupToggle(group.workflowDefinitionId)}
          onViewInstance={onViewInstance}
        />
      ))}

      {/* 分页信息 */}
      {data.totalPages > 1 && (
        <div className='text-muted-foreground mt-6 text-center text-sm'>
          显示第 {(data.page - 1) * data.pageSize + 1} -{' '}
          {Math.min(data.page * data.pageSize, data.total)} 个分组， 共{' '}
          {data.total} 个分组
        </div>
      )}
    </div>
  )
}
