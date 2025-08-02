import { Root, Content, Trigger } from '@radix-ui/react-popover';
interface Props extends React.ComponentProps<typeof Root> {
    contentProps?: React.ComponentProps<typeof Content>;
    triggerProps?: React.ComponentProps<typeof Trigger>;
}
export declare function LearnMore({ children, contentProps, triggerProps, ...props }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=learn-more.d.ts.map