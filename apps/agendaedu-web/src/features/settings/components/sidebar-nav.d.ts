import { type JSX } from 'react';
interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: {
        href: string;
        title: string;
        icon: JSX.Element;
    }[];
}
export default function SidebarNav({ className, items, ...props }: SidebarNavProps): JSX.Element;
export {};
//# sourceMappingURL=sidebar-nav.d.ts.map