import { useEffect, useState } from 'react'
import {
  AttendanceStatus,
  StudentAttendanceRecord,
  StudentPersonalStats,
} from '@/types/attendance.types'
import {
  Calendar,
  CheckCircle,
  Clock,
  Search,
  TrendingUp,
  User,
} from 'lucide-react'
import { attendanceApi } from '@/lib/attendance-api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function StudentAttendanceTab() {
  const [students, setStudents] = useState<StudentPersonalStats[]>([])
  const [selectedStudent, setSelectedStudent] =
    useState<StudentPersonalStats | null>(null)
  const [studentRecords, setStudentRecords] = useState<
    StudentAttendanceRecord[]
  >([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // 默认加载一些示例数据
    loadSampleData()
  }, [])

  const loadSampleData = () => {
    // 模拟学生数据，对应手机端截图显示的学生
    const sampleStudents: StudentPersonalStats[] = [
      {
        student: {
          xh: '2401',
          xm: '庄凯',
          bjmc: '数据科学2401',
          zymc: '数据科学',
        },
        total_courses: 8,
        present_count: 1,
        leave_count: 0,
        absent_count: 7,
        attendance_rate: 0.125,
        recent_record: {
          date: '2025/6/19',
          status: AttendanceStatus.PRESENT,
        },
      },
      {
        student: {
          xh: '2402',
          xm: '刘子杰',
          bjmc: '数据科学2401',
          zymc: '数据科学',
        },
        total_courses: 8,
        present_count: 1,
        leave_count: 0,
        absent_count: 7,
        attendance_rate: 0.125,
        recent_record: {
          date: '2025/6/19',
          status: AttendanceStatus.PRESENT,
        },
      },
    ]
    setStudents(sampleStudents)
  }

  const searchStudents = async () => {
    if (!searchQuery.trim()) {
      loadSampleData()
      return
    }

    try {
      setLoading(true)
      const response = await attendanceApi.searchStudents(searchQuery)
      if (response.success && response.data) {
        setStudents(response.data)
      }
    } catch (_error) {
      // 静默处理错误，不使用console
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentRecords = async (studentId: string) => {
    try {
      setLoading(true)
      const response = await attendanceApi.getStudentAttendanceRecords(
        studentId,
        {
          page: 1,
          page_size: 50,
        }
      )
      if (response.success && response.data) {
        setStudentRecords(response.data.items)
      }
    } catch (_error) {
      // 静默处理错误，不使用console
      setStudentRecords([])
    } finally {
      setLoading(false)
    }
  }

  const handleStudentClick = async (student: StudentPersonalStats) => {
    setSelectedStudent(student)
    await fetchStudentRecords(student.student.xh)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return <Badge variant='default'>签到</Badge>
      case AttendanceStatus.LATE:
        return <Badge variant='secondary'>迟到</Badge>
      case AttendanceStatus.LEAVE:
        return <Badge variant='outline'>请假</Badge>
      case AttendanceStatus.ABSENT:
        return <Badge variant='destructive'>缺勤</Badge>
      default:
        return <Badge variant='secondary'>未知</Badge>
    }
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 0.9) return 'text-green-600'
    if (rate >= 0.8) return 'text-orange-600'
    return 'text-red-600'
  }

  const filteredStudents = students.filter(
    (student) =>
      student.student.xm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student.xh.includes(searchQuery)
  )

  return (
    <div className='space-y-6'>
      {/* 搜索 */}
      <div className='flex gap-4'>
        <Input
          placeholder='搜索学生姓名或学号...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='max-w-sm'
        />
        <Button onClick={searchStudents}>
          <Search className='mr-2 h-4 w-4' />
          搜索
        </Button>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* 学生列表 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <User className='h-5 w-5' />
              学生个人统计
            </CardTitle>
            <CardDescription>点击学生查看详细考勤记录</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='py-8 text-center'>
                <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
                <p className='text-muted-foreground mt-2 text-sm'>加载中...</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {filteredStudents.map((student) => (
                  <Card
                    key={student.student.xh}
                    className={`hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedStudent?.student.xh === student.student.xh
                        ? 'ring-primary ring-2'
                        : ''
                    }`}
                    onClick={() => handleStudentClick(student)}
                  >
                    <CardContent className='pt-4'>
                      <div className='flex items-center gap-4'>
                        <Avatar>
                          <AvatarFallback>
                            {student.student.xm.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <h4 className='font-semibold'>
                              {student.student.xm}
                            </h4>
                            <Badge variant='outline'>
                              {student.student.xh}
                            </Badge>
                          </div>
                          <p className='text-muted-foreground text-sm'>
                            {student.student.bjmc} | {student.student.zymc}
                          </p>
                          <div className='mt-2 text-sm'>
                            <span
                              className={`font-semibold ${getAttendanceRateColor(student.attendance_rate)}`}
                            >
                              出勤率:{' '}
                              {(student.attendance_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={student.attendance_rate * 100}
                            className='mt-2 h-2'
                          />
                        </div>
                        <div className='text-right'>
                          <div className='grid grid-cols-4 gap-2 text-center'>
                            <div>
                              <div className='text-sm font-bold text-blue-600'>
                                {student.total_courses}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                总课时
                              </div>
                            </div>
                            <div>
                              <div className='text-sm font-bold text-green-600'>
                                {student.present_count}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                签到
                              </div>
                            </div>
                            <div>
                              <div className='text-sm font-bold text-orange-600'>
                                {student.leave_count}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                请假
                              </div>
                            </div>
                            <div>
                              <div className='text-sm font-bold text-red-600'>
                                {student.absent_count}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                缺勤
                              </div>
                            </div>
                          </div>
                          {student.recent_record && (
                            <div className='mt-2 flex items-center gap-1 text-xs'>
                              <span className='text-muted-foreground'>
                                最近记录:
                              </span>
                              <span>{student.recent_record.date}</span>
                              {getStatusBadge(student.recent_record.status)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 学生详情 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <TrendingUp className='h-5 w-5' />
              {selectedStudent
                ? `${selectedStudent.student.xm} - 考勤详情`
                : '选择学生查看详情'}
            </CardTitle>
            {selectedStudent && (
              <CardDescription>
                学号: {selectedStudent.student.xh} | 班级:{' '}
                {selectedStudent.student.bjmc} | 专业:{' '}
                {selectedStudent.student.zymc}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedStudent ? (
              <div className='space-y-6'>
                {/* 统计卡片 */}
                <div className='grid gap-4 md:grid-cols-2'>
                  <Card>
                    <CardContent className='pt-4'>
                      <div className='flex items-center gap-2'>
                        <Calendar className='h-4 w-4 text-blue-600' />
                        <span className='text-sm font-medium'>总课程数</span>
                      </div>
                      <div className='mt-1 text-2xl font-bold text-blue-600'>
                        {selectedStudent.total_courses}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className='pt-4'>
                      <div className='flex items-center gap-2'>
                        <CheckCircle className='h-4 w-4 text-green-600' />
                        <span className='text-sm font-medium'>出勤率</span>
                      </div>
                      <div
                        className={`mt-1 text-2xl font-bold ${getAttendanceRateColor(selectedStudent.attendance_rate)}`}
                      >
                        {(selectedStudent.attendance_rate * 100).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className='grid gap-4 md:grid-cols-4'>
                  <div className='text-center'>
                    <div className='text-lg font-bold text-green-600'>
                      {selectedStudent.present_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>已签到</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-lg font-bold text-orange-600'>
                      {selectedStudent.leave_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>请假</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-lg font-bold text-red-600'>
                      {selectedStudent.absent_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>缺勤</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-lg font-bold text-gray-600'>
                      {selectedStudent.total_courses -
                        selectedStudent.present_count -
                        selectedStudent.leave_count -
                        selectedStudent.absent_count}
                    </div>
                    <div className='text-muted-foreground text-sm'>其他</div>
                  </div>
                </div>

                {/* 考勤记录列表 */}
                <div>
                  <h4 className='mb-4 flex items-center gap-2 font-semibold'>
                    <Clock className='h-4 w-4' />
                    考勤记录
                  </h4>
                  {studentRecords.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日期</TableHead>
                          <TableHead>课程</TableHead>
                          <TableHead>时间</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>签到时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{record.created_at}</TableCell>
                            <TableCell>数据库技术及应用实践</TableCell>
                            <TableCell>15:30-17:05</TableCell>
                            <TableCell>
                              {getStatusBadge(record.status)}
                            </TableCell>
                            <TableCell>
                              {record.checkin_time
                                ? new Date(record.checkin_time).toLocaleString()
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className='text-muted-foreground py-8 text-center'>
                      暂无考勤记录
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className='text-muted-foreground py-12 text-center'>
                <User className='mx-auto mb-4 h-12 w-12 opacity-50' />
                <p>请从左侧列表选择学生查看详细考勤信息</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
