import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_authenticated/teachers')({
    component: Teachers,
});
function Teachers() {
    return (<div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <h2 className='text-3xl font-bold tracking-tight'>教师管理</h2>
      <p className='text-muted-foreground'>教师信息管理功能</p>
    </div>);
}
//# sourceMappingURL=teachers.js.map