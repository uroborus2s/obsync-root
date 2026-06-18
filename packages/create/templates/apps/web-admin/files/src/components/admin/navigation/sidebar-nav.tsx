import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import {
  isNavigationLeaf,
  isNavigationNodeActive,
  navigationSections,
  type NavigationGroup,
  type NavigationLeaf
} from '@/app/config/navigation';
import { NavIcon } from '@/components/admin/shell/nav-icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';

interface SidebarNavProps {
  pathname: string;
}

export function SidebarNav({ pathname }: SidebarNavProps) {
  return (
    <>
      {navigationSections.map((section) => (
        <SidebarGroup className='py-1.5' key={section.title}>
          <SidebarGroupLabel className='px-3 pb-2 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/42 uppercase'>
            {section.title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className='gap-1.5'>
              {section.items.map((item) =>
                isNavigationLeaf(item) ? (
                  <SidebarLeafItem
                    item={item}
                    key={item.to}
                    pathname={pathname}
                  />
                ) : (
                  <SidebarGroupItem
                    group={item}
                    key={`${section.title}-${item.title}`}
                    pathname={pathname}
                  />
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function SidebarLeafItem({
  item,
  pathname
}: {
  item: NavigationLeaf;
  pathname: string;
}) {
  const isActive = isNavigationNodeActive(item, pathname);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className='h-10 rounded-xl px-3 text-[13px] font-medium text-sidebar-foreground/78 transition-all hover:bg-sidebar-accent/85 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-[0_10px_24px_-20px_hsl(var(--foreground)/0.6)]'
        isActive={isActive}
        tooltip={item.title}
      >
        <Link to={item.to}>
          <NavIcon className='size-4' icon={item.icon} />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarGroupItem({
  group,
  pathname
}: {
  group: NavigationGroup;
  pathname: string;
}) {
  const isActive = isNavigationNodeActive(group, pathname);
  const [open, setOpen] = React.useState(group.defaultExpanded || isActive);

  React.useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [isActive]);

  return (
    <Collapsible
      className='group/collapsible'
      onOpenChange={setOpen}
      open={open}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className='h-10 rounded-xl px-3 text-[13px] font-medium text-sidebar-foreground/78 transition-all hover:bg-sidebar-accent/85 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/95 data-[active=true]:text-sidebar-foreground'
            isActive={isActive}
            tooltip={group.title}
          >
            <NavIcon className='size-4' icon={group.icon} />
            <span>{group.title}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            className='right-2 top-2 size-6 rounded-lg text-sidebar-foreground/38 transition-transform hover:bg-sidebar-accent hover:text-sidebar-foreground data-[state=open]:rotate-90'
            showOnHover
          >
            <ChevronRight />
            <span className='sr-only'>Toggle {group.title}</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className='mx-4 mt-1 gap-1.5 border-l border-sidebar-border/75 px-3 py-1'>
            {group.children.map((item) => {
              const childActive = isNavigationNodeActive(item, pathname);

              return (
                <SidebarMenuSubItem key={item.to}>
                  <SidebarMenuSubButton
                    asChild
                    className='h-8 rounded-lg px-2.5 text-[13px] text-sidebar-foreground/72 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground'
                    isActive={childActive}
                    size='sm'
                  >
                    <Link to={item.to}>
                      <NavIcon className='size-3.5' icon={item.icon} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
