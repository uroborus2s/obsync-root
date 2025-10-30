import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search as SearchIcon,
} from 'lucide-react'
import {
  StatsQueryParams,
  StudentOverallAttendanceStats,
  statsApiService,
} from '@/lib/stats-api'
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

export const Route = createFileRoute(
  '/_authenticated/data-query/student-stats'
)({
  component: StudentStatsPage,
})

function StudentStatsPage() {
  const [filters, setFilters] = useState<StatsQueryParams>({
    page: 1,
    pageSize: 20,
    searchKeyword: '',
    sortField: undefined,
    sortOrder: undefined,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['student-stats', filters],
    queryFn: () => statsApiService.getStudentStats(filters),
    placeholderData: (previousData) => previousData,
  })

  const records = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = data?.data?.totalPages ?? 0

  const handleFilterChange = (key: keyof StatsQueryParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }))
    }
  }

  const handleReset = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      searchKeyword: '',
      sortField: undefined,
      sortOrder: undefined,
    })
  }

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortField: field,
      sortOrder:
        prev.sortField === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }

  return (
    <div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>学生历史统计</h2>
          <p className='text-muted-foreground'>查询学生整体出勤统计数据</p>
        </div>
      </div>

      {/* 查询条件 */}
      <Card>
        <CardHeader>
          <CardTitle>查询条件</CardTitle>
          <CardDescription>输入搜索关键词或选择筛选条件</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='searchKeyword'>搜索</Label>
              <Input
                id='searchKeyword'
                placeholder='学号、姓名、学院名称、班级名称'
                value={filters.searchKeyword}
                onChange={(e) =>
                  handleFilterChange('searchKeyword', e.target.value)
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='pageSize'>每页显示</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange('pageSize', Number(value))
                }
                value={String(filters.pageSize)}
              >
                <SelectTrigger id='pageSize'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='10'>10 条</SelectItem>
                  <SelectItem value='20'>20 条</SelectItem>
                  <SelectItem value='50'>50 条</SelectItem>
                  <SelectItem value='100'>100 条</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex gap-4'>
            <Button onClick={handleReset} variant='outline'>
              <RotateCcw className='mr-2 h-4 w-4' />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 查询结果 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>查询结果</CardTitle>
              <CardDescription>找到 {total} 条记录</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className='hover:bg-muted cursor-pointer'
                    onClick={() => handleSort('student_id')}
                  >
                    学号
                    {filters.sortField === 'student_id' && (
                      <span className='ml-1'>
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead
                    className='hover:bg-muted cursor-pointer'
                    onClick={() => handleSort('name')}
                  >
                    姓名
                    {filters.sortField === 'name' && (
                      <span className='ml-1'>
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>学院名称</TableHead>
                  <TableHead>专业名称</TableHead>
                  <TableHead>班级名称</TableHead>
                  <TableHead
                    className='hover:bg-muted cursor-pointer'
                    onClick={() => handleSort('total_sessions')}
                  >
                    课节总数
                    {filters.sortField === 'total_sessions' && (
                      <span className='ml-1'>
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>已上课节数</TableHead>
                  <TableHead
                    className='hover:bg-muted cursor-pointer'
                    onClick={() => handleSort('absent_count')}
                  >
                    缺勤节数
                    {filters.sortField === 'absent_count' && (
                      <span className='ml-1'>
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>请假节数</TableHead>
                  <TableHead>旷课次数</TableHead>
                  <TableHead
                    className='hover:bg-muted cursor-pointer'
                    onClick={() => handleSort('absence_rate')}
                  >
                    缺勤率%
                    {filters.sortField === 'absence_rate' && (
                      <span className='ml-1'>
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className='h-24 text-center'>
                      <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                      <p className='mt-2'>正在加载...</p>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className='h-24 text-center text-red-500'
                    >
                      加载数据失败: {error?.message || '未知错误'}
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className='h-24 text-center'>
                      无结果
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record: StudentOverallAttendanceStats) => (
                    <TableRow key={record.student_id}>
                      <TableCell className='font-medium'>
                        {record.student_id}
                      </TableCell>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>{record.school_name}</TableCell>
                      <TableCell>{record.major_name}</TableCell>
                      <TableCell>{record.class_name}</TableCell>
                      <TableCell>{record.total_sessions}</TableCell>
                      <TableCell>{record.completed_sessions}</TableCell>
                      <TableCell>
                        <span className='text-red-600'>
                          {record.absent_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='text-yellow-600'>
                          {record.leave_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='text-red-800'>
                          {record.truant_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            record.absence_rate > 30
                              ? 'text-red-600'
                              : record.absence_rate > 10
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }`}
                        >
                          {record.absence_rate.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-muted-foreground text-sm'>
              第 {filters.page} 页，共 {totalPages} 页 | 总计 {total} 条记录
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(filters.page! - 1)}
                disabled={filters.page === 1 || isLoading}
              >
                <ChevronLeft className='h-4 w-4' />
                上一页
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(filters.page! + 1)}
                disabled={filters.page === totalPages || isLoading}
              >
                下一页
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
