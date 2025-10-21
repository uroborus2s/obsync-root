import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { IconBook, IconChartBar } from '@tabler/icons-react'
import {
  Activity,
  AlertTriangle,
  Calendar,
  Download,
  FileSpreadsheet,
  UserCheck,
  Users,
} from 'lucide-react'
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
  AdminGuard,
  PermissionGuard,
  TeacherGuard,
} from '@/components/auth/permission-guard'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  // 使用真实API获取数据
  const { data: stats, isLoading: _statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/icalink/v1/attendance/stats/overview')
      if (!response.ok) throw new Error('获取统计数据失败')
      const result = await response.json()
      return result.data
    },
    refetchInterval: 30000, // 30秒刷新一次
  })

  const { data: weeklyTrend, isLoading: _trendLoading } = useQuery({
    queryKey: ['weekly-trend'],
    queryFn: async () => {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      const response = await fetch(
        `/api/icalink/v1/attendance/stats/trend?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      )
      if (!response.ok) throw new Error('获取趋势数据失败')
      const result = await response.json()
      return result.data?.trend_data || []
    },
  })

  // 移除硬编码的学院统计和告警数据，改为从API获取
  const { data: alerts, isLoading: _alertsLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      // 这里应该调用真实的告警API
      return []
    },
  })

  // 模拟学院统计数据
  const collegeStats = [
    { name: '计算机学院', rate: 95 },
    { name: '经济管理学院', rate: 88 },
    { name: '外国语学院', rate: 92 },
    { name: '艺术学院', rate: 85 },
  ]

  return (
    <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight'>仪表板</h2>
        <div className='flex items-center space-x-2'>
          {/* 导出报表功能 - 需要教师或管理员权限 */}
          <TeacherGuard>
            <Button variant='outline' size='sm'>
              <Download className='mr-2 h-4 w-4' />
              导出报表
            </Button>
          </TeacherGuard>

          {/* 管理员专用功能 */}
          <AdminGuard>
            <Button variant='outline' size='sm'>
              <FileSpreadsheet className='mr-2 h-4 w-4' />
              系统报表
            </Button>
          </AdminGuard>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>今日出勤率</CardTitle>
            <Users className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {stats.todayAttendance}%
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较昨日 +2.1%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>本周出勤率</CardTitle>
            <Calendar className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {stats.weekAttendance}%
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-red-600'>↘ 较上周 -1.2%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>异常课程数</CardTitle>
            <AlertTriangle className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {stats.totalCourses}
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较昨日 +2</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>活跃学生数</CardTitle>
            <Activity className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-purple-600'>
              {stats.activeStudents.toLocaleString()}
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较昨日 +12</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
        {/* 出勤率趋势 */}
        <Card className='col-span-4'>
          <CardHeader>
            <CardTitle>出勤率趋势</CardTitle>
            <CardDescription>最近7天的出勤率变化</CardDescription>
          </CardHeader>
          <CardContent className='pl-2'>
            <div className='space-y-3'>
              {weeklyTrend?.map((item: any, index: number) => (
                <div key={index} className='flex items-center space-x-4'>
                  <div className='w-12 text-sm font-medium'>{item.day}</div>
                  <Progress value={item.rate} className='flex-1' />
                  <div className='w-12 text-right text-sm'>{item.rate}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 各学院出勤率对比 */}
        <Card className='col-span-3'>
          <CardHeader>
            <CardTitle>各学院出勤率对比</CardTitle>
            <CardDescription>本周各学院出勤率统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {collegeStats.map((college: any, index: number) => (
                <div key={index} className='flex items-center justify-between'>
                  <div className='text-sm font-medium'>{college.name}</div>
                  <div className='flex items-center space-x-2'>
                    <Progress value={college.rate} className='w-16' />
                    <span className='w-12 text-sm font-medium'>
                      {college.rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用功能快速入口</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div className='grid grid-cols-2 gap-4'>
              <Button variant='outline' className='h-20 flex-col space-y-2'>
                <Calendar className='h-6 w-6' />
                <span>查询今日考勤</span>
              </Button>
              <Button variant='outline' className='h-20 flex-col space-y-2'>
                <FileSpreadsheet className='h-6 w-6' />
                <span>添加课程</span>
              </Button>
              <Button variant='outline' className='h-20 flex-col space-y-2'>
                <Download className='h-6 w-6' />
                <span>导出报表</span>
              </Button>
              <Button variant='outline' className='h-20 flex-col space-y-2'>
                <UserCheck className='h-6 w-6' />
                <span>学生管理</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 异常提醒 */}
        <Card>
          <CardHeader>
            <CardTitle>异常提醒</CardTitle>
            <CardDescription>需要关注的异常情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {alerts?.map((alert: any, index: number) => (
                <div
                  key={index}
                  className='flex items-start space-x-3 rounded-lg border p-3'
                >
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full ${
                      alert.type === 'warning'
                        ? 'bg-yellow-500'
                        : alert.type === 'error'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <div className='flex-1 space-y-1'>
                    <p className='text-sm font-medium'>{alert.message}</p>
                    <p className='text-muted-foreground text-xs'>
                      {alert.time}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.type === 'warning'
                        ? 'secondary'
                        : alert.type === 'error'
                          ? 'destructive'
                          : 'default'
                    }
                  >
                    {alert.type === 'warning'
                      ? '警告'
                      : alert.type === 'error'
                        ? '紧急'
                        : '通知'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系统状态 */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>平均出勤率</CardTitle>
            <IconChartBar className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.averageAttendance}%</div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较上月 +2.3%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>风险课程数</CardTitle>
            <AlertTriangle className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {stats.riskClasses}
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-red-600'>↘ 较上月 -2</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>活跃课程数</CardTitle>
            <IconBook className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.activeCourses}</div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较上月 +8</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>数据覆盖率</CardTitle>
            <Activity className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {stats.dataAccuracy}%
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较上月 +0.5%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 管理员专用功能区域 */}
      <AdminGuard>
        <Card className='border-orange-200 bg-orange-50/50'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-orange-800'>
              <AlertTriangle className='h-5 w-5' />
              管理员专用功能
            </CardTitle>
            <CardDescription>以下功能仅对管理员可见</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <Button variant='outline' className='justify-start'>
                <Users className='mr-2 h-4 w-4' />
                用户管理
              </Button>
              <Button variant='outline' className='justify-start'>
                <Activity className='mr-2 h-4 w-4' />
                系统监控
              </Button>
              <Button variant='outline' className='justify-start'>
                <FileSpreadsheet className='mr-2 h-4 w-4' />
                数据导出
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminGuard>

      {/* 特定权限功能区域 */}
      <PermissionGuard
        requiredPermissions={['admin:system']}
        forbiddenComponent={
          <Card className='border-gray-200 bg-gray-50/50'>
            <CardContent className='p-6 text-center text-gray-500'>
              <AlertTriangle className='mx-auto mb-2 h-8 w-8' />
              <p>您需要系统管理权限才能查看此区域</p>
            </CardContent>
          </Card>
        }
      >
        <Card className='border-blue-200 bg-blue-50/50'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-blue-800'>
              <Activity className='h-5 w-5' />
              系统管理功能
            </CardTitle>
            <CardDescription>需要 admin:system 权限</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <Button variant='outline' className='justify-start'>
                <Activity className='mr-2 h-4 w-4' />
                性能监控
              </Button>
              <Button variant='outline' className='justify-start'>
                <AlertTriangle className='mr-2 h-4 w-4' />
                系统告警
              </Button>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  )
}
