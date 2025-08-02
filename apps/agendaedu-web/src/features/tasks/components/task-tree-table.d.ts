import React from 'react';
import { CompletedTask, RunningTask } from '@/types/task.types';
import { TaskNode } from '@/lib/task-tree-utils';
type TaskTreeTableProps<T extends RunningTask | CompletedTask> = {
    data: TaskNode<T>[];
    className?: string;
};
export declare function TaskTreeTable<T extends RunningTask | CompletedTask>({ data, className, }: TaskTreeTableProps<T>): React.JSX.Element;
export {};
//# sourceMappingURL=task-tree-table.d.ts.map