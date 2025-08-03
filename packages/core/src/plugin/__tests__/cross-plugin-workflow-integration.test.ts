/**
 * @stratix/core - Cross Plugin Workflow Integration Test
 * 
 * 简化的跨插件工作流集成测试，验证核心功能
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createContainer } from 'awilix';
import { 
  PluginContainerRegistry,
  pluginContainerRegistry 
} from '../container-registry.js';
import { CrossPluginWorkflowLoader } from '../cross-plugin-workflow-loader.js';
import type { TaskExecutor, ExecutionContext, TaskResult } from '../workflow-types.js';

describe('跨插件工作流集成测试', () => {
  let registry: PluginContainerRegistry;

  beforeEach(() => {
    registry = new PluginContainerRegistry();
  });

  afterEach(async () => {
    await registry.dispose();
  });

  test('应该正确注册插件容器', () => {
    const mockContainer = createContainer();
    
    const containerInfo = {
      pluginName: '@test/user-plugin',
      container: mockContainer,
      basePath: '/test/user',
      workflowConfig: {
        enabled: true,
        patterns: ['workflows/**/*.ts']
      }
    };

    registry.registerContainer(containerInfo);

    expect(registry.hasPlugin('@test/user-plugin')).toBe(true);
    
    const retrieved = registry.getContainerInfo('@test/user-plugin');
    expect(retrieved).toBeDefined();
    expect(retrieved!.workflowConfig?.enabled).toBe(true);
  });

  test('应该正确识别工作流启用的插件', () => {
    const container1 = createContainer();
    const container2 = createContainer();

    // 注册工作流插件
    registry.registerContainer({
      pluginName: '@test/workflow-plugin',
      container: container1,
      basePath: '/test/workflow',
      workflowConfig: {
        enabled: true,
        patterns: ['workflows/**/*.ts']
      }
    });

    // 注册普通插件
    registry.registerContainer({
      pluginName: '@test/normal-plugin',
      container: container2,
      basePath: '/test/normal'
    });

    const workflowPlugins = registry.getWorkflowEnabledPlugins();
    expect(workflowPlugins).toHaveLength(1);
    expect(workflowPlugins[0].pluginName).toBe('@test/workflow-plugin');
  });

  test('应该正确识别 @stratix/tasks 插件', () => {
    const tasksContainer = createContainer();

    registry.registerContainer({
      pluginName: '@stratix/tasks',
      container: tasksContainer,
      basePath: '/test/tasks'
    });

    const retrievedTasksContainer = registry.getTasksContainer();
    expect(retrievedTasksContainer).toBe(tasksContainer);
  });

  test('应该创建有效的跨容器解析器', () => {
    const sourceContainer = createContainer();
    
    // 在源容器中注册服务
    sourceContainer.register('testService', {
      resolve: () => ({ name: 'TestService', getValue: () => 'test-value' })
    });

    registry.registerContainer({
      pluginName: '@test/source-plugin',
      container: sourceContainer,
      basePath: '/test/source'
    });

    const resolver = registry.createCrossContainerResolver('@test/source-plugin');
    
    expect(resolver).toBeDefined();
    expect(typeof resolver.resolve).toBe('function');
    expect(typeof resolver.has).toBe('function');
    
    // 测试服务解析
    expect(resolver.has('testService')).toBe(true);
    const service = resolver.resolve('testService');
    expect(service).toBeDefined();
  });

  test('应该正确处理跨插件工作流加载器', async () => {
    const tasksContainer = createContainer();
    const userContainer = createContainer();

    // 创建测试执行器
    class TestExecutor implements TaskExecutor {
      name = 'test-executor';
      
      async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
        return { success: true, data: input };
      }
    }

    // 在用户容器中注册执行器
    userContainer.register('testExecutor', {
      resolve: () => new TestExecutor()
    });

    // 注册插件容器
    registry.registerContainer({
      pluginName: '@test/user-plugin',
      container: userContainer,
      basePath: '/test/user',
      workflowConfig: {
        enabled: true,
        patterns: ['workflows/executors/**/*.ts']
      }
    });

    registry.registerContainer({
      pluginName: '@stratix/tasks',
      container: tasksContainer,
      basePath: '/test/tasks'
    });

    // 创建跨插件加载器
    const loader = new CrossPluginWorkflowLoader(tasksContainer, true);
    
    // 验证加载器可以正常创建
    expect(loader).toBeDefined();
    
    // 验证可以加载插件工作流（这里只测试不抛出异常）
    await expect(loader.loadPluginWorkflows('@test/user-plugin')).resolves.not.toThrow();
  });

  test('应该提供正确的统计信息', () => {
    const container1 = createContainer();
    const container2 = createContainer();
    const tasksContainer = createContainer();

    // 注册不同类型的插件
    registry.registerContainer({
      pluginName: '@test/workflow-plugin',
      container: container1,
      basePath: '/test/workflow',
      workflowConfig: { enabled: true, patterns: ['**/*.ts'] }
    });

    registry.registerContainer({
      pluginName: '@test/normal-plugin',
      container: container2,
      basePath: '/test/normal'
    });

    registry.registerContainer({
      pluginName: '@stratix/tasks',
      container: tasksContainer,
      basePath: '/test/tasks'
    });

    const stats = registry.getStats();
    
    expect(stats.totalPlugins).toBe(3);
    expect(stats.workflowEnabledPlugins).toBe(1);
    expect(stats.tasksPluginLoaded).toBe(true);
    expect(stats.registeredAt).toHaveLength(3);
  });

  test('应该正确处理插件名称验证', () => {
    const mockContainer = createContainer();

    // 测试空名称
    expect(() => {
      registry.registerContainer({
        pluginName: '',
        container: mockContainer,
        basePath: '/test/path'
      });
    }).toThrow('插件名称不能为空');

    // 测试无效格式
    expect(() => {
      registry.registerContainer({
        pluginName: 'invalid name',
        container: mockContainer,
        basePath: '/test/path'
      });
    }).toThrow('无效的插件名称格式');

    // 测试有效格式
    expect(() => {
      registry.registerContainer({
        pluginName: '@stratix/valid-plugin',
        container: mockContainer,
        basePath: '/test/path'
      });
    }).not.toThrow();
  });

  test('应该正确处理工作流配置验证', () => {
    const mockContainer = createContainer();

    // 测试无效配置
    expect(() => {
      registry.registerContainer({
        pluginName: '@test/invalid-config',
        container: mockContainer,
        basePath: '/test/path',
        workflowConfig: {
          enabled: true,
          patterns: [] // 空数组应该失败
        }
      });
    }).toThrow('工作流配置的 patterns 不能为空');

    // 测试有效配置
    expect(() => {
      registry.registerContainer({
        pluginName: '@test/valid-config',
        container: mockContainer,
        basePath: '/test/path',
        workflowConfig: {
          enabled: true,
          patterns: ['workflows/**/*.ts']
        }
      });
    }).not.toThrow();
  });

  test('应该正确处理容器生命周期', async () => {
    const mockContainer = createContainer();

    registry.registerContainer({
      pluginName: '@test/lifecycle-plugin',
      container: mockContainer,
      basePath: '/test/lifecycle'
    });

    expect(registry.hasPlugin('@test/lifecycle-plugin')).toBe(true);

    // 销毁注册表
    await registry.dispose();

    // 销毁后应该无法注册新容器
    expect(() => {
      registry.registerContainer({
        pluginName: '@test/new-plugin',
        container: createContainer(),
        basePath: '/test/new'
      });
    }).toThrow('容器注册表已被销毁');
  });

  test('全局注册表应该是单例', async () => {
    expect(pluginContainerRegistry).toBeInstanceOf(PluginContainerRegistry);
    
    const { getPluginContainerRegistry } = await import('../container-registry.js');
    const instance1 = getPluginContainerRegistry();
    const instance2 = getPluginContainerRegistry();
    
    expect(instance1).toBe(instance2);
    expect(instance1).toBe(pluginContainerRegistry);
  });
});
