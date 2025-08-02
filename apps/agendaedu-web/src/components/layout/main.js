import React from 'react';
import { cn } from '@/lib/utils';
export const Main = ({ fixed, className, ...props }) => {
    return (<main className={cn('peer-[.header-fixed]/header:mt-16', 'px-4 py-6', fixed && 'fixed-main flex grow flex-col overflow-hidden', className)} {...props}/>);
};
Main.displayName = 'Main';
//# sourceMappingURL=main.js.map