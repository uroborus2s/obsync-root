import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { zhCN } from 'date-fns/locale'
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Info,
  RefreshCw,
  Search as SearchIcon,
  XCircle,
} from 'lucide-react'
import { workflowApi } from '@/lib/workflow-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
// API 和类型
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

// 扩展本地日志接口以匹配 API 响应
// interface LocalWorkflowExecutionLog extends WorkflowExecutionLog {
//   // 添加下划线命名的别名属性以兼容API响应
//   workflow_instance_id?: number
//   task_node_id?: number | null
//   node_id?: string | null
//   engine_instance_id?: string | null
//   created_at?: string
// }

export default function WorkflowLogsPage() {
  const [filters, setFilters] = useState({
    workflowInstanceId: '',
    level: '',
    keyword: '',
    startTime: '',
    endTime: '',
  })
  const [page, setPage] = useState(1)
  const pageSize = 50

  // 获取执行日志
  const {
    data: logsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['workflow-logs', filters, page],
    queryFn: () =>
      workflowApi.getExecutionLogs({
        page,
        pageSize,
        workflowInstanceId: filters.workflowInstanceId
          ? Number(filters.workflowInstanceId)
          : undefined,
        level: filters.level as any,
        keyword: filters.keyword || undefined,
        startTime: filters.startTime || undefined,
        endTime: filters.endTime || undefined,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      }),
    refetchInterval: 10000, // 每10秒刷新
  })

  // 注意：日志统计信息暂时不可用，需要后端支持

  // 处理筛选
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1) // 重置到第一页
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  // 清空筛选
  const handleClearFilters = () => {
    setFilters({
      workflowInstanceId: '',
      level: '',
      keyword: '',
      startTime: '',
      endTime: '',
    })
    setPage(1)
  }

  // 获取日志级别颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'debug':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  // 获取日志级别图标
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className='h-4 w-4' />
      case 'warn':
        return <AlertCircle className='h-4 w-4' />
      case 'info':
        return <Info className='h-4 w-4' />
      case 'debug':
        return <CheckCircle className='h-4 w-4' />
      default:
        return <Info className='h-4 w-4' />
    }
  }

  const logs = logsData?.items || []
  const totalPages = logsData ? Math.ceil(logsData.total / pageSize) : 0

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
                <FileText className='h-8 w-8' />
                工作流日志
              </h1>
              <p className='text-muted-foreground mt-2'>
                查看和分析工作流执行日志和调试信息
              </p>
            </div>
            <Button onClick={() => refetch()} className='gap-2'>
              <RefreshCw className='h-4 w-4' />
              刷新
            </Button>
          </div>

          {/* 统计卡片 - 暂时注释掉 */}
          {/* TODO: 添加日志统计功能 */}
          <div className='text-muted-foreground py-4 text-center'>
            日志统计功能开发中...
          </div>

          {/* 筛选器 */}
          <Card>
            <CardHeader>
              <CardTitle>筛选条件</CardTitle>
              <CardDescription>根据条件筛选工作流执行日志</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                <div className='space-y-2'>
                  <Label htmlFor='instanceId'>工作流实例ID</Label>
                  <Input
                    id='instanceId'
                    placeholder='输入实例ID'
                    value={filters.workflowInstanceId}
                    onChange={(e) =>
                      handleFilterChange('workflowInstanceId', e.target.value)
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='level'>日志级别</Label>
                  <Select
                    value={filters.level}
                    onValueChange={(value) =>
                      handleFilterChange('level', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择日志级别' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=''>全部</SelectItem>
                      <SelectItem value='error'>错误</SelectItem>
                      <SelectItem value='warn'>警告</SelectItem>
                      <SelectItem value='info'>信息</SelectItem>
                      <SelectItem value='debug'>调试</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='keyword'>关键词搜索</Label>
                  <Input
                    id='keyword'
                    placeholder='搜索日志内容'
                    value={filters.keyword}
                    onChange={(e) =>
                      handleFilterChange('keyword', e.target.value)
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='startTime'>开始时间</Label>
                  <Input
                    id='startTime'
                    type='datetime-local'
                    value={filters.startTime}
                    onChange={(e) =>
                      handleFilterChange('startTime', e.target.value)
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='endTime'>结束时间</Label>
                  <Input
                    id='endTime'
                    type='datetime-local'
                    value={filters.endTime}
                    onChange={(e) =>
                      handleFilterChange('endTime', e.target.value)
                    }
                  />
                </div>
                <div className='flex items-end space-x-2'>
                  <Button onClick={handleSearch} className='gap-2'>
                    <SearchIcon className='h-4 w-4' />
                    搜索
                  </Button>
                  <Button variant='outline' onClick={handleClearFilters}>
                    清空
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 日志列表 */}
          <Card>
            <CardHeader>
              <CardTitle>执行日志</CardTitle>
              <CardDescription>工作流执行过程中的详细日志记录</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='py-8 text-center'>加载中...</div>
              ) : logs.length === 0 ? (
                <div className='text-muted-foreground py-8 text-center'>
                  暂无日志记录
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>级别</TableHead>
                        <TableHead>实例ID</TableHead>
                        <TableHead>节点ID</TableHead>
                        <TableHead>消息</TableHead>
                        <TableHead>引擎实例</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className='font-mono text-sm'>
                            {formatDistanceToNow(new Date(log.timestamp), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge className={getLevelColor(log.level)}>
                              <span className='flex items-center gap-1'>
                                {getLevelIcon(log.level)}
                                {log.level.toUpperCase()}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className='font-mono text-sm'>
                            {log.workflowInstanceId}
                          </TableCell>
                          <TableCell className='font-mono text-sm'>
                            {log.nodeId || '-'}
                          </TableCell>
                          <TableCell className='max-w-md truncate'>
                            {log.message}
                          </TableCell>
                          <TableCell className='font-mono text-sm'>
                            {log.engineInstanceId || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className='mt-4 flex items-center justify-between'>
                      <div className='text-muted-foreground text-sm'>
                        第 {page} 页，共 {totalPages} 页
                      </div>
                      <div className='flex space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          上一页
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={page >= totalPages}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>
  )
}
