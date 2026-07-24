import * as React from 'react';
import { Link } from '@tanstack/react-router';

import type { BreadcrumbEntry } from '@/app/config/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

interface AdminBreadcrumbsProps {
  items: BreadcrumbEntry[];
}

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  return (
    <Breadcrumb className='overflow-hidden'>
      <BreadcrumbList className='flex-nowrap gap-2 text-[15px] font-medium'>
        <BreadcrumbItem>
          <BreadcrumbLink asChild className='truncate text-muted-foreground'>
            <Link to='/'>控制台</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={`${item.title}-${index}`}>
              <BreadcrumbSeparator className='text-muted-foreground/55 [&>svg]:size-3.5' />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className='truncate font-semibold text-foreground'>
                    {item.title}
                  </BreadcrumbPage>
                ) : item.to ? (
                  <BreadcrumbLink asChild className='truncate text-muted-foreground'>
                    <Link to={item.to}>{item.title}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className='truncate text-muted-foreground'>{item.title}</span>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
