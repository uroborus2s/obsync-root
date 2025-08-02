import { TaskStatus } from '@/types/task.types';
export interface TaskTreeToolbarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    selectedStatuses: TaskStatus[];
    onStatusChange: (statuses: TaskStatus[]) => void;
    selectedTaskTypes: string[];
    onTaskTypeChange: (types: string[]) => void;
    availableTaskTypes: string[];
    onExpandAll: () => void;
    onCollapseAll: () => void;
    totalTasks: number;
    visibleTasks: number;
}
export declare function TaskTreeToolbar({ searchValue, onSearchChange, selectedStatuses, onStatusChange, selectedTaskTypes, onTaskTypeChange, availableTaskTypes, onExpandAll, onCollapseAll, totalTasks, visibleTasks, }: TaskTreeToolbarProps): import("react").JSX.Element;
//# sourceMappingURL=task-tree-toolbar.d.ts.map