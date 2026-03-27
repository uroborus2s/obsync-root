import { describe, expect, it } from 'vitest';

import {
  filterCommandItems,
  findNavigationTrail,
  flattenNavigationItems,
  isNavigationNodeActive,
  navigationSections
} from '@/app/config/navigation';

describe('navigation helpers', () => {
  it('flattens nested sections into command items', () => {
    const items = flattenNavigationItems(navigationSections);

    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.some((item) => item.title === '仪表盘')).toBe(true);
    expect(items.some((item) => item.parentTitle === '权限与账号')).toBe(true);
  });

  it('matches command items by title, parent title and keywords', () => {
    const items = flattenNavigationItems(navigationSections);

    expect(filterCommandItems(items, '仪表盘')[0]?.title).toBe('仪表盘');
    expect(filterCommandItems(items, '角色')[0]?.title).toBe('角色权限');
    expect(filterCommandItems(items, '日志')[0]?.title).toBe('审计日志');
  });

  it('derives a breadcrumb trail for nested navigation', () => {
    expect(findNavigationTrail('/users').map((item) => item.title)).toEqual([
      '权限与账号',
      '用户管理'
    ]);
  });

  it('marks grouped nodes active when one of their children matches', () => {
    const operatorGroup = navigationSections[1]?.items[0];

    expect(operatorGroup).toBeDefined();
    expect(isNavigationNodeActive(operatorGroup!, '/users')).toBe(true);
    expect(isNavigationNodeActive(operatorGroup!, '/reports')).toBe(false);
  });
});
