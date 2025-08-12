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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { workflowApi } from '@/lib/workflow-api'
import type {
    WorkflowDefinition,
    WorkflowInstance,
} from '@/types/workflow.types'
import { WorkflowStatus } from '@/types/workflow.types'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
    Activity,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Plus,
    Workflow,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
// API 和类型
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
// 工作流组件
import { WorkflowDefinitionsTable } from '../components/workflow-definitions-table'
import { WorkflowExecutionHistory } from '../components/workflow-execution-history'
import { WorkflowInstancesTable } from '../components/workflow-instances-table'
// import { WorkflowStatsCards } from '../components/workflow-stats-cards'
import { WorkflowVisualizer } from '../components/workflow-visualizer'

export default function WorkflowsPage() {
  const [currentTab, setCurrentTab] = useState<
    'definitions' | 'running' | 'completed' | 'failed'
  >('definitions')
  const [selectedDefinition, setSelectedDefinition] =
    useState<WorkflowDefinition | null>(null)
  const [selectedInstance, setSelectedInstance] =
    useState<WorkflowInstance | null>(null)
  const [showDefinitionDialog, setShowDefinitionDialog] = useState(false)
  const [showInstanceDialog, setShowInstanceDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // 获取工作流统计信息
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: () => workflowApi.getWorkflowStats(),
    refetchInterval: 30000, // 每30秒刷新统计信息
    retry: false, // 让401错误直接触发重定向
  })

  // 处理创建新工作流
  const handleCreateWorkflow = () => {
    toast.info('创建功能开发中...')
    // TODO: 实现创建功能
  }

  // 查看工作流定义
  const handleViewDefinition = (definition: WorkflowDefinition) => {
    setSelectedDefinition(definition)
    setShowDefinitionDialog(true)
  }

  // 编辑工作流定义
  const handleEditDefinition = (definition: WorkflowDefinition) => {
    toast.info(`编辑工作流 "${definition.name}" 功能开发中...`)
  }

  // 启动工作流
  const handleStartWorkflow = (definition: WorkflowDefinition) => {
    toast.info(`启动工作流 "${definition.name}" 功能开发中...`)
  }

  // 查看工作流实例
  const handleViewInstance = (instance: WorkflowInstance) => {
    setSelectedInstance(instance)
    setShowInstanceDialog(true)
  }

  // 查看执行历史
  const handleViewHistory = (instance: WorkflowInstance) => {
    setSelectedInstance(instance)
    setShowHistoryDialog(true)
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
                <Workflow className='h-8 w-8' />
                工作流管理
              </h1>
              <p className='text-muted-foreground mt-2'>
                管理和监控工作流定义、实例和执行历史
              </p>
            </div>
            <div className='flex gap-2'>
              <Link to='/workflows/schedules'>
                <Button variant='outline' className='gap-2'>
                  <Calendar className='h-4 w-4' />
                  定时任务
                </Button>
              </Link>
              <Link to='/workflows/logs'>
                <Button variant='outline' className='gap-2'>
                  <FileText className='h-4 w-4' />
                  执行日志
                </Button>
              </Link>
              <Button onClick={handleCreateWorkflow} className='gap-2'>
                <Plus className='h-4 w-4' />
                创建工作流
              </Button>
            </div>
          </div>

          {/* 统计卡片 */}
          {!statsLoading && statsData && (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    工作流定义
                  </CardTitle>
                  <Workflow className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {statsData.totalDefinitions}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    活跃: {statsData.activeDefinitions}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    运行中实例
                  </CardTitle>
                  <Activity className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {statsData.runningInstances}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    总实例: {statsData.totalInstances}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>成功率</CardTitle>
                  <CheckCircle className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {statsData.successRate}%
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    已完成: {statsData.completedInstances}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    失败实例
                  </CardTitle>
                  <Clock className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {statsData.failedInstances}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    最后更新:{' '}
                    {new Date(statsData.lastUpdated).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {statsLoading && (
            <div className='text-muted-foreground py-8 text-center'>
              正在加载统计信息...
            </div>
          )}

          {/* 主要内容 */}
          <Card>
            <CardHeader>
              <CardTitle>工作流概览</CardTitle>
              <CardDescription>
                查看和管理所有工作流定义、运行实例和执行历史
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={currentTab}
                onValueChange={(v) => setCurrentTab(v as any)}
                className='w-full'
              >
                <TabsList className='grid w-full grid-cols-4'>
                  <TabsTrigger value='definitions' className='gap-2'>
                    <Workflow className='h-4 w-4' />
                    工作流定义
                  </TabsTrigger>
                  <TabsTrigger value='running' className='gap-2'>
                    <Activity className='h-4 w-4' />
                    运行中
                  </TabsTrigger>
                  <TabsTrigger value='completed' className='gap-2'>
                    <CheckCircle className='h-4 w-4' />
                    已完成
                  </TabsTrigger>
                  <TabsTrigger value='failed' className='gap-2'>
                    <Clock className='h-4 w-4' />
                    失败/取消
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='definitions' className='space-y-4'>
                  <WorkflowDefinitionsTable
                    onViewDefinition={handleViewDefinition}
                    onEditDefinition={handleEditDefinition}
                    onStartWorkflow={handleStartWorkflow}
                  />
                </TabsContent>

                <TabsContent value='running' className='space-y-4'>
                  <WorkflowInstancesTable
                    status={WorkflowStatus.RUNNING}
                    onViewInstance={handleViewInstance}
                    onViewHistory={handleViewHistory}
                  />
                </TabsContent>

                <TabsContent value='completed' className='space-y-4'>
                  <WorkflowInstancesTable
                    status={WorkflowStatus.COMPLETED}
                    onViewInstance={handleViewInstance}
                    onViewHistory={handleViewHistory}
                  />
                </TabsContent>

                <TabsContent value='failed' className='space-y-4'>
                  <WorkflowInstancesTable
                    status={WorkflowStatus.FAILED}
                    onViewInstance={handleViewInstance}
                    onViewHistory={handleViewHistory}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* 工作流定义详情对话框 */}
      <Dialog
        open={showDefinitionDialog}
        onOpenChange={setShowDefinitionDialog}
      >
        <DialogContent className='max-h-[80vh] max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>工作流定义详情</DialogTitle>
          </DialogHeader>
          {selectedDefinition && (
            <div className='space-y-6'>
              {/* 基本信息 */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    名称
                  </label>
                  <div className='font-medium'>{selectedDefinition.name}</div>
                </div>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    版本
                  </label>
                  <div>{selectedDefinition.version}</div>
                </div>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    状态
                  </label>
                  <div>
                    {selectedDefinition.status === 'active' ? (
                      <span className='text-green-600'>已启用</span>
                    ) : (
                      <span className='text-gray-600'>已禁用</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    节点数量
                  </label>
                  <div>{selectedDefinition.nodes?.length || 0} 个节点</div>
                </div>
              </div>

              {selectedDefinition.description && (
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    描述
                  </label>
                  <div className='mt-1 text-sm'>
                    {selectedDefinition.description}
                  </div>
                </div>
              )}

              {/* 工作流可视化 */}
              <WorkflowVisualizer definition={selectedDefinition} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 工作流实例详情对话框 */}
      <Dialog open={showInstanceDialog} onOpenChange={setShowInstanceDialog}>
        <DialogContent className='max-h-[80vh] max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>工作流实例详情</DialogTitle>
          </DialogHeader>
          {selectedInstance && selectedInstance.workflowDefinition && (
            <div className='space-y-6'>
              {/* 基本信息 */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    实例ID
                  </label>
                  <div className='font-mono text-sm'>{selectedInstance.id}</div>
                </div>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    工作流名称
                  </label>
                  <div>{selectedInstance.workflowDefinition.name}</div>
                </div>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    状态
                  </label>
                  <div>{selectedInstance.status}</div>
                </div>
                <div>
                  <label className='text-muted-foreground text-sm font-medium'>
                    当前节点
                  </label>
                  <div>{selectedInstance.currentNodeId || '无'}</div>
                </div>
              </div>

              {/* 工作流可视化（带实例状态） */}
              {selectedInstance.workflowDefinition && (
                <WorkflowVisualizer
                  definition={selectedInstance.workflowDefinition}
                  instance={selectedInstance}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 执行历史对话框 */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className='max-h-[80vh] max-w-6xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>执行历史</DialogTitle>
          </DialogHeader>
          {selectedInstance && (
            <div className='space-y-4'>
              <WorkflowExecutionHistory instanceId={selectedInstance.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
