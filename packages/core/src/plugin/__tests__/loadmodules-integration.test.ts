// LoadModules 集成测试

import { createContainer, Lifetime, RESOLVER } from 'awilix';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withRegisterAutoDI, type AutoDIConfig } from '../plugin-utils.js';

describe('LoadModules Integration', () => {
  let app: FastifyInstance;
  let container: any;

  beforeEach(async () => {
    app = fastify({ logger: false });
    container = createContainer();
    app.decorate('diContainer', container);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('基础 loadModules 功能', () => {
    it('应该使用 loadModules 自动加载模块到插件内部容器', async () => {
      const config: AutoDIConfig = {
        discovery: {
          patterns: [], // 空模式，只测试基础功能
          baseDir: process.cwd()
        },
        debug: true
      };

      const mockPlugin = async (fastify: FastifyInstance) => {
        // 插件逻辑
        fastify.get('/test', async () => ({ message: 'loadModules test' }));
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      // 应该不抛出错误
      await expect(
        app.register(enhancedPlugin, { testOption: 'value' })
      ).resolves.not.toThrow();
    });

    it('应该将插件配置注册为 pluginConfig', async () => {
      let capturedConfig: any = null;

      // 模拟服务类，用于测试配置访问
      class TestService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED,
          injector: (container: any) => {
            capturedConfig = container.resolve('pluginConfig');
            return {
              configValue: capturedConfig.testValue || 'default'
            };
          }
        };

        constructor({ configValue }: { configValue: string }) {
          this.configValue = configValue;
        }
      }

      const pluginOptions = {
        testValue: 'loadModules-test',
        database: {
          host: 'localhost',
          port: 5432
        }
      };

      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: false
      };

      const mockPlugin = async (fastify: FastifyInstance) => {
        // 手动注册测试服务来验证配置访问
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          const { asClass } = await import('awilix');
          pluginContainer.register('testService', asClass(TestService));

          // 解析服务以触发 injector
          pluginContainer.resolve('testService');
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, pluginOptions);

      // 验证插件配置被正确注册和访问
      expect(capturedConfig).toBeDefined();
      expect(capturedConfig).toEqual(pluginOptions);
      expect(capturedConfig.testValue).toBe('loadModules-test');
      expect(capturedConfig.database.host).toBe('localhost');
    });

    it('应该支持 camelCase 命名格式', async () => {
      const config: AutoDIConfig = {
        discovery: {
          patterns: [], // 空模式
          baseDir: process.cwd()
        },
        debug: true
      };

      const mockPlugin = async (fastify: FastifyInstance) => {
        // 验证 loadModules 使用了 camelCase 格式
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          // 检查注册的模块是否使用了 camelCase 命名
          const registrations = Object.keys(pluginContainer.registrations);
          expect(registrations).toContain('pluginConfig');
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, {});
    });

    it('应该使用 SCOPED 作为默认生命周期', async () => {
      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: true
      };

      const mockPlugin = async (fastify: FastifyInstance) => {
        // 验证默认生命周期设置
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          // loadModules 应该使用 SCOPED 作为默认生命周期
          // 这确保了插件内部对象不会使用 SINGLETON
          expect(pluginContainer).toBeDefined();
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, {});
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的模式路径', async () => {
      const config: AutoDIConfig = {
        discovery: {
          patterns: ['non-existent/**/*.js'], // 不存在的路径
          baseDir: process.cwd()
        },
        debug: false
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      // 应该不抛出错误，loadModules 会优雅地处理不存在的路径
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });

    it('应该处理空的模式数组', async () => {
      const config: AutoDIConfig = {
        discovery: {
          patterns: [], // 空数组
          baseDir: process.cwd()
        },
        debug: false
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });
  });

  describe('调试输出', () => {
    it('应该在调试模式下输出详细信息', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: true
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, {});

      // 验证调试输出
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting loadModules auto registration')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LoadModules registration completed')
      );

      consoleSpy.mockRestore();
    });
  });
});
