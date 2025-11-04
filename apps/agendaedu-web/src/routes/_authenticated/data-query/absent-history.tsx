import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
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
            缺勤历史明细
          </h1>
          <p className='text-muted-foreground'>查询学生缺勤历史记录</p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 查询条件 */}
        <Card>
          <CardHeader>
            <CardTitle>查询条件</CardTitle>
            <CardDescription>输入搜索关键词或选择筛选条件</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
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
                    <TableHead>年级</TableHead>
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
                    records.map((record: AbsentStudentRelation) => {
                      const truncate = (
                        text: string | number,
                        maxLength = 10
                      ) => {
                        const str = String(text || '')
                        return str.length > maxLength
                          ? str.substring(0, maxLength) + '...'
                          : str
                      }

                      return (
                        <TableRow key={record.id}>
                          <TableCell className='font-medium'>
                            {record.student_id}
                          </TableCell>
                          <TableCell>{record.student_name}</TableCell>
                          <TableCell>{record.course_code}</TableCell>
                          <TableCell title={record.course_name}>
                            {truncate(record.course_name)}
                          </TableCell>
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
                          <TableCell title={String(record.weekday)}>
                            {truncate(record.weekday)}
                          </TableCell>
                          <TableCell title={String(record.period)}>
                            {truncate(record.period)}
                          </TableCell>
                          <TableCell>{record.time_slot}</TableCell>
                          <TableCell title={record.school_name}>
                            {truncate(record.school_name)}
                          </TableCell>
                          <TableCell title={record.class_name}>
                            {truncate(record.class_name)}
                          </TableCell>
                          <TableCell title={record.major_name}>
                            {truncate(record.major_name)}
                          </TableCell>
                          <TableCell>{record.grade || '-'}</TableCell>
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
      </Main>
    </>
  )
}
