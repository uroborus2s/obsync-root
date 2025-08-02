import React from 'react';
import { TreeTaskResponse } from '@/lib/task-api';
export type TaskTreeTableData = TreeTaskResponse & {
    level: number;
    isExpanded: boolean;
    hasChildren: boolean;
    isLoading?: boolean;
};
type TaskTreeTableNewProps = {
    data: TaskTreeTableData[];
    className?: string;
    onToggleExpansion?: (taskId: string) => Promise<void>;
};
export declare function TaskTreeTableNew({ data, className, onToggleExpansion, }: TaskTreeTableNewProps): React.JSX.Element;
export {};
//# sourceMappingURL=task-tree-table-new.d.ts.map