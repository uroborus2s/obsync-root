/**
 * @stratix/core - Plugin Container Registry Tests
 * 
 * 测试插件容器注册表的功能，包括容器注册、查找、
 * 跨容器解析和生命周期管理。
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createContainer } from 'awilix';
import type { AwilixContainer } from 'awilix';
import { 
  PluginContainerRegistry,
  pluginContainerRegistry,
  type PluginContainerInfo,
  type WorkflowConfig
} from '../container-registry.js';

describe('PluginContainerRegistry', () => {
  let registry: PluginContainerRegistry;
  let mockContainer: AwilixContainer;
  let mockTasksContainer: AwilixContainer;

  beforeEach(() => {
    registry = new PluginContainerRegistry();
    mockContainer = createContainer();
    mockTasksContainer = createContainer();
  });

  afterEach(async () => {
    await registry.dispose();
    await mockContainer.dispose();
    await mockTasksContainer.dispose();
  });

  describe('容器注册', () => {
    test('应该正确注册插件容器', () => {
      const containerInfo: PluginContainerInfo = {
        pluginName: '@test/plugin-a',
        container: mockContainer,
        basePath: '/test/path',
        workflowConfig: {
          enabled: true,
          patterns: ['workflows/**/*.ts']
        }
      };

      registry.registerContainer(containerInfo);

      const retrieved = registry.getContainer('@test/plugin-a');
      expect(retrieved).toBe(mockContainer);
    });

    test('应该正确识别 @stratix/tasks 插件', () => {
      const tasksInfo: PluginContainerInfo = {
        pluginName: '@stratix/tasks',
        container: mockTasksContainer,
        basePath: '/tasks/path'
      };

      registry.registerContainer(tasksInfo);

      const tasksContainer = registry.getTasksContainer();
      expect(tasksContainer).toBe(mockTasksContainer);
    });

    test('应该拒绝重复注册同一插件', () => {
      const containerInfo: PluginContainerInfo = {
        pluginName: '@test/plugin-a',
        container: mockContainer,
        basePath: '/test/path'
      };

      registry.registerContainer(containerInfo);

      expect(() => {
        registry.registerContainer(containerInfo);
      }).toThrow('插件已注册: @test/plugin-a');
    });

    test('应该验证插件名称格式', () => {
      const invalidNames = [
        '',
        'invalid name',
        '@',
        '@scope/',
        'UPPERCASE',
        'under_score'
      ];

      for (const invalidName of invalidNames) {
        expect(() => {
          registry.registerContainer({
            pluginName: invalidName,
            container: mockContainer,
            basePath: '/test/path'
          });
        }).toThrow('无效的插件名称格式');
      }
    });

    test('应该接受有效的插件名称格式', () => {
      const validNames = [
        '@stratix/tasks',
        '@company/my-plugin',
        'simple-plugin',
        'plugin123'
      ];

      for (const validName of validNames) {
        const container = createContainer();
        
        expect(() => {
          registry.registerContainer({
            pluginName: validName,
            container,
            basePath: '/test/path'
          });
        }).not.toThrow();
        
        // 清理
        container.dispose();
      }
    });
  });

  describe('工作流配置验证', () => {
    test('应该验证工作流配置格式', () => {
      const invalidConfigs: WorkflowConfig[] = [
        { enabled: 'true' as any, patterns: [] },
        { enabled: true, patterns: 'invalid' as any },
        { enabled: true, patterns: [] },
        { enabled: true, patterns: ['', '  '] }
      ];

      for (const invalidConfig of invalidConfigs) {
        expect(() => {
          registry.registerContainer({
            pluginName: '@test/invalid-config',
            container: createContainer(),
            basePath: '/test/path',
            workflowConfig: invalidConfig
          });
        }).toThrow();
      }
    });

    test('应该接受有效的工作流配置', () => {
      const validConfig: WorkflowConfig = {
        enabled: true,
        patterns: ['workflows/**/*.ts', 'executors/**/*.js'],
        metadata: {
          category: 'business',
          provides: {
            definitions: ['user-workflow'],
            executors: ['user-creator'],
            services: ['user-service']
          }
        }
      };

      expect(() => {
        registry.registerContainer({
          pluginName: '@test/valid-config',
          container: mockContainer,
          basePath: '/test/path',
          workflowConfig: validConfig
        });
      }).not.toThrow();
    });
  });

  describe('容器查找', () => {
    beforeEach(() => {
      // 注册测试插件
      registry.registerContainer({
        pluginName: '@test/plugin-a',
        container: mockContainer,
        basePath: '/test/path-a',
        workflowConfig: {
          enabled: true,
          patterns: ['workflows/**/*.ts']
        }
      });

      registry.registerContainer({
        pluginName: '@test/plugin-b',
        container: createContainer(),
        basePath: '/test/path-b',
        workflowConfig: {
          enabled: false,
          patterns: ['workflows/**/*.ts']
        }
      });

      registry.registerContainer({
        pluginName: '@test/plugin-c',
        container: createContainer(),
        basePath: '/test/path-c'
        // 无工作流配置
      });
    });

    test('应该正确查找插件容器', () => {
      const container = registry.getContainer('@test/plugin-a');
      expect(container).toBe(mockContainer);

      const nonExistent = registry.getContainer('@test/non-existent');
      expect(nonExistent).toBeUndefined();
    });

    test('应该正确获取容器信息', () => {
      const info = registry.getContainerInfo('@test/plugin-a');
      expect(info).toBeDefined();
      expect(info!.pluginName).toBe('@test/plugin-a');
      expect(info!.basePath).toBe('/test/path-a');
      expect(info!.workflowConfig?.enabled).toBe(true);
    });

    test('应该正确识别工作流启用的插件', () => {
      const workflowPlugins = registry.getWorkflowEnabledPlugins();
      expect(workflowPlugins).toHaveLength(1);
      expect(workflowPlugins[0].pluginName).toBe('@test/plugin-a');
    });

    test('应该正确检查插件是否存在', () => {
      expect(registry.hasPlugin('@test/plugin-a')).toBe(true);
      expect(registry.hasPlugin('@test/non-existent')).toBe(false);
    });

    test('应该正确获取所有插件', () => {
      const allPlugins = registry.getAllPlugins();
      expect(allPlugins).toHaveLength(3);
      
      const pluginNames = allPlugins.map(p => p.pluginName);
      expect(pluginNames).toContain('@test/plugin-a');
      expect(pluginNames).toContain('@test/plugin-b');
      expect(pluginNames).toContain('@test/plugin-c');
    });
  });

  describe('跨容器解析器', () => {
    beforeEach(() => {
      // 在源容器中注册一些服务
      mockContainer.register('testService', {
        resolve: () => ({ name: 'TestService', getValue: () => 'test-value' })
      });

      registry.registerContainer({
        pluginName: '@test/source-plugin',
        container: mockContainer,
        basePath: '/test/path'
      });
    });

    test('应该创建有效的跨容器解析器', () => {
      const resolver = registry.createCrossContainerResolver('@test/source-plugin');
      
      expect(resolver).toBeDefined();
      expect(typeof resolver.resolve).toBe('function');
      expect(typeof resolver.has).toBe('function');
      expect(typeof resolver.getContainer).toBe('function');
    });

    test('应该正确解析跨容器服务', () => {
      const resolver = registry.createCrossContainerResolver('@test/source-plugin');
      
      const service = resolver.resolve('testService');
      expect(service).toBeDefined();
      expect(service.name).toBe('TestService');
      expect(service.getValue()).toBe('test-value');
    });

    test('应该正确检查服务是否存在', () => {
      const resolver = registry.createCrossContainerResolver('@test/source-plugin');
      
      expect(resolver.has('testService')).toBe(true);
      expect(resolver.has('nonExistentService')).toBe(false);
    });

    test('应该在目标插件不存在时抛出错误', () => {
      expect(() => {
        registry.createCrossContainerResolver('@test/non-existent');
      }).toThrow('插件容器未找到: @test/non-existent');
    });

    test('应该在解析失败时提供有用的错误信息', () => {
      const resolver = registry.createCrossContainerResolver('@test/source-plugin');
      
      expect(() => {
        resolver.resolve('nonExistentService');
      }).toThrow('跨容器解析失败: @test/source-plugin.nonExistentService');
    });
  });

  describe('统计信息', () => {
    test('应该正确计算统计信息', () => {
      // 注册不同类型的插件
      registry.registerContainer({
        pluginName: '@test/workflow-plugin',
        container: createContainer(),
        basePath: '/test/path1',
        workflowConfig: { enabled: true, patterns: ['**/*.ts'] }
      });

      registry.registerContainer({
        pluginName: '@test/normal-plugin',
        container: createContainer(),
        basePath: '/test/path2'
      });

      registry.registerContainer({
        pluginName: '@stratix/tasks',
        container: mockTasksContainer,
        basePath: '/test/tasks'
      });

      const stats = registry.getStats();
      
      expect(stats.totalPlugins).toBe(3);
      expect(stats.workflowEnabledPlugins).toBe(1);
      expect(stats.tasksPluginLoaded).toBe(true);
      expect(stats.registeredAt).toHaveLength(3);
    });
  });

  describe('生命周期管理', () => {
    test('应该正确销毁注册表', async () => {
      registry.registerContainer({
        pluginName: '@test/plugin',
        container: mockContainer,
        basePath: '/test/path'
      });

      expect(registry.hasPlugin('@test/plugin')).toBe(true);

      await registry.dispose();

      // 销毁后应该无法注册新容器
      expect(() => {
        registry.registerContainer({
          pluginName: '@test/new-plugin',
          container: createContainer(),
          basePath: '/test/new-path'
        });
      }).toThrow('容器注册表已被销毁');
    });

    test('应该支持重复调用 dispose', async () => {
      await registry.dispose();
      
      // 重复调用不应该抛出错误
      await expect(registry.dispose()).resolves.not.toThrow();
    });
  });

  describe('全局实例', () => {
    test('应该提供全局注册表实例', () => {
      expect(pluginContainerRegistry).toBeInstanceOf(PluginContainerRegistry);
    });

    test('全局实例应该是单例', () => {
      const { getPluginContainerRegistry } = require('../container-registry.js');
      const instance1 = getPluginContainerRegistry();
      const instance2 = getPluginContainerRegistry();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(pluginContainerRegistry);
    });
  });
});
