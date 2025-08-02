import { IconQuestionMark } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
export function LearnMore({ children, contentProps, triggerProps, ...props }) {
    return (<Popover {...props}>
      <PopoverTrigger asChild {...triggerProps} className={cn('size-5 rounded-full', triggerProps?.className)}>
        <Button variant='outline' size='icon'>
          <span className='sr-only'>Learn more</span>
          <IconQuestionMark className='size-3'/>
        </Button>
      </PopoverTrigger>
      <PopoverContent side='top' align='start' {...contentProps} className={cn('text-muted-foreground text-sm', contentProps?.className)}>
        {children}
      </PopoverContent>
    </Popover>);
}
//# sourceMappingURL=learn-more.js.map