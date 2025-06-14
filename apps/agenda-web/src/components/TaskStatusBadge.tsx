/**
 * 任务状态徽章组件
 */

import type { TaskStatus } from '../types/task';
import { Badge } from './ui/badge';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<
  TaskStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }
> = {
  pending: { variant: 'outline', text: '待处理' },
  running: { variant: 'default', text: '运行中' },
  paused: { variant: 'secondary', text: '已暂停' },
  completed: { variant: 'default', text: '已完成' },
  failed: { variant: 'destructive', text: '失败' },
  stopped: { variant: 'destructive', text: '已停止' }
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.text}</Badge>;
}
