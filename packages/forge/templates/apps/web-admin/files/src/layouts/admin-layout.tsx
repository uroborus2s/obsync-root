import * as React from 'react';
import { Outlet, useLocation } from '@tanstack/react-router';

import { AppHeader } from '@/components/admin/shell/app-header';
import { AppSidebar } from '@/components/admin/shell/app-sidebar';
import { AppWorkbench } from '@/components/admin/shell/app-workbench';
import { CommandPalette } from '@/components/admin/shell/command-palette';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { findNavigationTrail } from '@/app/config/navigation';
import {
  persistWorkbenchOpenPreference,
  readSidebarOpenPreference,
  readWorkbenchOpenPreference
} from '@/lib/layout';

export function AdminLayout() {
  const pathname = useLocation({
    select: (location) => location.pathname
  });
  const breadcrumbItems = React.useMemo(
    () => findNavigationTrail(pathname),
    [pathname]
  );
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [workbenchOpen, setWorkbenchOpen] = React.useState(() =>
    readWorkbenchOpenPreference()
  );

  React.useEffect(() => {
    persistWorkbenchOpenPreference(workbenchOpen);
  }, [workbenchOpen]);

  return (
    <SidebarProvider
      className='bg-muted/35'
      defaultOpen={readSidebarOpenPreference()}
      style={
        {
          '--sidebar-width': '17rem',
          '--sidebar-width-icon': '4rem'
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className='min-h-svh'>
        <div className='flex min-h-svh min-w-0 flex-col bg-background'>
          <AppHeader
            assistantOpen={workbenchOpen}
            breadcrumbItems={breadcrumbItems}
            onAssistantToggle={() => setWorkbenchOpen((open) => !open)}
            onCommandOpen={() => setCommandOpen(true)}
          />
          <div className='flex min-h-0 min-w-0 flex-1 overflow-hidden'>
            <main
              className='min-w-0 flex-1 overflow-x-hidden px-5 py-5 md:px-7 md:py-6'
              id='main-content'
            >
              <Outlet />
            </main>
            <AppWorkbench
              onOpenChange={setWorkbenchOpen}
              open={workbenchOpen}
            />
          </div>
        </div>

        <CommandPalette onOpenChange={setCommandOpen} open={commandOpen} />
      </SidebarInset>
    </SidebarProvider>
  );
}
