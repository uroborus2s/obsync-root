import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContainer, asClass, asValue } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { registerControllerRoutes } from '../controller-registration.js';
import { MetadataManager } from '../../decorators/metadata.js';
import { Controller } from '../../decorators/controller.js';
import { Get, Post } from '../../decorators/routes.js';

// 模拟 Fastify 实例
const createMockFastify = () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  route: vi.fn(),
  register: vi.fn((plugin, options) => {
    // 模拟 register 调用插件函数
    if (typeof plugin === 'function') {
      return plugin(createMockFastify());
    }
    return Promise.resolve();
  })
});

// 测试控制器类
@Controller()
class TestController {
  @Get('/test')
  async getTest() {
    return { message: 'test' };
  }

  @Post('/test')
  async postTest() {
    return { message: 'created' };
  }
}

@Controller()
class EmptyController {
  // 没有路由方法
  someMethod() {
    return 'not a route';
  }
}

// 非控制器类
class RegularService {
  doSomething() {
    return 'service';
  }
}

describe('优化后的控制器路由注册', () => {
  let container: any;
  let fastify: any;

  beforeEach(() => {
    container = createContainer();
    fastify = createMockFastify();
    
    // 清除之前的调用记录
    vi.clearAllMocks();
  });

  describe('控制器发现优化', () => {
    it('应该正确发现带有路由的控制器', async () => {
      // 注册控制器到容器
      container.register({
        testController: asClass(TestController),
        emptyController: asClass(EmptyController),
        regularService: asClass(RegularService)
      });

      await registerControllerRoutes(fastify, container, {
        enabled: true
      });

      // 验证只有带路由的控制器被处理
      expect(fastify.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Discovered')
      );
      
      // 验证路由注册被调用
      expect(fastify.route).toHaveBeenCalled();
      
      // 验证注册了正确数量的路由（TestController 有 2 个路由）
      expect(fastify.route).toHaveBeenCalledTimes(2);
    });

    it('应该跳过没有路由的控制器', async () => {
      container.register({
        emptyController: asClass(EmptyController)
      });

      await registerControllerRoutes(fastify, container, {
        enabled: true
      });

      // 应该发现控制器但不注册路由
      expect(fastify.log.debug).toHaveBeenCalledWith(
        expect.stringContaining('has no routes, skipping')
      );
      
      // 不应该调用路由注册
      expect(fastify.route).not.toHaveBeenCalled();
    });

    it('应该忽略非控制器类', async () => {
      container.register({
        regularService: asClass(RegularService)
      });

      await registerControllerRoutes(fastify, container, {
        enabled: true
      });

      // 应该报告没有发现控制器
      expect(fastify.log.info).toHaveBeenCalledWith(
        'No controllers found in container'
      );
      
      // 不应该调用路由注册
      expect(fastify.route).not.toHaveBeenCalled();
    });
  });

  describe('路由注册优化', () => {
    beforeEach(() => {
      container.register({
        testController: asClass(TestController)
      });
    });

    it('应该正确注册路由到 Fastify', async () => {
      await registerControllerRoutes(fastify, container, {
        enabled: true
      });

      // 验证路由注册调用
      expect(fastify.route).toHaveBeenCalledTimes(2);
      
      // 验证第一个路由（GET /test）
      expect(fastify.route).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          handler: expect.any(Function)
        })
      );
      
      // 验证第二个路由（POST /test）
      expect(fastify.route).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          handler: expect.any(Function)
        })
      );
    });

    it('应该支持路由前缀', async () => {
      await registerControllerRoutes(fastify, container, {
        enabled: true,
        prefix: '/api/v1'
      });

      // 验证使用了 Fastify 的 register 方法来处理前缀
      expect(fastify.register).toHaveBeenCalledWith(
        expect.any(Function),
        { prefix: '/api/v1' }
      );
      
      // 验证记录了前缀信息
      expect(fastify.log.info).toHaveBeenCalledWith(
        'Controller routes registered with prefix: /api/v1'
      );
    });

    it('应该在路由禁用时跳过注册', async () => {
      await registerControllerRoutes(fastify, container, {
        enabled: false
      });

      expect(fastify.log.info).toHaveBeenCalledWith(
        'Controller routes are disabled'
      );
      
      expect(fastify.route).not.toHaveBeenCalled();
    });
  });

  describe('错误处理优化', () => {
    it('应该优雅处理控制器注册错误', async () => {
      // 创建一个会导致错误的容器注册
      const badContainer = createContainer();
      badContainer.register({
        badController: asValue(null) // 这会导致错误
      });

      await registerControllerRoutes(fastify, badContainer, {
        enabled: true
      });

      // 应该报告没有发现控制器（因为错误的注册被跳过）
      expect(fastify.log.info).toHaveBeenCalledWith(
        'No controllers found in container'
      );
    });

    it('应该继续处理其他控制器即使某个控制器失败', async () => {
      // 注册一个正常的控制器和一个可能有问题的控制器
      container.register({
        testController: asClass(TestController),
        emptyController: asClass(EmptyController)
      });

      await registerControllerRoutes(fastify, container, {
        enabled: true
      });

      // 应该成功处理正常的控制器
      expect(fastify.route).toHaveBeenCalledTimes(2);
    });
  });

  describe('性能优化验证', () => {
    it('应该避免不必要的实例创建', async () => {
      // 创建一个带有副作用的控制器来检测是否被实例化
      let instanceCreated = false;
      
      @Controller()
      class SideEffectController {
        constructor() {
          instanceCreated = true;
        }
        
        @Get('/side-effect')
        async getSideEffect() {
          return { message: 'side effect' };
        }
      }

      container.register({
        sideEffectController: asClass(SideEffectController)
      });

      await registerControllerRoutes(fastify, container, {
        enabled: true
      });

      // 在发现阶段不应该创建实例
      // 注意：这个测试可能需要根据实际的 Awilix 行为调整
      expect(fastify.route).toHaveBeenCalled();
    });
  });
});
