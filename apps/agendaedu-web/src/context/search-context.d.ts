import React from 'react';
interface SearchContextType {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
interface Props {
    children: React.ReactNode;
}
export declare function SearchProvider({ children }: Props): React.JSX.Element;
export declare const useSearch: () => SearchContextType;
export {};
//# sourceMappingURL=search-context.d.ts.map