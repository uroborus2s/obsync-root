import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { CourseStatsTab } from '../components/course-stats-tab'
import { TeacherStatsTab } from '../components/teacher-stats-tab'
import { StudentStatsTab } from '../components/student-stats-tab'
import { AttendanceRateExplanation } from '../components/attendance-rate-explanation'

export function AttendanceAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('courses')

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
            <h1 className='text-lg font-semibold md:text-2xl'>签到数据分析</h1>
            <p className='text-muted-foreground'>
              多维度签到数据统计分析，支持课程、教师、学生维度的出勤率统计
            </p>
          </div>
        </div>

        {/* 出勤率计算说明 */}
        <AttendanceRateExplanation />

        <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='courses'>课程维度</TabsTrigger>
            <TabsTrigger value='teachers'>教师维度</TabsTrigger>
            <TabsTrigger value='students'>学生维度</TabsTrigger>
          </TabsList>

          <TabsContent value='courses' className='mt-6'>
            <Card>
              <CardHeader>
                <CardTitle>课程出勤统计</CardTitle>
                <CardDescription>
                  按课程统计出勤情况，包括出勤率、课次数、学生数等信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CourseStatsTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='teachers' className='mt-6'>
            <Card>
              <CardHeader>
                <CardTitle>教师出勤统计</CardTitle>
                <CardDescription>
                  按教师统计授课出勤情况，包括授课课程数、总课次数、整体出勤率等
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeacherStatsTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='students' className='mt-6'>
            <Card>
              <CardHeader>
                <CardTitle>学生出勤统计</CardTitle>
                <CardDescription>
                  按学生统计个人出勤情况，包括选课数、出勤率、最近签到时间等
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentStatsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </div>
  )
}
