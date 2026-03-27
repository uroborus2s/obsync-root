/**
 * StratixApplication 生命周期方法测试
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Stratix } from '../stratix.js';
import type { StratixApplication } from '../types/config.js';

describe('StratixApplication 生命周期方法', () => {
  let stratix: Stratix;
  let app: StratixApplication;

  beforeEach(async () => {
    stratix = new Stratix();
  });

  afterEach(async () => {
    if (stratix.isRunning()) {
      await stratix.stop();
    }
  });

  describe('stop() 方法', () => {
    it('应该正确停止应用并关闭 Fastify 实例', async () => {
      app = await stratix.start({
        type: 'web',
        server: { port: 0 }, // 使用随机端口
        config: {
          server: { port: 0 },
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      // 启动监听
      await app.fastify.listen({ port: 0, host: '127.0.0.1' });

      // 验证应用正在运行
      expect(app.isRunning()).toBe(true);
      expect(stratix.isRunning()).toBe(true);

      // 停止应用
      await app.stop();

      // 验证应用已停止
      expect(app.isRunning()).toBe(false);
      expect(stratix.isRunning()).toBe(false);
    });

    it('应该能够多次调用 stop() 而不出错', async () => {
      app = await stratix.start({
        type: 'cli',
        config: {
          server: {},
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      // 第一次停止
      await app.stop();
      expect(stratix.isRunning()).toBe(false);

      // 第二次停止应该不出错
      await expect(app.stop()).resolves.not.toThrow();
    });
  });

  describe('inject() 方法', () => {
    it('应该能够模拟 HTTP 请求', async () => {
      app = await stratix.start({
        type: 'web',
        config: {
          server: { port: 0 },
          plugins: [
            {
              name: 'test-routes',
              plugin: async (fastify) => {
                fastify.get('/test', async () => {
                  return { message: 'Hello, World!' };
                });

                fastify.post('/echo', async (request) => {
                  return { echo: request.body };
                });
              },
              options: {}
            }
          ],
          container: {},
          autoLoad: {}
        }
      });

      // 测试 GET 请求
      const getResponse = await app.inject({
        method: 'GET',
        url: '/test'
      });

      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.json()).toEqual({ message: 'Hello, World!' });

      // 测试 POST 请求
      const postResponse = await app.inject({
        method: 'POST',
        url: '/echo',
        headers: {
          'content-type': 'application/json'
        },
        payload: { test: 'data' }
      });

      expect(postResponse.statusCode).toBe(200);
      expect(postResponse.json()).toEqual({ echo: { test: 'data' } });
    });

    it('应该处理 404 错误', async () => {
      app = await stratix.start({
        type: 'web',
        config: {
          server: { port: 0 },
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent'
      });

      expect(response.statusCode).toBe(404);
      const errorResponse = response.json();
      expect(errorResponse.error.message).toBe('Route not found');
    });
  });

  describe('getAddress() 方法', () => {
    it('未启动时应该返回 null', async () => {
      app = await stratix.start({
        type: 'web',
        config: {
          server: { port: 0 },
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      expect(app.getAddress()).toBeNull();
    });

    it('启动后应该返回地址信息', async () => {
      app = await stratix.start({
        type: 'web',
        config: {
          server: { port: 0 },
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      await app.fastify.listen({ port: 0, host: '127.0.0.1' });

      const address = app.getAddress();
      expect(address).not.toBeNull();
      expect(address).toHaveProperty('address');
      expect(address).toHaveProperty('port');
      expect(address).toHaveProperty('family');
      expect(typeof address.port).toBe('number');
      expect(address.port).toBeGreaterThan(0);
    });
  });

  describe('isRunning() 方法', () => {
    it('应该正确反映服务器状态', async () => {
      app = await stratix.start({
        type: 'web',
        config: {
          server: { port: 0 },
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      // 未启动监听时
      expect(app.isRunning()).toBe(false);

      // 启动监听后
      await app.fastify.listen({ port: 0, host: '127.0.0.1' });
      expect(app.isRunning()).toBe(true);

      // 关闭后
      await app.close();
      expect(app.isRunning()).toBe(false);
    });

    it('CLI 应用应该返回 false', async () => {
      app = await stratix.start({
        type: 'cli',
        config: {
          server: {},
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      expect(app.isRunning()).toBe(false);
    });
  });

  describe('getUptime() 方法', () => {
    it('应该返回正确的运行时间', async () => {
      const startTime = Date.now();
      
      app = await stratix.start({
        type: 'cli',
        config: {
          server: {},
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 100));

      const uptime = app.getUptime();
      const expectedMinUptime = Date.now() - startTime - 50; // 允许一些误差

      expect(uptime).toBeGreaterThanOrEqual(expectedMinUptime);
      expect(uptime).toBeLessThan(Date.now() - startTime + 50);
    });

    it('运行时间应该随时间增长', async () => {
      app = await stratix.start({
        type: 'cli',
        config: {
          server: {},
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      const uptime1 = app.getUptime();
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const uptime2 = app.getUptime();

      expect(uptime2).toBeGreaterThan(uptime1);
    });
  });

  describe('close() 方法', () => {
    it('应该直接关闭 Fastify 实例', async () => {
      app = await stratix.start({
        type: 'web',
        config: {
          server: { port: 0 },
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      await app.fastify.listen({ port: 0, host: '127.0.0.1' });
      expect(app.isRunning()).toBe(true);

      await app.close();
      expect(app.isRunning()).toBe(false);
    });
  });

  describe('healthCheck() 方法', () => {
    it('应该返回健康状态信息', async () => {
      app = await stratix.start({
        type: 'cli',
        config: {
          server: {},
          plugins: [],
          container: {},
          autoLoad: {}
        }
      });

      const health = await app.healthCheck();

      expect(health).toHaveProperty('status', 'healthy');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('timestamp');
      expect(typeof health.uptime).toBe('number');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.memory).toHaveProperty('rss');
      expect(health.memory).toHaveProperty('heapUsed');
    });
  });
});
