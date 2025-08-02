import { TaskStatus } from '@/types/task.types';
import { EyeIcon, MoreHorizontalIcon, PauseIcon, PlayIcon, RotateCcwIcon, TrashIcon, XIcon, } from 'lucide-react';
import { taskApi } from '@/lib/task-api';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
export function TaskTreeRowActions({ row }) {
    const task = row.original;
    const handleAction = async (action) => {
        try {
            switch (action) {
                case 'pause':
                    await taskApi.pauseTask(task.id);
                    break;
                case 'resume':
                    await taskApi.resumeTask(task.id);
                    break;
                case 'cancel':
                    await taskApi.cancelTask(task.id);
                    break;
                case 'retry':
                    await taskApi.retryTask(task.id);
                    break;
                case 'delete':
                    await taskApi.deleteTask(task.id);
                    break;
                default:
                    break;
            }
            // 这里可以添加成功后的处理，比如刷新数据
        }
        catch (error) {
            // 处理错误
            // eslint-disable-next-line no-console
            console.error('任务操作失败:', error);
            // TODO: 添加用户友好的错误提示
        }
    };
    const handleViewDetails = (taskId) => {
        // TODO: 实现查看详情功能
        // 可以导航到详情页面或打开详情对话框
        // eslint-disable-next-line no-console
        console.log('查看任务详情:', taskId);
    };
    const canPause = task.status === TaskStatus.RUNNING;
    const canResume = task.status === TaskStatus.PAUSED;
    const canCancel = [
        TaskStatus.PENDING,
        TaskStatus.RUNNING,
        TaskStatus.PAUSED,
    ].includes(task.status);
    const canRetry = [TaskStatus.FAILED, TaskStatus.CANCELLED].includes(task.status);
    const canDelete = [
        TaskStatus.SUCCESS,
        TaskStatus.FAILED,
        TaskStatus.CANCELLED,
    ].includes(task.status);
    return (<DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='data-[state=open]:bg-muted flex h-8 w-8 p-0'>
          <MoreHorizontalIcon className='h-4 w-4'/>
          <span className='sr-only'>打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuLabel>操作</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => handleViewDetails(task.id)}>
          <EyeIcon className='mr-2 h-4 w-4'/>
          查看详情
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {canPause && (<DropdownMenuItem onClick={() => handleAction('pause')}>
            <PauseIcon className='mr-2 h-4 w-4'/>
            暂停任务
          </DropdownMenuItem>)}

        {canResume && (<DropdownMenuItem onClick={() => handleAction('resume')}>
            <PlayIcon className='mr-2 h-4 w-4'/>
            恢复任务
          </DropdownMenuItem>)}

        {canCancel && (<DropdownMenuItem onClick={() => handleAction('cancel')}>
            <XIcon className='mr-2 h-4 w-4'/>
            取消任务
          </DropdownMenuItem>)}

        {canRetry && (<DropdownMenuItem onClick={() => handleAction('retry')}>
            <RotateCcwIcon className='mr-2 h-4 w-4'/>
            重新执行
          </DropdownMenuItem>)}

        {canDelete && (<>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('delete')} className='text-red-600'>
              <TrashIcon className='mr-2 h-4 w-4'/>
              删除任务
            </DropdownMenuItem>
          </>)}
      </DropdownMenuContent>
    </DropdownMenu>);
}
//# sourceMappingURL=task-tree-row-actions.js.map