import { createFileRoute } from '@tanstack/react-router';
import { IconChartBar } from '@tabler/icons-react';
import { Activity, AlertTriangle, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
export const Route = createFileRoute('/_authenticated/analytics')({
    component: Analytics,
});
function Analytics() {
    // 模拟分析数据
    const analysisData = {
        averageAttendance: 89.2,
        riskClasses: 3,
        activeCourses: 156,
        dataAccuracy: 98.5,
        monthlyTrend: [
            { month: '9月', attendance: 91.2, target: 90 },
            { month: '10月', attendance: 88.5, target: 90 },
            { month: '11月', attendance: 92.1, target: 90 },
            { month: '12月', attendance: 89.8, target: 90 },
            { month: '1月', attendance: 87.2, target: 90 },
        ],
        collegeComparison: [
            { name: '计算机学院', currentYear: 92, lastYear: 88 },
            { name: '理学院', currentYear: 88, lastYear: 90 },
            { name: '工学院', currentYear: 85, lastYear: 82 },
            { name: '文学院', currentYear: 90, lastYear: 89 },
            { name: '经管学院', currentYear: 87, lastYear: 85 },
        ],
    };
    return (<div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>分析配置</h2>
          <p className='text-muted-foreground'>选择分析类型和维度</p>
        </div>
      </div>

      {/* 分析配置 */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>分析类型</label>
          <Select defaultValue='attendance'>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='attendance'>出勤率分析</SelectItem>
              <SelectItem value='course'>课程分析</SelectItem>
              <SelectItem value='student'>学生分析</SelectItem>
              <SelectItem value='teacher'>教师分析</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>分析维度</label>
          <Select defaultValue='college'>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='college'>按学院</SelectItem>
              <SelectItem value='major'>按专业</SelectItem>
              <SelectItem value='grade'>按年级</SelectItem>
              <SelectItem value='class'>按班级</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>时间粒度</label>
          <Select defaultValue='month'>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='day'>按日</SelectItem>
              <SelectItem value='week'>按周</SelectItem>
              <SelectItem value='month'>按月</SelectItem>
              <SelectItem value='semester'>按学期</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>对比基准</label>
          <Select defaultValue='year'>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='year'>同期对比</SelectItem>
              <SelectItem value='target'>目标对比</SelectItem>
              <SelectItem value='average'>平均值对比</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 关键指标 */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>平均出勤率</CardTitle>
            <IconChartBar className='text-muted-foreground h-4 w-4'/>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {analysisData.averageAttendance}%
            </div>
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
              {analysisData.riskClasses}
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-red-600'>↘ 较上月 -2</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>活跃课程数</CardTitle>
            <Activity className='text-muted-foreground h-4 w-4'/>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {analysisData.activeCourses}
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较上月 +8</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>数据覆盖率</CardTitle>
            <Target className='text-muted-foreground h-4 w-4'/>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {analysisData.dataAccuracy}%
            </div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 较上月 +0.5%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        {/* 出勤率趋势分析 */}
        <Card>
          <CardHeader>
            <CardTitle>出勤率趋势分析</CardTitle>
            <CardDescription>最近5个月的出勤率变化趋势</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {analysisData.monthlyTrend.map((item, index) => (<div key={index} className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='font-medium'>{item.month}</span>
                  <span className='text-muted-foreground'>
                    {item.attendance}%
                  </span>
                </div>
                <div className='flex items-center space-x-2'>
                  <Progress value={item.attendance} className='flex-1'/>
                  <Badge variant={item.attendance >= item.target ? 'default' : 'secondary'}>
                    {item.attendance >= item.target ? '达标' : '未达标'}
                  </Badge>
                </div>
                <div className='text-muted-foreground flex justify-between text-xs'>
                  <span>目标: {item.target}%</span>
                  <span className={item.attendance >= item.target
                ? 'text-green-600'
                : 'text-red-600'}>
                    {item.attendance >= item.target ? '↗' : '↘'}
                    {Math.abs(item.attendance - item.target).toFixed(1)}%
                  </span>
                </div>
              </div>))}
          </CardContent>
        </Card>

        {/* 各学院出勤率对比 */}
        <Card>
          <CardHeader>
            <CardTitle>各学院出勤率对比</CardTitle>
            <CardDescription>本年度与去年同期对比</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {analysisData.collegeComparison.map((college, index) => (<div key={index} className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>{college.name}</span>
                  <div className='flex items-center space-x-2'>
                    <Badge variant='outline' className='text-xs'>
                      本年 {college.currentYear}%
                    </Badge>
                    <Badge variant='secondary' className='text-xs'>
                      去年 {college.lastYear}%
                    </Badge>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div className='space-y-1'>
                    <div className='flex justify-between text-xs'>
                      <span>本年</span>
                      <span className='text-blue-600'>
                        {college.currentYear}%
                      </span>
                    </div>
                    <Progress value={college.currentYear} className='h-2'/>
                  </div>
                  <div className='space-y-1'>
                    <div className='flex justify-between text-xs'>
                      <span>去年</span>
                      <span className='text-gray-500'>{college.lastYear}%</span>
                    </div>
                    <Progress value={college.lastYear} className='h-2'/>
                  </div>
                </div>
                <div className='text-center text-xs'>
                  <span className={college.currentYear > college.lastYear
                ? 'text-green-600'
                : 'text-red-600'}>
                    {college.currentYear > college.lastYear ? '↗' : '↘'}
                    较去年
                    {college.currentYear > college.lastYear ? '上升' : '下降'}
                    {Math.abs(college.currentYear - college.lastYear)}%
                  </span>
                </div>
              </div>))}
          </CardContent>
        </Card>
      </div>
    </div>);
}
//# sourceMappingURL=analytics.js.map