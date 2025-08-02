import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const spinnerVariants = cva('inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]', {
    variants: {
        size: {
            sm: 'h-4 w-4 border-2',
            default: 'h-6 w-6 border-2',
            lg: 'h-8 w-8 border-[3px]',
            xl: 'h-12 w-12 border-4',
        },
    },
    defaultVariants: {
        size: 'default',
    },
});
export function Spinner({ className, size, ...props }) {
    return (<div className={cn(spinnerVariants({ size }), className)} role='status' aria-label='加载中' {...props}>
      <span className='sr-only'>加载中...</span>
    </div>);
}
//# sourceMappingURL=spinner.js.map