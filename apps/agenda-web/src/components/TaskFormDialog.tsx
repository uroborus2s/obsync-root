/**
 * 任务表单对话框组件
 */

import React from 'react';
import type {
  CreateTaskRequest,
  Task,
  TaskType,
  UpdateTaskRequest
} from '../types/task';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task; // 如果提供了task，则为编辑模式，否则为创建模式
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  loading?: boolean;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
  loading = false
}: TaskFormDialogProps) {
  const isEdit = !!task;
  const [formData, setFormData] = React.useState({
    name: task?.name || '',
    description: task?.description || '',
    type: (task?.type || 'leaf') as TaskType,
    executorName: task?.executorConfig?.name || '',
    executorTimeout: task?.executorConfig?.timeout?.toString() || '',
    executorRetries: task?.executorConfig?.retries?.toString() || ''
  });

  React.useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        type: task.type,
        executorName: task.executorConfig?.name || '',
        executorTimeout: task.executorConfig?.timeout?.toString() || '',
        executorRetries: task.executorConfig?.retries?.toString() || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'leaf',
        executorName: '',
        executorTimeout: '',
        executorRetries: ''
      });
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const baseData = {
      name: formData.name,
      description: formData.description || undefined
    };

    if (isEdit) {
      const updateData: UpdateTaskRequest = {
        ...baseData,
        executorConfig: formData.executorName
          ? {
              name: formData.executorName,
              timeout: formData.executorTimeout
                ? parseInt(formData.executorTimeout, 10)
                : undefined,
              retries: formData.executorRetries
                ? parseInt(formData.executorRetries, 10)
                : undefined
            }
          : undefined
      };
      await onSubmit(updateData);
    } else {
      const createData: CreateTaskRequest = {
        ...baseData,
        type: formData.type,
        executorConfig: formData.executorName
          ? {
              name: formData.executorName,
              timeout: formData.executorTimeout
                ? parseInt(formData.executorTimeout, 10)
                : undefined,
              retries: formData.executorRetries
                ? parseInt(formData.executorRetries, 10)
                : undefined
            }
          : undefined
      };
      await onSubmit(createData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑任务' : '创建任务'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改任务信息' : '填写任务信息以创建新任务'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <label htmlFor='name' className='text-sm font-medium'>
              任务名称 *
            </label>
            <Input
              id='name'
              placeholder='请输入任务名称'
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className='space-y-2'>
            <label htmlFor='description' className='text-sm font-medium'>
              任务描述
            </label>
            <Input
              id='description'
              placeholder='请输入任务描述'
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
            />
          </div>

          {!isEdit && (
            <div className='space-y-2'>
              <label htmlFor='type' className='text-sm font-medium'>
                任务类型 *
              </label>
              <Select
                value={formData.type}
                onValueChange={(value: TaskType) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择任务类型' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='directory'>目录任务</SelectItem>
                  <SelectItem value='leaf'>叶子任务</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className='space-y-2'>
            <label htmlFor='executorName' className='text-sm font-medium'>
              执行器名称
            </label>
            <Input
              id='executorName'
              placeholder='请输入执行器名称'
              value={formData.executorName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  executorName: e.target.value
                }))
              }
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label htmlFor='executorTimeout' className='text-sm font-medium'>
                超时时间(秒)
              </label>
              <Input
                id='executorTimeout'
                type='number'
                placeholder='超时时间'
                value={formData.executorTimeout}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    executorTimeout: e.target.value
                  }))
                }
              />
            </div>

            <div className='space-y-2'>
              <label htmlFor='executorRetries' className='text-sm font-medium'>
                重试次数
              </label>
              <Input
                id='executorRetries'
                type='number'
                placeholder='重试次数'
                value={formData.executorRetries}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    executorRetries: e.target.value
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type='submit' disabled={loading || !formData.name.trim()}>
              {loading ? '提交中...' : isEdit ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
