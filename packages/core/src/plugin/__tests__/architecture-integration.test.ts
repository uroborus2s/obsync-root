// 两层架构集成测试

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createContainer } from 'awilix';
import fastify, { type FastifyInstance } from 'fastify';
import { 
  withRegisterAutoDI, 
  type AutoDIConfig,
  type ServiceAdapter
} from '../plugin-utils.js';

describe('Two-Layer Architecture Integration', () => {
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

  it('应该成功创建基础架构', async () => {
    const config: AutoDIConfig = {
      discovery: {
        patterns: [],
        baseDir: process.cwd()
      },
      debug: false
    };

    const mockPlugin = async (fastify: FastifyInstance) => {
      fastify.get('/test', async () => ({ message: 'test' }));
    };

    const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
    
    await expect(app.register(enhancedPlugin)).resolves.not.toThrow();
  });

  it('应该支持服务适配器', async () => {
    const testAdapter: ServiceAdapter = {
      name: 'testService',
      factory: () => ({
        getMessage: () => 'Hello from adapter'
      }),
      lifetime: 'SINGLETON'
    };

    const config: AutoDIConfig = {
      discovery: {
        patterns: [],
        baseDir: process.cwd()
      },
      services: {
        enabled: true,
        adapters: [testAdapter]
      },
      debug: false
    };

    const mockPlugin = async () => {};
    const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
    
    await app.register(enhancedPlugin);

    const testService = container.resolve('testService');
    expect(testService).toBeDefined();
    expect(testService.getMessage()).toBe('Hello from adapter');
  });

  it('应该支持向后兼容', async () => {
    const config: AutoDIConfig = {
      discovery: {
        patterns: [],
        baseDir: process.cwd()
      }
    };

    const mockPlugin = async () => {};
    const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
    
    await expect(app.register(enhancedPlugin)).resolves.not.toThrow();
  });
});
