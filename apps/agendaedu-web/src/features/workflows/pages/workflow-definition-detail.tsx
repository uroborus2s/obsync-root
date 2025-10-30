import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { workflowApi } from '@/lib/workflow-api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { EnhancedWorkflowVisualizer } from '../components/enhanced-workflow-visualizer'
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
  const { isLoading: instancesLoading } = useQuery({
    queryKey: ['workflow-instances', definitionId],
    queryFn: () =>
      workflowApi.getWorkflowInstances({
        workflowDefinitionId: Number(definitionId),
        page: 1,
        pageSize: 10,
      }),
    enabled: !!definitionId,
  })

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
          <div className='space-y-4'>
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                {definitionError?.message?.includes('404') ||
                definitionError?.message?.includes('not found')
                  ? `工作流定义 ID ${definitionId} 不存在，可能已被删除或ID不正确`
                  : definitionError?.message || '加载工作流定义失败'}
              </AlertDescription>
            </Alert>
            <div className='flex gap-2'>
              <Link to='/workflows/definitions'>
                <Button variant='default'>
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  返回工作流列表
                </Button>
              </Link>
              <Button onClick={() => refetchDefinition()} variant='outline'>
                <RefreshCw className='mr-2 h-4 w-4' />
                重试
              </Button>
            </div>
          </div>
        </Main>
      </div>
    )
  }

  return (
    <div className='flex h-screen flex-col'>
      <Header>
        <div className='flex w-full items-center justify-between'>
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
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
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
              <Card>
                <CardHeader>
                  <CardTitle>工作流可视化</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  {definition ? (
                    <div className='h-[600px]'>
                      <EnhancedWorkflowVisualizer
                        definition={definition}
                        onNodeClick={(_nodeId: string) => {
                          // 节点点击处理逻辑
                        }}
                      />
                    </div>
                  ) : (
                    <div className='flex items-center justify-center py-8'>
                      <div className='text-center'>
                        <RefreshCw className='mx-auto h-8 w-8 animate-spin text-gray-400' />
                        <p className='mt-2 text-gray-500'>
                          加载工作流定义中...
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

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
