import { ColumnDef, RowData } from '@tanstack/react-table';
import { User } from '../data/schema';
declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        className: string;
    }
}
interface DataTableProps {
    columns: ColumnDef<User>[];
    data: User[];
}
export declare function UsersTable({ columns, data }: DataTableProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=users-table.d.ts.map