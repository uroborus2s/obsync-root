/**
 * 学生课程表页面
 * 展示学生个人的课程安排
 */
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export const Route = createFileRoute('/_authenticated/course-calendar/student')(
  {
    component: StudentCourseCalendarPage,
  }
)

function StudentCourseCalendarPage() {
  return (
    <>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            学生课程表
          </h1>
          <p className='text-muted-foreground'>
            查看学生个人的课程安排和签到记录
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        <Card>
          <CardHeader>
            <CardTitle>功能开发中</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>
              学生课程表功能正在开发中，敬请期待...
            </p>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
