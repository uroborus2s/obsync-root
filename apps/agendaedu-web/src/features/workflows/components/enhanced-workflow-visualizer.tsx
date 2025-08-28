import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Download,
  Maximize2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { workflowApi } from '@/lib/workflow-api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MermaidRenderer,
  SimplifiedFlowChart,
} from '@/components/mermaid-renderer'

interface EnhancedWorkflowVisualizerProps {
  workflowDefinitionId: number
  instanceId?: number
  className?: string
  showControls?: boolean
}

interface WorkflowNode {
  nodeId: string
  nodeName: string
  nodeType: 'simple' | 'task' | 'loop' | 'parallel' | 'subprocess'
  executor?: string
  dependsOn?: string[]
  position?: { x: number; y: number }
  maxRetries: number
  timeoutSeconds?: number
  inputData?: Record<string, any>
  condition?: string
}

interface WorkflowConnection {
  id: string
  source: string
  target: string
  condition?: string
  label?: string
  type?: 'success' | 'failure' | 'conditional' | 'default'
}

interface WorkflowDefinitionData {
  name: string
  version: string
  description?: string
  nodes: WorkflowNode[]
  connections?: WorkflowConnection[]
  inputs?: any[]
  outputs?: any[]
  config?: any
}

export function EnhancedWorkflowVisualizer({
  workflowDefinitionId,
  instanceId,
  className,
  showControls = true,
}: EnhancedWorkflowVisualizerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null)
  const [mermaidLoaded, setMermaidLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 获取工作流定义
  const {
    data: definition,
    isLoading: definitionLoading,
    error: definitionError,
    refetch: refetchDefinition,
  } = useQuery({
    queryKey: ['workflow-definition', workflowDefinitionId],
    queryFn: () => workflowApi.getWorkflowDefinitionById(workflowDefinitionId),
    enabled: !!workflowDefinitionId,
  })

  // 获取工作流实例（如果提供了instanceId）
  const {
    data: instance,
    isLoading: instanceLoading,
    error: instanceError,
  } = useQuery({
    queryKey: ['workflow-instance', instanceId],
    queryFn: () => workflowApi.getWorkflowInstance(instanceId!),
    enabled: !!instanceId,
    refetchInterval: instanceId ? 5000 : false, // 实例数据每5秒刷新
  })

  // 动态加载Mermaid
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        const mermaid = await import('mermaid')
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'default',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#2563eb',
            lineColor: '#6b7280',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#ffffff',
          },
        })
        setMermaidLoaded(true)
      } catch (error) {
        console.error('Failed to load Mermaid:', error)
        toast.error('流程图渲染库加载失败')
      }
    }

    loadMermaid()
  }, [])

  // 生成节点图标
  const getNodeIcon = (nodeType: string): string => {
    switch (nodeType) {
      case 'simple':
      case 'task':
        return '📋'
      case 'loop':
        return '🔄'
      case 'parallel':
        return '⚡'
      case 'subprocess':
        return '📦'
      default:
        return '⚪'
    }
  }

  // 生成节点样式类
  const getNodeStyleClass = (nodeId: string): string => {
    if (!instance) return 'default'

    if (instance.currentNodeId === nodeId && instance.status === 'running') {
      return 'running'
    }

    if (instance.completedNodes?.includes(nodeId)) {
      return 'completed'
    }

    if (instance.failedNodes?.includes(nodeId)) {
      return 'failed'
    }

    return 'pending'
  }

  // 生成Mermaid图表定义
  const generateMermaidDefinition = (): string => {
    if (!definition?.definition) return ''

    const workflowData = definition.definition as WorkflowDefinitionData
    const nodes = workflowData.nodes || []
    const connections = workflowData.connections || []

    let mermaidDef = 'flowchart TD\n'

    // 添加样式类定义
    mermaidDef += `
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#333
    classDef running fill:#dbeafe,stroke:#3b82f6,stroke-width:3px,color:#1e40af
    classDef completed fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#166534
    classDef failed fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#991b1b
    classDef pending fill:#f3f4f6,stroke:#6b7280,stroke-width:1px,color:#374151
    `

    // 添加节点定义
    nodes.forEach((node: WorkflowNode) => {
      const icon = getNodeIcon(node.nodeType)
      const styleClass = getNodeStyleClass(node.nodeId)
      const label = `${icon} ${node.nodeName}<br/><small>${node.nodeType}</small>`

      mermaidDef += `    ${node.nodeId}["${label}"]:::${styleClass}\n`
    })

    // 添加连接定义
    if (connections.length > 0) {
      connections.forEach((conn: WorkflowConnection) => {
        const label = conn.label ? `|${conn.label}|` : ''
        const arrow = conn.type === 'failure' ? '-.->|❌|' : '-->'
        mermaidDef += `    ${conn.source} ${arrow}${label} ${conn.target}\n`
      })
    } else {
      // 如果没有显式连接，根据dependsOn生成连接
      nodes.forEach((node: WorkflowNode) => {
        if (node.dependsOn && node.dependsOn.length > 0) {
          node.dependsOn.forEach((depId: string) => {
            mermaidDef += `    ${depId} --> ${node.nodeId}\n`
          })
        }
      })
    }

    return mermaidDef
  }

  // 渲染Mermaid图表
  useEffect(() => {
    if (!mermaidLoaded || !definition || !mermaidRef.current) return

    const renderChart = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        const mermaidDef = generateMermaidDefinition()

        if (!mermaidDef.trim()) return

        // 清空容器
        mermaidRef.current!.innerHTML = ''

        // 渲染图表
        const { svg } = await mermaid.render('workflow-chart', mermaidDef)
        mermaidRef.current!.innerHTML = svg

        // 应用缩放
        const svgElement = mermaidRef.current!.querySelector('svg')
        if (svgElement) {
          svgElement.style.transform = `scale(${zoom})`
          svgElement.style.transformOrigin = 'top left'
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error)
        mermaidRef.current!.innerHTML = `
          <div class="flex items-center justify-center h-64 text-red-500">
            <div class="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>流程图渲染失败</p>
            </div>
          </div>
        `
      }
    }

    renderChart()
  }, [mermaidLoaded, definition, instance, zoom])

  // 处理缩放
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5))
  const handleResetZoom = () => setZoom(1)

  // 处理全屏
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 导出图表
  const handleExport = () => {
    const svgElement = mermaidRef.current?.querySelector('svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)

      const link = document.createElement('a')
      link.download = `workflow-${definition?.name || 'chart'}.png`
      link.href = canvas.toDataURL()
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  if (definitionLoading || instanceLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-64 w-full' />
        </CardContent>
      </Card>
    )
  }

  if (definitionError || instanceError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className='text-red-600'>加载失败</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              {definitionError?.message || instanceError?.message || '未知错误'}
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-lg'>
              {definition?.name || '工作流程图'}
            </CardTitle>
            {definition?.description && (
              <p className='text-muted-foreground mt-1 text-sm'>
                {definition.description}
              </p>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {instance && (
              <Badge
                variant={
                  instance.status === 'running' ? 'default' : 'secondary'
                }
                className={
                  instance.status === 'running'
                    ? 'bg-blue-500'
                    : instance.status === 'completed'
                      ? 'bg-green-500'
                      : instance.status === 'failed'
                        ? 'bg-red-500'
                        : ''
                }
              >
                {instance.status}
              </Badge>
            )}
            {showControls && (
              <>
                <Button size='sm' variant='outline' onClick={handleZoomOut}>
                  <ZoomOut className='h-4 w-4' />
                </Button>
                <Button size='sm' variant='outline' onClick={handleResetZoom}>
                  {Math.round(zoom * 100)}%
                </Button>
                <Button size='sm' variant='outline' onClick={handleZoomIn}>
                  <ZoomIn className='h-4 w-4' />
                </Button>
                <Button size='sm' variant='outline' onClick={handleExport}>
                  <Download className='h-4 w-4' />
                </Button>
                <Button size='sm' variant='outline' onClick={handleFullscreen}>
                  <Maximize2 className='h-4 w-4' />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={mermaidRef}
          className='min-h-[400px] overflow-auto rounded-lg border bg-white p-4'
          style={{
            height: isFullscreen ? 'calc(100vh - 200px)' : '500px',
            maxHeight: isFullscreen ? 'none' : '500px',
          }}
        />

        {/* 执行信息 */}
        {instance && (
          <div className='mt-4 rounded-lg bg-gray-50 p-4'>
            <h4 className='mb-2 font-medium'>执行信息</h4>
            <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
              <div>
                <span className='text-muted-foreground'>当前节点:</span>
                <p className='font-medium'>{instance.currentNodeId || '无'}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>已完成:</span>
                <p className='font-medium'>
                  {instance.completedNodes?.length || 0}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>失败节点:</span>
                <p className='font-medium'>
                  {instance.failedNodes?.length || 0}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>重试次数:</span>
                <p className='font-medium'>{instance.retryCount || 0}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
