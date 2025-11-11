/**
 * 课程表页面
 * 展示日历-课程关联列表和详细信息
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ICalendarCourseItem } from '@/types/course-calendar.types'
import { ArrowLeft, Eye, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  getCalendarCourses,
  getCourseSessions,
  getCourseShareParticipants,
  syncCalendarParticipants,
} from '@/api/course-calendar.api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search as SearchComponent } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export const Route = createFileRoute('/_authenticated/course-calendar/')({
  component: CourseCalendarPage,
})

function CourseCalendarPage() {
  // 状态管理
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list') // 视图模式：列表或详情
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedCourse, setSelectedCourse] =
    useState<ICalendarCourseItem | null>(null)
  const [sessionPage, setSessionPage] = useState(1)
  const [sessionPageSize, setSessionPageSize] = useState(20)
  const [participantSearchInput, setParticipantSearchInput] = useState('') // 分享人搜索输入
  const [isSyncing, setIsSyncing] = useState(false) // 同步状态

  // 获取主列表数据
  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ['calendar-courses', page, pageSize, searchKeyword],
    queryFn: () => getCalendarCourses(page, pageSize, searchKeyword),
  })

  // 获取课节列表
  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: [
      'course-sessions',
      selectedCourse?.course_code,
      sessionPage,
      sessionPageSize,
    ],
    queryFn: () =>
      getCourseSessions(
        selectedCourse!.course_code,
        sessionPage,
        sessionPageSize
      ),
    enabled: !!selectedCourse,
  })

  // 获取分享人列表（包含教学班总数）
  const {
    data: shareParticipantsData,
    isLoading: isShareParticipantsLoading,
    refetch: refetchShareParticipants,
  } = useQuery({
    queryKey: ['share-participants', selectedCourse?.calendar_id],
    queryFn: () => getCourseShareParticipants(selectedCourse!.calendar_id),
    enabled: !!selectedCourse,
  })

  // 提取参与者列表、教学班总数和已有权限数
  const shareParticipants = shareParticipantsData?.participants || []
  const totalStudents = shareParticipantsData?.totalStudents || 0
  const existingPermissions = shareParticipantsData?.existingPermissions || 0
  const toAddCount = shareParticipantsData?.toAddCount || 0
  const toDeleteCount = shareParticipantsData?.toDeleteCount || 0
  const needsSync = shareParticipantsData?.needsSync || false

  // 过滤和排序分享人列表（客户端搜索，教师优先）
  const filteredParticipants = useMemo(() => {
    if (!shareParticipants || shareParticipants.length === 0) return []

    // 1. 先过滤
    let filtered = shareParticipants
    if (participantSearchInput.trim()) {
      const keyword = participantSearchInput.toLowerCase().trim()
      filtered = shareParticipants.filter(
        (p) =>
          p.userId.toLowerCase().includes(keyword) ||
          p.studentName?.toLowerCase().includes(keyword)
      )
    }

    // 2. 排序：教师在前，学生在后
    return filtered.sort((a, b) => {
      const aIsTeacher = a.studentName?.includes('（教师）') || false
      const bIsTeacher = b.studentName?.includes('（教师）') || false

      // 教师优先
      if (aIsTeacher && !bIsTeacher) return -1
      if (!aIsTeacher && bIsTeacher) return 1

      // 同类型按用户ID排序
      return a.userId.localeCompare(b.userId)
    })
  }, [shareParticipants, participantSearchInput])

  // 搜索处理
  const handleSearch = () => {
    setSearchKeyword(searchInput)
    setPage(1) // 重置到第一页
  }

  // 查看详情
  const handleViewDetail = (course: ICalendarCourseItem) => {
    setSelectedCourse(course)
    setSessionPage(1) // 重置课节页码
    setViewMode('detail') // 切换到详情视图
  }

  // 返回列表
  const handleBackToList = () => {
    setViewMode('list') // 切换回列表视图
    setSelectedCourse(null) // 清空选中的课程
  }

  // 同步日历参与者
  const handleSync = async () => {
    if (!selectedCourse?.calendar_id) return

    try {
      setIsSyncing(true)
      const result = await syncCalendarParticipants(selectedCourse.calendar_id)

      // 构建同步结果描述
      const syncDetails = []
      if (result.addedCount > 0) {
        syncDetails.push(`新增 ${result.addedCount} 人`)
      }
      if (result.removedCount > 0) {
        syncDetails.push(`删除 ${result.removedCount} 人`)
      }
      const syncSummary =
        syncDetails.length > 0 ? syncDetails.join('，') : '无变更'

      // 显示成功提示（5秒后自动消失）
      toast.success(`同步成功！${syncSummary}`, {
        description: `教学班总人数: ${result.totalStudents}，当前权限数: ${result.existingPermissions}`,
        duration: 5000,
      })

      // 刷新分享人列表
      refetchShareParticipants()
    } catch (error) {
      toast.error('同步失败，请重试', {
        description: error instanceof Error ? error.message : '未知错误',
        duration: 5000,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // 渲染权限角色标签
  const renderRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      owner: { label: '所有者', color: 'bg-red-100 text-red-800' },
      writer: { label: '编辑者', color: 'bg-blue-100 text-blue-800' },
      reader: { label: '查看者', color: 'bg-green-100 text-green-800' },
      free_busy_reader: {
        label: '忙闲查看',
        color: 'bg-gray-100 text-gray-800',
      },
    }

    const roleInfo = roleMap[role] || {
      label: role,
      color: 'bg-gray-100 text-gray-800',
    }

    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
          roleInfo.color
        )}
      >
        {roleInfo.label}
      </span>
    )
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
        {/* 列表视图 */}
        {viewMode === 'list' && (
          <>
            <div className='space-y-0.5'>
              <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
                课程表
              </h1>
              <p className='text-muted-foreground'>
                查看日历-课程关联列表和详细信息
              </p>
            </div>
            <Separator className='my-4 lg:my-6' />

            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-lg'>日历-课程列表</CardTitle>
                  <div className='flex items-center gap-2'>
                    <Input
                      placeholder='搜索课程代码、课程名称、教师...'
                      className='w-80'
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch()
                        }
                      }}
                    />
                    <Button onClick={handleSearch} size='icon'>
                      <Search className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 使用简单的 div 容器实现垂直滚动，保留 Table 组件的横向滚动能力 */}
                <div className='max-h-[450px] overflow-y-auto'>
                  {isCoursesLoading ? (
                    <div className='space-y-2 pb-4'>
                      {[...Array(10)].map((_, i) => (
                        <Skeleton key={i} className='h-16 w-full' />
                      ))}
                    </div>
                  ) : coursesData && coursesData.data.length > 0 ? (
                    <div className='pb-4'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='whitespace-nowrap'>
                              课程代码
                            </TableHead>
                            <TableHead className='whitespace-nowrap'>
                              课程名称
                            </TableHead>
                            <TableHead className='whitespace-nowrap'>
                              学期
                            </TableHead>
                            <TableHead className='whitespace-nowrap'>
                              时间
                            </TableHead>
                            <TableHead className='whitespace-nowrap'>
                              教师姓名
                            </TableHead>
                            <TableHead className='text-right whitespace-nowrap'>
                              学生总数
                            </TableHead>
                            <TableHead className='text-right whitespace-nowrap'>
                              课节总数
                            </TableHead>
                            <TableHead className='whitespace-nowrap'>
                              上课地点
                            </TableHead>
                            <TableHead className='text-right whitespace-nowrap'>
                              操作
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {coursesData.data.map((course) => (
                            <TableRow key={course.course_code}>
                              <TableCell className='font-medium whitespace-nowrap'>
                                {course.course_code}
                              </TableCell>
                              <TableCell className='whitespace-nowrap'>
                                {course.course_name}
                              </TableCell>
                              <TableCell className='whitespace-nowrap'>
                                {course.semester}
                              </TableCell>
                              <TableCell className='whitespace-nowrap'>
                                {course.start_week}-{course.end_week}周
                              </TableCell>
                              <TableCell className='whitespace-nowrap'>
                                {course.teacher_name || '-'}
                              </TableCell>
                              <TableCell className='text-right whitespace-nowrap'>
                                {course.total_students ?? '-'}
                              </TableCell>
                              <TableCell className='text-right whitespace-nowrap'>
                                {course.total_sessions ?? '-'}
                              </TableCell>
                              <TableCell className='whitespace-nowrap'>
                                {course.class_location || '-'}
                              </TableCell>
                              <TableCell className='text-right whitespace-nowrap'>
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  onClick={() => handleViewDetail(course)}
                                >
                                  <Eye className='mr-2 h-4 w-4' />
                                  查看详情
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className='text-muted-foreground py-8 text-center text-sm'>
                      暂无数据
                    </p>
                  )}
                </div>

                {/* 分页控件 */}
                <EnhancedPagination
                  page={page}
                  pageSize={pageSize}
                  total={coursesData?.total || 0}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  disabled={isCoursesLoading}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* 详情视图 */}
        {viewMode === 'detail' && selectedCourse && (
          <>
            <div className='mb-6 flex items-center gap-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleBackToList}
                className='gap-2'
              >
                <ArrowLeft className='h-4 w-4' />
                返回列表
              </Button>
              <div>
                <h1 className='text-3xl font-bold'>
                  {selectedCourse.course_name}
                </h1>
                <p className='text-muted-foreground mt-1'>
                  课程代码: {selectedCourse.course_code} | 学期:{' '}
                  {selectedCourse.semester} | 教师:{' '}
                  {selectedCourse.teacher_name || '-'}
                </p>
              </div>
            </div>

            <Card>
              <CardContent className='pt-6'>
                <Tabs defaultValue='sessions' className='w-full'>
                  <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value='sessions'>课节列表</TabsTrigger>
                    <TabsTrigger value='participants'>分享人列表</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: 课节列表 */}
                  <TabsContent value='sessions'>
                    {/* 使用简单的 div 容器实现垂直滚动，保留 Table 组件的横向滚动能力 */}
                    <div className='max-h-[400px] overflow-y-auto'>
                      {isSessionsLoading ? (
                        <div className='space-y-2 pb-4'>
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className='h-12 w-full' />
                          ))}
                        </div>
                      ) : sessionsData && sessionsData.data.length > 0 ? (
                        <div className='pb-4'>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className='w-[60px] whitespace-nowrap'>
                                  序号
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  课程名称
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  教学周
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  星期
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  节次
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  教师
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  地点
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  开始时间
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  结束时间
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  需要签到
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sessionsData.data.map((session, index) => (
                                <TableRow key={session.id}>
                                  <TableCell className='whitespace-nowrap'>
                                    {(sessionPage - 1) * sessionPageSize +
                                      index +
                                      1}
                                  </TableCell>
                                  <TableCell className='font-medium whitespace-nowrap'>
                                    {session.course_name}
                                  </TableCell>
                                  <TableCell className='whitespace-nowrap'>
                                    {session.teaching_week
                                      ? `第${session.teaching_week}周`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='whitespace-nowrap'>
                                    {session.week_day
                                      ? `周${session.week_day}`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='whitespace-nowrap'>
                                    {session.periods || '-'}
                                  </TableCell>
                                  <TableCell className='whitespace-nowrap'>
                                    {session.teacher_names || '-'}
                                  </TableCell>
                                  <TableCell className='whitespace-nowrap'>
                                    {session.class_location || '-'}
                                  </TableCell>
                                  <TableCell className='text-sm'>
                                    {new Date(
                                      session.start_time
                                    ).toLocaleString('zh-CN', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </TableCell>
                                  <TableCell className='text-sm whitespace-nowrap'>
                                    {new Date(session.end_time).toLocaleString(
                                      'zh-CN',
                                      {
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )}
                                  </TableCell>
                                  <TableCell className='whitespace-nowrap'>
                                    {session.attendance_enabled ? (
                                      <span className='text-green-600'>是</span>
                                    ) : (
                                      <span className='text-gray-400'>否</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className='text-muted-foreground py-8 text-center text-sm'>
                          暂无课节数据
                        </p>
                      )}
                    </div>

                    {/* 课节分页控件 */}
                    <EnhancedPagination
                      page={sessionPage}
                      pageSize={sessionPageSize}
                      total={sessionsData?.total || 0}
                      onPageChange={setSessionPage}
                      onPageSizeChange={setSessionPageSize}
                      disabled={isSessionsLoading}
                    />
                  </TabsContent>

                  {/* Tab 2: 分享人列表 */}
                  <TabsContent value='participants'>
                    {/* 搜索和同步工具栏 */}
                    <div className='mb-4 space-y-3'>
                      {/* 教学班学生总数和已有权限数显示 */}
                      <div className='text-muted-foreground flex flex-wrap items-center gap-4 text-sm'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>教学班学生总数：</span>
                          <span className='text-foreground font-semibold'>
                            {totalStudents} 人
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>已有权限数：</span>
                          <span className='text-foreground font-semibold'>
                            {existingPermissions} 人
                          </span>
                        </div>
                        {needsSync && (
                          <>
                            {toAddCount > 0 && (
                              <div className='flex items-center gap-2'>
                                <span className='font-medium'>待添加：</span>
                                <span className='font-semibold text-orange-600'>
                                  {toAddCount} 人
                                </span>
                              </div>
                            )}
                            {toDeleteCount > 0 && (
                              <div className='flex items-center gap-2'>
                                <span className='font-medium'>待删除：</span>
                                <span className='font-semibold text-red-600'>
                                  {toDeleteCount} 人
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {!needsSync && (
                          <div className='flex items-center gap-2'>
                            <svg
                              className='h-4 w-4 text-green-600'
                              xmlns='http://www.w3.org/2000/svg'
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M5 13l4 4L19 7'
                              />
                            </svg>
                            <span className='font-medium text-green-600'>
                              权限已同步
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 搜索框和同步按钮 */}
                      <div className='flex items-center gap-2'>
                        <div className='relative flex-1'>
                          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                          <Input
                            placeholder='搜索学生姓名或学号...'
                            value={participantSearchInput}
                            onChange={(e) =>
                              setParticipantSearchInput(e.target.value)
                            }
                            className='pl-9'
                          />
                        </div>
                        <Button
                          onClick={handleSync}
                          disabled={isSyncing || !selectedCourse || !needsSync}
                          className='bg-primary hover:bg-primary/90 shrink-0'
                          title={
                            !needsSync
                              ? '权限已同步，无需操作'
                              : `点击同步：添加 ${toAddCount} 人，删除 ${toDeleteCount} 人`
                          }
                        >
                          {isSyncing ? (
                            <>
                              <svg
                                className='mr-2 h-4 w-4 animate-spin'
                                xmlns='http://www.w3.org/2000/svg'
                                fill='none'
                                viewBox='0 0 24 24'
                              >
                                <circle
                                  className='opacity-25'
                                  cx='12'
                                  cy='12'
                                  r='10'
                                  stroke='currentColor'
                                  strokeWidth='4'
                                />
                                <path
                                  className='opacity-75'
                                  fill='currentColor'
                                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                />
                              </svg>
                              同步中...
                            </>
                          ) : (
                            <>
                              <svg
                                className='mr-2 h-4 w-4'
                                xmlns='http://www.w3.org/2000/svg'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                />
                              </svg>
                              同步
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 使用简单的 div 容器实现垂直滚动，保留 Table 组件的横向滚动能力 */}
                    <div className='max-h-[400px] overflow-y-auto'>
                      {isShareParticipantsLoading ? (
                        <div className='space-y-2 pb-4'>
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className='h-12 w-full' />
                          ))}
                        </div>
                      ) : filteredParticipants &&
                        filteredParticipants.length > 0 ? (
                        <div className='pb-4'>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className='w-[60px] whitespace-nowrap'>
                                  序号
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  用户ID
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  姓名
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  学院
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  专业
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  班级
                                </TableHead>
                                <TableHead className='whitespace-nowrap'>
                                  权限角色
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredParticipants.map(
                                (participant, index) => (
                                  <TableRow key={participant.id}>
                                    <TableCell className='whitespace-nowrap'>
                                      {index + 1}
                                    </TableCell>
                                    <TableCell className='font-medium whitespace-nowrap'>
                                      {participant.userId}
                                    </TableCell>
                                    <TableCell className='whitespace-nowrap'>
                                      {participant.studentName || '-'}
                                    </TableCell>
                                    <TableCell className='whitespace-nowrap'>
                                      {participant.schoolName || '-'}
                                    </TableCell>
                                    <TableCell className='whitespace-nowrap'>
                                      {participant.majorName || '-'}
                                    </TableCell>
                                    <TableCell className='whitespace-nowrap'>
                                      {participant.className || '-'}
                                    </TableCell>
                                    <TableCell className='whitespace-nowrap'>
                                      {renderRoleBadge(participant.role)}
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className='text-muted-foreground py-8 text-center text-sm'>
                          {participantSearchInput.trim()
                            ? '未找到匹配的学生'
                            : '暂无分享人数据'}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </Main>
    </>
  )
}
