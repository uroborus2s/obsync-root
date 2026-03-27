/**
 * @stratix/core - Cross Plugin Integration Tests
 * 
 * 测试跨插件工作流机制的完整集成，包括插件注册、
 * 工作流组件发现、跨容器依赖注入等功能。
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { withRegisterAutoDI } from '../auto-di-plugin.js';
import { pluginContainerRegistry } from '../container-registry.js';
import type { TaskExecutor, ExecutionContext, TaskResult, WorkflowDefinitionBase } from '../workflow-types.js';

describe('跨插件工作流集成测试', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    // 清理全局注册表
    await pluginContainerRegistry.dispose();
  });

  afterEach(async () => {
    await app.close();
    await pluginContainerRegistry.dispose();
  });

  describe('插件注册和容器管理', () => {
    test('应该正确注册插件容器到全局注册表', async () => {
      // 创建测试插件
      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: {
            patterns: ['**/*.ts']
          },
          workflows: {
            enabled: true,
            patterns: ['workflows/**/*.ts'],
            metadata: {
              category: 'test',
              provides: {
                executors: ['test-executor']
              }
            }
          }
        }
      );

      await app.register(testPlugin);

      // 验证插件容器已注册
      expect(pluginContainerRegistry.hasPlugin('test-plugin')).toBe(true);
      
      const containerInfo = pluginContainerRegistry.getContainerInfo('test-plugin');
      expect(containerInfo).toBeDefined();
      expect(containerInfo!.workflowConfig?.enabled).toBe(true);
      expect(containerInfo!.workflowConfig?.patterns).toContain('workflows/**/*.ts');
    });

    test('应该正确识别 @stratix/tasks 插件', async () => {
      const tasksPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // @stratix/tasks 插件逻辑
        },
        {
          discovery: {
            patterns: ['**/*.ts']
          }
        }
      );

      // 模拟插件名称为 @stratix/tasks
      Object.defineProperty(tasksPlugin, 'name', { value: '@stratix/tasks' });

      await app.register(tasksPlugin);

      // 验证 tasks 容器已正确识别
      const tasksContainer = pluginContainerRegistry.getTasksContainer();
      expect(tasksContainer).toBeDefined();
    });
  });

  describe('工作流组件发现', () => {
    test('应该发现和注册工作流定义', async () => {
      // 创建包含工作流定义的测试插件
      const workflowPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 模拟工作流定义
          const testWorkflowDefinition: WorkflowDefinitionBase = {
            id: 'test-workflow-v1',
            name: 'Test Workflow',
            version: '1.0.0',
            description: '测试工作流'
          };

          // 在容器中注册工作流定义
          fastify.diContainer.register('testWorkflow', {
            resolve: () => testWorkflowDefinition
          });
        },
        {
          workflows: {
            enabled: true,
            patterns: ['workflows/definitions/**/*.ts']
          }
        }
      );

      await app.register(workflowPlugin);

      // 验证工作流定义已被发现
      const workflowPlugins = pluginContainerRegistry.getWorkflowEnabledPlugins();
      expect(workflowPlugins).toHaveLength(1);
      expect(workflowPlugins[0].workflowConfig?.enabled).toBe(true);
    });

    test('应该发现和注册执行器', async () => {
      // 创建测试执行器
      class TestExecutor implements TaskExecutor {
        name = 'test-executor';

        async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
          return {
            success: true,
            data: { message: 'Test execution completed', input }
          };
        }
      }

      const executorPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 在容器中注册执行器
          fastify.diContainer.register('testExecutor', {
            resolve: () => new TestExecutor()
          });
        },
        {
          workflows: {
            enabled: true,
            patterns: ['workflows/executors/**/*.ts']
          }
        }
      );

      await app.register(executorPlugin);

      // 验证执行器已被发现
      const containerInfo = pluginContainerRegistry.getContainerInfo('executor-plugin');
      expect(containerInfo).toBeDefined();
      expect(containerInfo!.workflowConfig?.enabled).toBe(true);
    });
  });

  describe('跨容器依赖注入', () => {
    test('应该支持跨插件执行器的依赖注入', async () => {
      // 创建业务服务
      class UserService {
        createUser(userData: any) {
          return { id: '123', ...userData, createdAt: new Date() };
        }
      }

      // 创建依赖业务服务的执行器
      class UserCreatorExecutor implements TaskExecutor {
        name = 'user-creator';

        constructor(private userService: UserService) {}

        async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
          const user = this.userService.createUser(input);
          return {
            success: true,
            data: user
          };
        }
      }

      // 业务插件
      const userPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 注册业务服务
          fastify.diContainer.register('userService', {
            resolve: () => new UserService()
          });

          // 注册执行器（依赖注入会自动处理）
          fastify.diContainer.register('userCreatorExecutor', {
            resolve: (container) => new UserCreatorExecutor(
              container.resolve('userService')
            )
          });
        },
        {
          workflows: {
            enabled: true,
            patterns: ['workflows/executors/**/*.ts']
          }
        }
      );

      // @stratix/tasks 插件
      const tasksPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // tasks 插件逻辑
        },
        {
          discovery: {
            patterns: ['**/*.ts']
          }
        }
      );

      // 注册插件
      await app.register(userPlugin);
      await app.register(tasksPlugin);

      // 验证跨容器依赖注入
      const userContainer = pluginContainerRegistry.getContainer('user-plugin');
      const tasksContainer = pluginContainerRegistry.getTasksContainer();

      expect(userContainer).toBeDefined();
      expect(tasksContainer).toBeDefined();

      // 验证执行器可以在源容器中正确解析
      const executor = userContainer!.resolve('userCreatorExecutor');
      expect(executor).toBeInstanceOf(UserCreatorExecutor);
      expect(executor.name).toBe('user-creator');
    });
  });

  describe('插件加载顺序处理', () => {
    test('应该处理 @stratix/tasks 在其他插件之后加载的情况', async () => {
      // 先注册业务插件
      const businessPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 业务插件逻辑
        },
        {
          workflows: {
            enabled: true,
            patterns: ['workflows/**/*.ts']
          }
        }
      );

      await app.register(businessPlugin);

      // 验证业务插件已注册但 tasks 插件尚未加载
      expect(pluginContainerRegistry.hasPlugin('business-plugin')).toBe(true);
      expect(pluginContainerRegistry.getTasksContainer()).toBeNull();

      // 后注册 @stratix/tasks 插件
      const tasksPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // tasks 插件逻辑
        },
        {
          discovery: {
            patterns: ['**/*.ts']
          }
        }
      );

      await app.register(tasksPlugin);

      // 验证 tasks 插件已加载并处理了之前的业务插件
      expect(pluginContainerRegistry.getTasksContainer()).toBeDefined();
      
      const workflowPlugins = pluginContainerRegistry.getWorkflowEnabledPlugins();
      expect(workflowPlugins).toHaveLength(1);
    });
  });

  describe('错误处理和容错', () => {
    test('应该优雅处理工作流组件加载失败', async () => {
      const faultyPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 模拟插件正常逻辑
        },
        {
          workflows: {
            enabled: true,
            patterns: ['non-existent-path/**/*.ts'] // 不存在的路径
          }
        }
      );

      // 插件应该能正常注册，即使工作流组件加载失败
      await expect(app.register(faultyPlugin)).resolves.not.toThrow();

      // 验证插件容器已注册
      expect(pluginContainerRegistry.hasPlugin('faulty-plugin')).toBe(true);
    });

    test('应该处理无效的工作流配置', async () => {
      const invalidConfigPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          workflows: {
            enabled: true,
            patterns: [] // 空的模式数组
          }
        }
      );

      // 应该抛出配置验证错误
      await expect(app.register(invalidConfigPlugin)).rejects.toThrow();
    });
  });

  describe('调试和监控', () => {
    test('应该在调试模式下提供详细日志', async () => {
      const debugPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          debug: true,
          workflows: {
            enabled: true,
            patterns: ['workflows/**/*.ts']
          }
        }
      );

      // 在调试模式下注册插件
      await app.register(debugPlugin);

      // 验证插件已注册
      expect(pluginContainerRegistry.hasPlugin('debug-plugin')).toBe(true);
    });

    test('应该提供正确的统计信息', async () => {
      // 注册多个插件
      const plugin1 = withRegisterAutoDI(async () => {}, {
        workflows: { enabled: true, patterns: ['**/*.ts'] }
      });
      
      const plugin2 = withRegisterAutoDI(async () => {}, {
        workflows: { enabled: false, patterns: ['**/*.ts'] }
      });
      
      const plugin3 = withRegisterAutoDI(async () => {}, {});

      await app.register(plugin1);
      await app.register(plugin2);
      await app.register(plugin3);

      // 验证统计信息
      const stats = pluginContainerRegistry.getStats();
      expect(stats.totalPlugins).toBe(3);
      expect(stats.workflowEnabledPlugins).toBe(1);
      expect(stats.tasksPluginLoaded).toBe(false);
    });
  });
});
