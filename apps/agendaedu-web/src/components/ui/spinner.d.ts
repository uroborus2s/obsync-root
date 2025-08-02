import { type VariantProps } from 'class-variance-authority';
declare const spinnerVariants: (props?: ({
    size?: "default" | "sm" | "lg" | "xl" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {
}
export declare function Spinner({ className, size, ...props }: SpinnerProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=spinner.d.ts.map