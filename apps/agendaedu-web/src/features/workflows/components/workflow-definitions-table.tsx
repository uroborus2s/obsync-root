import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkflowDefinition } from '@/types/workflow.types'
import { zhCN } from 'date-fns/locale'
import {
  Edit,
  Eye,
  MoreHorizontal,
  Play,
  Power,
  PowerOff,
  Trash2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableLoadingState } from '@/components/loading-state'

interface WorkflowDefinitionsTableProps {
  onViewDefinition?: (definition: WorkflowDefinition) => void
  onEditDefinition?: (definition: WorkflowDefinition) => void
  onStartWorkflow?: (definition: WorkflowDefinition) => void
  // 可选的查询参数，如果不提供则使用默认值
  searchTerm?: string
  statusFilter?: string
  categoryFilter?: string
  page?: number
  pageSize?: number
}

// 状态相关的辅助函数
function getStatusLabel(status?: string): string {
  switch (status) {
    case 'active':
      return '活跃'
    case 'draft':
      return '草稿'
    case 'deprecated':
      return '已弃用'
    case 'archived':
      return '已归档'
    default:
      return '未知'
  }
}

function getStatusVariant(
  status?: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'draft':
      return 'outline'
    case 'deprecated':
      return 'secondary'
    case 'archived':
      return 'secondary'
    default:
      return 'secondary'
  }
}

function getStatusClassName(status?: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'draft':
      return 'bg-blue-100 text-blue-800'
    case 'deprecated':
      return 'bg-orange-100 text-orange-800'
    case 'archived':
      return 'bg-gray-100 text-gray-800'
    default:
      return ''
  }
}

export function WorkflowDefinitionsTable({
  onViewDefinition,
  onEditDefinition,
  onStartWorkflow,
  searchTerm,
  statusFilter,
  categoryFilter,
  page = 1,
  pageSize = 50,
}: WorkflowDefinitionsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [definitionToDelete, setDefinitionToDelete] =
    useState<WorkflowDefinition | null>(null)
  const queryClient = useQueryClient()

  // 获取工作流定义列表
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'workflow-definitions',
      searchTerm,
      statusFilter,
      categoryFilter,
      page,
      pageSize,
    ],
    queryFn: () =>
      workflowApi.getWorkflowDefinitions({
        page,
        pageSize,
        search: searchTerm || undefined,
        status: (statusFilter || undefined) as
          | 'active'
          | 'draft'
          | 'deprecated'
          | 'archived'
          | undefined,
        category: categoryFilter || undefined,
      }),
  })

  // 删除工作流定义
  const deleteMutation = useMutation({
    mutationFn: ({ name, version }: { name: string; version: string }) =>
      workflowApi.deleteWorkflowDefinition(name, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] })
      toast.success('工作流定义删除成功')
      setDeleteDialogOpen(false)
      setDefinitionToDelete(null)
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  // 切换启用状态
  const toggleEnabledMutation = useMutation({
    mutationFn: ({
      name,
      version,
      enabled,
    }: {
      name: string
      version: string
      enabled: boolean
    }) => workflowApi.updateWorkflowDefinition(name, version, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] })
      toast.success('工作流状态更新成功')
    },
    onError: (error) => {
      toast.error(`状态更新失败: ${error.message}`)
    },
  })

  const handleDelete = (definition: WorkflowDefinition) => {
    setDefinitionToDelete(definition)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (definitionToDelete) {
      deleteMutation.mutate({
        name: definitionToDelete.name,
        version: definitionToDelete.version,
      })
    }
  }

  const handleToggleEnabled = (definition: WorkflowDefinition) => {
    toggleEnabledMutation.mutate({
      name: definition.name,
      version: definition.version,
      enabled: !definition.enabled,
    })
  }

  const definitions = data?.items || []

  return (
    <>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>版本</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>节点数</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className='w-[100px]'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoadingState
              isLoading={isLoading}
              error={error}
              isEmpty={definitions.length === 0}
              emptyMessage='暂无工作流定义'
              colSpan={7}
              onRetry={() => refetch()}
            />
            {!isLoading &&
              !error &&
              definitions.map((definition) => (
                <TableRow key={definition.id}>
                  <TableCell className='font-medium'>
                    {definition.name}
                  </TableCell>
                  <TableCell className='max-w-[200px] truncate'>
                    {definition.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{definition.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(definition.status)}
                      className={getStatusClassName(definition.status)}
                    >
                      {getStatusLabel(definition.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {definition.definition?.nodes?.length || 0} 个节点
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {definition.updatedAt
                      ? formatDistanceToNow(new Date(definition.updatedAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })
                      : '未知'}
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
                          onClick={() => onViewDefinition?.(definition)}
                        >
                          <Eye className='mr-2 h-4 w-4' />
                          查看详情
                        </DropdownMenuItem>
                        {definition.enabled && (
                          <DropdownMenuItem
                            onClick={() => onStartWorkflow?.(definition)}
                          >
                            <Play className='mr-2 h-4 w-4' />
                            启动工作流
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onEditDefinition?.(definition)}
                        >
                          <Edit className='mr-2 h-4 w-4' />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleEnabled(definition)}
                        >
                          {definition.enabled ? (
                            <>
                              <PowerOff className='mr-2 h-4 w-4' />
                              禁用
                            </>
                          ) : (
                            <>
                              <Power className='mr-2 h-4 w-4' />
                              启用
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(definition)}
                          className='text-red-600'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除工作流定义 "{definitionToDelete?.name}" 吗？
              此操作不可撤销，相关的工作流实例也将无法查看定义信息。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-red-600 hover:bg-red-700'
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
