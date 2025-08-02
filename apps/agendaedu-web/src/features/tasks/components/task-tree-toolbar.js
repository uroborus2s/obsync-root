import { TaskStatus } from '@/types/task.types';
import { Filter, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
// 状态选项
const statusOptions = [
    {
        value: TaskStatus.PENDING,
        label: '等待中',
        color: 'bg-yellow-100 text-yellow-800',
    },
    {
        value: TaskStatus.RUNNING,
        label: '运行中',
        color: 'bg-blue-100 text-blue-800',
    },
    {
        value: TaskStatus.PAUSED,
        label: '已暂停',
        color: 'bg-orange-100 text-orange-800',
    },
    {
        value: TaskStatus.SUCCESS,
        label: '成功',
        color: 'bg-green-100 text-green-800',
    },
    { value: TaskStatus.FAILED, label: '失败', color: 'bg-red-100 text-red-800' },
    {
        value: TaskStatus.CANCELLED,
        label: '已取消',
        color: 'bg-gray-100 text-gray-800',
    },
    {
        value: TaskStatus.SUCCESS,
        label: '已完成',
        color: 'bg-green-100 text-green-800',
    },
];
export function TaskTreeToolbar({ searchValue, onSearchChange, selectedStatuses, onStatusChange, selectedTaskTypes, onTaskTypeChange, availableTaskTypes, onExpandAll, onCollapseAll, totalTasks, visibleTasks, }) {
    const handleStatusToggle = (status) => {
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter((s) => s !== status)
            : [...selectedStatuses, status];
        onStatusChange(newStatuses);
    };
    const handleTaskTypeToggle = (taskType) => {
        const newTypes = selectedTaskTypes.includes(taskType)
            ? selectedTaskTypes.filter((t) => t !== taskType)
            : [...selectedTaskTypes, taskType];
        onTaskTypeChange(newTypes);
    };
    const clearAllFilters = () => {
        onSearchChange('');
        onStatusChange([]);
        onTaskTypeChange([]);
    };
    const hasActiveFilters = searchValue || selectedStatuses.length > 0 || selectedTaskTypes.length > 0;
    return (<div className='flex flex-col space-y-4 border-b p-4'>
      {/* 搜索和展开控制 */}
      <div className='flex items-center justify-between space-x-4'>
        <div className='flex flex-1 items-center space-x-2'>
          {/* 搜索框 */}
          <div className='relative max-w-sm flex-1'>
            <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4'/>
            <Input placeholder='搜索任务名称、描述或类型...' value={searchValue} onChange={(e) => onSearchChange(e.target.value)} className='pl-8'/>
          </div>

          {/* 状态过滤器 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='h-8'>
                <Filter className='mr-2 h-4 w-4'/>
                状态
                {selectedStatuses.length > 0 && (<Badge variant='secondary' className='ml-2 h-5 w-5 rounded-full p-0 text-xs'>
                    {selectedStatuses.length}
                  </Badge>)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-48'>
              <DropdownMenuLabel>任务状态</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusOptions.map((option) => (<DropdownMenuCheckboxItem key={option.value} checked={selectedStatuses.includes(option.value)} onCheckedChange={() => handleStatusToggle(option.value)}>
                  <div className='flex items-center space-x-2'>
                    <div className={`h-2 w-2 rounded-full ${option.color.split(' ')[0]}`}/>
                    <span>{option.label}</span>
                  </div>
                </DropdownMenuCheckboxItem>))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 任务类型过滤器 */}
          {availableTaskTypes.length > 0 && (<DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='h-8'>
                  <Filter className='mr-2 h-4 w-4'/>
                  类型
                  {selectedTaskTypes.length > 0 && (<Badge variant='secondary' className='ml-2 h-5 w-5 rounded-full p-0 text-xs'>
                      {selectedTaskTypes.length}
                    </Badge>)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-48'>
                <DropdownMenuLabel>任务类型</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTaskTypes.map((taskType) => (<DropdownMenuCheckboxItem key={taskType} checked={selectedTaskTypes.includes(taskType)} onCheckedChange={() => handleTaskTypeToggle(taskType)}>
                    {taskType}
                  </DropdownMenuCheckboxItem>))}
              </DropdownMenuContent>
            </DropdownMenu>)}

          {/* 清除所有过滤器 */}
          {hasActiveFilters && (<Button variant='ghost' size='sm' onClick={clearAllFilters} className='h-8'>
              <X className='mr-2 h-4 w-4'/>
              清除过滤
            </Button>)}
        </div>

        {/* 展开/收缩控制 */}
        <div className='flex items-center space-x-2'>
          <Button variant='outline' size='sm' onClick={onExpandAll} className='h-8'>
            展开全部
          </Button>
          <Button variant='outline' size='sm' onClick={onCollapseAll} className='h-8'>
            收缩全部
          </Button>
        </div>
      </div>

      {/* 已选择的过滤器标签 */}
      {hasActiveFilters && (<div className='flex flex-wrap items-center gap-2'>
          <span className='text-muted-foreground text-sm'>已应用过滤器:</span>

          {/* 搜索关键词 */}
          {searchValue && (<Badge variant='secondary' className='text-xs'>
              搜索: {searchValue}
              <button onClick={() => onSearchChange('')} className='hover:bg-muted ml-1 rounded-full' title='移除搜索过滤' aria-label='移除搜索过滤'>
                <X className='h-3 w-3'/>
              </button>
            </Badge>)}

          {/* 选中的状态 */}
          {selectedStatuses.map((status) => {
                const option = statusOptions.find((opt) => opt.value === status);
                return option ? (<Badge key={status} variant='secondary' className='text-xs'>
                {option.label}
                <button onClick={() => handleStatusToggle(status)} className='hover:bg-muted ml-1 rounded-full' title='移除状态过滤' aria-label='移除状态过滤'>
                  <X className='h-3 w-3'/>
                </button>
              </Badge>) : null;
            })}

          {/* 选中的任务类型 */}
          {selectedTaskTypes.map((taskType) => (<Badge key={taskType} variant='secondary' className='text-xs'>
              类型: {taskType}
              <button onClick={() => handleTaskTypeToggle(taskType)} className='hover:bg-muted ml-1 rounded-full' title='移除类型过滤' aria-label='移除类型过滤'>
                <X className='h-3 w-3'/>
              </button>
            </Badge>))}
        </div>)}

      {/* 统计信息 */}
      <div className='text-muted-foreground flex items-center justify-between text-sm'>
        <span>
          显示 {visibleTasks} / {totalTasks} 个任务
          {hasActiveFilters && ` (已过滤)`}
        </span>
      </div>
    </div>);
}
//# sourceMappingURL=task-tree-toolbar.js.map