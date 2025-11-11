import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { UserCourseItem } from '@/types/course-calendar.types'
import { Search as SearchIcon, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  batchAddParticipant,
  getUserCourses,
  syncAllCalendarParticipants,
} from '@/api/course-calendar.api'
import {
  TeachingClass,
  TeachingClassQueryParams,
  statsApiService,
} from '@/lib/stats-api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export const Route = createFileRoute(
  '/_authenticated/data-query/teaching-class'
)({
  component: TeachingClassPage,
})

function TeachingClassPage() {
  const [filters, setFilters] = useState<TeachingClassQueryParams>({
    page: 1,
    pageSize: 20,
    searchKeyword: '',
    sortField: undefined,
    sortOrder: undefined,
  })

  // 同步个人课表弹窗状态
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [userType, setUserType] = useState<'teacher' | 'student'>('student')
  const [userId, setUserId] = useState('')
  const [userCourses, setUserCourses] = useState<UserCourseItem[]>([])
  const [isSearchingCourses, setIsSearchingCourses] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  // 全量同步状态
  const [showFullSyncDialog, setShowFullSyncDialog] = useState(false)
  const [isFullSyncing, setIsFullSyncing] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['teaching-class', filters],
    queryFn: () => statsApiService.getTeachingClass(filters),
    placeholderData: (previousData) => previousData,
  })

  const records = data?.data?.data ?? []
  const total = data?.data?.total ?? 0

  const handleFilterChange = (
    key: keyof TeachingClassQueryParams,
    value: any
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  // 打开同步个人课表弹窗
  const handleOpenSyncDialog = () => {
    setSyncDialogOpen(true)
    setUserId('')
    setUserCourses([])
    setUserName(null)
  }

  // 搜索用户课程
  const handleSearchCourses = async () => {
    if (!userId.trim()) {
      toast.error('请输入学号或工号')
      return
    }

    try {
      setIsSearchingCourses(true)
      const result = await getUserCourses(userType, userId.trim())
      setUserCourses(result.courses)
      setUserName(result.userName)

      if (result.courses.length === 0) {
        toast.info('未找到该用户的课程', {
          duration: 3000,
        })
      } else {
        toast.success(`找到 ${result.courses.length} 门课程`, {
          duration: 3000,
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '查询课程失败', {
        duration: 4000,
      })
      setUserCourses([])
      setUserName(null)
    } finally {
      setIsSearchingCourses(false)
    }
  }

  // 批量同步到日历
  const handleBatchSync = async () => {
    if (userCourses.length === 0) {
      toast.error('没有可同步的课程')
      return
    }

    try {
      setIsSyncing(true)
      const calendarIds = userCourses.map((course) => course.calendarId)
      const result = await batchAddParticipant(
        userType,
        userId.trim(),
        calendarIds
      )

      const successMsg = []
      if (result.successCount > 0) {
        successMsg.push(`成功添加 ${result.successCount} 个`)
      }
      if (result.skippedCount > 0) {
        successMsg.push(`跳过 ${result.skippedCount} 个`)
      }
      if (result.failedCount > 0) {
        successMsg.push(`失败 ${result.failedCount} 个`)
      }

      toast.success(`同步完成！${successMsg.join('，')}`, {
        description: `总共处理 ${result.totalCalendars} 个日历`,
        duration: 5000,
      })

      // 关闭弹窗
      setSyncDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批量同步失败')
    } finally {
      setIsSyncing(false)
    }
  }

  // 全量同步所有日历的参与者权限
  const handleFullSync = async () => {
    try {
      setIsFullSyncing(true)
      const result = await syncAllCalendarParticipants()

      const successMsg = []
      if (result.successCount > 0) {
        successMsg.push(`成功同步 ${result.successCount} 个日历`)
      }
      if (result.failedCount > 0) {
        successMsg.push(`失败 ${result.failedCount} 个`)
      }

      toast.success(`全量同步完成！${successMsg.join('，')}`, {
        description: `总共处理 ${result.totalCalendars} 个日历，新增 ${result.totalAddedPermissions} 个权限，删除 ${result.totalRemovedPermissions} 个权限`,
        duration: 8000,
      })

      setShowFullSyncDialog(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '全量同步失败')
    } finally {
      setIsFullSyncing(false)
    }
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

      <Main>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            教学班
          </h1>
          <p className='text-muted-foreground'>查询教学班学生名单</p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 查询条件 */}
        <div className='my-4 space-y-2'>
          <div className='flex gap-2'>
            <Input
              id='searchKeyword'
              placeholder='输入学号、姓名、学院、专业、班级、年级、课程编码、课程名称或开课单位'
              value={filters.searchKeyword}
              onChange={(e) =>
                handleFilterChange('searchKeyword', e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setFilters((prev) => ({ ...prev, page: 1 }))
                }
              }}
            />
            <Button
              variant='outline'
              size='icon'
              onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
            >
              <SearchIcon className='h-4 w-4' />
            </Button>
            <Button
              variant='default'
              onClick={handleOpenSyncDialog}
              className='whitespace-nowrap'
            >
              <UserPlus className='mr-2 h-4 w-4' />
              同步个人课表
            </Button>
            <Button
              variant='outline'
              onClick={() => setShowFullSyncDialog(true)}
              className='whitespace-nowrap'
            >
              全量同步课表分享者
            </Button>
          </div>
        </div>

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
            {/* 表格区域 - 使用简单的 div 容器实现垂直滚动，保留 Table 组件的横向滚动能力 */}
            <div className='max-h-[450px] overflow-y-auto'>
              <div className='pb-4'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>学院</TableHead>
                      <TableHead>专业</TableHead>
                      <TableHead>班级</TableHead>
                      <TableHead>年级</TableHead>
                      <TableHead>课程编号</TableHead>
                      <TableHead>教学班代码</TableHead>
                      <TableHead>课程名称</TableHead>
                      <TableHead>开课单位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className='h-24 text-center'>
                          <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                          <p className='mt-2'>正在加载...</p>
                        </TableCell>
                      </TableRow>
                    ) : isError ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className='h-24 text-center text-red-500'
                        >
                          加载数据失败: {error?.message || '未知错误'}
                        </TableCell>
                      </TableRow>
                    ) : records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className='h-24 text-center'>
                          无结果
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record: TeachingClass, index: number) => (
                        <TableRow
                          key={`${record.student_id}-${record.course_code}-${index}`}
                        >
                          <TableCell className='font-medium'>
                            {record.student_id || '-'}
                          </TableCell>
                          <TableCell>{record.student_name || '-'}</TableCell>
                          <TableCell>{record.school_name || '-'}</TableCell>
                          <TableCell>{record.major_name || '-'}</TableCell>
                          <TableCell>{record.class_name || '-'}</TableCell>
                          <TableCell>{record.grade || '-'}</TableCell>
                          <TableCell>{record.course_code}</TableCell>
                          <TableCell>{record.teaching_class_code}</TableCell>
                          <TableCell>{record.course_name}</TableCell>
                          <TableCell>{record.course_unit || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 分页控件 */}
            {records.length > 0 && (
              <EnhancedPagination
                page={filters.page!}
                pageSize={filters.pageSize!}
                total={total}
                onPageChange={(newPage) =>
                  setFilters((prev) => ({ ...prev, page: newPage }))
                }
                onPageSizeChange={(newPageSize) =>
                  setFilters((prev) => ({
                    ...prev,
                    pageSize: newPageSize,
                    page: 1,
                  }))
                }
                disabled={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </Main>

      {/* 同步个人课表弹窗 */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className='max-h-[90vh] !max-w-[95vw] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>同步个人课表</DialogTitle>
            <DialogDescription>
              为指定的教师或学生批量同步其所有课程到日历权限中
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-6'>
            {/* 用户类型选择 */}
            <div className='space-y-2'>
              <Label>用户类型</Label>
              <RadioGroup
                value={userType}
                onValueChange={(value) =>
                  setUserType(value as 'teacher' | 'student')
                }
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='student' id='student' />
                  <Label htmlFor='student' className='font-normal'>
                    学生
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='teacher' id='teacher' />
                  <Label htmlFor='teacher' className='font-normal'>
                    教师
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 用户ID输入 */}
            <div className='space-y-2'>
              <Label htmlFor='userId'>
                {userType === 'student' ? '学号' : '工号'}
              </Label>
              <div className='flex gap-2'>
                <Input
                  id='userId'
                  placeholder={
                    userType === 'student' ? '请输入学号' : '请输入工号'
                  }
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchCourses()
                    }
                  }}
                />
                <Button
                  onClick={handleSearchCourses}
                  disabled={isSearchingCourses || !userId.trim()}
                >
                  {isSearchingCourses ? '搜索中...' : '搜索课程'}
                </Button>
              </div>
            </div>

            {/* 用户信息显示 */}
            {userName && (
              <div className='bg-muted rounded-lg p-3'>
                <p className='text-sm'>
                  <span className='font-medium'>用户姓名：</span>
                  {userName}
                </p>
              </div>
            )}

            {/* 课程列表 */}
            {userCourses.length > 0 && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label>课程列表（共 {userCourses.length} 门）</Label>
                  <Button
                    onClick={handleBatchSync}
                    disabled={isSyncing}
                    size='sm'
                  >
                    {isSyncing ? '同步中...' : '批量同步到日历'}
                  </Button>
                </div>

                {/* 使用简单的 div 容器实现垂直滚动，保留 Table 组件的横向滚动能力 */}
                <div className='max-h-[400px] overflow-y-auto rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[60px]'>序号</TableHead>
                        <TableHead className='w-[120px]'>课程代码</TableHead>
                        <TableHead>课程名称</TableHead>
                        <TableHead className='w-[100px]'>学期</TableHead>
                        <TableHead className='w-[120px]'>教师姓名</TableHead>
                        <TableHead className='w-[150px]'>上课地点</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userCourses.map((course, index) => (
                        <TableRow key={`${course.calendarId}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className='font-mono text-xs'>
                            {course.courseCode}
                          </TableCell>
                          <TableCell>{course.courseName}</TableCell>
                          <TableCell>{course.semester}</TableCell>
                          <TableCell>{course.teacherName || '-'}</TableCell>
                          <TableCell>{course.classLocation || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {isSearchingCourses && (
              <div className='space-y-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 全量同步确认对话框 */}
      <AlertDialog
        open={showFullSyncDialog}
        onOpenChange={setShowFullSyncDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认全量同步</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将同步所有课程日历的参与者权限，可能需要较长时间。
              <br />
              系统会自动为每个课程添加对应的学生和教师权限，并删除不再需要的权限。
              <br />
              <br />
              是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFullSyncing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFullSync}
              disabled={isFullSyncing}
            >
              {isFullSyncing ? '同步中...' : '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
