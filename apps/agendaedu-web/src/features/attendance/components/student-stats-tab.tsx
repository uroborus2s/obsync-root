import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Clock, TrendingUp, Users } from 'lucide-react'
// import { attendanceApi } from '@/lib/attendance-api'
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

interface StudentStats {
  student_id: string
  student_name: string
  class_name?: string
  major_name?: string
  course_count: number
  total_should_attend: number
  actual_attended: number
  leave_count: number
  absent_count: number
  attendance_rate: number
  last_checkin_time?: string
}

interface StudentStatsResponse {
  data: StudentStats[]
  total: number
  page: number
  page_size: number
}

export function StudentStatsTab() {
  const [filters, setFilters] = useState({
    semester: 'all',
    start_date: '',
    end_date: '',
    course_code: '',
    student_id: '',
    page: 1,
    page_size: 20,
    sort_by: 'attendance_rate' as 'attendance_rate' | 'course_count',
    sort_order: 'desc' as 'asc' | 'desc',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-stats', filters],
    queryFn: async (): Promise<StudentStatsResponse> => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(
        `/api/icalink/v1/attendance/stats/students?${params}`
      )
      if (!response.ok) {
        throw new Error('获取学生统计数据失败')
      }
      const result = await response.json()
      return result.data
    },
    enabled: true,
  })

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : Number(value),
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
      <div className='grid grid-cols-1 gap-4 md:grid-cols-6'>
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
          <Label htmlFor='course_code'>课程代码</Label>
          <Input
            id='course_code'
            placeholder='输入课程代码'
            value={filters.course_code}
            onChange={(e) => handleFilterChange('course_code', e.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='student_id'>学号</Label>
          <Input
            id='student_id'
            placeholder='输入学号'
            value={filters.student_id}
            onChange={(e) => handleFilterChange('student_id', e.target.value)}
          />
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
              <SelectItem value='course_count'>选课数</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 统计概览卡片 */}
      {data && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>学生总数</CardTitle>
              <Users className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{data.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>总选课数</CardTitle>
              <BookOpen className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.reduce((sum, item) => sum + item.course_count, 0)}
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
              <CardTitle className='text-sm font-medium'>活跃学生</CardTitle>
              <Clock className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {data.data.filter((item) => item.last_checkin_time).length}
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
              <TableHead>学生信息</TableHead>
              <TableHead>班级专业</TableHead>
              <TableHead className='text-center'>选课数</TableHead>
              <TableHead className='text-center'>应签到次数</TableHead>
              <TableHead className='text-center'>实际出勤</TableHead>
              <TableHead className='text-center'>请假</TableHead>
              <TableHead className='text-center'>缺勤</TableHead>
              <TableHead className='text-center'>出勤率</TableHead>
              <TableHead>最近签到</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 9 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className='h-4 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className='text-center text-red-500'>
                  加载失败：{error.message}
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className='text-muted-foreground text-center'
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell>
                    <div>
                      <div className='font-medium'>{student.student_name}</div>
                      <div className='text-muted-foreground text-sm'>
                        {student.student_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className='text-sm'>{student.class_name || '-'}</div>
                      <div className='text-muted-foreground text-xs'>
                        {student.major_name || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.course_count}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.total_should_attend}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.actual_attended}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.leave_count}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.absent_count}
                  </TableCell>
                  <TableCell className='text-center'>
                    {getAttendanceRateBadge(student.attendance_rate)}
                  </TableCell>
                  <TableCell>
                    {student.last_checkin_time
                      ? new Date(student.last_checkin_time).toLocaleDateString()
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
