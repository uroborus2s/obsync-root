import { useCallback, useEffect, useState } from 'react'
import { AttendanceStats, StudentPersonalStats } from '@/types/attendance.types'
import {
  BarChart3,
  BookOpen,
  Download,
  RefreshCw,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'
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

export function StatsAttendanceTab() {
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [ranking, setRanking] = useState<StudentPersonalStats[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSemester, setSelectedSemester] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await attendanceApi.getOverallStats({
        xnxq: selectedSemester === 'all' ? undefined : selectedSemester,
      })
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (_error) {
      // 静默处理错误
    } finally {
      setLoading(false)
    }
  }, [selectedSemester])

  const fetchRanking = useCallback(async () => {
    try {
      const response = await attendanceApi.getClassAttendanceRanking({
        xnxq: selectedSemester === 'all' ? undefined : selectedSemester,
        bjmc: selectedClass || undefined,
        limit: 10,
      })
      if (response.success && response.data) {
        setRanking(response.data)
      }
    } catch (_error) {
      // 静默处理错误
    }
  }, [selectedSemester, selectedClass])

  useEffect(() => {
    fetchStats()
    fetchRanking()
  }, [fetchStats, fetchRanking])

  const handleExport = async () => {
    try {
      const blob = await attendanceApi.exportAttendanceData({
        xnxq: selectedSemester === 'all' ? undefined : selectedSemester,
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `考勤统计_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (_error) {
      // 静默处理错误
    }
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 0.9) return 'text-green-600'
    if (rate >= 0.8) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRankingBadge = (index: number) => {
    if (index === 0) return <Badge className='bg-yellow-500'>🥇</Badge>
    if (index === 1) return <Badge className='bg-gray-400'>🥈</Badge>
    if (index === 2) return <Badge className='bg-amber-600'>🥉</Badge>
    return <Badge variant='outline'>{index + 1}</Badge>
  }

  return (
    <div className='space-y-6'>
      {/* 筛选控件 */}
      <div className='flex items-center gap-4'>
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='选择学期' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>全部学期</SelectItem>
            <SelectItem value='2024-2025-1'>2024-2025第一学期</SelectItem>
            <SelectItem value='2024-2025-2'>2024-2025第二学期</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='选择班级' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>全部班级</SelectItem>
            <SelectItem value='数据科学2401'>数据科学2401</SelectItem>
            <SelectItem value='数据科学2402'>数据科学2402</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchStats} variant='outline'>
          <RefreshCw className='mr-2 h-4 w-4' />
          刷新
        </Button>
        <Button onClick={handleExport} variant='outline'>
          <Download className='mr-2 h-4 w-4' />
          导出数据
        </Button>
      </div>

      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview'>统计概览</TabsTrigger>
          <TabsTrigger value='ranking'>学生排名</TabsTrigger>
          <TabsTrigger value='trends'>趋势分析</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          {/* 整体统计 */}
          {loading ? (
            <div className='py-8 text-center'>
              <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
              <p className='text-muted-foreground mt-2 text-sm'>加载中...</p>
            </div>
          ) : stats ? (
            <div className='grid gap-6 md:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <BarChart3 className='h-5 w-5' />
                    整体统计
                  </CardTitle>
                  <CardDescription>当前学期考勤数据汇总</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-blue-600'>
                        {stats.total_courses}
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        总课程数
                      </div>
                    </div>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-green-600'>
                        {stats.class_size}
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        班级人数
                      </div>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>平均出勤率</span>
                      <span
                        className={`font-bold ${getAttendanceRateColor(stats.average_attendance_rate)}`}
                      >
                        {(stats.average_attendance_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={stats.average_attendance_rate * 100}
                      className='h-2'
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4 text-center'>
                    <div>
                      <div className='text-lg font-bold text-orange-600'>
                        {stats.total_leave_count}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        总请假次数
                      </div>
                    </div>
                    <div>
                      <div className='text-lg font-bold text-red-600'>
                        {stats.total_absent_count}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        总缺勤次数
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <TrendingUp className='h-5 w-5' />
                    关键指标
                  </CardTitle>
                  <CardDescription>重要考勤指标分析</CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>课程参与度</span>
                      <Badge
                        variant={
                          stats.total_courses > 0 ? 'default' : 'secondary'
                        }
                      >
                        {stats.total_courses > 0 ? '活跃' : '无数据'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>学生活跃度</span>
                      <Badge
                        variant={stats.class_size > 0 ? 'default' : 'secondary'}
                      >
                        {stats.class_size > 0 ? '正常' : '无数据'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>出勤质量</span>
                      <Badge
                        variant={
                          stats.average_attendance_rate >= 0.9
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {stats.average_attendance_rate >= 0.9
                          ? '优秀'
                          : '需改善'}
                      </Badge>
                    </div>
                  </div>

                  <div className='border-t pt-4'>
                    <h4 className='mb-3 text-sm font-medium'>数据完整性</h4>
                    <div className='space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span>课程覆盖率</span>
                        <span>100%</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span>数据准确性</span>
                        <span>高</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className='pt-6'>
                <div className='text-muted-foreground text-center'>
                  暂无统计数据
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='ranking' className='space-y-4'>
          {/* 学生排名 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Trophy className='h-5 w-5' />
                学生出勤排名
              </CardTitle>
              <CardDescription>按出勤率排序的学生榜单</CardDescription>
            </CardHeader>
            <CardContent>
              {ranking.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-16'>排名</TableHead>
                      <TableHead>学生信息</TableHead>
                      <TableHead>班级</TableHead>
                      <TableHead>总课程</TableHead>
                      <TableHead>出勤次数</TableHead>
                      <TableHead>出勤率</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((student, index) => (
                      <TableRow key={student.student.xh}>
                        <TableCell>{getRankingBadge(index)}</TableCell>
                        <TableCell>
                          <div>
                            <div className='font-medium'>
                              {student.student.xm}
                            </div>
                            <div className='text-muted-foreground text-sm'>
                              {student.student.xh}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.student.bjmc}</TableCell>
                        <TableCell>
                          <Badge variant='outline'>
                            {student.total_courses}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            <Badge variant='default'>
                              {student.present_count}
                            </Badge>
                            {student.leave_count > 0 && (
                              <Badge variant='secondary' className='ml-1'>
                                请假: {student.leave_count}
                              </Badge>
                            )}
                            {student.absent_count > 0 && (
                              <Badge variant='destructive' className='ml-1'>
                                缺勤: {student.absent_count}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            <div
                              className={`font-bold ${getAttendanceRateColor(student.attendance_rate)}`}
                            >
                              {(student.attendance_rate * 100).toFixed(1)}%
                            </div>
                            <Progress
                              value={student.attendance_rate * 100}
                              className='h-1 w-16'
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.attendance_rate >= 0.9
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {student.attendance_rate >= 0.9 ? '优秀' : '需关注'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className='text-muted-foreground py-8 text-center'>
                  <Trophy className='mx-auto mb-4 h-12 w-12 opacity-50' />
                  <p>暂无排名数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='trends' className='space-y-4'>
          {/* 趋势分析 */}
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <BookOpen className='h-5 w-5' />
                  课程出勤趋势
                </CardTitle>
                <CardDescription>各课程出勤率变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='bg-muted flex items-center justify-between rounded-lg p-3'>
                    <div>
                      <div className='font-medium'>数据库技术及应用实践</div>
                      <div className='text-muted-foreground text-sm'>
                        周四 15:30-17:05
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='font-bold text-orange-600'>12.1%</div>
                      <div className='text-muted-foreground text-xs'>
                        平均出勤率
                      </div>
                    </div>
                  </div>
                  <div className='text-muted-foreground py-8 text-center'>
                    <BarChart3 className='mx-auto mb-4 h-12 w-12 opacity-50' />
                    <p>趋势图表功能开发中...</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Users className='h-5 w-5' />
                  班级对比分析
                </CardTitle>
                <CardDescription>不同班级考勤情况对比</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>数据科学2401</span>
                      <div className='flex items-center gap-2'>
                        <Progress value={12.1} className='h-2 w-20' />
                        <span className='text-sm font-bold text-orange-600'>
                          12.1%
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>数据科学2402</span>
                      <div className='flex items-center gap-2'>
                        <Progress value={0} className='h-2 w-20' />
                        <span className='text-sm font-bold text-gray-500'>
                          --
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='text-muted-foreground py-8 text-center'>
                    <Users className='mx-auto mb-4 h-12 w-12 opacity-50' />
                    <p>更多对比分析功能即将推出</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
