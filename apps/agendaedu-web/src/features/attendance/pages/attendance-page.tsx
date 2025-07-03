import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiTest } from '@/components/api-test'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { AttendanceOverview } from '../components/attendance-overview'
import { CourseAttendanceTab } from '../components/course-attendance-tab'
import { StatsAttendanceTab } from '../components/stats-attendance-tab'
import { StudentAttendanceTab } from '../components/student-attendance-tab'

export function AttendancePage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className='bg-muted/40 flex min-h-screen w-full flex-col'>
      <Header>
        <Search />
        <ThemeSwitch />
        <UserNav />
      </Header>
      <Main className='flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6'>
        <div className='flex items-center'>
          <h1 className='text-lg font-semibold md:text-2xl'>考勤管理</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1'>
          <TabsList className='grid w-full grid-cols-5'>
            <TabsTrigger value='overview'>总览</TabsTrigger>
            <TabsTrigger value='courses'>课程考勤</TabsTrigger>
            <TabsTrigger value='students'>学生考勤</TabsTrigger>
            <TabsTrigger value='stats'>统计分析</TabsTrigger>
            <TabsTrigger value='api-test'>API诊断</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='mt-6'>
            <AttendanceOverview />
          </TabsContent>

          <TabsContent value='courses' className='mt-6'>
            <CourseAttendanceTab />
          </TabsContent>

          <TabsContent value='students' className='mt-6'>
            <StudentAttendanceTab />
          </TabsContent>

          <TabsContent value='stats' className='mt-6'>
            <StatsAttendanceTab />
          </TabsContent>

          <TabsContent value='api-test' className='mt-6'>
            <ApiTest />
          </TabsContent>
        </Tabs>
      </Main>
    </div>
  )
}
