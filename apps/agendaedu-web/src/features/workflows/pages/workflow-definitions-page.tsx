import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { WorkflowDefinition } from '@/types/workflow.types'
import { AlertCircle, Filter, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
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
import { WorkflowDefinitionsTable } from '../components/workflow-definitions-table'

export default function WorkflowDefinitionsPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 临时使用模拟数据进行测试
  const data = {
    items: [
      {
        id: 1,
        name: 'full-sync-multi-loop-workflow',
        description: '完整同步多循环工作流',
        version: '1.0.0',
        status: 'active',
        enabled: true,
        definition: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'calendar-group-sync-workflow',
        description: '日历组同步工作流',
        version: '1.0.0',
        status: 'active',
        enabled: true,
        definition: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 5,
        name: 'test-sync-workflow',
        description:
          '基于Stratix Tasks架构的增量同步工作流，用于处理课程表的增量数据变更同步',
        version: '1.0.0',
        status: 'active',
        enabled: true,
        definition: {
          nodes: [
            {
              nodeId: 'start',
              nodeName: '开始节点',
              nodeType: 'simple',
              maxRetries: 0,
              dependsOn: [],
            },
            {
              nodeId: 'data-validation',
              nodeName: '数据验证',
              nodeType: 'task',
              executor: 'DataValidationExecutor',
              maxRetries: 3,
              dependsOn: ['start'],
            },
            {
              nodeId: 'sync-process',
              nodeName: '同步处理',
              nodeType: 'task',
              executor: 'SyncProcessExecutor',
              maxRetries: 2,
              dependsOn: ['data-validation'],
            },
            {
              nodeId: 'completion',
              nodeName: '完成节点',
              nodeType: 'simple',
              maxRetries: 0,
              dependsOn: ['sync-process'],
            },
          ],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    total: 3,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }
  // const _statsLoading = false
  const _statsError = null

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

  // 处理分类过滤
  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  // 查看工作流定义
  const handleViewDefinition = (definition: WorkflowDefinition) => {
    // 跳转到工作流详情页面
    navigate({
      to: '/workflows/definitions/$definitionId',
      params: { definitionId: definition.id!.toString() },
    })
  }

  // const definitions = data?.items || []
  const total = data?.total || 0

  // 错误处理
  if (_statsError) {
    return (
      <>
        <Header className='border-b'>
          <div className='flex items-center space-x-4'>
            <SearchComponent />
            <ThemeSwitch />
            <UserNav />
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
                      无法加载工作流定义列表，请检查网络连接或稍后重试
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
        <div className='flex items-center space-x-4'>
          <SearchComponent />
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* 页面标题和操作 */}
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>工作流定义</h1>
              <p className='text-muted-foreground mt-2'>查看和管理工作流定义</p>
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
                使用搜索和过滤条件快速找到需要的工作流定义
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4 md:flex-row md:items-end'>
                <div className='flex-1'>
                  <label className='mb-2 block text-sm font-medium'>搜索</label>
                  <div className='relative'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                      placeholder='搜索工作流名称、描述...'
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
                      <SelectItem value='draft'>草稿</SelectItem>
                      <SelectItem value='active'>活跃</SelectItem>
                      <SelectItem value='deprecated'>已弃用</SelectItem>
                      <SelectItem value='archived'>已归档</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='w-full md:w-48'>
                  <label className='mb-2 block text-sm font-medium'>分类</label>
                  <Select
                    value={categoryFilter || 'all'}
                    onValueChange={handleCategoryFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择分类' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部分类</SelectItem>
                      <SelectItem value='automation'>自动化</SelectItem>
                      <SelectItem value='approval'>审批</SelectItem>
                      <SelectItem value='notification'>通知</SelectItem>
                      <SelectItem value='integration'>集成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 工作流定义列表 */}
          <Card>
            <CardHeader>
              <CardTitle>工作流定义列表</CardTitle>
              <CardDescription>查看和管理所有工作流定义</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowDefinitionsTable
                onViewDefinition={handleViewDefinition}
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                categoryFilter={categoryFilter}
                page={page}
                pageSize={pageSize}
              />

              {/* 分页控件 */}
              <EnhancedPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
