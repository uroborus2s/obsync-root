import { formatDistanceToNow } from 'date-fns';
import { TaskStatus } from '@/types/task.types';
import { zhCN } from 'date-fns/locale';
import { AlertTriangleIcon, CheckCircleIcon, ChevronRightIcon, ClockIcon, PauseIcon, PlayIcon, XCircleIcon, } from 'lucide-react';
import { taskStatusColors, taskStatusLabels } from '@/lib/task-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { DataTableColumnHeader } from './data-table-column-header';
import { TaskRowActions } from './task-row-actions';
// 状态图标映射
const statusIcons = {
    [TaskStatus.PENDING]: ClockIcon,
    [TaskStatus.RUNNING]: PlayIcon,
    [TaskStatus.PAUSED]: PauseIcon,
    [TaskStatus.SUCCESS]: CheckCircleIcon,
    [TaskStatus.FAILED]: XCircleIcon,
    [TaskStatus.CANCELLED]: XCircleIcon,
    [TaskStatus.TIMEOUT]: AlertTriangleIcon,
};
export const taskColumns = [
    {
        id: 'select',
        header: ({ table }) => (<Checkbox checked={table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label='选择全部' className='translate-y-[2px]'/>),
        cell: ({ row }) => (<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label='选择行' className='translate-y-[2px]'/>),
        enableSorting: false,
        enableHiding: false,
    },
    {
        id: 'expand',
        header: '',
        cell: ({ row }) => {
            const hasChildren = row.original.children && row.original.children.length > 0;
            if (!hasChildren) {
                return <div className='w-4'/>;
            }
            return (<Button variant='ghost' size='sm' className='h-4 w-4 p-0' onClick={() => row.toggleExpanded()}>
          <ChevronRightIcon className={`h-4 w-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`}/>
        </Button>);
        },
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'name',
        header: ({ column }) => (<DataTableColumnHeader column={column} title='任务名称'/>),
        cell: ({ row }) => {
            const depth = row.depth || 0;
            return (<div className='flex items-center space-x-2'>
          <div style={{ marginLeft: `${depth * 20}px` }} className='flex items-center space-x-2'>
            {row.original.task_type && (<Badge variant='outline' className='text-xs'>
                {row.original.task_type}
              </Badge>)}
            <span className='max-w-32 truncate font-medium sm:max-w-72 md:max-w-[31rem]'>
              {row.getValue('name')}
            </span>
          </div>
        </div>);
        },
    },
    {
        accessorKey: 'status',
        header: ({ column }) => (<DataTableColumnHeader column={column} title='状态'/>),
        cell: ({ row }) => {
            const status = row.getValue('status');
            const StatusIcon = statusIcons[status];
            return (<div className='flex w-[100px] items-center'>
          <Badge className={`${taskStatusColors[status]} border-0`}>
            {StatusIcon && <StatusIcon className='mr-1 h-3 w-3'/>}
            {taskStatusLabels[status]}
          </Badge>
        </div>);
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: 'progress',
        header: ({ column }) => (<DataTableColumnHeader column={column} title='进度'/>),
        cell: ({ row }) => {
            const progress = row.getValue('progress');
            return (<div className='flex w-[120px] items-center space-x-2'>
          <Progress value={progress} className='h-2 flex-1'/>
          <span className='text-muted-foreground min-w-[3rem] text-xs'>
            {progress.toFixed(0)}%
          </span>
        </div>);
        },
    },
    {
        accessorKey: 'priority',
        header: ({ column }) => (<DataTableColumnHeader column={column} title='优先级'/>),
        cell: ({ row }) => {
            const priority = row.getValue('priority');
            let variant = 'default';
            let label = '普通';
            if (priority >= 8) {
                variant = 'destructive';
                label = '紧急';
            }
            else if (priority >= 5) {
                variant = 'default';
                label = '高';
            }
            else if (priority >= 2) {
                variant = 'secondary';
                label = '普通';
            }
            else {
                variant = 'secondary';
                label = '低';
            }
            return (<Badge variant={variant} className='text-xs'>
          {label}
        </Badge>);
        },
    },
    {
        accessorKey: 'executor_name',
        header: ({ column }) => (<DataTableColumnHeader column={column} title='执行器'/>),
        cell: ({ row }) => {
            const executorName = row.getValue('executor_name');
            return (<div className='text-muted-foreground text-sm'>
          {executorName || '-'}
        </div>);
        },
    },
    {
        accessorKey: 'created_at',
        header: ({ column }) => (<DataTableColumnHeader column={column} title='创建时间'/>),
        cell: ({ row }) => {
            const createdAt = new Date(row.getValue('created_at'));
            return (<div className='text-muted-foreground text-sm'>
          {formatDistanceToNow(createdAt, {
                    addSuffix: true,
                    locale: zhCN,
                })}
        </div>);
        },
    },
    {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => <TaskRowActions row={row}/>,
        enableSorting: false,
        enableHiding: false,
    },
];
//# sourceMappingURL=task-columns.js.map