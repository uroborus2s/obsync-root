/**
 * Stratix应用容器单元测试
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StratixAppImpl } from '../../src/app/app.js';
import { ConfigAPI } from '../../src/config/types.js';
import { StratixPlugin } from '../../src/plugin/types.js';
import {
  DecoratorAlreadyExistsError,
  InvalidPluginError,
  PluginAlreadyExistsError,
  PluginDependencyError
} from '../../src/types/errors.js';
import { HookName } from '../../src/types/hook.js';
import { LoggerInstance } from '../../src/types/logger.js';

// 模拟Fastify实例
const mockFastify = {
  ready: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  server: {
    address: () => ({ address: '127.0.0.1', port: 3000 })
  }
};

// 模拟配置API
const mockConfig: ConfigAPI = {
  get: vi.fn().mockImplementation((path, defaultValue) => defaultValue),
  has: vi.fn().mockReturnValue(false),
  set: vi.fn(),
  validate: vi.fn().mockReturnValue(true)
};

// 模拟日志实例
const mockLogger: LoggerInstance = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn().mockReturnThis()
};

describe('StratixAppImpl', () => {
  let app: StratixAppImpl;

  beforeEach(() => {
    vi.clearAllMocks();

    app = new StratixAppImpl({
      name: 'test-app',
      fastify: mockFastify as any,
      config: mockConfig,
      logger: mockLogger
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('应该正确创建应用实例', () => {
    expect(app).toBeDefined();
    expect(app.name).toBe('test-app');
    expect(app.fastify).toBe(mockFastify);
    expect(app.config).toBe(mockConfig);
    expect(app.logger).toBe(mockLogger);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { name: 'test-app' },
      '应用实例已创建'
    );
  });

  it('应该正确添加装饰器', () => {
    // 添加装饰器
    app.decorate('testDecorator', 'test-value');

    // 验证是否添加成功
    expect(app.hasDecorator('testDecorator')).toBe(true);
    expect((app as any).testDecorator).toBe('test-value');

    // 不能重复添加相同名称的装饰器
    expect(() => app.decorate('testDecorator', 'another-value')).toThrow(
      DecoratorAlreadyExistsError
    );
  });

  it('应该能够注册钩子', () => {
    // 创建模拟钩子处理器
    const handler = vi.fn();

    // 注册钩子
    app.hook(HookName.BeforeStart, handler);

    // 启动应用，触发钩子
    return app.start().then(() => {
      expect(handler).toHaveBeenCalled();
      expect(mockFastify.ready).toHaveBeenCalled();
    });
  });

  describe('插件相关功能', () => {
    // 模拟有效的插件
    const mockPlugin: StratixPlugin = {
      name: 'test-plugin',
      register: vi.fn()
    };

    // 依赖插件
    const mockDepPlugin: StratixPlugin = {
      name: 'dep-plugin',
      register: vi.fn()
    };

    it('应该能够注册有效的插件', () => {
      app.register(mockPlugin);

      expect(app.hasPlugin(mockPlugin.name)).toBe(true);
      expect(mockPlugin.register).toHaveBeenCalled();
    });

    it('无效插件应该抛出异常', () => {
      // @ts-expect-error 测试无效插件
      expect(() => app.register(null)).toThrow(InvalidPluginError);

      // @ts-expect-error 测试无效插件
      expect(() => app.register({})).toThrow(InvalidPluginError);
    });

    it('不能重复注册相同名称的插件', () => {
      app.register(mockPlugin);

      expect(() => app.register(mockPlugin)).toThrow(PluginAlreadyExistsError);
    });

    it('应该验证插件依赖', () => {
      const pluginWithDep: StratixPlugin = {
        name: 'plugin-with-dep',
        dependencies: [mockDepPlugin.name],
        register: vi.fn()
      };

      // 注册依赖前注册插件应该失败
      expect(() => app.register(pluginWithDep)).toThrow(PluginDependencyError);

      // 先注册依赖
      app.register(mockDepPlugin);

      // 现在应该能够成功注册
      app.register(pluginWithDep);

      expect(app.hasPlugin(pluginWithDep.name)).toBe(true);
    });

    it('应该能够通过use方法访问已注册的插件', () => {
      app.register(mockPlugin);

      // 应该能够获取插件实例信息
      const pluginInstance = app.use(mockPlugin.name);
      expect(pluginInstance).toBeDefined();
      expect(pluginInstance.plugin).toBe(mockPlugin);

      // 访问未注册的插件应该抛出异常
      expect(() => app.use('non-existent-plugin')).toThrow();
    });
  });

  it('应该能够正确启动和关闭应用', async () => {
    // 测试启动
    await app.start();
    expect(mockFastify.ready).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('应用启动成功');

    // 测试关闭
    await app.close();
    expect(mockFastify.close).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('应用已关闭');
  });
});
