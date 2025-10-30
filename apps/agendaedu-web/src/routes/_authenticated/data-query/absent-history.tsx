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
  AbsentStudentRelation,
  StatsQueryParams,
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
  '/_authenticated/data-query/absent-history'
)({
  component: AbsentHistoryPage,
})

function AbsentHistoryPage() {
  const [filters, setFilters] = useState<StatsQueryParams>({
    page: 1,
    pageSize: 20,
    searchKeyword: '',
    teachingWeek: undefined,
    sortField: undefined,
    sortOrder: undefined,
  })

  // 查询数据
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['absent-history', filters],
    queryFn: () => statsApiService.getAbsentHistory(filters),
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
      teachingWeek: undefined,
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
          <h2 className='text-3xl font-bold tracking-tight'>缺勤历史明细</h2>
          <p className='text-muted-foreground'>查询学生缺勤历史记录</p>
        </div>
      </div>

      {/* 查询条件 */}
      <Card>
        <CardHeader>
          <CardTitle>查询条件</CardTitle>
          <CardDescription>输入搜索关键词或选择筛选条件</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label htmlFor='searchKeyword'>搜索</Label>
              <Input
                id='searchKeyword'
                placeholder='学生姓名、学号、课程名称、课程代码、缺勤类型'
                value={filters.searchKeyword}
                onChange={(e) =>
                  handleFilterChange('searchKeyword', e.target.value)
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='teachingWeek'>教学周</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    'teachingWeek',
                    value === 'all' ? undefined : Number(value)
                  )
                }
                value={
                  filters.teachingWeek ? String(filters.teachingWeek) : 'all'
                }
              >
                <SelectTrigger id='teachingWeek'>
                  <SelectValue placeholder='选择教学周' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>所有周次</SelectItem>
                  {Array.from({ length: 20 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      第 {i + 1} 周
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <TableHead>姓名</TableHead>
                  <TableHead>课程代码</TableHead>
                  <TableHead>课程名称</TableHead>
                  <TableHead>缺勤类型</TableHead>
                  <TableHead>学期</TableHead>
                  <TableHead
                    className='hover:bg-muted cursor-pointer'
                    onClick={() => handleSort('teaching_week')}
                  >
                    教学周
                    {filters.sortField === 'teaching_week' && (
                      <span className='ml-1'>
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>星期</TableHead>
                  <TableHead>节次</TableHead>
                  <TableHead>时间段</TableHead>
                  <TableHead>学院</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>专业</TableHead>
                  <TableHead>请假原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className='h-24 text-center'>
                      <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                      <p className='mt-2'>正在加载...</p>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={14}
                      className='h-24 text-center text-red-500'
                    >
                      加载数据失败: {error?.message || '未知错误'}
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className='h-24 text-center'>
                      无结果
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record: AbsentStudentRelation) => (
                    <TableRow key={record.id}>
                      <TableCell className='font-medium'>
                        {record.student_id}
                      </TableCell>
                      <TableCell>{record.student_name}</TableCell>
                      <TableCell>{record.course_code}</TableCell>
                      <TableCell>{record.course_name}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            record.absence_type === '旷课'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {record.absence_type}
                        </span>
                      </TableCell>
                      <TableCell>{record.semester}</TableCell>
                      <TableCell>{record.teaching_week}</TableCell>
                      <TableCell>{record.weekday}</TableCell>
                      <TableCell>{record.period}</TableCell>
                      <TableCell>{record.time_slot}</TableCell>
                      <TableCell>{record.school_name}</TableCell>
                      <TableCell>{record.class_name}</TableCell>
                      <TableCell>{record.major_name}</TableCell>
                      <TableCell>{record.leave_reason || '-'}</TableCell>
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
