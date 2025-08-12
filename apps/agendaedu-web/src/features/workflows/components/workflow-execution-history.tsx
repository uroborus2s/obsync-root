import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import type { WorkflowExecutionLog } from '@/types/workflow.types'
import { zhCN } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import { workflowApi } from '@/lib/workflow-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingState } from '@/components/loading-state'

interface WorkflowExecutionHistoryProps {
  instanceId: number
  className?: string
}

export function WorkflowExecutionHistory({
  instanceId,
  className,
}: WorkflowExecutionHistoryProps) {
  const [_selectedLog, _setSelectedLog] = useState<WorkflowExecutionLog | null>(
    null
  )

  // 获取执行历史
  const { data, isLoading, error } = useQuery({
    queryKey: ['workflow-execution-history', instanceId],
    queryFn: () => workflowApi.getLogsByInstanceId(instanceId),
    refetchInterval: 5000, // 每5秒刷新
  })

  const logs = data || []

  return (
    <div className={className}>
      <LoadingState
        isLoading={isLoading}
        error={error}
        isEmpty={logs.length === 0}
        emptyMessage='暂无执行日志'
        emptyDescription='该工作流实例还没有生成执行日志'
      >
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>节点ID</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>消息</TableHead>
                <TableHead>时间</TableHead>
                <TableHead className='w-[100px]'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='text-muted-foreground py-8 text-center'
                  >
                    暂无执行日志
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className='font-medium'>
                      {log.nodeId || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          log.level === 'error'
                            ? 'bg-red-100 text-red-800'
                            : log.level === 'warn'
                              ? 'bg-yellow-100 text-yellow-800'
                              : log.level === 'info'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='max-w-md truncate' title={log.message}>
                        {log.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>
                          {format(new Date(log.timestamp), 'MM-dd HH:mm:ss')}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          {formatDistanceToNow(new Date(log.timestamp), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => _setSelectedLog(log)}
                          >
                            <Eye className='h-4 w-4' />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-2xl'>
                          <DialogHeader>
                            <DialogTitle>日志详情</DialogTitle>
                          </DialogHeader>
                          <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4'>
                              <div>
                                <label className='text-muted-foreground text-sm font-medium'>
                                  节点ID
                                </label>
                                <div className='font-mono text-sm'>
                                  {log.nodeId || '-'}
                                </div>
                              </div>
                              <div>
                                <label className='text-muted-foreground text-sm font-medium'>
                                  级别
                                </label>
                                <div className='mt-1'>
                                  <Badge
                                    className={
                                      log.level === 'error'
                                        ? 'bg-red-100 text-red-800'
                                        : log.level === 'warn'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : log.level === 'info'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {log.level.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <label className='text-muted-foreground text-sm font-medium'>
                                  时间
                                </label>
                                <div>
                                  {format(
                                    new Date(log.timestamp),
                                    'yyyy-MM-dd HH:mm:ss'
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className='text-muted-foreground text-sm font-medium'>
                                  引擎实例ID
                                </label>
                                <div className='font-mono text-sm'>
                                  {log.engineInstanceId || '-'}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className='text-muted-foreground text-sm font-medium'>
                                消息内容
                              </label>
                              <div className='mt-1 rounded-md border p-3'>
                                <pre className='text-sm whitespace-pre-wrap'>
                                  {log.message}
                                </pre>
                              </div>
                            </div>

                            {log.details && (
                              <div>
                                <label className='text-muted-foreground text-sm font-medium'>
                                  详细信息
                                </label>
                                <ScrollArea className='mt-1 h-32 w-full rounded-md border p-3'>
                                  <pre className='text-sm'>
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </LoadingState>
    </div>
  )
}
