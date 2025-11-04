import { createFileRoute } from '@tanstack/react-router'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export const Route = createFileRoute('/_authenticated/courses/schedule')({
  component: CourseSchedule,
})

function CourseSchedule() {
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
            课表管理
          </h1>
          <p className='text-muted-foreground'>课程时间表安排管理</p>
        </div>
        <Separator className='my-4 lg:my-6' />
      </Main>
    </>
  )
}
