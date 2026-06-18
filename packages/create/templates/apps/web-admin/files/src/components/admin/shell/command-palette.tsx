import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@tanstack/react-router';

import { NavIcon } from '@/components/admin/shell/nav-icon';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from '@/components/ui/command';
import {
  filterCommandItems,
  flattenNavigationItems,
  navigationSections
} from '@/app/config/navigation';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const items = useMemo(() => flattenNavigationItems(navigationSections), []);
  const filteredItems = useMemo(
    () => filterCommandItems(items, query),
    [items, query]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }

      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const handleSelect = (to: string) => {
    onOpenChange(false);
    router.history.push(to);
  };

  const groupedItems = navigationSections
    .map((section) => ({
      title: section.title,
      items: filteredItems.filter((item) => item.section === section.title)
    }))
    .filter((section) => section.items.length > 0);

  return (
    <CommandDialog
      description='搜索后台页面、模块入口与常用工作流。'
      onOpenChange={onOpenChange}
      open={open}
      title='全局搜索'
    >
      <CommandInput
        onValueChange={setQuery}
        placeholder='搜索页面、模块和功能...'
        value={query}
      />
      <CommandList className='max-h-[60vh]'>
        <CommandEmpty>试试搜索“用户”、“报表”或“设置”。</CommandEmpty>
        {groupedItems.map((section) => (
          <CommandGroup heading={section.title} key={section.title}>
            {section.items.map((item) => (
              <CommandItem
                key={item.to}
                onSelect={() => handleSelect(item.to)}
                value={`${item.title} ${item.description} ${item.searchText}`}
              >
                <NavIcon
                  className='text-muted-foreground size-4'
                  icon={item.icon}
                />
                <div className='flex min-w-0 flex-1 flex-col'>
                  <span className='truncate font-medium'>{item.title}</span>
                  <span className='text-muted-foreground truncate text-xs'>
                    {item.parentTitle
                      ? `${item.parentTitle} · ${item.description}`
                      : item.description}
                  </span>
                </div>
                <CommandShortcut>
                  {item.badge ?? item.parentTitle ?? item.section}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
