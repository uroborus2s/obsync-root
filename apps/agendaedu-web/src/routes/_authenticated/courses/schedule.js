import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_authenticated/courses/schedule')({
    component: CourseSchedule,
});
function CourseSchedule() {
    return (<div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <h2 className='text-3xl font-bold tracking-tight'>课表管理</h2>
      <p className='text-muted-foreground'>课程时间表安排管理</p>
    </div>);
}
//# sourceMappingURL=schedule.js.map