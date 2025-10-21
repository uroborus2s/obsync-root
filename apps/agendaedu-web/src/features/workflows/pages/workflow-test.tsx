import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { SimplifiedWorkflowVisualizer } from '../components/simplified-workflow-visualizer'

export default function WorkflowTest() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(1)

  return (
    <div className="flex h-screen flex-col">
      <Header>
        <div className="flex items-center gap-4">
          <Link to="/workflows">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">工作流可视化测试</h1>
            <p className="text-sm text-muted-foreground">
              测试工作流可视化功能
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search />
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          {/* 测试说明 */}
          <Card>
            <CardHeader>
              <CardTitle>功能测试说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">已实现的功能：</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>✅ 工作流定义数据获取（支持外部API）</li>
                    <li>✅ 简化的流程图可视化展示</li>
                    <li>✅ 多种节点类型支持（简单、任务、循环、并行、子流程）</li>
                    <li>✅ 实时状态更新和状态图标</li>
                    <li>✅ 响应式设计和全屏模式</li>
                    <li>✅ 工作流实例管理表格</li>
                    <li>✅ 节点详情查看组件</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">技术特点：</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>🔧 基于React + TypeScript + TanStack Query</li>
                    <li>🎨 使用Tailwind CSS + shadcn/ui组件库</li>
                    <li>📊 支持从外部API获取工作流定义</li>
                    <li>🔄 实时数据刷新和状态同步</li>
                    <li>📱 响应式设计，支持移动端</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 工作流选择 */}
          <Card>
            <CardHeader>
              <CardTitle>选择测试工作流</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  variant={selectedWorkflowId === 1 ? 'default' : 'outline'}
                  onClick={() => setSelectedWorkflowId(1)}
                >
                  外部API工作流 (ID: 1)
                </Button>
                <Button 
                  variant={selectedWorkflowId === 2 ? 'default' : 'outline'}
                  onClick={() => setSelectedWorkflowId(2)}
                >
                  示例工作流 (ID: 2)
                </Button>
                <Button 
                  variant={selectedWorkflowId === 3 ? 'default' : 'outline'}
                  onClick={() => setSelectedWorkflowId(3)}
                >
                  复杂工作流 (ID: 3)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 当前选中的工作流信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>当前工作流</CardTitle>
                <Badge variant="outline">ID: {selectedWorkflowId}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {selectedWorkflowId === 1 && (
                  <p>此工作流将通过本地API获取定义数据：/api/workflows/definitions/1</p>
                )}
                {selectedWorkflowId === 2 && (
                  <p>此工作流使用本地示例数据，展示基本的节点类型和连接关系</p>
                )}
                {selectedWorkflowId === 3 && (
                  <p>此工作流展示复杂的节点结构，包含循环、并行和子流程节点</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 工作流可视化 */}
          <SimplifiedWorkflowVisualizer 
            workflowDefinitionId={selectedWorkflowId}
            showControls={true}
          />

          {/* API信息 */}
          <Card>
            <CardHeader>
              <CardTitle>API集成信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">本地API端点：</h4>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    GET /api/workflows/definitions/1
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">预期数据结构：</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
{`{
  "id": 1,
  "name": "工作流名称",
  "version": "1.0.0",
  "description": "工作流描述",
  "definition": {
    "nodes": [
      {
        "nodeId": "start",
        "nodeName": "开始",
        "nodeType": "simple",
        "maxRetries": 0
      },
      // ... 更多节点
    ],
    "connections": [
      {
        "id": "conn1",
        "source": "start",
        "target": "task1"
      }
      // ... 更多连接
    ]
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">支持的节点类型：</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <Badge variant="outline">📋 simple</Badge>
                    <Badge variant="outline">📋 task</Badge>
                    <Badge variant="outline">🔄 loop</Badge>
                    <Badge variant="outline">⚡ parallel</Badge>
                    <Badge variant="outline">📦 subprocess</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>
  )
}
