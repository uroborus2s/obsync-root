// 增强的 Per-module Local Injections 测试

import { createContainer, Lifetime, RESOLVER } from 'awilix';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { withRegisterAutoDI, type AutoDIConfig } from '../plugin-utils.js';

describe('Enhanced Per-module Local Injections', () => {
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

  describe('Awilix 标准 injector 函数', () => {
    it('应该支持接收插件域容器作为参数', async () => {
      let capturedContainer: any = null;
      let capturedOptions: any = null;

      // 模拟带有 Awilix 标准 injector 的服务类
      class TestService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED,
          injector: (container: any) => {
            capturedContainer = container;
            capturedOptions = container.resolve('pluginConfig');

            return {
              configValue: capturedOptions.testValue || 'default',
              dynamicValue: `processed-${capturedOptions.dynamicValue || 'none'}`
            };
          }
        };

        constructor({
          configValue,
          dynamicValue
        }: {
          configValue: string;
          dynamicValue: string;
        }) {
          this.configValue = configValue;
          this.dynamicValue = dynamicValue;
        }
      }

      const pluginOptions = {
        testValue: 'enhanced-test',
        dynamicValue: 'dynamic-data'
      };

      const config: AutoDIConfig = {
        discovery: {
          patterns: [], // 空模式，手动测试
          baseDir: process.cwd()
        },
        debug: true
      };

      const mockPlugin = async (fastify: FastifyInstance) => {
        // 手动注册测试服务到插件内部容器
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          const { asClass } = await import('awilix');
          pluginContainer.register('testService', asClass(TestService));
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, pluginOptions);

      // 验证 injector 函数接收到了插件域容器
      expect(capturedContainer).toBeDefined();
      expect(capturedOptions).toEqual(pluginOptions);
    });

    it('应该支持基于插件配置的动态参数注入', async () => {
      class ConfigurableService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED,
          injector: (container: any) => {
            const options = container.resolve('pluginConfig');
            const env = process.env.NODE_ENV || 'test';

            return {
              apiUrl:
                env === 'production'
                  ? options.prodApiUrl
                  : options.devApiUrl || 'http://localhost:3000',
              timeout: options.timeout || 5000,
              enableFeature: options.features?.newFeature ?? false,
              environment: env
            };
          }
        };

        constructor({
          apiUrl,
          timeout,
          enableFeature,
          environment
        }: {
          apiUrl: string;
          timeout: number;
          enableFeature: boolean;
          environment: string;
        }) {
          this.config = { apiUrl, timeout, enableFeature, environment };
        }
      }

      const pluginOptions = {
        devApiUrl: 'http://dev.example.com',
        prodApiUrl: 'https://api.example.com',
        timeout: 10000,
        features: {
          newFeature: true
        }
      };

      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: false
      };

      let serviceInstance: any = null;

      const mockPlugin = async (fastify: FastifyInstance) => {
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          const { asClass } = await import('awilix');
          pluginContainer.register(
            'configurableService',
            asClass(ConfigurableService)
          );

          // 解析服务实例进行测试
          serviceInstance = pluginContainer.resolve('configurableService');
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, pluginOptions);

      // 验证动态配置注入
      expect(serviceInstance).toBeDefined();
      expect(serviceInstance.config.apiUrl).toBe('http://dev.example.com'); // 测试环境
      expect(serviceInstance.config.timeout).toBe(10000);
      expect(serviceInstance.config.enableFeature).toBe(true);
      expect(serviceInstance.config.environment).toBe('test');
    });
  });

  describe('向后兼容性', () => {
    it('应该支持标准的 Awilix injector 函数', async () => {
      class LegacyService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED,
          // 标准 Awilix injector 函数
          injector: () => ({
            staticValue: 'legacy-config',
            defaultTimeout: 3000
          })
        };

        constructor({
          staticValue,
          defaultTimeout
        }: {
          staticValue: string;
          defaultTimeout: number;
        }) {
          this.staticValue = staticValue;
          this.defaultTimeout = defaultTimeout;
        }
      }

      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: false
      };

      let serviceInstance: any = null;

      const mockPlugin = async (fastify: FastifyInstance) => {
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          const { asClass } = await import('awilix');
          pluginContainer.register('legacyService', asClass(LegacyService));
          serviceInstance = pluginContainer.resolve('legacyService');
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, {});

      // 验证标准 injector 正常工作
      expect(serviceInstance).toBeDefined();
      expect(serviceInstance.staticValue).toBe('legacy-config');
      expect(serviceInstance.defaultTimeout).toBe(3000);
    });

    it('应该处理没有 injector 的服务', async () => {
      class SimpleService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED
          // 没有 injector
        };

        constructor() {
          this.type = 'simple';
        }
      }

      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: false
      };

      let serviceInstance: any = null;

      const mockPlugin = async (fastify: FastifyInstance) => {
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          const { asClass } = await import('awilix');
          pluginContainer.register('simpleService', asClass(SimpleService));
          serviceInstance = pluginContainer.resolve('simpleService');
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, {});

      // 验证没有 injector 的服务正常工作
      expect(serviceInstance).toBeDefined();
      expect(serviceInstance.type).toBe('simple');
    });
  });

  describe('错误处理', () => {
    it('应该处理 injector 函数中的错误', async () => {
      class FaultyService {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED,
          injector: (container: any) => {
            // 故意抛出错误
            throw new Error('Injector error');
          }
        };

        constructor() {
          this.type = 'faulty';
        }
      }

      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: false
      };

      const mockPlugin = async (fastify: FastifyInstance) => {
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          const { asClass } = await import('awilix');
          pluginContainer.register('faultyService', asClass(FaultyService));
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      // 应该不抛出错误，injector 错误被捕获
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });

    it('应该处理容器解析失败的情况', async () => {
      class ServiceWithMissingDep {
        static [RESOLVER] = {
          lifetime: Lifetime.SCOPED,
          injector: (container: any) => {
            try {
              // 尝试解析不存在的依赖
              const nonExistent = container.resolve('nonExistentService');
              return { value: nonExistent.value };
            } catch (error) {
              // 返回默认配置
              return { value: 'default' };
            }
          }
        };

        constructor({ value }: { value: string }) {
          this.value = value;
        }
      }

      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        debug: false
      };

      let serviceInstance: any = null;

      const mockPlugin = async (fastify: FastifyInstance) => {
        const pluginContainer = (fastify as any).pluginInternalContainer;
        if (pluginContainer) {
          const { asClass } = await import('awilix');
          pluginContainer.register(
            'serviceWithMissingDep',
            asClass(ServiceWithMissingDep)
          );
          serviceInstance = pluginContainer.resolve('serviceWithMissingDep');
        }
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);

      await app.register(enhancedPlugin, {});

      // 验证错误处理正确，使用了默认值
      expect(serviceInstance).toBeDefined();
      expect(serviceInstance.value).toBe('default');
    });
  });
});
