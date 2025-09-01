import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { SimplifiedWorkflowVisualizer } from '@/features/workflows/components/simplified-workflow-visualizer'

function QuickTestPage() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(1)

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
            <h1 className='text-xl font-semibold'>工作流快速测试</h1>
            <p className='text-muted-foreground text-sm'>
              测试工作流详情页面功能
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
          {/* 测试按钮 */}
          <Card>
            <CardHeader>
              <CardTitle>选择测试工作流</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex gap-4'>
                <Button
                  variant={selectedWorkflowId === 1 ? 'default' : 'outline'}
                  onClick={() => setSelectedWorkflowId(1)}
                >
                  工作流 ID: 1 (外部API)
                </Button>
                <Button
                  variant={selectedWorkflowId === 2 ? 'default' : 'outline'}
                  onClick={() => setSelectedWorkflowId(2)}
                >
                  工作流 ID: 2 (本地)
                </Button>
                <Button
                  variant={selectedWorkflowId === 3 ? 'default' : 'outline'}
                  onClick={() => setSelectedWorkflowId(3)}
                >
                  工作流 ID: 3 (本地)
                </Button>
              </div>
              <div className='mt-4'>
                <Link
                  to='/workflows/definitions/$definitionId'
                  params={{ definitionId: selectedWorkflowId.toString() }}
                >
                  <Button>跳转到详情页面 (ID: {selectedWorkflowId})</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 直接显示可视化组件 */}
          <Card>
            <CardHeader>
              <CardTitle>工作流可视化预览</CardTitle>
            </CardHeader>
            <CardContent>
              <SimplifiedWorkflowVisualizer
                workflowDefinitionId={selectedWorkflowId}
                showControls={true}
              />
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/workflows/quick-test')({
  component: QuickTestPage,
})
