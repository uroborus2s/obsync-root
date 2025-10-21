import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  CourseAttendanceStatsQuery,
  CourseAttendanceStatsResponse,
} from '@/types/attendance.types'
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
} from 'lucide-react'
import { attendanceApi } from '@/lib/attendance-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function CourseAttendanceStatistics() {
  const [filters, setFilters] = useState<CourseAttendanceStatsQuery>({
    page: 1,
    page_size: 10,
    sort_by: 'start_time',
    sort_order: 'desc',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-attendance-statistics', filters],
    queryFn: async (): Promise<CourseAttendanceStatsResponse> => {
      const response =
        await attendanceApi.getCourseAttendanceStatistics(filters)

      if (!response.success) {
        throw new Error(response.message || '获取课程维度签到统计失败')
      }

      return (
        response.data || {
          data: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        }
      )
    },
    enabled: true,
  })

  const handleFilterChange = (
    key: keyof CourseAttendanceStatsQuery,
    value: string | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : Number(value),
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '未开始':
        return <Badge variant='secondary'>{status}</Badge>
      case '进行中':
        return (
          <Badge variant='default' className='bg-blue-100 text-blue-800'>
            {status}
          </Badge>
        )
      case '已结束':
        return <Badge variant='outline'>{status}</Badge>
      default:
        return <Badge variant='secondary'>{status}</Badge>
    }
  }

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 90)
      return (
        <Badge className='bg-green-100 text-green-800'>
          {rate.toFixed(2)}%
        </Badge>
      )
    if (rate >= 80)
      return (
        <Badge className='bg-yellow-100 text-yellow-800'>
          {rate.toFixed(2)}%
        </Badge>
      )
    if (rate >= 70)
      return (
        <Badge className='bg-orange-100 text-orange-800'>
          {rate.toFixed(2)}%
        </Badge>
      )
    return <Badge className='bg-red-100 text-red-800'>{rate.toFixed(2)}%</Badge>
  }

  const getCheckinRateBadge = (rate: number) => {
    if (rate >= 85)
      return (
        <Badge className='bg-green-100 text-green-800'>
          {rate.toFixed(2)}%
        </Badge>
      )
    if (rate >= 70)
      return (
        <Badge className='bg-yellow-100 text-yellow-800'>
          {rate.toFixed(2)}%
        </Badge>
      )
    if (rate >= 60)
      return (
        <Badge className='bg-orange-100 text-orange-800'>
          {rate.toFixed(2)}%
        </Badge>
      )
    return <Badge className='bg-red-100 text-red-800'>{rate.toFixed(2)}%</Badge>
  }

  if (error) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <p className='mb-2 text-red-600'>加载失败</p>
          <p className='text-muted-foreground text-sm'>
            {(error as Error).message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* 筛选条件 */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
        <div className='space-y-2'>
          <Label htmlFor='semester'>学期</Label>
          <Input
            id='semester'
            placeholder='如：2024-2025-1'
            value={filters.semester || ''}
            onChange={(e) => handleFilterChange('semester', e.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='course_name'>课程名称</Label>
          <Input
            id='course_name'
            placeholder='课程名称关键词'
            value={filters.course_name || ''}
            onChange={(e) => handleFilterChange('course_name', e.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='teacher_code'>教师工号</Label>
          <Input
            id='teacher_code'
            placeholder='教师工号'
            value={filters.teacher_code || ''}
            onChange={(e) => handleFilterChange('teacher_code', e.target.value)}
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
              <SelectItem value='start_time'>上课时间</SelectItem>
              <SelectItem value='checkin_rate'>签到率</SelectItem>
              <SelectItem value='attendance_rate'>出勤率</SelectItem>
              <SelectItem value='total_students'>学生数量</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='sort_order'>排序方向</Label>
          <Select
            value={filters.sort_order}
            onValueChange={(value) => handleFilterChange('sort_order', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='desc'>降序</SelectItem>
              <SelectItem value='asc'>升序</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 统计概览卡片 */}
      {data && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>总课次数</CardTitle>
              <BookOpen className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{data.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>总学生数</CardTitle>
              <Users className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.reduce((sum, item) => sum + item.totalStudents, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>平均签到率</CardTitle>
              <TrendingUp className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.length > 0
                  ? (
                      data.data.reduce(
                        (sum, item) => sum + item.checkinRate,
                        0
                      ) / data.data.length
                    ).toFixed(2)
                  : 0}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>平均出勤率</CardTitle>
              <CalendarDays className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.length > 0
                  ? (
                      data.data.reduce(
                        (sum, item) => sum + item.attendanceRate,
                        0
                      ) / data.data.length
                    ).toFixed(2)
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>课程维度签到统计列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-3'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>课程名称</TableHead>
                    <TableHead>课次信息</TableHead>
                    <TableHead>周次</TableHead>
                    <TableHead>任课教师</TableHead>
                    <TableHead>学生数量</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>签到数量</TableHead>
                    <TableHead>请假数量</TableHead>
                    <TableHead>缺勤数量</TableHead>
                    <TableHead>签到率</TableHead>
                    <TableHead>出勤率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className='font-medium'>
                        {course.courseName}
                      </TableCell>
                      <TableCell>{course.sessionInfo}</TableCell>
                      <TableCell>{course.weekNumber}</TableCell>
                      <TableCell>{course.teacher}</TableCell>
                      <TableCell>{course.totalStudents}</TableCell>
                      <TableCell>{getStatusBadge(course.status)}</TableCell>
                      <TableCell>{course.checkedInCount}</TableCell>
                      <TableCell>
                        {course.leavePendingCount + course.leaveApprovedCount}
                      </TableCell>
                      <TableCell>{course.absentCount}</TableCell>
                      <TableCell>
                        {getCheckinRateBadge(course.checkinRate)}
                      </TableCell>
                      <TableCell>
                        {getAttendanceRateBadge(course.attendanceRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页控件 */}
              {data && data.total > 0 && (
                <div className='flex items-center justify-between space-x-2 py-4'>
                  <div className='text-muted-foreground text-sm'>
                    显示第 {(data.page - 1) * data.page_size + 1} -{' '}
                    {Math.min(data.page * data.page_size, data.total)} 条， 共{' '}
                    {data.total} 条记录
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleFilterChange('page', data.page - 1)}
                      disabled={!data.has_prev}
                    >
                      <ChevronLeft className='h-4 w-4' />
                      上一页
                    </Button>
                    <div className='text-sm'>
                      第 {data.page} / {data.total_pages} 页
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleFilterChange('page', data.page + 1)}
                      disabled={!data.has_next}
                    >
                      下一页
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
