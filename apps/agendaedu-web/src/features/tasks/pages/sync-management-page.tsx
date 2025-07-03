import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IncrementalSyncRequest } from '@/types/task.types'
import {
  AlertCircleIcon,
  BarChart3Icon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  RefreshCwIcon,
  Square,
} from 'lucide-react'
import { toast } from 'sonner'
import { taskApi } from '@/lib/task-api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export default function SyncManagementPage() {
  const [syncConfig, setSyncConfig] = useState<IncrementalSyncRequest>({
    xnxq: '2024-2025-2',
    batchSize: 50,
    parallel: false,
    maxConcurrency: 5,
  })

  const queryClient = useQueryClient()

  // 获取任务统计
  const { data: taskStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => taskApi.getTaskStats(),
    refetchInterval: 5000, // 每5秒刷新一次
  })

  // 获取任务树
  const { data: taskTree, isLoading: isLoadingTree } = useQuery({
    queryKey: ['task-tree'],
    queryFn: () => taskApi.getTaskTree({ maxDepth: 2, limit: 100 }),
    refetchInterval: 10000, // 每10秒刷新一次
  })

  // 获取增量同步状态
  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useQuery({
    queryKey: ['sync-status', syncConfig.xnxq],
    queryFn: () => taskApi.getIncrementalSyncStatus(syncConfig.xnxq),
    refetchInterval: 2000, // 每2秒刷新一次
    enabled: !!syncConfig.xnxq,
  })

  // 启动增量同步
  const startSyncMutation = useMutation({
    mutationFn: (config: IncrementalSyncRequest) =>
      taskApi.startIncrementalSync(config),
    onSuccess: () => {
      toast.success('增量同步已启动')
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      queryClient.invalidateQueries({ queryKey: ['task-tree'] })
    },
    onError: (error: Error) => {
      toast.error(`启动同步失败: ${error.message}`)
    },
  })

  // 恢复任务
  const recoverTasksMutation = useMutation({
    mutationFn: () => taskApi.recoverTasks(),
    onSuccess: () => {
      toast.success('任务恢复完成')
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      queryClient.invalidateQueries({ queryKey: ['task-tree'] })
    },
    onError: (error: Error) => {
      toast.error(`任务恢复失败: ${error.message}`)
    },
  })

  const handleStartSync = () => {
    startSyncMutation.mutate(syncConfig)
  }

  const handleRecoverTasks = () => {
    recoverTasksMutation.mutate()
  }

  const getSyncStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    }
  }

  const getSyncStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <PlayIcon className='h-4 w-4' />
      case 'completed':
        return <CheckCircleIcon className='h-4 w-4' />
      case 'failed':
        return <AlertCircleIcon className='h-4 w-4' />
      case 'cancelled':
        return <Square className='h-4 w-4' />
      default:
        return <ClockIcon className='h-4 w-4' />
    }
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>同步管理</h1>
              <p className='text-muted-foreground'>
                管理增量同步任务和监控系统状态
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue='sync' className='space-y-6'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='sync'>增量同步</TabsTrigger>
            <TabsTrigger value='tasks'>任务监控</TabsTrigger>
            <TabsTrigger value='stats'>系统统计</TabsTrigger>
          </TabsList>

          <TabsContent value='sync' className='space-y-6'>
            {/* 同步配置 */}
            <Card>
              <CardHeader>
                <CardTitle>同步配置</CardTitle>
                <CardDescription>配置增量同步参数</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='xnxq'>学年学期</Label>
                    <Input
                      id='xnxq'
                      value={syncConfig.xnxq}
                      onChange={(e) =>
                        setSyncConfig((prev) => ({
                          ...prev,
                          xnxq: e.target.value,
                        }))
                      }
                      placeholder='2024-2025-2'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='batchSize'>批量大小</Label>
                    <Input
                      id='batchSize'
                      type='number'
                      value={syncConfig.batchSize}
                      onChange={(e) =>
                        setSyncConfig((prev) => ({
                          ...prev,
                          batchSize: parseInt(e.target.value),
                        }))
                      }
                      placeholder='50'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='maxConcurrency'>最大并发数</Label>
                    <Input
                      id='maxConcurrency'
                      type='number'
                      value={syncConfig.maxConcurrency}
                      onChange={(e) =>
                        setSyncConfig((prev) => ({
                          ...prev,
                          maxConcurrency: parseInt(e.target.value),
                        }))
                      }
                      placeholder='5'
                    />
                  </div>
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id='parallel'
                      checked={syncConfig.parallel}
                      onChange={(e) =>
                        setSyncConfig((prev) => ({
                          ...prev,
                          parallel: e.target.checked,
                        }))
                      }
                      className='rounded'
                    />
                    <Label htmlFor='parallel'>并行处理</Label>
                  </div>
                </div>

                <div className='flex space-x-2'>
                  <Button
                    onClick={handleStartSync}
                    disabled={
                      startSyncMutation.isPending ||
                      syncStatus?.status === 'running'
                    }
                  >
                    {startSyncMutation.isPending ? (
                      <RefreshCwIcon className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <PlayIcon className='mr-2 h-4 w-4' />
                    )}
                    启动增量同步
                  </Button>

                  <Button
                    variant='outline'
                    onClick={handleRecoverTasks}
                    disabled={recoverTasksMutation.isPending}
                  >
                    {recoverTasksMutation.isPending ? (
                      <RefreshCwIcon className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <RefreshCwIcon className='mr-2 h-4 w-4' />
                    )}
                    恢复任务
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 同步状态 */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center space-x-2'>
                  <span>同步状态</span>
                  {!isLoadingSyncStatus && syncStatus && (
                    <Badge className={getSyncStatusColor(syncStatus.status)}>
                      {getSyncStatusIcon(syncStatus.status)}
                      <span className='ml-1'>{syncStatus.status}</span>
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>当前增量同步任务的执行状态</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSyncStatus ? (
                  <div className='flex items-center space-x-2'>
                    <RefreshCwIcon className='h-4 w-4 animate-spin' />
                    <span>加载中...</span>
                  </div>
                ) : syncStatus ? (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <Label>学年学期</Label>
                        <p className='text-sm font-medium'>{syncStatus.xnxq}</p>
                      </div>
                      <div>
                        <Label>任务ID</Label>
                        <p className='text-sm font-medium'>
                          {syncStatus.taskId || '未分配'}
                        </p>
                      </div>
                      <div>
                        <Label>开始时间</Label>
                        <p className='text-sm font-medium'>
                          {syncStatus.startTime
                            ? new Date(syncStatus.startTime).toLocaleString()
                            : '未开始'}
                        </p>
                      </div>
                      <div>
                        <Label>结束时间</Label>
                        <p className='text-sm font-medium'>
                          {syncStatus.endTime
                            ? new Date(syncStatus.endTime).toLocaleString()
                            : '未结束'}
                        </p>
                      </div>
                    </div>

                    {syncStatus.progress !== undefined && (
                      <div className='space-y-2'>
                        <div className='flex justify-between'>
                          <Label>进度</Label>
                          <span className='text-sm font-medium'>
                            {Math.round(syncStatus.progress)}%
                          </span>
                        </div>
                        <Progress
                          value={syncStatus.progress}
                          className='w-full'
                        />
                      </div>
                    )}

                    {syncStatus.statistics && (
                      <div className='grid grid-cols-3 gap-4'>
                        <div className='text-center'>
                          <p className='text-2xl font-bold'>
                            {syncStatus.statistics.totalCourses}
                          </p>
                          <p className='text-muted-foreground text-sm'>
                            总课程数
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-2xl font-bold'>
                            {syncStatus.statistics.teacherTasks}
                          </p>
                          <p className='text-muted-foreground text-sm'>
                            教师任务
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-2xl font-bold'>
                            {syncStatus.statistics.studentTasks}
                          </p>
                          <p className='text-muted-foreground text-sm'>
                            学生任务
                          </p>
                        </div>
                      </div>
                    )}

                    {syncStatus.error && (
                      <Alert variant='destructive'>
                        <AlertCircleIcon className='h-4 w-4' />
                        <AlertTitle>错误</AlertTitle>
                        <AlertDescription>{syncStatus.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <p className='text-muted-foreground'>暂无同步状态信息</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='tasks' className='space-y-6'>
            {/* 任务树视图 */}
            <Card>
              <CardHeader>
                <CardTitle>任务树</CardTitle>
                <CardDescription>当前系统中的任务层级结构</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTree ? (
                  <div className='flex items-center space-x-2'>
                    <RefreshCwIcon className='h-4 w-4 animate-spin' />
                    <span>加载中...</span>
                  </div>
                ) : taskTree && taskTree.nodes.length > 0 ? (
                  <div className='space-y-2'>
                    {taskTree.nodes.map((node) => (
                      <div
                        key={node.id}
                        className='space-y-2 rounded-lg border p-3'
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center space-x-2'>
                            <Badge className={getSyncStatusColor(node.status)}>
                              {getSyncStatusIcon(node.status)}
                              <span className='ml-1'>{node.status}</span>
                            </Badge>
                            <span className='font-medium'>{node.name}</span>
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            {node.childrenCount > 0 &&
                              `${node.childrenCount} 个子任务`}
                          </div>
                        </div>

                        {node.description && (
                          <p className='text-muted-foreground text-sm'>
                            {node.description}
                          </p>
                        )}

                        <div className='flex justify-between'>
                          <span className='text-sm'>进度</span>
                          <span className='text-sm font-medium'>
                            {Math.round(node.progress)}%
                          </span>
                        </div>
                        <Progress value={node.progress} className='w-full' />

                        {node.children && node.children.length > 0 && (
                          <div className='ml-4 space-y-2'>
                            {node.children.map((child) => (
                              <div
                                key={child.id}
                                className='flex items-center justify-between text-sm'
                              >
                                <div className='flex items-center space-x-2'>
                                  <Badge
                                    className={`${getSyncStatusColor(child.status)} text-xs`}
                                  >
                                    {child.status}
                                  </Badge>
                                  <span>{child.name}</span>
                                </div>
                                <span>{Math.round(child.progress)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground'>暂无任务</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='stats' className='space-y-6'>
            {/* 系统统计 */}
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
              {isLoadingStats ? (
                <div className='col-span-full flex items-center justify-center'>
                  <RefreshCwIcon className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>加载中...</span>
                </div>
              ) : taskStats ? (
                <>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        总任务数
                      </CardTitle>
                      <BarChart3Icon className='text-muted-foreground h-4 w-4' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {taskStats.total}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        运行中
                      </CardTitle>
                      <PlayIcon className='h-4 w-4 text-blue-600' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold text-blue-600'>
                        {taskStats.running}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        成功
                      </CardTitle>
                      <CheckCircleIcon className='h-4 w-4 text-green-600' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold text-green-600'>
                        {taskStats.success}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        失败
                      </CardTitle>
                      <AlertCircleIcon className='h-4 w-4 text-red-600' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold text-red-600'>
                        {taskStats.failed}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className='text-muted-foreground col-span-full text-center'>
                  暂无统计数据
                </div>
              )}
            </div>

            {taskStats && (
              <Card>
                <CardHeader>
                  <CardTitle>任务状态分布</CardTitle>
                  <CardDescription>
                    最后更新:{' '}
                    {new Date(taskStats.last_updated).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <div className='text-center'>
                      <p className='text-lg font-bold text-yellow-600'>
                        {taskStats.pending}
                      </p>
                      <p className='text-muted-foreground text-sm'>等待中</p>
                    </div>
                    <div className='text-center'>
                      <p className='text-lg font-bold text-orange-600'>
                        {taskStats.paused}
                      </p>
                      <p className='text-muted-foreground text-sm'>暂停</p>
                    </div>
                    <div className='text-center'>
                      <p className='text-lg font-bold text-gray-600'>
                        {taskStats.cancelled}
                      </p>
                      <p className='text-muted-foreground text-sm'>取消</p>
                    </div>
                    <div className='text-center'>
                      <p className='text-lg font-bold text-purple-600'>
                        {taskStats.timeout}
                      </p>
                      <p className='text-muted-foreground text-sm'>超时</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
