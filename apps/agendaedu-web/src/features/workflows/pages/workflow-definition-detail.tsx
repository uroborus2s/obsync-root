import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  Edit,
  Play,
  RefreshCw,
  Settings,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { workflowApi } from '@/lib/workflow-api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { SimplifiedWorkflowVisualizer } from '../components/simplified-workflow-visualizer'
import { WorkflowInstancesTable } from '../components/workflow-instances-table'

export default function WorkflowDefinitionDetail() {
  const { definitionId } = useParams({
    from: '/_authenticated/workflows/definitions/$definitionId',
  })
  const [activeTab, setActiveTab] = useState('overview')

  // 获取工作流定义详情
  const {
    data: definition,
    isLoading: definitionLoading,
    error: definitionError,
    refetch: refetchDefinition,
  } = useQuery({
    queryKey: ['workflow-definition', definitionId],
    queryFn: () => workflowApi.getWorkflowDefinitionById(Number(definitionId)),
    enabled: !!definitionId,
  })

  // 获取工作流实例列表
  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['workflow-instances', definitionId],
    queryFn: () =>
      workflowApi.getWorkflowInstances({
        workflowDefinitionId: Number(definitionId),
        page: 1,
        pageSize: 10,
      }),
    enabled: !!definitionId,
  })

  const handleStartWorkflow = async () => {
    try {
      await workflowApi.createWorkflowInstance({
        workflowDefinitionId: Number(definitionId),
        name: `${definition?.name}-${Date.now()}`,
        inputData: {},
      })
      toast.success('工作流实例创建成功')
      // 刷新实例列表
      window.location.reload()
    } catch (error) {
      toast.error('创建工作流实例失败')
    }
  }

  const handleCopyDefinition = () => {
    if (definition) {
      navigator.clipboard.writeText(
        JSON.stringify(definition.definition, null, 2)
      )
      toast.success('工作流定义已复制到剪贴板')
    }
  }

  if (definitionLoading) {
    return (
      <div className='flex h-screen flex-col'>
        <Header>
          <div className='flex items-center gap-4'>
            <Skeleton className='h-8 w-8' />
            <Skeleton className='h-6 w-48' />
          </div>
          <div className='flex items-center gap-2'>
            <Search />
            <ThemeSwitch />
            <UserNav />
          </div>
        </Header>
        <Main>
          <div className='space-y-6'>
            <Skeleton className='h-32 w-full' />
            <Skeleton className='h-96 w-full' />
          </div>
        </Main>
      </div>
    )
  }

  if (definitionError || !definition) {
    return (
      <div className='flex h-screen flex-col'>
        <Header>
          <div className='flex items-center gap-4'>
            <Link to='/workflows/definitions'>
              <Button variant='ghost' size='sm'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
            </Link>
            <h1 className='text-xl font-semibold'>工作流详情</h1>
          </div>
          <div className='flex items-center gap-2'>
            <Search />
            <ThemeSwitch />
            <UserNav />
          </div>
        </Header>
        <Main>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              {definitionError?.message || '工作流定义不存在'}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => refetchDefinition()}
            className='mt-4'
            variant='outline'
          >
            <RefreshCw className='mr-2 h-4 w-4' />
            重试
          </Button>
        </Main>
      </div>
    )
  }

  const runningInstances =
    instances?.items?.filter((i) => i.status === 'running').length || 0
  const completedInstances =
    instances?.items?.filter((i) => i.status === 'completed').length || 0
  const failedInstances =
    instances?.items?.filter((i) => i.status === 'failed').length || 0

  return (
    <div className='flex h-screen flex-col'>
      <Header>
        <div className='flex items-center gap-4'>
          <Link to='/workflows/definitions'>
            <Button variant='ghost' size='sm'>
              <ArrowLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div>
            <h1 className='text-xl font-semibold'>{definition.name}</h1>
            <p className='text-muted-foreground text-sm'>
              版本 {definition.version} • ID: {definition.id}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Search />
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* 工作流基本信息 */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    definition.status === 'active' ? 'default' : 'secondary'
                  }
                  className={
                    definition.status === 'active' ? 'bg-green-500' : ''
                  }
                >
                  {definition.status === 'active'
                    ? '活跃'
                    : definition.status === 'draft'
                      ? '草稿'
                      : definition.status === 'deprecated'
                        ? '已弃用'
                        : '已归档'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  运行中实例
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <Clock className='h-4 w-4 text-blue-500' />
                  <span className='text-2xl font-bold'>{runningInstances}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  已完成实例
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='h-4 w-4 text-green-500' />
                  <span className='text-2xl font-bold'>
                    {completedInstances}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  失败实例
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <XCircle className='h-4 w-4 text-red-500' />
                  <span className='text-2xl font-bold'>{failedInstances}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 操作按钮 */}
          <div className='flex items-center gap-2'>
            <Button onClick={handleStartWorkflow}>
              <Play className='mr-2 h-4 w-4' />
              启动工作流
            </Button>
            <Button variant='outline'>
              <Edit className='mr-2 h-4 w-4' />
              编辑
            </Button>
            <Button variant='outline' onClick={handleCopyDefinition}>
              <Copy className='mr-2 h-4 w-4' />
              复制定义
            </Button>
            <Button variant='outline'>
              <Settings className='mr-2 h-4 w-4' />
              配置
            </Button>
          </div>

          {/* 标签页内容 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value='overview'>流程图</TabsTrigger>
              <TabsTrigger value='instances'>实例</TabsTrigger>
              <TabsTrigger value='definition'>定义</TabsTrigger>
              <TabsTrigger value='settings'>设置</TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='space-y-6'>
              {/* 工作流可视化 */}
              <SimplifiedWorkflowVisualizer
                workflowDefinitionId={Number(definitionId)}
                showControls={true}
              />

              {/* 描述信息 */}
              {definition.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>描述</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-muted-foreground'>
                      {definition.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value='instances'>
              <Card>
                <CardHeader>
                  <CardTitle>工作流实例</CardTitle>
                </CardHeader>
                <CardContent>
                  {instancesLoading ? (
                    <Skeleton className='h-64 w-full' />
                  ) : (
                    <WorkflowInstancesTable
                      workflowDefinitionId={Number(definitionId)}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='definition'>
              <Card>
                <CardHeader>
                  <CardTitle>工作流定义</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className='max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-sm'>
                    {JSON.stringify(definition.definition, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='settings'>
              <Card>
                <CardHeader>
                  <CardTitle>工作流设置</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div>
                      <label className='text-sm font-medium'>名称</label>
                      <p className='text-muted-foreground text-sm'>
                        {definition.name}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm font-medium'>版本</label>
                      <p className='text-muted-foreground text-sm'>
                        {definition.version}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm font-medium'>创建时间</label>
                      <p className='text-muted-foreground text-sm'>
                        {definition.createdAt
                          ? new Date(definition.createdAt).toLocaleString()
                          : '未知'}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm font-medium'>更新时间</label>
                      <p className='text-muted-foreground text-sm'>
                        {definition.updatedAt
                          ? new Date(definition.updatedAt).toLocaleString()
                          : '未知'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </div>
  )
}
