/**
 * Stratix 应用实例管理测试
 */

import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Stratix } from '../stratix.js';

describe('Stratix 单应用实例', () => {
  let stratix: Stratix;

  beforeEach(async () => {
    stratix = new Stratix();
  });

  afterEach(async () => {
    if (stratix.isRunning()) {
      await stratix.stop();
    }
  });

  it('应该能够创建单个应用实例', async () => {
    // 创建应用实例
    const app = await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    expect(app.instanceId).toBe('default');
    expect(stratix.isRunning()).toBe(true);
    expect(stratix.getApplication()).toBe(app);
  });

  it('应该能够获取当前应用实例', async () => {
    const app = await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    const retrievedApp = stratix.getApplication();
    expect(retrievedApp).toBeDefined();
    expect(retrievedApp?.instanceId).toBe('default');
    expect(retrievedApp).toBe(app);

    // 停止后应该返回 null
    await stratix.stop();
    expect(stratix.getApplication()).toBeNull();
  });

  it('应该能够检查应用运行状态', async () => {
    expect(stratix.isRunning()).toBe(false);

    await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    expect(stratix.isRunning()).toBe(true);

    await stratix.stop();
    expect(stratix.isRunning()).toBe(false);
  });

  it('应该能够停止当前应用实例', async () => {
    await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    expect(stratix.isRunning()).toBe(true);

    await stratix.stop();
    expect(stratix.isRunning()).toBe(false);
    expect(stratix.getApplication()).toBeNull();
  });

  it('应该能够重启应用实例', async () => {
    const app1 = await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    expect(stratix.isRunning()).toBe(true);
    expect(app1.instanceId).toBe('default');

    const app2 = await stratix.restart({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    expect(stratix.isRunning()).toBe(true);
    expect(app2.instanceId).toBe('default');
    expect(app2).not.toBe(app1); // 应该是新的实例
  });

  it('Fastify 装饰器应该能够访问当前应用实例', async () => {
    let testResults: any = {};

    const testPlugin: FastifyPluginAsync = async (fastify) => {
      // 测试获取当前应用
      const currentApp = fastify.getStratixApp();
      testResults.currentAppId = currentApp.instanceId;

      // 测试检查是否为 Stratix 应用
      testResults.isStratixApp = fastify.isStratixApp();

      // 测试获取 DI 容器
      const container = fastify.getDIContainer();
      testResults.hasContainer = !!container;
    };

    // 创建测试应用
    await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [
          {
            name: 'test-plugin',
            plugin: testPlugin,
            options: {}
          }
        ],
        container: {},
        autoLoad: {}
      }
    });

    // 验证测试结果
    expect(testResults.currentAppId).toBe('default');
    expect(testResults.isStratixApp).toBe(true);
    expect(testResults.hasContainer).toBe(true);
  });

  it('应该能够获取应用实例状态', async () => {
    await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    const status = stratix.getStatus();
    expect(status).toHaveProperty('type', 'cli');
    expect(status).toHaveProperty('status');
  });

  it('应该能够处理重复启动错误', async () => {
    await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    // 尝试再次启动应该抛出错误
    await expect(
      stratix.start({
        type: 'cli',
        config: {
          server: {},
          plugins: [],
          container: {},
          autoLoad: {}
        }
      })
    ).rejects.toThrow('Application is already running');
  });

  it('默认实例ID应该是 "default"', async () => {
    const app = await stratix.start({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    expect(app.instanceId).toBe('default');
    expect(stratix.getApplication()).toBe(app);
  });

  it('应该能够使用静态方法创建应用', async () => {
    const app = await Stratix.run({
      type: 'cli',
      config: {
        server: {},
        plugins: [],
        container: {},
        autoLoad: {}
      }
    });

    expect(app.instanceId).toBe('default');
    expect(app.type).toBe('cli');
  });
});
