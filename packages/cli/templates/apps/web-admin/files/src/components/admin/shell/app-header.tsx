import { Bot, Search } from 'lucide-react';

import { AdminBreadcrumbs } from '@/components/admin/navigation/admin-breadcrumbs';
import { ThemeToggle } from '@/components/admin/shell/theme-toggle';
import { UserPanel } from '@/components/admin/shell/user-panel';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { BreadcrumbEntry } from '@/app/config/navigation';

interface AppHeaderProps {
  breadcrumbItems: BreadcrumbEntry[];
  assistantOpen: boolean;
  onAssistantToggle: () => void;
  onCommandOpen: () => void;
}

export function AppHeader({
  breadcrumbItems,
  assistantOpen,
  onAssistantToggle,
  onCommandOpen
}: AppHeaderProps) {
  return (
    <header className='bg-background/95 sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/92'>
      <div className='flex h-16 items-center gap-3 border-b border-border/70 px-4 md:px-6'>
        <div className='flex items-center'>
          <SidebarTrigger
            aria-label='切换侧边栏'
            className='size-9 rounded-xl border border-border/70 bg-background text-foreground/75 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] hover:bg-accent/70 hover:text-foreground'
            size='icon'
            variant='outline'
          />
        </div>

        <div className='min-w-0 flex-1'>
          <AdminBreadcrumbs items={breadcrumbItems} />
        </div>

        <Button
          aria-label='打开全局搜索'
          className='size-9 rounded-xl border-border/70 bg-background text-muted-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] hover:bg-accent/70 hover:text-foreground'
          onClick={onCommandOpen}
          size='icon'
          variant='outline'
        >
          <Search className='size-4' />
          <span className='sr-only'>搜索页面与操作</span>
        </Button>

        <Button
          aria-label={assistantOpen ? '关闭 AI 助手工作台' : '打开 AI 助手工作台'}
          className={cn(
            'size-9 rounded-xl border-border/70 bg-background text-muted-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] hover:bg-accent/70 hover:text-foreground',
            assistantOpen &&
              'border-primary/15 bg-primary/10 text-primary hover:bg-primary/15'
          )}
          onClick={onAssistantToggle}
          size='icon'
          variant='outline'
        >
          <Bot className='size-4' />
          <span className='sr-only'>AI 助手</span>
        </Button>

        <ThemeToggle />
        <UserPanel />
      </div>
    </header>
  );
}
