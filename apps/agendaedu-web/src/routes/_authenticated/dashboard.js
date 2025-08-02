import { createFileRoute } from '@tanstack/react-router';
import { IconBook, IconChartBar } from '@tabler/icons-react';
import { Activity, AlertTriangle, Calendar, Download, FileSpreadsheet, UserCheck, Users, } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
export const Route = createFileRoute('/_authenticated/dashboard')({
    component: Dashboard,
});
function Dashboard() {
    // 模拟数据
    const stats = {
        todayAttendance: 92.5,
        weekAttendance: 89.3,
        totalCourses: 5,
        activeStudents: 1234,
        averageAttendance: 89.2,
        riskClasses: 3,
        activeCourses: 156,
        dataAccuracy: 98.5,
    };
    const weeklyTrend = [
        { day: '周一', rate: 95 },
        { day: '周二', rate: 88 },
        { day: '周三', rate: 97 },
        { day: '周四', rate: 85 },
        { day: '周五', rate: 90 },
        { day: '周六', rate: 83 },
        { day: '周日', rate: 89 },
    ];
    const collegeStats = [
        { name: '计算机学院', rate: 92 },
        { name: '理学院', rate: 88 },
        { name: '工学院', rate: 85 },
        { name: '文学院', rate: 90 },
    ];
    const alerts = [
        { type: 'warning', message: '高等数学课程出勤率低于80%', time: '2小时前' },
        { type: 'error', message: '张三连续3天缺勤', time: '4小时前' },
        { type: 'info', message: '数据结构课程需要补录考勤', time: '6小时前' },
    ];
    return (<div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight'>仪表板</h2>
        <div className='flex items-center space-x-2'>
          <Button variant='outline' size='sm'>
            <Download className='mr-2 h-4 w-4'/>
            导出报表
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>今日出勤率</CardTitle>
            <Users className='text-muted-foreground h-4 w-4'/>
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
            <Calendar className='text-muted-foreground h-4 w-4'/>
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
            <AlertTriangle className='text-muted-foreground h-4 w-4'/>
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
            <Activity className='text-muted-foreground h-4 w-4'/>
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
              {weeklyTrend.map((item, index) => (<div key={index} className='flex items-center space-x-4'>
                  <div className='w-12 text-sm font-medium'>{item.day}</div>
                  <Progress value={item.rate} className='flex-1'/>
                  <div className='w-12 text-right text-sm'>{item.rate}%</div>
                </div>))}
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
              {collegeStats.map((college, index) => (<div key={index} className='flex items-center justify-between'>
                  <div className='text-sm font-medium'>{college.name}</div>
                  <div className='flex items-center space-x-2'>
                    <Progress value={college.rate} className='w-16'/>
                    <span className='w-12 text-sm font-medium'>
                      {college.rate}%
                    </span>
                  </div>
                </div>))}
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
                <Calendar className='h-6 w-6'/>
                <span>查询今日考勤</span>
              </Button>
              <Button variant='outline' className='h-20 flex-col space-y-2'>
                <FileSpreadsheet className='h-6 w-6'/>
                <span>添加课程</span>
              </Button>
              <Button variant='outline' className='h-20 flex-col space-y-2'>
                <Download className='h-6 w-6'/>
                <span>导出报表</span>
              </Button>
              <Button variant='outline' className='h-20 flex-col space-y-2'>
                <UserCheck className='h-6 w-6'/>
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
              {alerts.map((alert, index) => (<div key={index} className='flex items-start space-x-3 rounded-lg border p-3'>
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${alert.type === 'warning'
                ? 'bg-yellow-500'
                : alert.type === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'}`}/>
                  <div className='flex-1 space-y-1'>
                    <p className='text-sm font-medium'>{alert.message}</p>
                    <p className='text-muted-foreground text-xs'>
                      {alert.time}
                    </p>
                  </div>
                  <Badge variant={alert.type === 'warning'
                ? 'secondary'
                : alert.type === 'error'
                    ? 'destructive'
                    : 'default'}>
                    {alert.type === 'warning'
                ? '警告'
                : alert.type === 'error'
                    ? '紧急'
                    : '通知'}
                  </Badge>
                </div>))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系统状态 */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>平均出勤率</CardTitle>
            <IconChartBar className='text-muted-foreground h-4 w-4'/>
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
            <AlertTriangle className='text-muted-foreground h-4 w-4'/>
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
            <IconBook className='text-muted-foreground h-4 w-4'/>
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
            <Activity className='text-muted-foreground h-4 w-4'/>
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
    </div>);
}
//# sourceMappingURL=dashboard.js.map