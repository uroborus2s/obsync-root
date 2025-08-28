import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkflowSchedule } from '@/types/workflow.types'
import { zhCN } from 'date-fns/locale'
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit,
  Filter,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
// API 和类型
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search as SearchComponent } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export default function WorkflowSchedulesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [_selectedSchedule, setSelectedSchedule] =
    useState<WorkflowSchedule | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [definitionFilter, setDefinitionFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const queryClient = useQueryClient()

  // 获取定时任务列表
  const {
    data: schedulesData,
    isLoading,
    error: schedulesError,
  } = useQuery({
    queryKey: [
      'workflow-schedules',
      searchTerm,
      statusFilter,
      definitionFilter,
      page,
      pageSize,
    ],
    queryFn: () =>
      workflowApi.getWorkflowSchedules({
        page,
        pageSize,
        search: searchTerm || undefined,
        enabled: statusFilter ? statusFilter === 'enabled' : undefined,
        workflowDefinitionName: definitionFilter || undefined,
      }),
    refetchInterval: 30000, // 每30秒刷新
    retry: 3,
    retryDelay: 1000,
  })

  // 获取工作流定义列表（用于过滤器）
  const { data: definitionsData } = useQuery({
    queryKey: ['workflow-definitions-for-schedule-filter'],
    queryFn: () =>
      workflowApi.getWorkflowDefinitions({ page: 1, pageSize: 100 }),
  })

  // 删除定时任务
  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowApi.deleteSchedule(id),
    onSuccess: () => {
      toast.success('定时任务删除成功')
      queryClient.invalidateQueries({ queryKey: ['workflow-schedules'] })
    },
    onError: (error) => {
      toast.error(
        `删除失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    },
  })

  // 切换定时任务状态
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      workflowApi.toggleSchedule(id, enabled),
    onSuccess: (_, { enabled }) => {
      toast.success(`定时任务已${enabled ? '启用' : '禁用'}`)
      queryClient.invalidateQueries({ queryKey: ['workflow-schedules'] })
    },
    onError: (error) => {
      toast.error(
        `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    },
  })

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPage(1) // 重置到第一页
  }

  // 处理状态过滤
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  // 处理定义过滤
  const handleDefinitionFilter = (value: string) => {
    setDefinitionFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  // 处理编辑定时任务
  const handleEdit = (schedule: WorkflowSchedule) => {
    setSelectedSchedule(schedule)
    setShowEditDialog(true)
  }

  // 处理删除定时任务
  const handleDelete = (schedule: WorkflowSchedule) => {
    if (confirm(`确定要删除定时任务 "${schedule.name}" 吗？`)) {
      deleteMutation.mutate(schedule.id.toString())
    }
  }

  // 处理切换状态
  const handleToggle = (schedule: WorkflowSchedule) => {
    toggleMutation.mutate({
      id: schedule.id.toString(),
      enabled: !schedule.isEnabled,
    })
  }

  // 格式化Cron表达式显示
  const formatCronExpression = (cron: string) => {
    // 这里可以添加更友好的Cron表达式解析
    return cron
  }

  // 格式化下次运行时间
  const formatNextRunTime = (nextRunAt: string | null) => {
    if (!nextRunAt) return '未设置'

    const nextRun = new Date(nextRunAt)
    const now = new Date()

    if (nextRun < now) return '已过期'

    return formatDistanceToNow(nextRun, {
      addSuffix: true,
      locale: zhCN,
    })
  }

  const schedules = schedulesData?.items || []
  const total = schedulesData?.total || 0
  const totalPages = schedulesData?.totalPages || 0
  const definitions = definitionsData?.items || []

  // 统计不同状态的任务数量
  const enabledCount = schedules.filter((s) => s.isEnabled).length
  const disabledCount = schedules.filter((s) => !s.isEnabled).length

  // 错误处理
  if (schedulesError) {
    return (
      <>
        <Header className='border-b'>
          <div className='flex h-16 items-center px-4'>
            <div className='ml-auto flex items-center space-x-4'>
              <SearchComponent />
              <ThemeSwitch />
              <UserNav />
            </div>
          </div>
        </Header>

        <Main>
          <div className='flex min-h-[400px] items-center justify-center'>
            <Card className='w-full max-w-md'>
              <CardContent className='pt-6'>
                <div className='flex flex-col items-center space-y-4 text-center'>
                  <AlertCircle className='h-12 w-12 text-red-500' />
                  <div>
                    <h3 className='text-lg font-semibold'>加载失败</h3>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      无法加载工作流定时任务列表，请检查网络连接或稍后重试
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.reload()}
                    className='gap-2'
                  >
                    <RefreshCw className='h-4 w-4' />
                    重新加载
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Main>
      </>
    )
  }

  return (
    <div className='h-full'>
      <Header>
        <Search />
        <ThemeSwitch />
        <UserNav />
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* 页面标题和操作 */}
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
                <Calendar className='h-8 w-8' />
                定时任务管理
              </h1>
              <p className='text-muted-foreground mt-2'>
                管理工作流的定时执行规则和调度配置
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className='gap-2'>
              <Plus className='h-4 w-4' />
              创建定时任务
            </Button>
          </div>

          {/* 搜索和过滤 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Filter className='h-5 w-5' />
                搜索和过滤
              </CardTitle>
              <CardDescription>
                使用搜索和过滤条件快速找到需要的定时任务
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4 md:flex-row md:items-end'>
                <div className='flex-1'>
                  <label className='mb-2 block text-sm font-medium'>搜索</label>
                  <div className='relative'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                      placeholder='搜索任务名称、描述...'
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>
                <div className='w-full md:w-48'>
                  <label className='mb-2 block text-sm font-medium'>状态</label>
                  <Select
                    value={statusFilter || 'all'}
                    onValueChange={handleStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择状态' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部状态</SelectItem>
                      <SelectItem value='enabled'>已启用</SelectItem>
                      <SelectItem value='disabled'>已禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='w-full md:w-48'>
                  <label className='mb-2 block text-sm font-medium'>
                    工作流定义
                  </label>
                  <Select
                    value={definitionFilter || 'all'}
                    onValueChange={handleDefinitionFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择定义' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部定义</SelectItem>
                      {definitions.map((def) => (
                        <SelectItem key={def.id} value={def.name}>
                          {def.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 统计卡片 */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>总任务数</CardTitle>
                <Calendar className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {isLoading ? (
                    <div className='flex items-center gap-2'>
                      <RefreshCw className='h-4 w-4 animate-spin' />
                      <span>--</span>
                    </div>
                  ) : (
                    total
                  )}
                </div>
                <p className='text-muted-foreground text-xs'>当前搜索结果</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>启用中</CardTitle>
                <Power className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-green-600'>
                  {enabledCount}
                </div>
                <p className='text-muted-foreground text-xs'>正在运行的任务</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>已禁用</CardTitle>
                <PowerOff className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-gray-600'>
                  {disabledCount}
                </div>
                <p className='text-muted-foreground text-xs'>已停止的任务</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>即将执行</CardTitle>
                <Clock className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {schedules.filter((s) => s.isEnabled && s.nextRunAt).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 定时任务列表 */}
          <Card>
            <CardHeader>
              <CardTitle>定时任务列表</CardTitle>
              <CardDescription>查看和管理所有工作流定时任务</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='py-8 text-center'>加载中...</div>
              ) : schedules.length === 0 ? (
                <div className='text-muted-foreground py-8 text-center'>
                  暂无定时任务
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>任务名称</TableHead>
                      <TableHead>工作流</TableHead>
                      <TableHead>Cron表达式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>下次运行</TableHead>
                      <TableHead>最大实例数</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className='text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className='font-medium'>
                          {schedule.name}
                        </TableCell>
                        <TableCell>
                          {schedule.workflowDefinition?.name ||
                            `工作流 ${schedule.workflowDefinitionId}`}
                        </TableCell>
                        <TableCell className='font-mono text-sm'>
                          {formatCronExpression(schedule.cronExpression)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              schedule.isEnabled ? 'default' : 'secondary'
                            }
                          >
                            {schedule.isEnabled ? '启用' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatNextRunTime(schedule.nextRunAt)}
                        </TableCell>
                        <TableCell>{schedule.maxInstances}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(schedule.createdAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </TableCell>
                        <TableCell className='text-right'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' className='h-8 w-8 p-0'>
                                <MoreHorizontal className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                onClick={() => handleEdit(schedule)}
                              >
                                <Edit className='mr-2 h-4 w-4' />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggle(schedule)}
                              >
                                {schedule.isEnabled ? (
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
                                onClick={() => handleDelete(schedule)}
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
              )}

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className='mt-4 flex items-center justify-between'>
                  <div className='text-muted-foreground text-sm'>
                    显示第 {(page - 1) * pageSize + 1} -{' '}
                    {Math.min(page * pageSize, total)} 条，共 {total} 条记录
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      上一页
                    </Button>
                    <div className='flex items-center space-x-1'>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          const pageNum = i + 1
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? 'default' : 'outline'}
                              size='sm'
                              onClick={() => setPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          )
                        }
                      )}
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* 创建定时任务对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>创建定时任务</DialogTitle>
          </DialogHeader>
          <div className='text-muted-foreground py-8 text-center'>
            创建定时任务表单开发中...
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑定时任务对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>编辑定时任务</DialogTitle>
          </DialogHeader>
          <div className='text-muted-foreground py-8 text-center'>
            编辑定时任务表单开发中...
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
