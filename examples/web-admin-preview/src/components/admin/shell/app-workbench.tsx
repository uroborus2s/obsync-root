import * as React from 'react';
import { MessageSquareText } from 'lucide-react';

import { AssistantPanel } from '@/components/admin/ai/assistant-panel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AppWorkbenchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useCompactWorkbench() {
  const [compact, setCompact] = React.useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth < 1280;
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const sync = () => setCompact(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener('change', sync);

    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  return compact;
}

export function AppWorkbench({ open, onOpenChange }: AppWorkbenchProps) {
  const compact = useCompactWorkbench();

  if (compact) {
    return (
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent
          className='w-full max-w-[24rem] p-0 sm:max-w-[26rem]'
          side='right'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>AI Copilot</SheetTitle>
            <SheetDescription>
              Assistant workbench for searching, drafting and admin guidance.
            </SheetDescription>
          </SheetHeader>
          <AssistantPanel onClose={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'bg-background/95 relative hidden min-h-0 shrink-0 overflow-hidden border-l transition-[width,border-color] duration-300 xl:block',
        open ? 'border-border/70 w-[26rem]' : 'w-0 border-transparent'
      )}
    >
      <div
        className={cn(
          'flex h-full min-w-0 w-[26rem] flex-col transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <AssistantPanel onClose={() => onOpenChange(false)} />
      </div>

      {!open ? (
        <div className='from-background via-background/95 text-muted-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center bg-gradient-to-l to-transparent'>
          <MessageSquareText className='size-4' />
        </div>
      ) : null}
    </aside>
  );
}
