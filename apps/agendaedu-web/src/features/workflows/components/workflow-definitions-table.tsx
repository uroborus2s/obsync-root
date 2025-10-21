import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import type { WorkflowDefinition } from '@/types/workflow.types'
import { zhCN } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import { workflowApi } from '@/lib/workflow-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  searchTerm,
  statusFilter,
  categoryFilter,
  page = 1,
  pageSize = 50,
}: WorkflowDefinitionsTableProps) {
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
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onViewDefinition?.(definition)}
                      className='gap-2'
                    >
                      <Eye className='h-4 w-4' />
                      查看
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
