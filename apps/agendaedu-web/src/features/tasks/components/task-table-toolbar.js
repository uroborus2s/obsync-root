import { PlusIcon, RefreshCwIcon, SettingsIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';
import { TaskStatusFilter } from './task-status-filter';
export function TaskTableToolbar({ table, }) {
    const isFiltered = table.getState().columnFilters.length > 0;
    const handleOpenSettings = () => {
        // TODO: 实现打开任务设置功能
    };
    const handleCreateNewTask = () => {
        // TODO: 实现创建新任务功能
    };
    return (<div className='flex items-center justify-between'>
      <div className='flex flex-1 items-center space-x-2'>
        <Input placeholder='搜索任务名称...' value={table.getColumn('name')?.getFilterValue() ?? ''} onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)} className='h-8 w-[150px] lg:w-[250px]'/>

        <TaskStatusFilter table={table}/>

        {isFiltered && (<Button variant='ghost' onClick={() => table.resetColumnFilters()} className='h-8 px-2 lg:px-3'>
            重置
            <XIcon className='ml-2 h-4 w-4'/>
          </Button>)}
      </div>

      <div className='flex items-center space-x-2'>
        <Button variant='outline' size='sm' onClick={() => window.location.reload()} className='h-8'>
          <RefreshCwIcon className='mr-2 h-4 w-4'/>
          刷新
        </Button>

        <Button variant='outline' size='sm' onClick={handleOpenSettings} className='h-8'>
          <SettingsIcon className='mr-2 h-4 w-4'/>
          设置
        </Button>

        <Button size='sm' onClick={handleCreateNewTask} className='h-8'>
          <PlusIcon className='mr-2 h-4 w-4'/>
          新建任务
        </Button>

        <DataTableViewOptions table={table}/>
      </div>
    </div>);
}
//# sourceMappingURL=task-table-toolbar.js.map