export type NavigationIcon =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'reports'
  | 'logs'
  | 'settings'
  | 'shield'
  | 'sparkles'
  | 'workspace'
  | 'operations'
  | 'bot';

export interface NavigationLeaf {
  kind: 'item';
  title: string;
  to: string;
  description: string;
  icon: NavigationIcon;
  keywords?: string[];
  badge?: string;
}

export interface NavigationGroup {
  kind: 'group';
  title: string;
  description: string;
  icon: NavigationIcon;
  defaultExpanded?: boolean;
  keywords?: string[];
  children: NavigationLeaf[];
}

export type NavigationNode = NavigationLeaf | NavigationGroup;

export interface NavigationSection {
  title: string;
  items: NavigationNode[];
}

export interface BreadcrumbEntry {
  title: string;
  to?: string;
}

export interface CommandItem extends NavigationLeaf {
  section: string;
  parentTitle?: string;
  searchText: string;
}

export const navigationSections: NavigationSection[] = [
  {
    title: '概览',
    items: [
      {
        kind: 'item',
        title: '仪表盘',
        to: '/',
        description: '查看工作台概况、系统健康度和关键运营指标',
        icon: 'dashboard',
        keywords: ['仪表盘', '首页', '概览', 'dashboard', 'overview']
      }
    ]
  },
  {
    title: '系统管理',
    items: [
      {
        kind: 'group',
        title: '权限与账号',
        description: '账号、角色与权限等后台基础管理能力。',
        icon: 'workspace',
        defaultExpanded: true,
        keywords: ['用户', '角色', '权限', '账号', 'system'],
        children: [
          {
            kind: 'item',
            title: '用户管理',
            to: '/users',
            description: '管理后台用户、状态、邀请与成员信息',
            icon: 'users',
            keywords: ['用户', '成员', '账号', 'users', 'members']
          },
          {
            kind: 'item',
            title: '角色权限',
            to: '/roles',
            description: '配置角色分组、权限矩阵与菜单访问范围',
            icon: 'roles',
            keywords: ['角色', '权限', 'rbac', 'roles', 'permissions']
          }
        ]
      }
    ]
  },
  {
    title: '运营中心',
    items: [
      {
        kind: 'group',
        title: '运营分析',
        description: '报表、审计与运营分析的初始化页面集合。',
        icon: 'operations',
        defaultExpanded: true,
        keywords: ['报表', '日志', '分析', '运营', 'reports'],
        children: [
          {
            kind: 'item',
            title: '数据报表',
            to: '/reports',
            description: '查看趋势分析、导出任务与运营指标概览',
            icon: 'reports',
            keywords: ['报表', '统计', '分析', 'reports', 'analytics']
          },
          {
            kind: 'item',
            title: '审计日志',
            to: '/audit-logs',
            description: '查看关键操作记录、风险事件与审计留痕',
            icon: 'logs',
            keywords: ['日志', '审计', '操作记录', 'audit', 'logs']
          }
        ]
      }
    ]
  },
  {
    title: '平台设置',
    items: [
      {
        kind: 'group',
        title: '基础配置',
        description: '工作台偏好、主题与平台基础设置。',
        icon: 'shield',
        defaultExpanded: true,
        keywords: ['设置', '偏好', '配置', 'settings'],
        children: [
          {
            kind: 'item',
            title: '系统设置',
            to: '/settings',
            description: '管理主题、导航偏好与基础平台设置',
            icon: 'settings',
            keywords: ['系统设置', '设置', 'preferences', 'configuration']
          }
        ]
      }
    ]
  }
];

export function isNavigationLeaf(node: NavigationNode): node is NavigationLeaf {
  return node.kind === 'item';
}

export function isNavigationGroup(
  node: NavigationNode
): node is NavigationGroup {
  return node.kind === 'group';
}

function matchesPath(to: string, pathname: string): boolean {
  return to === '/'
    ? pathname === '/'
    : pathname === to || pathname.startsWith(`${to}/`);
}

export function flattenNavigationItems(
  sections: NavigationSection[]
): CommandItem[] {
  return sections.flatMap((section) =>
    section.items.flatMap((item) => {
      if (isNavigationLeaf(item)) {
        return [
          {
            ...item,
            section: section.title,
            searchText: [
              section.title,
              item.title,
              item.description,
              ...(item.keywords ?? [])
            ]
              .join(' ')
              .toLowerCase()
          }
        ];
      }

      return item.children.map((child) => ({
        ...child,
        section: section.title,
        parentTitle: item.title,
        searchText: [
          section.title,
          item.title,
          item.description,
          child.title,
          child.description,
          ...(item.keywords ?? []),
          ...(child.keywords ?? [])
        ]
          .join(' ')
          .toLowerCase()
      }));
    })
  );
}

export function filterCommandItems(
  items: CommandItem[],
  query: string
): CommandItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return [...items]
    .filter((item) => item.searchText.includes(normalizedQuery))
    .sort((left, right) => {
      const leftStartsWith = left.title
        .toLowerCase()
        .startsWith(normalizedQuery);
      const rightStartsWith = right.title
        .toLowerCase()
        .startsWith(normalizedQuery);

      if (leftStartsWith && !rightStartsWith) {
        return -1;
      }

      if (!leftStartsWith && rightStartsWith) {
        return 1;
      }

      return left.title.localeCompare(right.title);
    });
}

export function isNavigationNodeActive(
  node: NavigationNode,
  pathname: string
): boolean {
  if (isNavigationLeaf(node)) {
    return matchesPath(node.to, pathname);
  }

  return node.children.some((child) => matchesPath(child.to, pathname));
}

export function findNavigationItem(
  pathname: string
): NavigationLeaf | undefined {
  return flattenNavigationItems(navigationSections).find((item) =>
    matchesPath(item.to, pathname)
  );
}

export function findNavigationTrail(pathname: string): BreadcrumbEntry[] {
  for (const section of navigationSections) {
    for (const item of section.items) {
      if (isNavigationLeaf(item) && matchesPath(item.to, pathname)) {
        return [{ title: item.title, to: item.to }];
      }

      if (isNavigationGroup(item)) {
        const child = item.children.find((entry) =>
          matchesPath(entry.to, pathname)
        );

        if (child) {
          return [{ title: item.title }, { title: child.title, to: child.to }];
        }
      }
    }
  }

  return [];
}
