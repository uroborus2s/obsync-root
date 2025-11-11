import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarDays, TrendingUp, Users } from 'lucide-react'
import { attendanceApi } from '@/lib/attendance-api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CourseStats {
  course_code: string
  course_name: string
  semester: string
  teacher_names: string
  teacher_codes: string
  class_count: number
  total_should_attend: number
  actual_attended: number
  leave_count: number
  absent_count: number
  attendance_rate: number
  last_class_time?: string
}

interface CourseStatsResponse {
  data: CourseStats[]
  total: number
  page: number
  page_size: number
}

export function CourseStatsTab() {
  const [filters, setFilters] = useState({
    semester: 'all',
    start_date: '',
    end_date: '',
    page: 1,
    page_size: 20,
    sort_by: 'attendance_rate' as
      | 'attendance_rate'
      | 'class_count'
      | 'last_class_time',
    sort_order: 'desc' as 'asc' | 'desc',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-stats', filters],
    queryFn: async (): Promise<CourseStatsResponse> => {
      const response = await attendanceApi.getCourseAttendanceStats({
        semester: filters.semester === 'all' ? undefined : filters.semester,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        page: filters.page,
        page_size: filters.page_size,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      })

      if (!response.success) {
        throw new Error(response.message || '获取课程统计数据失败')
      }

      return response.data
    },
    enabled: true,
  })

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : Number(value), // 确保page始终是number类型
    }))
  }

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 90)
      return <Badge className='bg-green-100 text-green-800'>{rate}%</Badge>
    if (rate >= 80)
      return <Badge className='bg-yellow-100 text-yellow-800'>{rate}%</Badge>
    if (rate >= 70)
      return <Badge className='bg-orange-100 text-orange-800'>{rate}%</Badge>
    return <Badge className='bg-red-100 text-red-800'>{rate}%</Badge>
  }

  return (
    <div className='space-y-6'>
      {/* 筛选条件 */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='space-y-2'>
          <Label htmlFor='semester'>学期</Label>
          <Select
            value={filters.semester}
            onValueChange={(value) => handleFilterChange('semester', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder='选择学期' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部学期</SelectItem>
              <SelectItem value='2024-2025-1'>2024-2025-1</SelectItem>
              <SelectItem value='2024-2025-2'>2024-2025-2</SelectItem>
              <SelectItem value='2023-2024-1'>2023-2024-1</SelectItem>
              <SelectItem value='2023-2024-2'>2023-2024-2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='start_date'>开始日期</Label>
          <Input
            id='start_date'
            type='date'
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='end_date'>结束日期</Label>
          <Input
            id='end_date'
            type='date'
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='sort_by'>排序方式</Label>
          <Select
            value={filters.sort_by}
            onValueChange={(value) => handleFilterChange('sort_by', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='attendance_rate'>出勤率</SelectItem>
              <SelectItem value='class_count'>课次数</SelectItem>
              <SelectItem value='last_class_time'>最近上课时间</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 统计概览卡片 */}
      {data && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>总课程数</CardTitle>
              <BookOpen className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{data.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>总课次数</CardTitle>
              <CalendarDays className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.reduce((sum, item) => sum + item.class_count, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>平均出勤率</CardTitle>
              <TrendingUp className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.length > 0
                  ? Math.round(
                      data.data.reduce(
                        (sum, item) => sum + item.attendance_rate,
                        0
                      ) / data.data.length
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>总学生数</CardTitle>
              <Users className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.reduce(
                  (sum, item) => sum + item.total_should_attend,
                  0
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 数据表格 */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>课程信息</TableHead>
              <TableHead>授课教师</TableHead>
              <TableHead>学期</TableHead>
              <TableHead className='text-center'>课次数</TableHead>
              <TableHead className='text-center'>应签到人数</TableHead>
              <TableHead className='text-center'>实际出勤</TableHead>
              <TableHead className='text-center'>请假</TableHead>
              <TableHead className='text-center'>缺勤</TableHead>
              <TableHead className='text-center'>出勤率</TableHead>
              <TableHead>最近上课</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 10 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className='h-4 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} className='text-center text-red-500'>
                  加载失败：{error.message}
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className='text-muted-foreground text-center'
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((course) => (
                <TableRow key={`${course.course_code}-${course.semester}`}>
                  <TableCell>
                    <div>
                      <div className='font-medium'>{course.course_name}</div>
                      <div className='text-muted-foreground text-sm'>
                        {course.course_code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{course.teacher_names}</TableCell>
                  <TableCell>{course.semester}</TableCell>
                  <TableCell className='text-center'>
                    {course.class_count}
                  </TableCell>
                  <TableCell className='text-center'>
                    {course.total_should_attend}
                  </TableCell>
                  <TableCell className='text-center'>
                    {course.actual_attended}
                  </TableCell>
                  <TableCell className='text-center'>
                    {course.leave_count}
                  </TableCell>
                  <TableCell className='text-center'>
                    {course.absent_count}
                  </TableCell>
                  <TableCell className='text-center'>
                    {getAttendanceRateBadge(course.attendance_rate)}
                  </TableCell>
                  <TableCell>
                    {course.last_class_time
                      ? new Date(course.last_class_time).toLocaleDateString()
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <EnhancedPagination
        page={filters.page}
        pageSize={filters.page_size}
        total={data?.total || 0}
        onPageChange={(page) => handleFilterChange('page', page)}
        onPageSizeChange={(pageSize) => {
          handleFilterChange('page_size', pageSize)
          handleFilterChange('page', 1)
        }}
        disabled={isLoading}
      />
    </div>
  )
}
