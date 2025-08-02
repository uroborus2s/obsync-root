import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_authenticated/students')({
    component: Students,
});
function Students() {
    return (<div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <h2 className='text-3xl font-bold tracking-tight'>学生管理</h2>
      <p className='text-muted-foreground'>学生信息管理功能</p>
    </div>);
}
//# sourceMappingURL=students.js.map