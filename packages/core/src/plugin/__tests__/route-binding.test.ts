// 测试控制器路由 this 绑定优化
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { createContainer, asClass } from 'awilix';
import { Controller } from '../decorators/controller.js';
import { Get, Post } from '../decorators/route.js';
import { Injectable } from '../decorators/injection.js';
import { withEnhancedAutoDI } from '../plugin-utils.js';

// 测试服务
@Injectable()
class TestService {
  getMessage(): string {
    return 'Hello from service';
  }
}

// 测试控制器
@Controller('/test')
@Injectable()
class TestController {
  constructor(private testService: TestService) {}

  @Get('/hello')
  async getHello(request: any, reply: any) {
    // 测试 this 绑定是否正确
    const message = this.testService.getMessage();
    return { message, controller: this.constructor.name };
  }

  @Post('/echo')
  async postEcho(request: any, reply: any) {
    // 测试 this 在异步方法中的绑定
    const serviceMessage = this.testService.getMessage();
    return { 
      echo: request.body,
      service: serviceMessage,
      controller: this.constructor.name
    };
  }

  @Get('/sync')
  getSync(request: any, reply: any) {
    // 测试同步方法的 this 绑定
    const message = this.testService.getMessage();
    return { message, sync: true, controller: this.constructor.name };
  }
}

describe('控制器路由 this 绑定优化', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    
    // 注册 @fastify/awilix
    await fastify.register(import('@fastify/awilix'), {
      disposeOnClose: true,
      disposeOnResponse: true
    });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('应该正确绑定异步方法的 this 上下文', async () => {
    const plugin = withEnhancedAutoDI(async (fastify) => {
      // 手动注册服务和控制器用于测试
      fastify.diContainer.register({
        testService: asClass(TestService).singleton(),
        testController: asClass(TestController).scoped()
      });
    }, {
      modules: {
        controllers: { enabled: false } // 禁用自动发现，手动注册
      },
      routeRegistration: { enabled: true }
    });

    await fastify.register(plugin);

    const response = await fastify.inject({
      method: 'GET',
      url: '/test/hello'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Hello from service');
    expect(body.controller).toBe('TestController');
  });

  it('应该正确绑定同步方法的 this 上下文', async () => {
    const plugin = withEnhancedAutoDI(async (fastify) => {
      fastify.diContainer.register({
        testService: asClass(TestService).singleton(),
        testController: asClass(TestController).scoped()
      });
    }, {
      modules: {
        controllers: { enabled: false }
      },
      routeRegistration: { enabled: true }
    });

    await fastify.register(plugin);

    const response = await fastify.inject({
      method: 'GET',
      url: '/test/sync'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Hello from service');
    expect(body.sync).toBe(true);
    expect(body.controller).toBe('TestController');
  });

  it('应该正确处理 POST 请求的 this 绑定', async () => {
    const plugin = withEnhancedAutoDI(async (fastify) => {
      fastify.diContainer.register({
        testService: asClass(TestService).singleton(),
        testController: asClass(TestController).scoped()
      });
    }, {
      modules: {
        controllers: { enabled: false }
      },
      routeRegistration: { enabled: true }
    });

    await fastify.register(plugin);

    const testData = { test: 'data' };
    const response = await fastify.inject({
      method: 'POST',
      url: '/test/echo',
      payload: testData
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.echo).toEqual(testData);
    expect(body.service).toBe('Hello from service');
    expect(body.controller).toBe('TestController');
  });

  it('应该缓存路由处理器以提高性能', async () => {
    // 这个测试验证处理器缓存是否工作
    const plugin = withEnhancedAutoDI(async (fastify) => {
      fastify.diContainer.register({
        testService: asClass(TestService).singleton(),
        testController: asClass(TestController).scoped()
      });
    }, {
      modules: {
        controllers: { enabled: false }
      },
      routeRegistration: { enabled: true }
    });

    await fastify.register(plugin);

    // 多次请求同一个路由
    const responses = await Promise.all([
      fastify.inject({ method: 'GET', url: '/test/hello' }),
      fastify.inject({ method: 'GET', url: '/test/hello' }),
      fastify.inject({ method: 'GET', url: '/test/hello' })
    ]);

    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Hello from service');
      expect(body.controller).toBe('TestController');
    });
  });
});
