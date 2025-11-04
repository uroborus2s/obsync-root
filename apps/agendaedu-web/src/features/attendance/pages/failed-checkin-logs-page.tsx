import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { attendanceApi } from '@/lib/attendance-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export function FailedCheckinLogsPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20

  // 查询失败的签到任务
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['failed-checkin-jobs', page, pageSize],
    queryFn: () => attendanceApi.getFailedCheckinJobs(page, pageSize),
    placeholderData: (previousData) => previousData,
  })

  const records = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // 截断长文本
  const truncate = (text: string, maxLength = 30) => {
    if (!text) return '-'
    const str = String(text)
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
  }

  return (
    <>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            签到失败日志
          </h1>
          <p className='text-muted-foreground'>
            查看签到队列中失败的任务记录，包括失败原因和详细信息
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 查询结果 */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>失败任务列表</CardTitle>
                <CardDescription>找到 {total} 条失败记录</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务ID</TableHead>
                    <TableHead>学生ID</TableHead>
                    <TableHead>学生姓名</TableHead>
                    <TableHead>课程ID</TableHead>
                    <TableHead>签到时间</TableHead>
                    <TableHead>失败原因</TableHead>
                    <TableHead>处理时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-24 text-center'>
                        <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                        <p className='mt-2'>正在加载...</p>
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className='h-24 text-center text-red-500'
                      >
                        加载数据失败: {error?.message || '未知错误'}
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-24 text-center'>
                        暂无失败记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => {
                      const jobData = record.data || {}
                      const studentInfo = jobData.studentInfo || {}

                      return (
                        <TableRow key={record.id}>
                          <TableCell className='font-medium'>
                            {record.id}
                          </TableCell>
                          <TableCell>{studentInfo.userId || '-'}</TableCell>
                          <TableCell>{studentInfo.username || '-'}</TableCell>
                          <TableCell>{jobData.courseExtId || '-'}</TableCell>
                          <TableCell>
                            {jobData.checkinTime
                              ? formatTimestamp(
                                  new Date(jobData.checkinTime).getTime()
                                )
                              : '-'}
                          </TableCell>
                          <TableCell
                            title={record.failedReason}
                            className='max-w-xs'
                          >
                            <span className='text-red-600'>
                              {truncate(record.failedReason, 40)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatTimestamp(record.processedOn)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            <div className='mt-4 flex items-center justify-between'>
              <div className='text-muted-foreground text-sm'>
                第 {page} 页，共 {totalPages} 页 | 总计 {total} 条记录
              </div>
              <div className='flex items-center space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className='h-4 w-4' />
                  上一页
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || isLoading}
                >
                  下一页
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}

