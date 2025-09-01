import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { StudentRankingsTab } from '../components/student-rankings-tab'
import { CourseRankingsTab } from '../components/course-rankings-tab'
import { AttendanceRateExplanation } from '../components/attendance-rate-explanation'

export function AttendanceRankingsPage() {
  const [activeTab, setActiveTab] = useState('students')

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
            <h1 className='text-lg font-semibold md:text-2xl'>出勤率排行榜</h1>
            <p className='text-muted-foreground'>
              基于出勤率的学生和课程排行榜，支持按学期和时间段筛选
            </p>
          </div>
        </div>

        {/* 出勤率计算说明 */}
        <AttendanceRateExplanation />

        <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='students'>学生出勤率排行</TabsTrigger>
            <TabsTrigger value='courses'>课程出勤率排行</TabsTrigger>
          </TabsList>

          <TabsContent value='students' className='mt-6'>
            <Card>
              <CardHeader>
                <CardTitle>学生出勤率排行榜</CardTitle>
                <CardDescription>
                  按学生个人出勤率排序，展示出勤表现最佳的学生
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentRankingsTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='courses' className='mt-6'>
            <Card>
              <CardHeader>
                <CardTitle>课程出勤率排行榜</CardTitle>
                <CardDescription>
                  按课程整体出勤率排序，展示出勤情况最好的课程
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CourseRankingsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </div>
  )
}
