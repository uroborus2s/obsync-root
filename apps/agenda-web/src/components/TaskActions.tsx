/**
 * 任务操作按钮组件
 */

import { Edit, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react';
import type { Task, TaskOperationOptions } from '../types/task';
import { Button } from './ui/button';

interface TaskActionsProps {
  task: Task;
  onStart?: (id: string, options?: TaskOperationOptions) => void;
  onPause?: (id: string, options?: TaskOperationOptions) => void;
  onResume?: (id: string, options?: TaskOperationOptions) => void;
  onStop?: (id: string, options?: TaskOperationOptions) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (
    id: string,
    options?: { cascade?: boolean; force?: boolean }
  ) => void;
  disabled?: boolean;
}

export function TaskActions({
  task,
  onStart,
  onPause,
  onResume,
  onStop,
  onEdit,
  onDelete,
  disabled = false
}: TaskActionsProps) {
  const canStart =
    task.status === 'pending' ||
    task.status === 'failed' ||
    task.status === 'stopped';
  const canPause = task.status === 'running';
  const canResume = task.status === 'paused';
  const canStop = task.status === 'running' || task.status === 'paused';

  return (
    <div className='flex items-center gap-1'>
      {/* 启动按钮 */}
      {canStart && onStart && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onStart(task.id)}
          disabled={disabled}
          title='启动任务'
        >
          <Play className='h-4 w-4' />
        </Button>
      )}

      {/* 暂停按钮 */}
      {canPause && onPause && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPause(task.id)}
          disabled={disabled}
          title='暂停任务'
        >
          <Pause className='h-4 w-4' />
        </Button>
      )}

      {/* 恢复按钮 */}
      {canResume && onResume && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onResume(task.id)}
          disabled={disabled}
          title='恢复任务'
        >
          <RotateCcw className='h-4 w-4' />
        </Button>
      )}

      {/* 停止按钮 */}
      {canStop && onStop && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onStop(task.id)}
          disabled={disabled}
          title='停止任务'
        >
          <Square className='h-4 w-4' />
        </Button>
      )}

      {/* 编辑按钮 */}
      {onEdit && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onEdit(task)}
          disabled={disabled}
          title='编辑任务'
        >
          <Edit className='h-4 w-4' />
        </Button>
      )}

      {/* 删除按钮 */}
      {onDelete && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onDelete(task.id)}
          disabled={disabled}
          title='删除任务'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}
