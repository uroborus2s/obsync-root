import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { WorkflowInstance, WorkflowStatus } from '@/types/workflow.types'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { workflowApi } from '@/lib/workflow-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search as SearchComponent } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { WorkflowGroupsView } from '../components/workflow-groups-view'
import { WorkflowInstancesTable } from '../components/workflow-instances-table'

export default function WorkflowInstancesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | ''>('')
  const [definitionFilter, setDefinitionFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const pageSize = 20

  // 获取流程分组列表
  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: [
      'workflow-groups',
      searchTerm,
      statusFilter,
      definitionFilter,
      page,
    ],
    queryFn: () =>
      workflowApi.getWorkflowGroups({
        page,
        pageSize,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        workflowDefinitionName: definitionFilter || undefined,
      }),
    refetchInterval: 10000, // 每10秒刷新
    retry: 3,
    retryDelay: 1000,
    enabled: viewMode === 'grouped',
  })

  // 获取传统实例列表（当选择列表模式时）
  const {
    data: instancesData,
    isLoading: instancesLoading,
    error: instancesError,
  } = useQuery({
    queryKey: [
      'workflow-instances-list',
      searchTerm,
      statusFilter,
      definitionFilter,
      page,
    ],
    queryFn: () =>
      workflowApi.getWorkflowInstances({
        page,
        pageSize,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        workflowDefinitionName: definitionFilter || undefined,
        rootInstancesOnly: false,
      }),
    refetchInterval: 10000, // 每10秒刷新
    retry: 3,
    retryDelay: 1000,
    enabled: viewMode === 'list',
  })

  // 获取工作流定义列表（用于过滤器）
  const { data: definitionsData } = useQuery({
    queryKey: ['workflow-definitions-for-filter'],
    queryFn: () =>
      workflowApi.getWorkflowDefinitions({ page: 1, pageSize: 100 }),
  })

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPage(1) // 重置到第一页
  }

  // 处理状态过滤
  const handleStatusFilter = (value: string) => {
    setStatusFilter((value === 'all' ? '' : value) as WorkflowStatus | '')
    setPage(1)
  }

  // 处理定义过滤
  const handleDefinitionFilter = (value: string) => {
    setDefinitionFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  // 处理视图模式切换
  const handleViewModeChange = (mode: 'grouped' | 'list') => {
    setViewMode(mode)
    setPage(1)
    setExpandedGroups(new Set()) // 重置展开状态
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

  // 处理创建新实例
  const handleCreateInstance = () => {
    toast.info('创建工作流实例功能开发中...')
    // TODO: 实现创建功能
  }

  // 查看工作流实例
  const handleViewInstance = (instanceId: number) => {
    // 跳转到实例详情页面，使用正确的路径
    window.location.href = `/web/workflows/instances/${instanceId}`
  }

  // 查看执行历史
  const handleViewHistory = (instance: WorkflowInstance) => {
    toast.info(`查看工作流实例 "${instance.name}" 执行历史功能开发中...`)
    // TODO: 实现查看历史功能
  }

  // 根据视图模式获取当前数据
  const currentData = viewMode === 'grouped' ? groupsData : instancesData
  const total = currentData?.total || 0
  const totalPages = currentData?.totalPages || 0
  const definitions = definitionsData?.items || []

  // 根据视图模式计算统计数据
  let runningCount = 0
  let completedCount = 0
  let failedCount = 0
  let pendingCount = 0

  if (viewMode === 'grouped' && groupsData?.groups) {
    // 分组模式：汇总所有分组的统计数据
    runningCount = groupsData.groups.reduce(
      (sum, group) => sum + group.runningInstanceCount,
      0
    )
    completedCount = groupsData.groups.reduce(
      (sum, group) => sum + group.completedInstanceCount,
      0
    )
    failedCount = groupsData.groups.reduce(
      (sum, group) => sum + group.failedInstanceCount,
      0
    )
    // 计算等待中的数量（总数减去其他状态）
    const totalInstances = groupsData.groups.reduce(
      (sum, group) => sum + group.rootInstanceCount,
      0
    )
    pendingCount = totalInstances - runningCount - completedCount - failedCount
  } else if (viewMode === 'list' && instancesData?.items) {
    // 列表模式：统计当前页面的实例状态
    runningCount = instancesData.items.filter(
      (item) => item.status === 'running'
    ).length
    completedCount = instancesData.items.filter(
      (item) => item.status === 'completed'
    ).length
    failedCount = instancesData.items.filter(
      (item) => item.status === 'failed'
    ).length
    pendingCount = instancesData.items.filter(
      (item) => item.status === 'pending'
    ).length
  }

  // 错误处理
  const currentError = viewMode === 'grouped' ? groupsError : instancesError
  const currentLoading =
    viewMode === 'grouped' ? groupsLoading : instancesLoading

  if (currentError) {
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
                      无法加载工作流实例列表，请检查网络连接或稍后重试
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
        <div className='space-y-6'>
          {/* 页面标题和操作 */}
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>工作流实例</h1>
              <p className='text-muted-foreground mt-2'>
                查看和管理工作流实例的执行状态和历史记录
              </p>
            </div>
            <div className='flex gap-2'>
              <Link to='/workflows/definitions'>
                <Button variant='outline' className='gap-2'>
                  <Activity className='h-4 w-4' />
                  工作流定义
                </Button>
              </Link>
              <Button onClick={handleCreateInstance} className='gap-2'>
                <Plus className='h-4 w-4' />
                新建实例
              </Button>
            </div>
          </div>

          {/* 搜索和过滤 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Filter className='h-5 w-5' />
                搜索和过滤
              </CardTitle>
              <CardDescription>
                使用搜索和过滤条件快速找到需要的工作流实例
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4 md:flex-row md:items-end'>
                <div className='flex-1'>
                  <label className='mb-2 block text-sm font-medium'>搜索</label>
                  <div className='relative'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                      placeholder='搜索实例名称、业务键...'
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
                      <SelectItem value='pending'>等待中</SelectItem>
                      <SelectItem value='running'>运行中</SelectItem>
                      <SelectItem value='completed'>已完成</SelectItem>
                      <SelectItem value='failed'>失败</SelectItem>
                      <SelectItem value='cancelled'>已取消</SelectItem>
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

          {/* 统计信息 */}
          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>运行中</CardTitle>
                <Activity className='h-4 w-4 text-blue-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-blue-600'>
                  {currentLoading ? (
                    <div className='flex items-center gap-2'>
                      <RefreshCw className='h-4 w-4 animate-spin' />
                      <span>--</span>
                    </div>
                  ) : (
                    runningCount
                  )}
                </div>
                <p className='text-muted-foreground text-xs'>正在执行的实例</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>已完成</CardTitle>
                <CheckCircle className='h-4 w-4 text-green-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-green-600'>
                  {completedCount}
                </div>
                <p className='text-muted-foreground text-xs'>成功完成的实例</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>失败</CardTitle>
                <XCircle className='h-4 w-4 text-red-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-red-600'>
                  {failedCount}
                </div>
                <p className='text-muted-foreground text-xs'>执行失败的实例</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>等待中</CardTitle>
                <Clock className='h-4 w-4 text-yellow-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-yellow-600'>
                  {pendingCount}
                </div>
                <p className='text-muted-foreground text-xs'>等待执行的实例</p>
              </CardContent>
            </Card>
          </div>

          {/* 工作流实例列表 */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>工作流实例</CardTitle>
                  <CardDescription>查看和管理所有工作流实例</CardDescription>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant={viewMode === 'grouped' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => handleViewModeChange('grouped')}
                  >
                    <Users className='mr-2 h-4 w-4' />
                    分组视图
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => handleViewModeChange('list')}
                  >
                    <Activity className='mr-2 h-4 w-4' />
                    列表视图
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'grouped' ? (
                <WorkflowGroupsView
                  data={groupsData}
                  isLoading={groupsLoading}
                  error={groupsError}
                  expandedGroups={expandedGroups}
                  onGroupToggle={handleGroupToggle}
                  onViewInstance={handleViewInstance}
                />
              ) : (
                <WorkflowInstancesTable
                  onViewInstance={(instance: WorkflowInstance) =>
                    handleViewInstance(instance.id)
                  }
                  onViewHistory={handleViewHistory}
                  searchTerm={searchTerm}
                  statusFilter={statusFilter}
                  definitionFilter={definitionFilter}
                  page={page}
                  pageSize={pageSize}
                />
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
    </>
  )
}
