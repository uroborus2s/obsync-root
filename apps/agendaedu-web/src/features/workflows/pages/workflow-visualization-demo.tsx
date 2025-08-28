import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Download,
  Eye,
  Play,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { WorkflowInstancesTable } from '../components/workflow-instances-table'
import { WorkflowNodeDetail } from '../components/workflow-node-detail'

export default function WorkflowVisualizationDemo() {
  const [activeTab, setActiveTab] = useState('visualizer')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(1)

  // 模拟工作流定义数据
  const mockWorkflowDefinitions = [
    {
      id: 1,
      name: '学生成绩处理流程',
      version: '1.0.0',
      description: '处理学生成绩录入、审核、发布的完整流程',
      status: 'active' as const,
      nodeCount: 8,
      lastModified: '2024-01-15',
    },
    {
      id: 2,
      name: '课程申请审批流程',
      version: '2.1.0',
      description: '新课程申请的多级审批流程',
      status: 'active' as const,
      nodeCount: 12,
      lastModified: '2024-01-10',
    },
    {
      id: 3,
      name: '教师评估流程',
      version: '1.5.0',
      description: '教师年度评估的标准化流程',
      status: 'draft' as const,
      nodeCount: 15,
      lastModified: '2024-01-08',
    },
  ]

  // 模拟节点数据
  const mockNodes = [
    {
      nodeId: 'start',
      nodeName: '开始',
      nodeType: 'simple' as const,
      maxRetries: 0,
      inputData: {},
      dependsOn: [],
    },
    {
      nodeId: 'validate_data',
      nodeName: '数据验证',
      nodeType: 'task' as const,
      executor: 'DataValidationExecutor',
      maxRetries: 3,
      timeoutSeconds: 30,
      inputData: { rules: ['required', 'format'] },
      dependsOn: ['start'],
    },
    {
      nodeId: 'process_loop',
      nodeName: '批量处理',
      nodeType: 'loop' as const,
      executor: 'BatchProcessExecutor',
      maxRetries: 2,
      timeoutSeconds: 300,
      condition: 'items.length > 0',
      dependsOn: ['validate_data'],
    },
    {
      nodeId: 'parallel_tasks',
      nodeName: '并行任务',
      nodeType: 'parallel' as const,
      maxRetries: 1,
      dependsOn: ['process_loop'],
    },
    {
      nodeId: 'sub_workflow',
      nodeName: '子流程调用',
      nodeType: 'subprocess' as const,
      executor: 'SubWorkflowExecutor',
      maxRetries: 2,
      timeoutSeconds: 600,
      inputData: { workflowName: 'approval-process' },
      dependsOn: ['parallel_tasks'],
    },
    {
      nodeId: 'end',
      nodeName: '结束',
      nodeType: 'simple' as const,
      maxRetries: 0,
      dependsOn: ['sub_workflow'],
    },
  ]

  // 模拟实例数据
  const mockInstance = {
    status: 'running',
    currentNodeId: 'process_loop',
    completedNodes: ['start', 'validate_data'],
    failedNodes: [],
    executionPath: ['start', 'validate_data', 'process_loop'],
  }

  // 模拟执行详情
  const mockExecutionDetails = {
    startedAt: '2024-01-15T10:30:00Z',
    duration: 45000,
    retryCount: 1,
    outputData: { processedCount: 150, errors: [] },
  }

  const selectedWorkflow = mockWorkflowDefinitions.find(
    (w) => w.id === selectedWorkflowId
  )

  return (
    <div className='flex h-screen flex-col'>
      <Header>
        <div className='flex items-center gap-4'>
          <Link to='/workflows'>
            <Button variant='ghost' size='sm'>
              <ArrowLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div>
            <h1 className='text-xl font-semibold'>工作流可视化演示</h1>
            <p className='text-muted-foreground text-sm'>
              展示增强的工作流可视化功能
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
          {/* 工作流选择器 */}
          <Card>
            <CardHeader>
              <CardTitle>选择工作流定义</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                {mockWorkflowDefinitions.map((workflow) => (
                  <Card
                    key={workflow.id}
                    className={`cursor-pointer transition-colors ${
                      selectedWorkflowId === workflow.id
                        ? 'bg-blue-50 ring-2 ring-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedWorkflowId(workflow.id)}
                  >
                    <CardHeader className='pb-2'>
                      <div className='flex items-center justify-between'>
                        <CardTitle className='text-base'>
                          {workflow.name}
                        </CardTitle>
                        <Badge
                          variant={
                            workflow.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {workflow.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className='text-muted-foreground mb-2 text-sm'>
                        {workflow.description}
                      </p>
                      <div className='text-muted-foreground flex items-center justify-between text-xs'>
                        <span>版本: {workflow.version}</span>
                        <span>{workflow.nodeCount} 个节点</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 当前选中的工作流信息 */}
          {selectedWorkflow && (
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>{selectedWorkflow.name}</CardTitle>
                    <p className='text-muted-foreground text-sm'>
                      {selectedWorkflow.description}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button size='sm'>
                      <Play className='mr-2 h-4 w-4' />
                      启动实例
                    </Button>
                    <Button size='sm' variant='outline'>
                      <Settings className='mr-2 h-4 w-4' />
                      配置
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* 标签页内容 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='visualizer'>流程图</TabsTrigger>
              <TabsTrigger value='instances'>实例管理</TabsTrigger>
              <TabsTrigger value='nodes'>节点详情</TabsTrigger>
              <TabsTrigger value='api-demo'>API演示</TabsTrigger>
            </TabsList>

            <TabsContent value='visualizer' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>增强工作流可视化</CardTitle>
                  <p className='text-muted-foreground text-sm'>
                    支持多种节点类型、实时状态更新、交互式操作
                  </p>
                </CardHeader>
                <CardContent>
                  <SimplifiedWorkflowVisualizer
                    workflowDefinitionId={selectedWorkflowId}
                    showControls={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='instances' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>工作流实例管理</CardTitle>
                  <p className='text-muted-foreground text-sm'>
                    查看和管理工作流实例的执行状态
                  </p>
                </CardHeader>
                <CardContent>
                  <WorkflowInstancesTable
                    workflowDefinitionId={selectedWorkflowId}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='nodes' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>节点详情展示</CardTitle>
                  <p className='text-muted-foreground text-sm'>
                    查看各种类型节点的详细配置和执行信息
                  </p>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {mockNodes.map((node) => (
                      <Card key={node.nodeId} className='p-4'>
                        <div className='mb-2 flex items-center justify-between'>
                          <h4 className='font-medium'>{node.nodeName}</h4>
                          <Badge variant='outline'>{node.nodeType}</Badge>
                        </div>
                        <p className='text-muted-foreground mb-3 text-sm'>
                          节点ID: {node.nodeId}
                        </p>
                        <WorkflowNodeDetail
                          node={node}
                          instance={mockInstance}
                          executionDetails={mockExecutionDetails}
                        />
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='api-demo' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>API集成演示</CardTitle>
                  <p className='text-muted-foreground text-sm'>
                    演示从外部API获取工作流定义数据
                  </p>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex items-center gap-4'>
                    <Button>
                      <RefreshCw className='mr-2 h-4 w-4' />
                      从API获取数据
                    </Button>
                    <Button variant='outline'>
                      <Eye className='mr-2 h-4 w-4' />
                      查看原始数据
                    </Button>
                    <Button variant='outline'>
                      <Download className='mr-2 h-4 w-4' />
                      导出配置
                    </Button>
                  </div>

                  <div className='rounded-lg bg-gray-50 p-4'>
                    <h4 className='mb-2 font-medium'>API端点信息</h4>
                    <div className='space-y-2 text-sm'>
                      <div>
                        <span className='font-medium'>URL:</span>
                        <code className='ml-2 rounded bg-white px-2 py-1'>
                          https://kwps.jlufe.edu.cn/api/workflows/definitions/1
                        </code>
                      </div>
                      <div>
                        <span className='font-medium'>方法:</span>
                        <Badge variant='outline' className='ml-2'>
                          GET
                        </Badge>
                      </div>
                      <div>
                        <span className='font-medium'>响应格式:</span>
                        <span className='ml-2'>JSON</span>
                      </div>
                    </div>
                  </div>

                  <SimplifiedWorkflowVisualizer
                    workflowDefinitionId={1}
                    showControls={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </div>
  )
}
