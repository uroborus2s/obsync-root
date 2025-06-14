/**
 * 任务管理主页面组件
 */

import { Plus, RefreshCw, Search, Table, TreePine } from 'lucide-react';
import React from 'react';
import { useTaskControl, useTasks } from '../hooks/useTasks';
import type {
  CreateTaskRequest,
  QueryTasksParams,
  Task,
  TaskTreeNode,
  UpdateTaskRequest
} from '../types/task';
import { TaskFormDialog } from './TaskFormDialog';
import { TaskTable } from './TaskTable';
import { TaskTreeView } from './TaskTreeView';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';

export function TaskManagement() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | undefined>();
  const [viewMode, setViewMode] = React.useState<'table' | 'tree'>('table');

  // 构建查询参数
  const queryParams: QueryTasksParams = React.useMemo(() => {
    const params: QueryTasksParams = {};

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (typeFilter !== 'all') {
      params.type = typeFilter as 'directory' | 'leaf';
    }

    return params;
  }, [statusFilter, typeFilter]);

  const { tasks, loading, error, refetch, createTask, updateTask, deleteTask } =
    useTasks(queryParams);
  const {
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    loading: controlLoading
  } = useTaskControl();

  // 过滤任务（基于搜索查询）
  const filteredTasks = React.useMemo(() => {
    if (!searchQuery.trim()) return tasks;

    return tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tasks, searchQuery]);

  const handleCreateTask = async (data: CreateTaskRequest) => {
    try {
      await createTask(data);
      setFormDialogOpen(false);
    } catch (error) {
      console.error('创建任务失败:', error);
    }
  };

  const handleUpdateTask = async (data: UpdateTaskRequest) => {
    if (!editingTask) return;

    try {
      await updateTask(editingTask.id, data);
      setEditingTask(undefined);
      setFormDialogOpen(false);
    } catch (error) {
      console.error('更新任务失败:', error);
    }
  };

  const handleEditTask = (task: Task | TaskTreeNode) => {
    setEditingTask(task);
    setFormDialogOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('确定要删除这个任务吗？')) {
      try {
        await deleteTask(id);
      } catch (error) {
        console.error('删除任务失败:', error);
      }
    }
  };

  const handleTaskControl = async (
    action: 'start' | 'pause' | 'resume' | 'stop',
    id: string
  ) => {
    try {
      switch (action) {
        case 'start':
          await startTask(id);
          break;
        case 'pause':
          await pauseTask(id);
          break;
        case 'resume':
          await resumeTask(id);
          break;
        case 'stop':
          await stopTask(id);
          break;
      }
      await refetch();
    } catch (error) {
      console.error(`${action} 任务失败:`, error);
    }
  };

  return (
    <div className='space-y-6'>
      {/* 页面标题 */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>任务管理</h1>
        <p className='text-muted-foreground'>管理和监控你的任务执行状态</p>
      </div>

      {/* 操作工具栏 */}
      <Card>
        <CardHeader>
          <CardTitle>任务操作</CardTitle>
          <CardDescription>创建新任务或筛选现有任务</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center'>
              {/* 搜索框 */}
              <div className='relative'>
                <Search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
                <Input
                  placeholder='搜索任务...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-64 pl-8'
                />
              </div>

              {/* 状态筛选 */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='筛选状态' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部状态</SelectItem>
                  <SelectItem value='pending'>待处理</SelectItem>
                  <SelectItem value='running'>运行中</SelectItem>
                  <SelectItem value='paused'>已暂停</SelectItem>
                  <SelectItem value='completed'>已完成</SelectItem>
                  <SelectItem value='failed'>失败</SelectItem>
                  <SelectItem value='cancelled'>已取消</SelectItem>
                </SelectContent>
              </Select>

              {/* 类型筛选 */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='筛选类型' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部类型</SelectItem>
                  <SelectItem value='directory'>目录</SelectItem>
                  <SelectItem value='leaf'>叶子</SelectItem>
                </SelectContent>
              </Select>

              {/* 视图模式切换 */}
              <div className='flex rounded-md border'>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setViewMode('table')}
                  className='rounded-r-none border-r-0'
                >
                  <Table className='mr-1 h-4 w-4' />
                  表格
                </Button>
                <Button
                  variant={viewMode === 'tree' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setViewMode('tree')}
                  className='rounded-l-none'
                >
                  <TreePine className='mr-1 h-4 w-4' />
                  树状
                </Button>
              </div>
            </div>

            <div className='flex gap-2'>
              {/* 刷新按钮 */}
              <Button
                variant='outline'
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                刷新
              </Button>

              {/* 创建任务按钮 */}
              <Button onClick={() => setFormDialogOpen(true)}>
                <Plus className='mr-2 h-4 w-4' />
                创建任务
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card className='border-destructive'>
          <CardContent className='pt-6'>
            <p className='text-destructive'>{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 任务展示区域 */}
      {viewMode === 'table' ? (
        <Card>
          <CardHeader>
            <CardTitle>任务列表</CardTitle>
            <CardDescription>共 {filteredTasks.length} 个任务</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskTable
              data={filteredTasks}
              loading={loading || controlLoading}
              onStart={(id) => handleTaskControl('start', id)}
              onPause={(id) => handleTaskControl('pause', id)}
              onResume={(id) => handleTaskControl('resume', id)}
              onStop={(id) => handleTaskControl('stop', id)}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          </CardContent>
        </Card>
      ) : (
        <TaskTreeView onEdit={handleEditTask} onDelete={handleDeleteTask} />
      )}

      {/* 任务表单对话框 */}
      <TaskFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) {
            setEditingTask(undefined);
          }
        }}
        task={editingTask}
        onSubmit={async (data) => {
          if (editingTask) {
            await handleUpdateTask(data as UpdateTaskRequest);
          } else {
            await handleCreateTask(data as CreateTaskRequest);
          }
        }}
        loading={loading}
      />
    </div>
  );
}
