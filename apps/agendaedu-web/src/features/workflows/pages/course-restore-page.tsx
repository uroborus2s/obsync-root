import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  RefreshCw, 
  Calendar, 
  Users,
  Loader2
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { workflowApi } from '@/lib/workflow-api'
import { WorkflowGroupsView } from '../components/workflow-groups-view'

const courseRestoreSchema = z.object({
  xgh: z.string().min(1, '学工号不能为空'),
  userType: z.enum(['student', 'teacher'], {
    required_error: '请选择用户类型',
  }),
  xnxq: z.string().optional(),
})

type CourseRestoreFormData = z.infer<typeof courseRestoreSchema>

export function CourseRestorePage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const queryClient = useQueryClient()
  const pageSize = 20

  const form = useForm<CourseRestoreFormData>({
    resolver: zodResolver(courseRestoreSchema),
    defaultValues: {
      xgh: '',
      userType: 'student',
      xnxq: '',
    },
  })

  // 获取课表重建工作流分组数据
  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
    refetch
  } = useQuery({
    queryKey: ['course-restore-groups', page],
    queryFn: () =>
      workflowApi.getWorkflowGroups({
        page,
        pageSize,
        workflowDefinitionName: 'course-restore-workflow', // 只查询课表重建工作流
      }),
    refetchInterval: 10000, // 每10秒刷新
    retry: 3,
    retryDelay: 1000,
  })

  // 启动课表重建工作流
  const startWorkflowMutation = useMutation({
    mutationFn: async (data: CourseRestoreFormData) => {
      // 调用课表重建接口
      const response = await fetch('/api/workflows/icasync/course-restore/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dryRun: false,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '启动课表重建工作流失败')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      toast.success('课表重建工作流启动成功', {
        description: `实例ID: ${data.data?.instanceId}`,
      })
      form.reset()
      setShowCreateDialog(false)
      queryClient.invalidateQueries({ queryKey: ['course-restore-groups'] })
    },
    onError: (error: any) => {
      toast.error('启动课表重建工作流失败', {
        description: error.message || '请稍后重试',
      })
    },
  })

  const handleStartWorkflow = (data: CourseRestoreFormData) => {
    startWorkflowMutation.mutate(data)
  }

  // 处理分组展开/收起
  const handleGroupToggle = (workflowDefinitionId: number) => {
    const newExpandedGroups = new Set(expandedGroups)
    if (newExpandedGroups.has(workflowDefinitionId)) {
      newExpandedGroups.delete(workflowDefinitionId)
    } else {
      newExpandedGroups.add(workflowDefinitionId)
    }
    setExpandedGroups(newExpandedGroups)
  }

  // 查看工作流实例
  const handleViewInstance = (instanceId: number) => {
    window.location.href = `/web/workflows/instances/${instanceId}`
  }

  const total = groupsData?.total || 0
  const totalPages = groupsData?.totalPages || 0

  return (
    <div className='h-full'>
      <Header>
        <Search />
        <ThemeSwitch />
        <UserNav />
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* 页面标题 */}
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
                <Calendar className='h-8 w-8' />
                课表重建
              </h1>
              <p className='text-muted-foreground mt-2'>
                管理和监控课表重建工作流的执行
              </p>
            </div>
            <div className='flex gap-2'>
              <Button 
                variant='outline' 
                onClick={() => refetch()}
                className='gap-2'
              >
                <RefreshCw className='h-4 w-4' />
                刷新
              </Button>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className='gap-2'
              >
                <Plus className='h-4 w-4' />
                重建个人课表
              </Button>
            </div>
          </div>

          {/* 课表重建工作流实例列表 */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <Users className='h-5 w-5' />
                    课表重建实例
                  </CardTitle>
                  <CardDescription>查看和管理课表重建工作流实例</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <WorkflowGroupsView
                data={groupsData}
                isLoading={groupsLoading}
                error={groupsError}
                expandedGroups={expandedGroups}
                onGroupToggle={handleGroupToggle}
                onViewInstance={handleViewInstance}
              />

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

      {/* 重建个人课表对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>重建个人课表</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleStartWorkflow)} className='space-y-4'>
              <FormField
                control={form.control}
                name='xgh'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>学工号 *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder='请输入学号或工号' 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='userType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户类型 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='选择用户类型' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='student'>学生</SelectItem>
                        <SelectItem value='teacher'>教师</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='xnxq'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>学年学期</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder='如: 2024-2025-1（可选，留空使用当前学期）' 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex gap-2 pt-4'>
                <Button 
                  type='button' 
                  variant='outline' 
                  onClick={() => setShowCreateDialog(false)}
                  className='flex-1'
                >
                  取消
                </Button>
                <Button 
                  type='submit' 
                  className='flex-1' 
                  disabled={startWorkflowMutation.isPending}
                >
                  {startWorkflowMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      重建中...
                    </>
                  ) : (
                    '立即重建'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}