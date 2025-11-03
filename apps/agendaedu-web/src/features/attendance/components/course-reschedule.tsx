import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, RefreshCw, Search, X } from 'lucide-react'
import { toast } from 'sonner'
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
}

/**
 * 调课结果接口
 */
interface RescheduleResult {
  successCount: number
  failedCount: number
  errors: Array<{
    courseId: number
    courseName: string
    error: string
  }>
}

/**
 * 课程调串课页面组件
 */
export default function CourseReschedule() {
  // 状态管理
  const [teachingWeek, setTeachingWeek] = useState<number | undefined>()
  const [weekDay, setWeekDay] = useState<number | undefined>()
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [targetTeachingWeek, setTargetTeachingWeek] = useState<number>(1)
  const [targetWeekDay, setTargetWeekDay] = useState<number>(1)

  const queryClient = useQueryClient()

  // 查询课程列表
  const { data: courses, isLoading } = useQuery({
    queryKey: ['attendance-courses', teachingWeek, weekDay],
    queryFn: async () => {
      const params = new URLSearchParams({})
      if (teachingWeek) params.append('teachingWeek', String(teachingWeek))
      if (weekDay) params.append('weekDay', String(weekDay))

      const response = await fetch(
        `/api/icalink/v1/attendance-courses?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error('获取课程列表失败')
      }
      const result = await response.json()
      return result.data as Course[]
    },
  })

  // 批量调课mutation
  const rescheduleMutation = useMutation({
    mutationFn: async (data: {
      courseIds: number[]
      targetTeachingWeek: number
      targetWeekDay: number
    }) => {
      const response = await fetch(
        '/api/icalink/v1/attendance-courses/reschedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      if (!response.ok) {
        throw new Error('调课失败')
      }
      const result = await response.json()
      return result.data as RescheduleResult
    },
    onSuccess: (result) => {
      if (result.successCount > 0) {
        toast.success(`成功调课 ${result.successCount} 门课程`)
      }
      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} 门课程调课失败`)
        result.errors.forEach((error) => {
          toast.error(`${error.courseName}: ${error.error}`)
        })
      }
      // 刷新课程列表
      queryClient.invalidateQueries({ queryKey: ['attendance-courses'] })
      // 关闭对话框并清空选择
      setIsRescheduleDialogOpen(false)
      setSelectedCourseIds([])
    },
    onError: (error: Error) => {
      toast.error(`调课失败: ${error.message}`)
    },
  })

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked && courses) {
      setSelectedCourseIds(courses.map((c) => c.id))
    } else {
      setSelectedCourseIds([])
    }
  }

  // 处理单个选择
  const handleSelectCourse = (courseId: number, checked: boolean) => {
    if (checked) {
      setSelectedCourseIds([...selectedCourseIds, courseId])
    } else {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId))
    }
  }

  // 处理调课提交
  const handleRescheduleSubmit = () => {
    if (selectedCourseIds.length === 0) {
      toast.error('请选择要调课的课程')
      return
    }

    rescheduleMutation.mutate({
      courseIds: selectedCourseIds,
      targetTeachingWeek,
      targetWeekDay,
    })
  }

  // 清空搜索条件
  const handleClearFilters = () => {
    setTeachingWeek(undefined)
    setWeekDay(undefined)
  }

  // 格式化时间显示
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 星期映射
  const weekDayMap: Record<number, string> = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日',
  }

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>课程调串课</h1>
          <p className='text-muted-foreground mt-2'>
            批量调整课程的教学周和星期
          </p>
        </div>
        <Calendar className='text-muted-foreground h-8 w-8' />
      </div>

      {/* 搜索条件 */}
      <div className='bg-card rounded-lg border p-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='space-y-2'>
            <Label htmlFor='teachingWeek'>教学周</Label>
            <Input
              id='teachingWeek'
              type='number'
              min={1}
              max={30}
              value={teachingWeek || ''}
              onChange={(e) =>
                setTeachingWeek(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder='选择教学周'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='weekDay'>星期</Label>
            <Select
              value={weekDay ? String(weekDay) : ''}
              onValueChange={(value) =>
                setWeekDay(value ? Number(value) : undefined)
              }
            >
              <SelectTrigger id='weekDay'>
                <SelectValue placeholder='选择星期' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='1'>周一</SelectItem>
                <SelectItem value='2'>周二</SelectItem>
                <SelectItem value='3'>周三</SelectItem>
                <SelectItem value='4'>周四</SelectItem>
                <SelectItem value='5'>周五</SelectItem>
                <SelectItem value='6'>周六</SelectItem>
                <SelectItem value='7'>周日</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-end gap-2'>
            <Button
              variant='outline'
              onClick={handleClearFilters}
              className='flex-1'
            >
              <X className='mr-2 h-4 w-4' />
              清空
            </Button>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className='flex items-center justify-between'>
        <div className='text-muted-foreground text-sm'>
          {courses && `共 ${courses.length} 门课程`}
          {selectedCourseIds.length > 0 &&
            ` · 已选择 ${selectedCourseIds.length} 门`}
        </div>
        <Button
          onClick={() => setIsRescheduleDialogOpen(true)}
          disabled={selectedCourseIds.length === 0}
        >
          <RefreshCw className='mr-2 h-4 w-4' />
          批量调课
        </Button>
      </div>

      {/* 课程列表表格 */}
      <div className='bg-card rounded-lg border'>
        {isLoading ? (
          <div className='space-y-4 p-6'>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className='h-12 w-full' />
            ))}
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <Search className='text-muted-foreground mb-4 h-12 w-12' />
            <p className='text-muted-foreground text-lg'>暂无课程数据</p>
            <p className='text-muted-foreground text-sm'>
              请调整搜索条件后重试
            </p>
          </div>
        ) : (
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
                <TableHead>课程代码</TableHead>
                <TableHead>课程名称</TableHead>
                <TableHead>教学周</TableHead>
                <TableHead>星期</TableHead>
                <TableHead>节次</TableHead>
                <TableHead>时间段</TableHead>
                <TableHead>教师</TableHead>
                <TableHead>地点</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCourseIds.includes(course.id)}
                      onCheckedChange={(checked) =>
                        handleSelectCourse(course.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className='font-mono text-sm'>
                    {course.course_code}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {course.course_name}
                  </TableCell>
                  <TableCell>第{course.teaching_week}周</TableCell>
                  <TableCell>{weekDayMap[course.week_day]}</TableCell>
                  <TableCell>{course.periods || '-'}</TableCell>
                  <TableCell>
                    {formatTime(course.start_time)} -{' '}
                    {formatTime(course.end_time)}
                  </TableCell>
                  <TableCell>{course.teacher_names || '-'}</TableCell>
                  <TableCell>{course.class_location || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 调课对话框 */}
      <Dialog
        open={isRescheduleDialogOpen}
        onOpenChange={setIsRescheduleDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量调课</DialogTitle>
            <DialogDescription>
              将选中的 {selectedCourseIds.length} 门课程调整到指定的教学周和星期
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='targetTeachingWeek'>目标教学周</Label>
              <Input
                id='targetTeachingWeek'
                type='number'
                min={1}
                max={30}
                value={targetTeachingWeek}
                onChange={(e) => setTargetTeachingWeek(Number(e.target.value))}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='targetWeekDay'>目标星期</Label>
              <Select
                value={String(targetWeekDay)}
                onValueChange={(value) => setTargetWeekDay(Number(value))}
              >
                <SelectTrigger id='targetWeekDay'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>周一</SelectItem>
                  <SelectItem value='2'>周二</SelectItem>
                  <SelectItem value='3'>周三</SelectItem>
                  <SelectItem value='4'>周四</SelectItem>
                  <SelectItem value='5'>周五</SelectItem>
                  <SelectItem value='6'>周六</SelectItem>
                  <SelectItem value='7'>周日</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsRescheduleDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? (
                <>
                  <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                  调课中...
                </>
              ) : (
                <>
                  <RefreshCw className='mr-2 h-4 w-4' />
                  确认调课
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
