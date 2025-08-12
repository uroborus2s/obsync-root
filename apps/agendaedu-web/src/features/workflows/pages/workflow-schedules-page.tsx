import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkflowSchedule } from '@/types/workflow.types'
import { zhCN } from 'date-fns/locale'
import {
  Calendar,
  Clock,
  Edit,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
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
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export default function WorkflowSchedulesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [_selectedSchedule, _setSelectedSchedule] =
    useState<WorkflowSchedule | null>(null)
  const queryClient = useQueryClient()

  // 注意：定时任务功能暂时不可用，需要后端支持
  const schedulesData: { items: WorkflowSchedule[]; total: number } = {
    items: [],
    total: 0,
  }
  const isLoading = false

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

  // 处理编辑定时任务
  const handleEdit = (schedule: WorkflowSchedule) => {
    _setSelectedSchedule(schedule)
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

          {/* 统计卡片 */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>总任务数</CardTitle>
                <Calendar className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{schedules.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>启用中</CardTitle>
                <Power className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {schedules.filter((s) => s.isEnabled).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>已禁用</CardTitle>
                <PowerOff className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {schedules.filter((s) => !s.isEnabled).length}
                </div>
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
