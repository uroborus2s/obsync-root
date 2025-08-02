import { ColumnDef } from '@tanstack/react-table';
interface TaskDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
}
export declare function TaskDataTable<TData, TValue>({ columns, data, isLoading, }: TaskDataTableProps<TData, TValue>): import("react").JSX.Element;
export {};
//# sourceMappingURL=task-data-table.d.ts.map