import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { AttendanceRateExplanation } from '../components/attendance-rate-explanation'
import { CourseAttendanceStatistics } from '../components/course-attendance-statistics'

export function CourseAttendanceStatisticsPage() {
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
            <h1 className='text-lg font-semibold md:text-2xl'>课程表统计</h1>
            <p className='text-muted-foreground'>
              按课程表维度查看签到统计数据，包括签到率、出勤率、学生数量等详细信息
            </p>
          </div>
        </div>

        {/* 出勤率计算说明 */}
        <AttendanceRateExplanation />

        <Card>
          <CardHeader>
            <CardTitle>课程表统计</CardTitle>
            <CardDescription>
              按课程表维度统计签到情况，支持按学期、课程名称、教师等条件筛选和排序
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseAttendanceStatistics />
          </CardContent>
        </Card>
      </Main>
    </div>
  )
}
