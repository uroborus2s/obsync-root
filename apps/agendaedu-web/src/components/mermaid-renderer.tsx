import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

interface MermaidRendererProps {
  definition: string
  className?: string
  style?: React.CSSProperties
}

export function MermaidRenderer({ definition, className, style }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mermaidLoaded, setMermaidLoaded] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadAndRenderMermaid = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 动态导入Mermaid
        const mermaid = await import('mermaid')
        
        if (!mounted) return

        // 初始化Mermaid
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'default',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#2563eb',
            lineColor: '#6b7280',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#ffffff'
          }
        })

        setMermaidLoaded(true)

        if (!containerRef.current || !definition.trim()) {
          setIsLoading(false)
          return
        }

        // 清空容器
        containerRef.current.innerHTML = ''

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // 渲染图表
        const { svg } = await mermaid.default.render(id, definition)
        
        if (!mounted || !containerRef.current) return

        containerRef.current.innerHTML = svg

        setIsLoading(false)
      } catch (err) {
        if (!mounted) return
        
        console.error('Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : '渲染失败')
        setIsLoading(false)
      }
    }

    loadAndRenderMermaid()

    return () => {
      mounted = false
    }
  }, [definition])

  if (isLoading) {
    return (
      <div className={className} style={style}>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={className} style={style}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            流程图渲染失败: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!definition.trim()) {
    return (
      <div className={className} style={style}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>暂无流程图定义</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`mermaid-container ${className || ''}`}
      style={style}
    />
  )
}

// 简化版本，使用CSS绘制基本流程图
export function SimplifiedFlowChart({ 
  nodes, 
  connections, 
  className 
}: {
  nodes: Array<{
    id: string
    name: string
    type: string
    status?: string
  }>
  connections: Array<{
    from: string
    to: string
    label?: string
  }>
  className?: string
}) {
  const getNodeColor = (type: string, status?: string) => {
    if (status === 'running') return 'bg-blue-100 border-blue-500 text-blue-800'
    if (status === 'completed') return 'bg-green-100 border-green-500 text-green-800'
    if (status === 'failed') return 'bg-red-100 border-red-500 text-red-800'
    
    switch (type) {
      case 'task':
        return 'bg-blue-50 border-blue-300 text-blue-700'
      case 'loop':
        return 'bg-purple-50 border-purple-300 text-purple-700'
      case 'parallel':
        return 'bg-yellow-50 border-yellow-300 text-yellow-700'
      case 'subprocess':
        return 'bg-indigo-50 border-indigo-300 text-indigo-700'
      default:
        return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋'
      case 'loop': return '🔄'
      case 'parallel': return '⚡'
      case 'subprocess': return '📦'
      default: return '⚪'
    }
  }

  return (
    <div className={`p-6 ${className || ''}`}>
      <div className="flex flex-col space-y-8">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex flex-col items-center">
            {/* 节点 */}
            <div className={`
              px-4 py-3 rounded-lg border-2 min-w-[120px] text-center
              ${getNodeColor(node.type, node.status)}
            `}>
              <div className="text-lg mb-1">{getNodeIcon(node.type)}</div>
              <div className="font-medium text-sm">{node.name}</div>
              <div className="text-xs opacity-75">{node.type}</div>
            </div>
            
            {/* 连接线 */}
            {index < nodes.length - 1 && (
              <div className="flex flex-col items-center my-2">
                <div className="w-0.5 h-6 bg-gray-300"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-0.5 h-6 bg-gray-300"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
