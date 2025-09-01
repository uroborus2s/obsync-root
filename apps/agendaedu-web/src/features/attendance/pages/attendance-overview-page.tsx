import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  CalendarDays,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// import { attendanceApi } from '@/lib/attendance-api'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { AttendanceRateExplanation } from '../components/attendance-rate-explanation'
import { AttendanceTrendChart } from '../components/attendance-trend-chart'

interface OverallStats {
  total_courses: number
  total_students: number
  total_classes: number
  overall_attendance_rate: number
  trend_data: Array<{
    date: string
    attendance_rate: number
    class_count: number
  }>
}

export function AttendanceOverviewPage() {
  const [filters, setFilters] = useState({
    semester: 'all',
    start_date: '',
    end_date: '',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['attendance-overview', filters],
    queryFn: async (): Promise<OverallStats> => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(
        `/api/icalink/v1/attendance/stats/overview?${params}`
      )
      if (!response.ok) {
        throw new Error('获取签到概览数据失败')
      }
      const result = await response.json()
      return result.data
    },
    enabled: true,
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <div className='bg-muted/40 flex min-h-screen w-full flex-col'>
      <Header>
        <Search />
        <ThemeSwitch />
        <UserNav />
      </Header>
      <Main className='flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-lg font-semibold md:text-2xl'>签到总览</h1>
            <p className='text-muted-foreground'>
              签到系统整体数据概览，包括出勤统计、趋势分析和关键指标
            </p>
          </div>
        </div>

        {/* 筛选条件 */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='space-y-2'>
            <Label htmlFor='semester'>学期</Label>
            <Select
              value={filters.semester}
              onValueChange={(value) => handleFilterChange('semester', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='选择学期' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部学期</SelectItem>
                <SelectItem value='2024-2025-1'>2024-2025-1</SelectItem>
                <SelectItem value='2024-2025-2'>2024-2025-2</SelectItem>
                <SelectItem value='2023-2024-1'>2023-2024-1</SelectItem>
                <SelectItem value='2023-2024-2'>2023-2024-2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='start_date'>开始日期</Label>
            <Input
              id='start_date'
              type='date'
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='end_date'>结束日期</Label>
            <Input
              id='end_date'
              type='date'
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
        </div>

        {/* 出勤率计算说明 */}
        <AttendanceRateExplanation />

        {/* 关键指标卡片 */}
        {data && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>总课程数</CardTitle>
                <BookOpen className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{data.total_courses}</div>
                <p className='text-muted-foreground text-xs'>
                  已开设的课程总数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  参与学生数
                </CardTitle>
                <Users className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{data.total_students}</div>
                <p className='text-muted-foreground text-xs'>
                  参与签到的学生总数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>总课次数</CardTitle>
                <CalendarDays className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{data.total_classes}</div>
                <p className='text-muted-foreground text-xs'>
                  已进行的课次总数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  整体出勤率
                </CardTitle>
                <TrendingUp className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-green-600'>
                  {data.overall_attendance_rate}%
                </div>
                <p className='text-muted-foreground text-xs'>
                  (实际出勤 + 请假) / 应签到
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 出勤趋势图表 */}
        {data && data.trend_data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>出勤率趋势</CardTitle>
              <CardDescription>
                最近30天的出勤率变化趋势，帮助了解出勤情况的发展动态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceTrendChart data={data.trend_data} />
            </CardContent>
          </Card>
        )}

        {/* 快速导航 */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='cursor-pointer transition-shadow hover:shadow-md'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>数据分析</CardTitle>
              <TrendingUp className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-xs'>
                查看详细的签到数据分析
              </p>
            </CardContent>
          </Card>

          <Card className='cursor-pointer transition-shadow hover:shadow-md'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>出勤排行</CardTitle>
              <UserCheck className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-xs'>
                查看学生和课程出勤排行榜
              </p>
            </CardContent>
          </Card>

          <Card className='cursor-pointer transition-shadow hover:shadow-md'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>学生考勤</CardTitle>
              <Users className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-xs'>
                查看学生个人考勤详情
              </p>
            </CardContent>
          </Card>

          <Card className='cursor-pointer transition-shadow hover:shadow-md'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>课程考勤</CardTitle>
              <BookOpen className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-xs'>
                查看课程考勤统计详情
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 加载状态和错误处理 */}
        {isLoading && (
          <div className='flex h-32 items-center justify-center'>
            <div className='text-muted-foreground'>加载中...</div>
          </div>
        )}

        {error && (
          <div className='flex h-32 items-center justify-center'>
            <div className='text-red-500'>加载失败：{error.message}</div>
          </div>
        )}
      </Main>
    </div>
  )
}
