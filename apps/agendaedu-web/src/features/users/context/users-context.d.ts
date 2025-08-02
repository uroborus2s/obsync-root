import React from 'react';
import { User } from '../data/schema';
type UsersDialogType = 'invite' | 'add' | 'edit' | 'delete';
interface UsersContextType {
    open: UsersDialogType | null;
    setOpen: (str: UsersDialogType | null) => void;
    currentRow: User | null;
    setCurrentRow: React.Dispatch<React.SetStateAction<User | null>>;
}
interface Props {
    children: React.ReactNode;
}
export default function UsersProvider({ children }: Props): React.JSX.Element;
export declare const useUsers: () => UsersContextType;
export {};
//# sourceMappingURL=users-context.d.ts.map