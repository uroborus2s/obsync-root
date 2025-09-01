import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StudentStatsTab } from '../components/student-stats-tab'
import { AttendanceRateExplanation } from '../components/attendance-rate-explanation'

export function AttendanceStudentsPage() {
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
            <h1 className='text-lg font-semibold md:text-2xl'>学生考勤管理</h1>
            <p className='text-muted-foreground'>
              查看和管理学生个人考勤情况，包括出勤率、选课数、签到记录等详细信息
            </p>
          </div>
        </div>

        {/* 出勤率计算说明 */}
        <AttendanceRateExplanation />

        <Card>
          <CardHeader>
            <CardTitle>学生考勤统计</CardTitle>
            <CardDescription>
              按学生统计个人出勤情况，支持按学期、课程、时间段等条件筛选
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentStatsTab />
          </CardContent>
        </Card>
      </Main>
    </div>
  )
}
