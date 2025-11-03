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
import { StudentAbsenceStats } from '../components/student-absence-stats'

export function StudentAbsenceStatsPage() {
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
            <h1 className='text-lg font-semibold md:text-2xl'>学工签到统计</h1>
            <p className='text-muted-foreground'>
              按学生维度查看缺勤统计数据，支持按组织架构筛选和查询
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>学生考勤统计</CardTitle>
            <CardDescription>
              按学生维度统计缺勤情况，左侧选择组织架构节点，右侧显示对应学生的统计数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentAbsenceStats />
          </CardContent>
        </Card>
      </Main>
    </div>
  )
}
