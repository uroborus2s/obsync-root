import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, CheckCircle, Search, UserCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Search as SearchComponent } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

/**
 * 课程数据接口
 */
interface Course {
  id: number
  external_id: string
  course_code: string
  course_name: string
  semester: string
  teaching_week: number
  week_day: number
  teacher_names: string | null
  class_location: string | null
  start_time: string
  end_time: string
  periods: string | null
  need_checkin: boolean
}

/**
 * 分页响应接口
 */
interface PaginatedResponse {
  data: Course[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * 星期映射
 */
const WEEKDAY_MAP: Record<number, string> = {
  1: '星期一',
  2: '星期二',
  3: '星期三',
  4: '星期四',
  5: '星期五',
  6: '星期六',
  7: '星期日',
}

/**
 * 课程管理页面组件
 */
export default function CourseManagement() {
  const queryClient = useQueryClient()

  // 搜索条件状态
  const [teachingWeek, setTeachingWeek] = useState<string>('')
  const [weekDay, setWeekDay] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50) // 每页显示50条记录

  // 选择状态
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])

  // 调串课对话框状态
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [targetTeachingWeek, setTargetTeachingWeek] = useState<string>('')
  const [targetWeekDay, setTargetWeekDay] = useState<string>('')

  // 补签对话框状态
  const [makeupDialogOpen, setMakeupDialogOpen] = useState(false)

  // 学生补签对话框状态
  const [studentMakeupDialogOpen, setStudentMakeupDialogOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [courseStudents, setCourseStudents] = useState<
    Array<{
      student_id: string
      student_name: string
      class_name: string | null
      major_name: string | null
    }>
  >([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // 查询课程列表
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'course-management',
      teachingWeek,
      weekDay,
      searchKeyword,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      })

      if (teachingWeek) params.append('teaching_week', teachingWeek)
      if (weekDay) params.append('week_day', weekDay)
      if (searchKeyword) params.append('search_keyword', searchKeyword)

      const response = await fetch(
        `/api/icalink/v1/courses/list?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error('获取课程列表失败')
      }
      const result = await response.json()
      return result.data as PaginatedResponse
    },
  })

  const courses = data?.data ?? []
  const total = data?.total ?? 0

  // 调串课 mutation
  const rescheduleMutation = useMutation({
    mutationFn: async (data: {
      courseIds: number[]
      targetTeachingWeek: number
      targetWeekDay: number
    }) => {
      const response = await fetch('/api/icalink/v1/courses/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '调串课失败')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('调串课成功', { duration: 3000 })
      setRescheduleDialogOpen(false)
      setSelectedCourseIds([])
      setTargetTeachingWeek('')
      setTargetWeekDay('')
      queryClient.invalidateQueries({ queryKey: ['course-management'] })
    },
    onError: (error: Error) => {
      toast.error(`调串课失败: ${error.message}`, { duration: 5000 })
    },
  })

  // 补签 mutation
  const makeupMutation = useMutation({
    mutationFn: async (data: { courseIds: number[] }) => {
      const response = await fetch('/api/icalink/v1/courses/makeup-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '补签失败')
      }
      return response.json()
    },
    onSuccess: (response) => {
      const result = response.data
      toast.success(
        `补签成功！补签类型：${result.makeup_type === 'current_day' ? '当日补签' : '历史补签'}，共补签 ${result.total_records} 条记录`,
        { duration: 4000 }
      )
      setMakeupDialogOpen(false)
      setSelectedCourseIds([])
      queryClient.invalidateQueries({ queryKey: ['course-management'] })
    },
    onError: (error: Error) => {
      toast.error(`补签失败: ${error.message}`, { duration: 5000 })
    },
  })

  // 学生补签 mutation
  const studentMakeupMutation = useMutation({
    mutationFn: async (data: { courseId: number; studentIds: string[] }) => {
      const response = await fetch(
        '/api/icalink/v1/courses/makeup-signin/students',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '学生补签失败')
      }
      return response.json()
    },
    onSuccess: (response) => {
      const result = response.data
      toast.success(
        `学生补签成功！补签类型：${result.makeup_type === 'current_day' ? '当日补签' : '历史补签'}，成功 ${result.success_count} 人，失败 ${result.failed_count} 人`,
        { duration: 4000 }
      )
      setStudentMakeupDialogOpen(false)
      setSelectedCourseIds([])
      setSelectedStudentIds([])
      setCourseStudents([])
      queryClient.invalidateQueries({ queryKey: ['course-management'] })
    },
    onError: (error: Error) => {
      toast.error(`学生补签失败: ${error.message}`, { duration: 5000 })
    },
  })

  // 清空搜索条件
  const handleClearFilters = () => {
    setTeachingWeek('')
    setWeekDay('')
    setSearchKeyword('')
    setPage(1)
  }

  // 搜索处理
  const handleSearch = () => {
    setPage(1)
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCourseIds(courses.map((c) => c.id))
    } else {
      setSelectedCourseIds([])
    }
  }

  // 选择单个课程
  const handleSelectCourse = (courseId: number, checked: boolean) => {
    if (checked) {
      setSelectedCourseIds([...selectedCourseIds, courseId])
    } else {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId))
    }
  }

  // 打开调串课对话框
  const handleOpenRescheduleDialog = () => {
    if (selectedCourseIds.length === 0) {
      toast.error('请先选择要调串课的课程', { duration: 3000 })
      return
    }
    setRescheduleDialogOpen(true)
  }

  // 打开补签对话框
  const handleOpenMakeupDialog = () => {
    if (selectedCourseIds.length === 0) {
      toast.error('请先选择要补签的课程', { duration: 3000 })
      return
    }
    setMakeupDialogOpen(true)
  }

  // 确认补签
  const handleConfirmMakeup = () => {
    makeupMutation.mutate({
      courseIds: selectedCourseIds,
    })
  }

  // 打开学生补签对话框
  const handleOpenStudentMakeupDialog = async () => {
    if (selectedCourseIds.length === 0) {
      toast.error('请先选择要补签的课程', { duration: 3000 })
      return
    }

    if (selectedCourseIds.length > 1) {
      toast.error('学生补签只能选择单节课程', { duration: 3000 })
      return
    }

    // 获取选中的课程
    const selectedCourse = courses.find((c) => c.id === selectedCourseIds[0])
    if (!selectedCourse) {
      toast.error('未找到选中的课程', { duration: 3000 })
      return
    }

    // 加载学生列表
    setLoadingStudents(true)
    setStudentMakeupDialogOpen(true)

    try {
      const response = await fetch(
        `/api/icalink/v1/courses/${selectedCourse.id}/students?course_code=${selectedCourse.course_code}`
      )
      if (!response.ok) {
        throw new Error('获取学生列表失败')
      }
      const result = await response.json()
      setCourseStudents(result.data || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      toast.error(`获取学生列表失败: ${message}`, { duration: 5000 })
      setStudentMakeupDialogOpen(false)
    } finally {
      setLoadingStudents(false)
    }
  }

  // 切换学生选择
  const handleToggleStudent = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId))
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId])
    }
  }

  // 全选/取消全选学生
  const handleToggleAllStudents = () => {
    if (selectedStudentIds.length === courseStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(courseStudents.map((s) => s.student_id))
    }
  }

  // 确认学生补签
  const handleConfirmStudentMakeup = () => {
    if (selectedStudentIds.length === 0) {
      toast.error('请至少选择一名学生', { duration: 3000 })
      return
    }

    studentMakeupMutation.mutate({
      courseId: selectedCourseIds[0],
      studentIds: selectedStudentIds,
    })
  }

  // 确认调串课
  const handleConfirmReschedule = () => {
    const week = parseInt(targetTeachingWeek, 10)
    const day = parseInt(targetWeekDay, 10)

    if (!targetTeachingWeek || isNaN(week) || week < 1 || week > 30) {
      toast.error('请输入有效的教学周(1-30)', { duration: 3000 })
      return
    }

    if (!targetWeekDay || isNaN(day) || day < 1 || day > 7) {
      toast.error('请输入有效的星期(1-7)', { duration: 3000 })
      return
    }

    rescheduleMutation.mutate({
      courseIds: selectedCourseIds,
      targetTeachingWeek: week,
      targetWeekDay: day,
    })
  }

  // 格式化时间显示
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Header>
        <SearchComponent />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            课程管理
          </h1>
          <p className='text-muted-foreground'>查询和管理课程信息</p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 搜索条件 */}
        <div className='mb-6 space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label htmlFor='teachingWeek'>教学周</Label>
              <Input
                id='teachingWeek'
                type='number'
                placeholder='输入教学周'
                value={teachingWeek}
                onChange={(e) => setTeachingWeek(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='weekDay'>星期</Label>
              <Input
                id='weekDay'
                type='number'
                min='1'
                max='7'
                placeholder='输入星期(1-7)'
                value={weekDay}
                onChange={(e) => setWeekDay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='searchKeyword'>课程名/课程号/教师</Label>
              <Input
                id='searchKeyword'
                placeholder='输入课程名称、课程编号或教师姓名'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
          </div>
          <div className='flex gap-2'>
            <Button onClick={handleSearch}>
              <Search className='mr-2 h-4 w-4' />
              搜索
            </Button>
            <Button variant='outline' onClick={handleClearFilters}>
              <X className='mr-2 h-4 w-4' />
              清空条件
            </Button>
            <Button
              variant='default'
              onClick={handleOpenRescheduleDialog}
              disabled={selectedCourseIds.length === 0}
            >
              <Calendar className='mr-2 h-4 w-4' />
              调串课{' '}
              {selectedCourseIds.length > 0 && `(${selectedCourseIds.length})`}
            </Button>
            <Button
              variant='default'
              onClick={handleOpenMakeupDialog}
              disabled={selectedCourseIds.length === 0}
            >
              <CheckCircle className='mr-2 h-4 w-4' />
              补签{' '}
              {selectedCourseIds.length > 0 && `(${selectedCourseIds.length})`}
            </Button>
            <Button
              variant='outline'
              onClick={handleOpenStudentMakeupDialog}
              disabled={selectedCourseIds.length !== 1}
            >
              <UserCheck className='mr-2 h-4 w-4' />
              学生补签
            </Button>
          </div>
        </div>

        {/* 课程列表 */}
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12'>
                  <Checkbox
                    checked={
                      courses.length > 0 &&
                      selectedCourseIds.length === courses.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>课程编号</TableHead>
                <TableHead>课程名称</TableHead>
                <TableHead>教学周</TableHead>
                <TableHead>星期</TableHead>
                <TableHead>教师</TableHead>
                <TableHead>上课地点</TableHead>
                <TableHead>上课时间</TableHead>
                <TableHead>节次</TableHead>
                <TableHead>是否需要签到</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className='h-4 w-4' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-20' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-32' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-12' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-16' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-20' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-24' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-28' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-16' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-12' />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={10} className='text-center text-red-500'>
                    加载失败: {error?.message}
                  </TableCell>
                </TableRow>
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className='text-muted-foreground text-center'
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCourseIds.includes(course.id)}
                        onCheckedChange={(checked) =>
                          handleSelectCourse(course.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className='font-medium'>
                      {course.course_code}
                    </TableCell>
                    <TableCell>{course.course_name}</TableCell>
                    <TableCell>{course.teaching_week}</TableCell>
                    <TableCell>
                      {WEEKDAY_MAP[course.week_day] || course.week_day}
                    </TableCell>
                    <TableCell>{course.teacher_names || '-'}</TableCell>
                    <TableCell>{course.class_location || '-'}</TableCell>
                    <TableCell>
                      {formatTime(course.start_time)} -{' '}
                      {formatTime(course.end_time)}
                    </TableCell>
                    <TableCell>{course.periods || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={course.need_checkin ? 'default' : 'secondary'}
                      >
                        {course.need_checkin ? '是' : '否'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页控制 */}
        <EnhancedPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={isLoading}
        />

        {/* 调串课对话框 */}
        <Dialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>调串课</DialogTitle>
              <DialogDescription>
                已选择 {selectedCourseIds.length} 门课程，请输入目标教学周和星期
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='targetTeachingWeek'>目标教学周</Label>
                <Input
                  id='targetTeachingWeek'
                  type='number'
                  min='1'
                  max='30'
                  placeholder='输入教学周(1-30)'
                  value={targetTeachingWeek}
                  onChange={(e) => setTargetTeachingWeek(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='targetWeekDay'>目标星期</Label>
                <Input
                  id='targetWeekDay'
                  type='number'
                  min='1'
                  max='7'
                  placeholder='输入星期(1-7)'
                  value={targetWeekDay}
                  onChange={(e) => setTargetWeekDay(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setRescheduleDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmReschedule}
                disabled={rescheduleMutation.isPending}
              >
                {rescheduleMutation.isPending ? '处理中...' : '确认调串课'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 补签对话框 */}
        <Dialog open={makeupDialogOpen} onOpenChange={setMakeupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>补签确认</DialogTitle>
              <DialogDescription>
                已选择 {selectedCourseIds.length}{' '}
                门课程，确认要为这些课程补签吗？
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <div className='rounded-md border p-4'>
                <h4 className='mb-2 text-sm font-medium'>已选择的课程：</h4>
                <div className='space-y-2'>
                  {courses
                    .filter((course) => selectedCourseIds.includes(course.id))
                    .map((course) => (
                      <div
                        key={course.id}
                        className='flex items-center justify-between text-sm'
                      >
                        <div>
                          <span className='font-medium'>
                            {course.course_name}
                          </span>
                          <span className='text-muted-foreground ml-2'>
                            第{course.teaching_week}周{' '}
                            {WEEKDAY_MAP[course.week_day]}
                          </span>
                        </div>
                        <Badge variant='outline'>
                          {new Date(course.start_time).toLocaleTimeString(
                            'zh-CN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}{' '}
                          -{' '}
                          {new Date(course.end_time).toLocaleTimeString(
                            'zh-CN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
              <p className='text-muted-foreground mt-4 text-sm'>
                系统将自动判断补签类型（当日补签/历史补签）并为所有应到学生创建签到记录。
              </p>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setMakeupDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmMakeup}
                disabled={makeupMutation.isPending}
              >
                {makeupMutation.isPending ? '处理中...' : '确认补签'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 学生补签对话框 */}
        <Dialog
          open={studentMakeupDialogOpen}
          onOpenChange={setStudentMakeupDialogOpen}
        >
          <DialogContent className='max-w-3xl'>
            <DialogHeader>
              <DialogTitle>学生补签</DialogTitle>
              <DialogDescription>为选中课程的指定学生补签</DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              {loadingStudents ? (
                <div className='space-y-2'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                </div>
              ) : (
                <>
                  <div className='mb-4 flex items-center justify-between'>
                    <div className='text-muted-foreground text-sm'>
                      共 {courseStudents.length} 名学生，已选择{' '}
                      {selectedStudentIds.length} 人
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleToggleAllStudents}
                    >
                      {selectedStudentIds.length === courseStudents.length
                        ? '取消全选'
                        : '全选'}
                    </Button>
                  </div>
                  <div className='max-h-96 overflow-y-auto rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-12'>选择</TableHead>
                          <TableHead>学号</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>班级</TableHead>
                          <TableHead>专业</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className='text-center'>
                              暂无学生数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          courseStudents.map((student) => (
                            <TableRow key={student.student_id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedStudentIds.includes(
                                    student.student_id
                                  )}
                                  onCheckedChange={() =>
                                    handleToggleStudent(student.student_id)
                                  }
                                />
                              </TableCell>
                              <TableCell>{student.student_id}</TableCell>
                              <TableCell>{student.student_name}</TableCell>
                              <TableCell>{student.class_name || '-'}</TableCell>
                              <TableCell>{student.major_name || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <p className='text-muted-foreground mt-4 text-sm'>
                    系统将自动判断补签类型（当日补签/历史补签）并为选中的学生创建签到记录。
                  </p>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => {
                  setStudentMakeupDialogOpen(false)
                  setSelectedStudentIds([])
                  setCourseStudents([])
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmStudentMakeup}
                disabled={
                  studentMakeupMutation.isPending ||
                  selectedStudentIds.length === 0
                }
              >
                {studentMakeupMutation.isPending
                  ? '处理中...'
                  : `确认补签 (${selectedStudentIds.length}人)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
