/**
 * 模拟数据，用于开发和测试
 */

import type { Task, TaskTreeNode } from '../types/task';

// 模拟任务数据
export const mockTasks: Task[] = [
  {
    id: '1',
    name: '网站重构项目',
    description: '完整的网站重构，包括前端和后端',
    type: 'directory',
    status: 'running',
    progress: 45,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    children: []
  },
  {
    id: '2',
    parentId: '1',
    name: '前端开发',
    description: 'React + TypeScript 前端开发',
    type: 'directory',
    status: 'running',
    progress: 65,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    children: []
  },
  {
    id: '3',
    parentId: '2',
    name: '组件库开发',
    description: '基于 shadcn/ui 的组件库',
    type: 'leaf',
    status: 'completed',
    progress: 100,
    executorConfig: {
      name: 'build-components',
      timeout: 3600,
      retries: 3
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    completedAt: '2024-01-02T00:00:00Z',
    children: []
  },
  {
    id: '4',
    parentId: '2',
    name: '页面开发',
    description: '任务管理页面开发',
    type: 'leaf',
    status: 'running',
    progress: 30,
    executorConfig: {
      name: 'build-pages',
      timeout: 7200,
      retries: 2
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    startedAt: '2024-01-01T08:00:00Z',
    children: []
  },
  {
    id: '5',
    parentId: '1',
    name: '后端开发',
    description: 'Node.js + Fastify 后端API开发',
    type: 'directory',
    status: 'pending',
    progress: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    children: []
  },
  {
    id: '6',
    parentId: '5',
    name: 'API设计',
    description: 'RESTful API 设计和文档编写',
    type: 'leaf',
    status: 'pending',
    progress: 0,
    executorConfig: {
      name: 'design-api',
      timeout: 1800,
      retries: 1
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    children: []
  },
  {
    id: '7',
    parentId: '5',
    name: '数据库设计',
    description: '数据库表结构设计和索引优化',
    type: 'leaf',
    status: 'failed',
    progress: 25,
    executorConfig: {
      name: 'design-database',
      timeout: 3600,
      retries: 2
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    startedAt: '2024-01-01T10:00:00Z',
    children: []
  },
  {
    id: '8',
    name: '测试任务',
    description: '单元测试和集成测试',
    type: 'directory',
    status: 'paused',
    progress: 15,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    children: []
  },
  {
    id: '9',
    parentId: '8',
    name: '单元测试',
    description: 'Jest + React Testing Library',
    type: 'leaf',
    status: 'paused',
    progress: 15,
    executorConfig: {
      name: 'unit-test',
      timeout: 1800,
      retries: 1
    },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    startedAt: '2024-01-02T09:00:00Z',
    children: []
  },
  {
    id: '10',
    name: '部署配置',
    description: 'Docker 容器化和 CI/CD 配置',
    type: 'leaf',
    status: 'stopped',
    progress: 0,
    executorConfig: {
      name: 'deploy-config',
      timeout: 5400,
      retries: 3
    },
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    children: []
  }
];

// 构建树形结构的函数
export function buildTaskTree(tasks: Task[]): TaskTreeNode[] {
  const taskMap = new Map<string, TaskTreeNode>();
  const rootTasks: TaskTreeNode[] = [];

  // 创建任务映射，初始化基础属性
  tasks.forEach((task) => {
    taskMap.set(task.id, {
      ...task,
      children: [],
      depth: 0,
      path: []
    });
  });

  // 构建树形结构
  tasks.forEach((task) => {
    const taskNode = taskMap.get(task.id)!;

    if (task.parentId) {
      const parent = taskMap.get(task.parentId);
      if (parent) {
        // 设置层级深度和路径
        taskNode.depth = parent.depth + 1;
        taskNode.path = [...parent.path, parent.id];
        parent.children.push(taskNode);
      }
    } else {
      // 根节点
      taskNode.depth = 0;
      taskNode.path = [];
      rootTasks.push(taskNode);
    }
  });

  return rootTasks;
}

// 模拟任务树数据
export const mockTaskTree: TaskTreeNode[] = buildTaskTree(mockTasks);

// 模拟API延迟
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// 生成随机ID
export const generateId = () => Math.random().toString(36).substr(2, 9);
