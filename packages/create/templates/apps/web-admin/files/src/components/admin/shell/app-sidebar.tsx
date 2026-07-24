import { Link, useLocation } from '@tanstack/react-router';

import { SidebarNav } from '@/components/admin/navigation/sidebar-nav';
import { AppLogo } from '@/components/admin/shell/app-logo';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const pathname = useLocation({
    select: (location) => location.pathname
  });

  return (
    <Sidebar
      className='bg-sidebar/95'
      collapsible='icon'
      variant='sidebar'
    >
      <SidebarHeader className='h-16 justify-center border-b border-sidebar-border/70 px-3 py-0'>
        <Link
          className='rounded-2xl px-2.5 py-2 transition-colors hover:bg-sidebar-accent/70'
          to='/'
        >
          <AppLogo />
        </Link>
      </SidebarHeader>
      <SidebarContent className='gap-0 px-2.5 py-4'>
        <SidebarNav pathname={pathname} />
      </SidebarContent>
      <SidebarRail className='after:bg-transparent hover:after:bg-sidebar-border/80' />
    </Sidebar>
  );
}
