interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
    links: {
        title: string;
        href: string;
        isActive: boolean;
        disabled?: boolean;
    }[];
}
export declare function TopNav({ className, links, ...props }: TopNavProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=top-nav.d.ts.map