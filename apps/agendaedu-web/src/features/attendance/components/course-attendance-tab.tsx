import { useCallback, useEffect, useState } from 'react'
import {
  AttendanceRecord,
  CourseAttendanceDetail,
} from '@/types/attendance.types'
import { BookOpen, Calendar, Eye, TrendingUp, Users } from 'lucide-react'
import { attendanceApi } from '@/lib/attendance-api'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function CourseAttendanceTab() {
  const [courses, setCourses] = useState<AttendanceRecord[]>([])
  const [selectedCourse, setSelectedCourse] =
    useState<CourseAttendanceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSemester, setSelectedSemester] = useState<string>('')

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await attendanceApi.getCourseAttendanceRecords({
        page: 1,
        page_size: 20,
        xnxq: selectedSemester || undefined,
      })
      if (response.success && response.data) {
        setCourses(response.data.items)
      }
    } catch (_error) {
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [selectedSemester])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const fetchCourseDetail = async (courseId: string) => {
    try {
      const response = await attendanceApi.getCourseAttendanceDetail(courseId)
      if (response.success && response.data) {
        setSelectedCourse(response.data)
      }
    } catch (_error) {
      // 静默处理错误
    }
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.kcmc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.kkh.includes(searchQuery)
  )

  const getStatusBadge = (status: 'active' | 'closed') => {
    return status === 'active' ? (
      <Badge variant='default'>进行中</Badge>
    ) : (
      <Badge variant='secondary'>已结束</Badge>
    )
  }

  const getAttendanceRateBadge = (rate: number) => {
    const percentage = (rate * 100).toFixed(1)
    if (rate >= 0.9) return <Badge variant='default'>{percentage}%</Badge>
    if (rate >= 0.8) return <Badge variant='secondary'>{percentage}%</Badge>
    return <Badge variant='destructive'>{percentage}%</Badge>
  }

  return (
    <div className='space-y-6'>
      {/* 搜索和筛选 */}
      <div className='flex gap-4'>
        <Input
          placeholder='搜索课程名称或开课号...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='max-w-sm'
        />
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='选择学期' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=''>全部学期</SelectItem>
            <SelectItem value='2024-2025-1'>2024-2025第一学期</SelectItem>
            <SelectItem value='2024-2025-2'>2024-2025第二学期</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchCourses}>刷新</Button>
      </div>

      <Tabs defaultValue='current' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='current'>本节课签到</TabsTrigger>
          <TabsTrigger value='history'>历史统计</TabsTrigger>
        </TabsList>

        <TabsContent value='current' className='space-y-4'>
          {/* 当前课程列表 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <BookOpen className='h-5 w-5' />
                课程考勤列表
              </CardTitle>
              <CardDescription>当前学期课程考勤情况</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='py-8 text-center'>
                  <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
                  <p className='text-muted-foreground mt-2 text-sm'>
                    加载中...
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>课程名称</TableHead>
                      <TableHead>开课号</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>总人数</TableHead>
                      <TableHead>签到人数</TableHead>
                      <TableHead>出勤率</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((course) => {
                      const attendanceRate =
                        course.total_count > 0
                          ? course.checkin_count / course.total_count
                          : 0

                      return (
                        <TableRow key={course.id}>
                          <TableCell className='font-medium'>
                            {course.kcmc}
                          </TableCell>
                          <TableCell>{course.kkh}</TableCell>
                          <TableCell>
                            <div className='text-sm'>
                              <div>{course.rq}</div>
                              <div className='text-muted-foreground'>
                                {course.jc_s} ({course.sj_f}-{course.sj_t})
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline'>
                              <Users className='mr-1 h-3 w-3' />
                              {course.total_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1'>
                              <Badge variant='default'>
                                {course.checkin_count}
                              </Badge>
                              {course.leave_count > 0 && (
                                <Badge variant='secondary' className='ml-1'>
                                  请假: {course.leave_count}
                                </Badge>
                              )}
                              {course.absent_count > 0 && (
                                <Badge variant='destructive' className='ml-1'>
                                  缺勤: {course.absent_count}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getAttendanceRateBadge(attendanceRate)}
                          </TableCell>
                          <TableCell>{getStatusBadge(course.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => fetchCourseDetail(course.id)}
                            >
                              <Eye className='mr-1 h-4 w-4' />
                              查看详情
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 课程详情 */}
          {selectedCourse && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5' />
                  {selectedCourse.course.kcmc} - 考勤详情
                </CardTitle>
                <CardDescription>
                  {selectedCourse.course.rq} {selectedCourse.course.jc_s} |
                  教室: {selectedCourse.course.room_s} | 教师:{' '}
                  {selectedCourse.course.xm_s}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='mb-6 grid gap-4 md:grid-cols-4'>
                  <div className='text-center'>
                    <div className='text-2xl font-bold text-blue-600'>
                      {selectedCourse.stats.total_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>总人数</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-2xl font-bold text-green-600'>
                      {selectedCourse.stats.checkin_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>已签到</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-2xl font-bold text-orange-600'>
                      {selectedCourse.stats.leave_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>请假</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-2xl font-bold text-red-600'>
                      {selectedCourse.stats.absent_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>缺勤</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>签到时间</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCourse.student_attendances.map((attendance) => (
                      <TableRow key={attendance.id}>
                        <TableCell>{attendance.student_id}</TableCell>
                        <TableCell>{attendance.student_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              attendance.status === 'present'
                                ? 'default'
                                : attendance.status === 'leave'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {attendance.status === 'present'
                              ? '已签到'
                              : attendance.status === 'leave'
                                ? '请假'
                                : attendance.status === 'late'
                                  ? '迟到'
                                  : '缺勤'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {attendance.checkin_time
                            ? new Date(attendance.checkin_time).toLocaleString()
                            : '-'}
                        </TableCell>
                        <TableCell>{attendance.remark || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='history' className='space-y-4'>
          {/* 历史统计 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='h-5 w-5' />
                数据库技术及应用实践 - 历史考勤统计
              </CardTitle>
              <CardDescription>历史考勤记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='mb-6 grid gap-4 md:grid-cols-4'>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-blue-600'>8</div>
                  <div className='text-muted-foreground text-sm'>
                    总课程节数
                  </div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-green-600'>12.1%</div>
                  <div className='text-muted-foreground text-sm'>
                    平均出勤率
                  </div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-orange-600'>2</div>
                  <div className='text-muted-foreground text-sm'>
                    总请假次数
                  </div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-red-600'>209</div>
                  <div className='text-muted-foreground text-sm'>
                    总缺勤次数
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <h4 className='font-semibold'>历史考勤记录</h4>
                <div className='space-y-3'>
                  {[
                    {
                      week: '18周',
                      status: '未开始',
                      date: '2025/07/03 15:30-17:05',
                      period: '7/8',
                      stats: {
                        total: 'N/A',
                        present: 'N/A',
                        leave: 'N/A',
                        absent: 'N/A',
                      },
                    },
                    {
                      week: '16周',
                      status: '已结束',
                      date: '2025/06/19 15:30-17:05',
                      period: '7/8',
                      attendance_rate: 97.1,
                      stats: { total: 35, present: 34, leave: 1, absent: 0 },
                    },
                    {
                      week: '14周',
                      status: '已结束',
                      date: '2025/06/05 15:30-17:05',
                      period: '7/8',
                      attendance_rate: 0.0,
                      stats: { total: 35, present: 0, leave: 0, absent: 35 },
                    },
                    {
                      week: '10周',
                      status: '已结束',
                      date: '2025/05/08 15:30-17:05',
                      period: '7/8',
                      attendance_rate: 0.0,
                      stats: { total: 35, present: 0, leave: 0, absent: 35 },
                    },
                  ].map((record, index) => (
                    <Card key={index}>
                      <CardContent className='pt-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-4'>
                            <div className='font-semibold'>{record.week}</div>
                            <Badge
                              variant={
                                record.status === '已结束'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {record.status}
                            </Badge>
                            <div className='text-muted-foreground text-sm'>
                              (周四) {record.date}
                            </div>
                          </div>
                        </div>
                        <div className='text-muted-foreground mt-2 text-sm'>
                          节次: {record.period} | 出勤率:{' '}
                          {record.attendance_rate
                            ? `${record.attendance_rate}%`
                            : 'N/A'}
                        </div>
                        <div className='mt-4 grid grid-cols-4 gap-4 text-center'>
                          <div>
                            <div className='text-lg font-bold text-blue-600'>
                              {record.stats.total}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              总人数
                            </div>
                          </div>
                          <div>
                            <div className='text-lg font-bold text-green-600'>
                              {record.stats.present}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              签到
                            </div>
                          </div>
                          <div>
                            <div className='text-lg font-bold text-orange-600'>
                              {record.stats.leave}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              请假
                            </div>
                          </div>
                          <div>
                            <div className='text-lg font-bold text-red-600'>
                              {record.stats.absent}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              缺勤
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
