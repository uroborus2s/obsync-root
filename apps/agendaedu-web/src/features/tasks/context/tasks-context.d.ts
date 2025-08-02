import React from 'react';
import { Task } from '../data/schema';
type TasksDialogType = 'create' | 'update' | 'delete' | 'import';
interface TasksContextType {
    open: TasksDialogType | null;
    setOpen: (str: TasksDialogType | null) => void;
    currentRow: Task | null;
    setCurrentRow: React.Dispatch<React.SetStateAction<Task | null>>;
}
interface Props {
    children: React.ReactNode;
}
export default function TasksProvider({ children }: Props): React.JSX.Element;
export declare const useTasks: () => TasksContextType;
export {};
//# sourceMappingURL=tasks-context.d.ts.map