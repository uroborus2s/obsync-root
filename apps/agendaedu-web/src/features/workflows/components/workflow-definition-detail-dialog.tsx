import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import type { WorkflowDefinition } from '@/types/workflow.types'
import { zhCN } from 'date-fns/locale'
import {
  AlertCircle,
  Calendar,
  Clock,
  Code,
  FileText,
  Hash,
  Layers,
  RefreshCw,
  Settings,
  Tag,
  User,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface WorkflowDefinitionDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: WorkflowDefinition | null
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

export function WorkflowDefinitionDetailDialog({
  open,
  onOpenChange,
  definition,
}: WorkflowDefinitionDetailDialogProps) {
  // 获取详细的工作流定义信息
  const {
    data: detailData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workflow-definition-detail', definition?.id],
    queryFn: () => {
      if (!definition?.id) {
        throw new Error('缺少工作流定义ID')
      }
      return workflowApi.getWorkflowDefinitionById(definition.id)
    },
    enabled: open && !!definition?.id, // 启用API请求，当对话框打开且有ID时
  })

  // 使用详细数据或基础数据
  const workflowData = detailData || definition

  if (!workflowData) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-h-[90vh] max-w-4xl'
        aria-describedby='workflow-detail-description'
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FileText className='h-5 w-5' />
            工作流定义详情
          </DialogTitle>
        </DialogHeader>

        <div id='workflow-detail-description' className='sr-only'>
          查看工作流定义的详细信息，包括基本信息、技术配置和节点结构
        </div>

        <ScrollArea className='max-h-[calc(90vh-120px)]'>
          <div className='space-y-6 p-1'>
            {/* 加载状态 */}
            {isLoading && (
              <div className='flex items-center justify-center py-8'>
                <RefreshCw className='mr-2 h-6 w-6 animate-spin' />
                <span>加载详细信息中...</span>
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <Card className='border-red-200 bg-red-50'>
                <CardContent className='pt-6'>
                  <div className='flex items-center gap-2 text-red-600'>
                    <AlertCircle className='h-5 w-5' />
                    <div>
                      <div className='font-medium'>加载详细信息失败</div>
                      <div className='text-sm text-red-500'>
                        {error instanceof Error
                          ? error.message
                          : '未知错误，请稍后重试'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Settings className='h-4 w-4' />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      名称
                    </Label>
                    <div className='mt-1 font-medium'>{workflowData.name}</div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      版本
                    </Label>
                    <div className='mt-1'>
                      <Badge variant='outline'>{workflowData.version}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      状态
                    </Label>
                    <div className='mt-1'>
                      <Badge
                        variant={getStatusVariant(workflowData.status)}
                        className={getStatusClassName(workflowData.status)}
                      >
                        {getStatusLabel(workflowData.status)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      启用状态
                    </Label>
                    <div className='mt-1'>
                      <Badge
                        variant={workflowData.enabled ? 'default' : 'secondary'}
                        className={
                          workflowData.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {workflowData.enabled ? '已启用' : '已禁用'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      分类
                    </Label>
                    <div className='mt-1'>
                      {workflowData.category ? (
                        <Badge variant='outline'>{workflowData.category}</Badge>
                      ) : (
                        <span className='text-muted-foreground'>未分类</span>
                      )}
                    </div>
                  </div>
                </div>

                {workflowData.description && (
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      描述
                    </Label>
                    <div className='mt-1 text-sm'>
                      {workflowData.description}
                    </div>
                  </div>
                )}

                {workflowData.tags && workflowData.tags.length > 0 && (
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      标签
                    </Label>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {workflowData.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant='secondary'
                          className='text-xs'
                        >
                          <Tag className='mr-1 h-3 w-3' />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 技术信息 */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Code className='h-4 w-4' />
                  技术信息
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      节点数量
                    </Label>
                    <div className='mt-1 flex items-center gap-2'>
                      <Layers className='text-muted-foreground h-4 w-4' />
                      <span className='font-medium'>
                        {workflowData.definition?.nodes?.length ||
                          workflowData.nodes?.length ||
                          0}{' '}
                        个节点
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      输入参数
                    </Label>
                    <div className='mt-1 flex items-center gap-2'>
                      <Hash className='text-muted-foreground h-4 w-4' />
                      <span className='font-medium'>
                        {workflowData.definition?.inputs?.length ||
                          workflowData.inputs?.length ||
                          0}{' '}
                        个参数
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      输出参数
                    </Label>
                    <div className='mt-1 flex items-center gap-2'>
                      <Hash className='text-muted-foreground h-4 w-4' />
                      <span className='font-medium'>
                        {workflowData.definition?.outputs?.length ||
                          workflowData.outputs?.length ||
                          0}{' '}
                        个参数
                      </span>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      创建者
                    </Label>
                    <div className='mt-1 flex items-center gap-2'>
                      <User className='text-muted-foreground h-4 w-4' />
                      <span>{workflowData.createdBy || '未知'}</span>
                    </div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      创建时间
                    </Label>
                    <div className='mt-1 flex items-center gap-2'>
                      <Calendar className='text-muted-foreground h-4 w-4' />
                      <span>
                        {workflowData.createdAt
                          ? formatDistanceToNow(
                              new Date(workflowData.createdAt),
                              {
                                addSuffix: true,
                                locale: zhCN,
                              }
                            )
                          : '未知'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className='text-muted-foreground text-sm font-medium'>
                      更新时间
                    </Label>
                    <div className='mt-1 flex items-center gap-2'>
                      <Clock className='text-muted-foreground h-4 w-4' />
                      <span>
                        {workflowData.updatedAt
                          ? formatDistanceToNow(
                              new Date(workflowData.updatedAt),
                              {
                                addSuffix: true,
                                locale: zhCN,
                              }
                            )
                          : '未知'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 节点配置 */}
            {(workflowData.definition?.nodes || workflowData.nodes) && (
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Layers className='h-4 w-4' />
                    节点配置
                  </CardTitle>
                  <CardDescription>工作流包含的节点和连接配置</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    {/* 节点列表 */}
                    {(workflowData.definition?.nodes || workflowData.nodes)
                      ?.length > 0 && (
                      <div>
                        <Label className='text-muted-foreground text-sm font-medium'>
                          节点列表
                        </Label>
                        <div className='mt-2 space-y-2'>
                          {(
                            workflowData.definition?.nodes || workflowData.nodes
                          ).map((node: any, index: number) => (
                            <div
                              key={index}
                              className='flex items-center justify-between rounded-lg border p-3'
                            >
                              <div>
                                <div className='font-medium'>
                                  {node.name || node.id || `节点 ${index + 1}`}
                                </div>
                                {node.type && (
                                  <div className='text-muted-foreground text-sm'>
                                    类型: {node.type}
                                  </div>
                                )}
                                {node.description && (
                                  <div className='text-muted-foreground text-sm'>
                                    {node.description}
                                  </div>
                                )}
                              </div>
                              <Badge variant='outline'>
                                {node.type || '未知类型'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 边连接 */}
                    {workflowData.definition?.edges &&
                      workflowData.definition.edges.length > 0 && (
                        <div>
                          <Separator />
                          <Label className='text-muted-foreground text-sm font-medium'>
                            连接关系
                          </Label>
                          <div className='mt-2 space-y-2'>
                            {workflowData.definition.edges.map(
                              (edge: any, index: number) => (
                                <div
                                  key={index}
                                  className='bg-muted flex items-center justify-between rounded p-2'
                                >
                                  <span className='text-sm'>
                                    {edge.source} → {edge.target}
                                  </span>
                                  {edge.label && (
                                    <Badge
                                      variant='secondary'
                                      className='text-xs'
                                    >
                                      {edge.label}
                                    </Badge>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 配置信息 */}
            {workflowData.config &&
              Object.keys(workflowData.config).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Settings className='h-4 w-4' />
                      配置信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className='bg-muted overflow-auto rounded-lg p-4 text-sm'>
                      {JSON.stringify(workflowData.config, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
          </div>
        </ScrollArea>

        <div className='flex justify-end border-t pt-4'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
