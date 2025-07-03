import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/courses/settings')({
  component: CourseSettings,
})

function CourseSettings() {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <h2 className='text-3xl font-bold tracking-tight'>课程设置</h2>
      <p className='text-muted-foreground'>课程相关配置和设置</p>
    </div>
  )
}
