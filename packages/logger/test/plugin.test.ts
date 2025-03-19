import { beforeEach, describe, expect, it, vi } from 'vitest';
import loggerPlugin from '../src';

// 模拟Stratix应用框架
const createMockApp = () => {
  const hooks = {};
  const decorations = {};
  const injections = {};

  return {
    // 注册插件
    register: vi.fn().mockImplementation(async (plugin, options) => {
      if (typeof plugin === 'function') {
        await plugin(mockApp, options);
      } else if (plugin.register) {
        await plugin.register(mockApp, options);
      }
    }),

    // 添加钩子
    addHook: vi.fn().mockImplementation((name, fn) => {
      hooks[name] = hooks[name] || [];
      hooks[name].push(fn);
    }),

    // 装饰应用实例
    decorate: vi.fn().mockImplementation((name, value) => {
      decorations[name] = value;
    }),

    // 注入服务
    inject: vi.fn().mockImplementation((name, factory) => {
      injections[name] = factory;
    }),

    // 解析服务
    resolve: vi.fn().mockImplementation(async (name) => {
      if (injections[name]) {
        if (typeof injections[name] === 'function') {
          return injections[name]({ resolve: mockApp.resolve });
        }
        return injections[name];
      }
      return null;
    }),

    // 启动应用
    start: vi.fn().mockResolvedValue(undefined),

    // 获取内部状态（用于测试）
    _getState: () => ({
      hooks,
      decorations,
      injections
    })
  };
};

let mockApp;

describe('Logger Plugin', () => {
  beforeEach(() => {
    mockApp = createMockApp();
    vi.clearAllMocks();
  });

  it('should register with the app', async () => {
    await mockApp.register(loggerPlugin);
    expect(mockApp.inject).toHaveBeenCalledWith('logger', expect.any(Function));
  });

  it('should decorate app with log property', async () => {
    await mockApp.register(loggerPlugin);
    expect(mockApp.decorate).toHaveBeenCalledWith('log', expect.anything());
  });

  it('should register request hooks', async () => {
    await mockApp.register(loggerPlugin);

    const state = mockApp._getState();
    expect(state.hooks['onRequest']).toBeDefined();
    expect(state.hooks['onError']).toBeDefined();
  });

  it('should create a logger with provided options', async () => {
    const options = {
      level: 'debug',
      name: 'test-app'
    };

    await mockApp.register(loggerPlugin, options);

    // 获取注入的logger实例
    const loggerFactory = mockApp._getState().injections['logger'];
    expect(loggerFactory).toBeDefined();

    const logger = await mockApp.resolve('logger');
    expect(logger).toBeDefined();
    expect(logger.level).toEqual('debug');
  });

  it('should expose the correct API', async () => {
    await mockApp.register(loggerPlugin);

    const logger = await mockApp.resolve('logger');

    // 测试日志方法存在
    expect(logger.trace).toBeInstanceOf(Function);
    expect(logger.debug).toBeInstanceOf(Function);
    expect(logger.info).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
    expect(logger.fatal).toBeInstanceOf(Function);

    // 测试工具方法
    expect(logger.child).toBeInstanceOf(Function);
    expect(logger.isLevelEnabled).toBeInstanceOf(Function);
  });

  it('should create request-scoped loggers', async () => {
    await mockApp.register(loggerPlugin);

    const hooks = mockApp._getState().hooks;
    const onRequestHook = hooks['onRequest'][0];

    // 模拟请求
    const req = {
      headers: { 'x-request-id': '123456' }
    };
    const reply = {};

    // 执行钩子
    await new Promise((resolve) => {
      onRequestHook(req, reply, resolve);
    });

    // 验证请求和响应对象有日志装饰
    expect(req.log).toBeDefined();
    expect(reply.log).toBeDefined();
  });
});
