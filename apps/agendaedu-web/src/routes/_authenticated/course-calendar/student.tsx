/**
 * 学生课程表页面
 * 展示学生个人的课程安排
 */
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/course-calendar/student')({
  component: StudentCourseCalendarPage,
})

function StudentCourseCalendarPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">学生课程表</h1>
        <p className="text-muted-foreground mt-2">
          查看学生个人的课程安排和签到记录
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>功能开发中</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            学生课程表功能正在开发中，敬请期待...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

