/**
 * 任务树视图组件
 */

import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import React from 'react';
import { useTaskControl, useTaskTree } from '../hooks/useTasks';
import type { TaskTreeNode } from '../types/task';
import { TaskActions } from './TaskActions';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface TaskTreeItemProps {
  node: TaskTreeNode;
  level?: number;
  onEdit?: (task: TaskTreeNode) => void;
  onDelete?: (
    id: string,
    options?: { cascade?: boolean; force?: boolean }
  ) => void;
  onTaskControl?: (
    action: 'start' | 'pause' | 'resume' | 'stop',
    id: string
  ) => void;
  disabled?: boolean;
}

function TaskTreeItem({
  node,
  level = 0,
  onEdit,
  onDelete,
  onTaskControl,
  disabled = false
}: TaskTreeItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const paddingLeft = level * 24;

  return (
    <div>
      {/* 当前节点 */}
      <div
        className='flex items-center justify-between border-b p-3 hover:bg-gray-50'
        style={{ paddingLeft: `${paddingLeft + 12}px` }}
      >
        <div className='flex flex-1 items-center gap-2'>
          {/* 展开/收起按钮 */}
          {node.type === 'directory' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className='rounded p-1 hover:bg-gray-200'
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )
              ) : (
                <div className='h-4 w-4' />
              )}
            </button>
          )}

          {/* 文件/文件夹图标 */}
          {node.type === 'directory' ? (
            <Folder className='h-4 w-4 text-blue-500' />
          ) : (
            <File className='h-4 w-4 text-gray-500' />
          )}

          {/* 任务名称和描述 */}
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span className='truncate font-medium'>{node.name}</span>
              <TaskStatusBadge status={node.status} />
            </div>
            {node.description && (
              <p className='mt-1 truncate text-sm text-gray-600'>
                {node.description}
              </p>
            )}
          </div>

          {/* 时间信息 */}
          <div className='mr-4 text-xs text-gray-500'>
            {new Date(node.createdAt).toLocaleDateString('zh-CN')}
          </div>

          {/* 操作按钮 */}
          <TaskActions
            task={node}
            onStart={(id) => onTaskControl?.('start', id)}
            onPause={(id) => onTaskControl?.('pause', id)}
            onResume={(id) => onTaskControl?.('resume', id)}
            onStop={(id) => onTaskControl?.('stop', id)}
            onEdit={onEdit ? (task) => onEdit(task as TaskTreeNode) : undefined}
            onDelete={onDelete}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 子节点 */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TaskTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onTaskControl={onTaskControl}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskTreeViewProps {
  rootId?: string;
  onEdit?: (task: TaskTreeNode) => void;
  onDelete?: (
    id: string,
    options?: { cascade?: boolean; force?: boolean }
  ) => void;
}

export function TaskTreeView({ rootId, onEdit, onDelete }: TaskTreeViewProps) {
  const { tree, loading, error, refetch } = useTaskTree(rootId);
  const {
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    loading: controlLoading
  } = useTaskControl();

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

  if (loading) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='animate-pulse space-y-4'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='h-12 rounded bg-gray-200' />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='border-destructive'>
        <CardContent className='pt-6'>
          <p className='text-destructive'>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>任务树视图</CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        {tree.length > 0 ? (
          <div>
            {tree.map((node) => (
              <TaskTreeItem
                key={node.id}
                node={node}
                onEdit={onEdit}
                onDelete={onDelete}
                onTaskControl={handleTaskControl}
                disabled={loading || controlLoading}
              />
            ))}
          </div>
        ) : (
          <div className='p-8 text-center'>
            <p className='text-muted-foreground'>暂无任务数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
