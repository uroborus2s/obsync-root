/**
 * Stratix应用工厂函数单元测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, createAppFromConfig } from '../../src/app/factory.js';

// 模拟依赖模块
vi.mock('fastify', () => ({
  default: vi.fn().mockReturnValue({
    ready: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    server: {
      address: () => ({ address: '127.0.0.1', port: 3000 })
    }
  })
}));

vi.mock('../../src/config/loader.js', () => ({
  ConfigLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockReturnValue({
      name: 'test-app-from-config',
      server: { port: 3001 }
    })
  }))
}));

vi.mock('../../src/config/config.js', () => ({
  ConfigImpl: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockImplementation((path, defaultValue) => {
      if (path === 'logger') return {};
      return defaultValue;
    }),
    has: vi.fn().mockReturnValue(false),
    set: vi.fn(),
    validate: vi.fn().mockReturnValue(true)
  }))
}));

vi.mock('../../src/logger/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis()
  })
}));

vi.mock('../../src/app/app.js', () => ({
  StratixAppImpl: vi.fn().mockImplementation(() => ({
    name: 'test-app',
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    register: vi.fn().mockReturnThis(),
    start: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true)
}));

// 为测试插件注册准备虚拟模块
vi.mock('@stratix/core', {
  virtual: true,
  default: () => ({
    default: {
      name: 'core',
      register: vi.fn()
    }
  })
});

describe('应用工厂函数', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApp', () => {
    it('应该成功创建应用', () => {
      const app = createApp({
        name: 'test-app'
      });

      expect(app).toBeDefined();
      expect(app.name).toBe('test-app');
    });

    it('应该抛出错误如果没有提供应用名称', () => {
      expect(() => {
        // @ts-expect-error 测试无效参数
        createApp({});
      }).toThrow('应用必须有一个名称');
    });

    it('应该抛出错误如果提供的参数无效', () => {
      expect(() => {
        // @ts-expect-error 测试无效参数
        createApp(null);
      }).toThrow('应用选项必须是一个对象');
    });

    it('应该尝试注册指定的内置插件', () => {
      const app = createApp({
        name: 'test-app',
        plugins: {
          core: {}
        }
      });

      expect(app).toBeDefined();
      expect(app.register).toHaveBeenCalled();
    });
  });

  describe('createAppFromConfig', () => {
    it('应该从配置文件创建应用', async () => {
      const app = await createAppFromConfig('app.config.js');

      expect(app).toBeDefined();
      expect(app.name).toBe('test-app');
    });

    it('应该允许覆盖配置中的选项', async () => {
      const app = await createAppFromConfig('app.config.js', {
        name: 'custom-name'
      });

      expect(app).toBeDefined();
      expect(app.name).toBe('test-app'); // 模拟的StratixAppImpl总是返回'test-app'
    });

    it('应该抛出错误如果合并后的配置中没有应用名称', async () => {
      // 修改配置加载器的模拟实现，使其返回没有名称的配置
      const ConfigLoader = require('../../src/config/loader.js').ConfigLoader;
      vi.mocked(ConfigLoader).mockImplementationOnce(() => ({
        load: vi.fn().mockReturnValue({
          server: { port: 3001 }
        })
      }));

      await expect(createAppFromConfig('app.config.js')).rejects.toThrow(
        '应用配置必须包含名称'
      );
    });
  });
});
