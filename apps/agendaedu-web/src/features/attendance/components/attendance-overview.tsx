import { useEffect, useState } from 'react'
import { AttendanceStats } from '@/types/attendance.types'
import {
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { attendanceApi } from '@/lib/attendance-api'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function AttendanceOverview() {
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOverallStats()
  }, [])

  const fetchOverallStats = async () => {
    try {
      setLoading(true)
      const response = await attendanceApi.getOverallStats()
      if (response.success && response.data) {
        setStats(response.data)
      } else {
        setError(response.message || '获取统计数据失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                <div className='bg-muted h-4 w-16 animate-pulse rounded' />
              </CardTitle>
              <div className='bg-muted h-4 w-4 animate-pulse rounded' />
            </CardHeader>
            <CardContent>
              <div className='bg-muted h-8 w-20 animate-pulse rounded' />
              <div className='bg-muted mt-2 h-3 w-32 animate-pulse rounded' />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='text-center text-red-500'>{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='text-muted-foreground text-center'>暂无数据</div>
        </CardContent>
      </Card>
    )
  }

  const attendanceRate = (stats.average_attendance_rate * 100).toFixed(1)

  return (
    <div className='space-y-6'>
      {/* 主要统计卡片 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>总课程节数</CardTitle>
            <Calendar className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {stats.total_courses}
            </div>
            <p className='text-muted-foreground text-xs'>本学期课程统计</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>班级人数</CardTitle>
            <Users className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {stats.class_size}
            </div>
            <p className='text-muted-foreground text-xs'>注册学生总数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>整体出勤率</CardTitle>
            <TrendingUp className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {attendanceRate}%
            </div>
            <p className='text-muted-foreground text-xs'>
              {stats.average_attendance_rate >= 0.9 ? '出勤率良好' : '需要关注'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>请假次数</CardTitle>
            <Clock className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-purple-600'>
              {stats.total_leave_count}
            </div>
            <p className='text-muted-foreground text-xs'>累计请假统计</p>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计信息 */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BarChart3 className='h-5 w-5' />
              考勤概况
            </CardTitle>
            <CardDescription>当前学期整体考勤情况</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>总缺勤次数</span>
              <Badge variant='destructive'>{stats.total_absent_count}</Badge>
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>总请假次数</span>
              <Badge variant='secondary'>{stats.total_leave_count}</Badge>
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>平均出勤率</span>
              <Badge
                variant={
                  stats.average_attendance_rate >= 0.9
                    ? 'default'
                    : 'destructive'
                }
              >
                {attendanceRate}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <UserCheck className='h-5 w-5' />
              快速统计
            </CardTitle>
            <CardDescription>关键指标一览</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>课程覆盖率</span>
              <Badge variant='outline'>
                {stats.total_courses > 0 ? '100%' : '0%'}
              </Badge>
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>学生参与度</span>
              <Badge variant={stats.class_size > 0 ? 'default' : 'secondary'}>
                {stats.class_size > 0 ? '活跃' : '无数据'}
              </Badge>
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>系统状态</span>
              <Badge variant='default'>正常运行</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
